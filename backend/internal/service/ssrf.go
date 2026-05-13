package service

import (
	"fmt"
	"net"
	"net/url"
)

var errURLNotAllowed = NewValidationError("url not allowed")

type ipResolver interface {
	LookupIP(host string) ([]net.IP, error)
}

type defaultResolver struct{}

func (defaultResolver) LookupIP(host string) ([]net.IP, error) {
	return net.LookupIP(host)
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
	ipv4Ranges := []struct {
		network *net.IPNet
	}{
		// loopback
		{mustParseCIDR("127.0.0.0/8")},
		// private (RFC 1918 + IPv6 unique local)
		{mustParseCIDR("10.0.0.0/8")},
		{mustParseCIDR("172.16.0.0/12")},
		{mustParseCIDR("192.168.0.0/16")},
		// link-local
		{mustParseCIDR("169.254.0.0/16")},
		// unspecified / multicast
		{mustParseCIDR("0.0.0.0/8")},
		// carrier-grade NAT
		{mustParseCIDR("100.64.0.0/10")},
		// multicast
		{mustParseCIDR("224.0.0.0/4")},
	}
	ipv6Ranges := []struct {
		network *net.IPNet
	}{
		// loopback
		{mustParseCIDR("::1/128")},
		// private (IPv6 unique local)
		{mustParseCIDR("fc00::/7")},
		// link-local
		{mustParseCIDR("fe80::/10")},
		// unspecified / IPv4-mapped / multicast
		{mustParseCIDR("::/128")},
		{mustParseCIDR("::ffff:0:0/96")},
		{mustParseCIDR("ff00::/8")},
	}
	ranges := ipv6Ranges
	if ip.To4() != nil {
		ranges = ipv4Ranges
	}
	for _, r := range ranges {
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
