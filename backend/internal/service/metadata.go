package service

import (
	"context"
	"cubby/internal/model"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
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
	Icon  string `json:"icon"`
}

type metadataHTTPClientFactory func(targetIP string) *http.Client

type MetadataService struct {
	resolver      ipResolver
	clientFactory metadataHTTPClientFactory
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

	var buf strings.Builder
	limited := io.LimitReader(resp.Body, 512*1024)
	chunk := make([]byte, 4096)
	for {
		n, err := limited.Read(chunk)
		if n > 0 {
			buf.Write(chunk[:n])
			if strings.Contains(strings.ToLower(buf.String()), "</head>") {
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
	icon := s.fetchIcon(parsed, html)
	return &Metadata{Title: title, Icon: icon}, nil
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

func (s *MetadataService) fetchIcon(baseURL *url.URL, htmlText string) string {
	for _, candidate := range iconCandidates(baseURL, htmlText) {
		if strings.HasPrefix(candidate, "data:image/") {
			if icon := sanitizeBookmarkIcon(candidate); icon != "" {
				return icon
			}
			continue
		}
		icon, err := s.fetchRemoteIcon(candidate)
		if err == nil && icon != "" {
			return icon
		}
	}
	return ""
}

func (s *MetadataService) fetchRemoteIcon(rawURL string) (string, error) {
	parsed, ips, err := validateURLWithResolver(rawURL, s.resolver)
	if err != nil {
		return "", err
	}

	client := s.clientFactory(ips[0].String())
	req, err := http.NewRequest("GET", parsed.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36")
	req.Host = parsed.Hostname()

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusMultipleChoices && resp.StatusCode < http.StatusBadRequest {
		return "", errURLNotAllowed
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("icon fetch failed: %s", resp.Status)
	}

	maxBytes := int64((model.MaxBookmarkIconSize * 3) / 4)
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil {
		return "", err
	}
	if int64(len(data)) > maxBytes {
		return "", fmt.Errorf("icon exceeds maximum size")
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" || !strings.HasPrefix(strings.ToLower(contentType), "image/") {
		contentType = http.DetectContentType(data)
	}
	if idx := strings.Index(contentType, ";"); idx >= 0 {
		contentType = contentType[:idx]
	}
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	if !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("icon response is not an image")
	}

	icon := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data)
	return sanitizeBookmarkIcon(icon), nil
}
