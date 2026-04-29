package metadata

import (
	"fmt"
	"net"
	"net/url"
	"strings"
)

func NormalizeURL(rawURL string) (string, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return "", fmt.Errorf("invalid url")
	}

	candidate := trimmed
	if !strings.Contains(candidate, "://") {
		candidate = defaultScheme(candidate) + "://" + strings.TrimPrefix(candidate, "//")
	}

	parsed, err := url.Parse(candidate)
	if err != nil {
		return "", fmt.Errorf("invalid url: %w", err)
	}

	scheme := strings.ToLower(strings.TrimSpace(parsed.Scheme))
	if scheme != "http" && scheme != "https" {
		return "", fmt.Errorf("invalid url")
	}

	hostname := strings.ToLower(strings.TrimSpace(parsed.Hostname()))
	if !isValidHostname(hostname) {
		return "", fmt.Errorf("invalid url")
	}

	host := hostname
	if port := parsed.Port(); port != "" {
		host += ":" + port
	}

	path := parsed.EscapedPath()
	switch {
	case path == "/":
		path = ""
	case len(path) > 1:
		path = strings.TrimRight(path, "/")
	}

	return (&url.URL{
		Scheme:   scheme,
		User:     parsed.User,
		Host:     host,
		Path:     path,
		RawQuery: parsed.RawQuery,
		Fragment: parsed.Fragment,
	}).String(), nil
}

func defaultScheme(candidate string) string {
	host := candidate
	if slash := strings.IndexByte(host, '/'); slash >= 0 {
		host = host[:slash]
	}
	host = strings.TrimSpace(strings.TrimPrefix(host, "//"))
	if colon := strings.LastIndexByte(host, ':'); colon >= 0 {
		if parsedIP := net.ParseIP(host[:colon]); parsedIP != nil && parsedIP.IsLoopback() {
			return "http"
		}
	}
	if host == "localhost" {
		return "http"
	}
	if parsedIP := net.ParseIP(host); parsedIP != nil && parsedIP.IsLoopback() {
		return "http"
	}
	return "https"
}

func isValidHostname(hostname string) bool {
	if hostname == "" || strings.ContainsAny(hostname, " \t\r\n") {
		return false
	}
	if hostname == "localhost" {
		return true
	}
	if parsedIP := net.ParseIP(hostname); parsedIP != nil {
		return true
	}
	return strings.Contains(hostname, ".")
}
