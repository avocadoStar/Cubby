package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

func NewMetadataService() *MetadataService {
	return &MetadataService{
		resolver:      defaultResolver{},
		clientFactory: newMetadataHTTPClient,
	}
}

type Metadata struct {
	Title string `json:"title"`
}

var errURLNotAllowed = errors.New("URL not allowed")

type ipResolver interface {
	LookupIP(host string) ([]net.IP, error)
}

type defaultResolver struct{}

func (defaultResolver) LookupIP(host string) ([]net.IP, error) {
	return net.LookupIP(host)
}

type metadataHTTPClientFactory func(targetIP string) *http.Client

type MetadataService struct {
	resolver      ipResolver
	clientFactory metadataHTTPClientFactory
}

// allowedPorts maps explicitly permitted port numbers.
var allowedPorts = map[string]bool{
	"":    true, // default port for the scheme
	"80":  true,
	"443": true,
}

// isBlockedIP reports whether an IP address falls in a private, loopback,
// link-local, multicast, or otherwise non-public range.
func isBlockedIP(ip net.IP) bool {
	privateRanges := []struct {
		network *net.IPNet
	}{
		// loopback
		{mustParseCIDR("127.0.0.0/8")},
		{mustParseCIDR("::1/128")},
		// private (RFC 1918 + IPv6 unique local)
		{mustParseCIDR("10.0.0.0/8")},
		{mustParseCIDR("172.16.0.0/12")},
		{mustParseCIDR("192.168.0.0/16")},
		{mustParseCIDR("fc00::/7")},
		// link-local
		{mustParseCIDR("169.254.0.0/16")},
		{mustParseCIDR("fe80::/10")},
		// unspecified / multicast
		{mustParseCIDR("0.0.0.0/8")},
		{mustParseCIDR("::/128")},
		{mustParseCIDR("::ffff:0:0/96")},
		// carrier-grade NAT
		{mustParseCIDR("100.64.0.0/10")},
		// multicast
		{mustParseCIDR("224.0.0.0/4")},
		{mustParseCIDR("ff00::/8")},
	}
	for _, r := range privateRanges {
		if r.network.Contains(ip) {
			return true
		}
	}
	return false
}

func mustParseCIDR(s string) *net.IPNet {
	_, network, err := net.ParseCIDR(s)
	if err != nil {
		panic(fmt.Sprintf("parse CIDR %q: %v", s, err))
	}
	return network
}

// validateURL performs SSRF protection checks on the provided URL.
func validateURL(rawURL string) error {
	_, _, err := validateURLWithResolver(rawURL, defaultResolver{})
	return err
}

func validateURLWithResolver(rawURL string, resolver ipResolver) (*url.URL, []net.IP, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, nil, errURLNotAllowed
	}

	// Only allow http and https schemes.
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, nil, errURLNotAllowed
	}

	host := parsed.Hostname()
	if host == "" {
		return nil, nil, errURLNotAllowed
	}

	// Restrict ports.
	port := parsed.Port()
	if !allowedPorts[port] {
		return nil, nil, errURLNotAllowed
	}

	ips := []net.IP{}
	if ip := net.ParseIP(host); ip != nil {
		ips = append(ips, ip)
	} else {
		ips, err = resolver.LookupIP(host)
		if err != nil {
			return nil, nil, errURLNotAllowed
		}
		if len(ips) == 0 {
			return nil, nil, errURLNotAllowed
		}
	}
	for _, ip := range ips {
		if ip == nil || isBlockedIP(ip) {
			return nil, nil, errURLNotAllowed
		}
	}

	return parsed, ips, nil
}

func (s *MetadataService) FetchTitle(rawURL string) (*Metadata, error) {
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	parsed, ips, err := validateURLWithResolver(rawURL, s.resolver)
	if err != nil {
		return nil, err
	}

	host := parsed.Hostname()
	resolvedIP := ips[0].String()
	client := s.clientFactory(resolvedIP)

	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36")
	// Set Host header explicitly so TLS SNI and Host header use the original hostname.
	req.Host = host

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusMultipleChoices && resp.StatusCode < http.StatusBadRequest {
		return nil, errURLNotAllowed
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("metadata fetch failed: %s", resp.Status)
	}

	// Read up to 512KB to find </title>
	var buf strings.Builder
	limited := io.LimitReader(resp.Body, 512*1024)
	chunk := make([]byte, 4096)
	for {
		n, err := limited.Read(chunk)
		if n > 0 {
			buf.Write(chunk[:n])
			if strings.Contains(buf.String(), "</title>") {
				break
			}
		}
		if err != nil {
			break
		}
	}

	html := buf.String()
	title := extractTitle(html)
	if title == "" {
		title = rawURL
	}
	return &Metadata{Title: title}, nil
}

func newMetadataHTTPClient(targetIP string) *http.Client {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			_, port, _ := net.SplitHostPort(addr)
			target := net.JoinHostPort(targetIP, port)
			dialer := &net.Dialer{Timeout: 5 * time.Second}
			return dialer.DialContext(ctx, network, target)
		},
	}
	return &http.Client{
		Timeout:   8 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

var titleRe = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)

func extractTitle(html string) string {
	match := titleRe.FindStringSubmatch(html)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}
