package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	defaultPreviewSessionTTL = 2 * time.Minute
	defaultPreviewMaxBytes   = 5 << 20
	mobilePreviewUserAgent   = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)

type previewHTTPClientFactory func(targetIP string) *http.Client
type previewIDFactory func() (string, error)

type previewSession struct {
	URL       string
	ExpiresAt time.Time
}

type PreviewSession struct {
	Src       string    `json:"src"`
	ExpiresAt time.Time `json:"expires_at"`
}

type PreviewProxyResponse struct {
	StatusCode int
	Header     http.Header
	Body       []byte
}

type PreviewService struct {
	resolver      ipResolver
	clientFactory previewHTTPClientFactory
	idFactory     previewIDFactory
	now           func() time.Time
	ttl           time.Duration
	maxBytes      int64
	previewOrigin string

	mu       sync.Mutex
	sessions map[string]previewSession
}

func NewPreviewService(previewOrigin ...string) *PreviewService {
	origin := "http://localhost:8080"
	if len(previewOrigin) > 0 && strings.TrimSpace(previewOrigin[0]) != "" {
		origin = strings.TrimRight(strings.TrimSpace(previewOrigin[0]), "/")
	}
	return &PreviewService{
		resolver:      defaultResolver{},
		clientFactory: newPreviewHTTPClient,
		idFactory:     newPreviewSessionID,
		now:           time.Now,
		ttl:           defaultPreviewSessionTTL,
		maxBytes:      defaultPreviewMaxBytes,
		previewOrigin: origin,
		sessions:      make(map[string]previewSession),
	}
}

func (s *PreviewService) CreateSession(rawURL string, mode string) (*PreviewSession, error) {
	if mode != "mobile" {
		return nil, NewValidationError("unsupported preview mode")
	}

	parsed, _, err := validatePreviewURLWithResolver(strings.TrimSpace(rawURL), s.resolver)
	if err != nil {
		return nil, err
	}

	id, err := s.idFactory()
	if err != nil {
		return nil, fmt.Errorf("create preview session id: %w", err)
	}
	expiresAt := s.now().Add(s.ttl)

	s.mu.Lock()
	s.sessions[id] = previewSession{URL: parsed.String(), ExpiresAt: expiresAt}
	s.mu.Unlock()

	return &PreviewSession{
		Src:       s.previewOrigin + "/preview/sessions/" + id,
		ExpiresAt: expiresAt.UTC(),
	}, nil
}

func (s *PreviewService) Proxy(id string) (*PreviewProxyResponse, error) {
	session, err := s.session(id)
	if err != nil {
		return nil, err
	}
	return s.fetch(session.URL, 0)
}

func (s *PreviewService) session(id string) (previewSession, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	session, ok := s.sessions[id]
	if !ok {
		return previewSession{}, NewNotFoundError(nil)
	}
	if !s.now().Before(session.ExpiresAt) {
		delete(s.sessions, id)
		return previewSession{}, NewValidationError("preview session expired")
	}
	return session, nil
}

func (s *PreviewService) fetch(rawURL string, redirectCount int) (*PreviewProxyResponse, error) {
	if redirectCount > 5 {
		return nil, NewValidationError("too many redirects")
	}

	parsed, ips, err := validatePreviewURLWithResolver(rawURL, s.resolver)
	if err != nil {
		return nil, err
	}

	client := s.clientFactory(ips[0].String())
	req, err := http.NewRequest(http.MethodGet, parsed.String(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", mobilePreviewUserAgent)
	req.Host = parsed.Host

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusMultipleChoices && resp.StatusCode < http.StatusBadRequest {
		location := resp.Header.Get("Location")
		if location == "" {
			return nil, NewValidationError("redirect missing location")
		}
		next, err := resolveRedirectURL(parsed, location)
		if err != nil {
			return nil, err
		}
		return s.fetch(next, redirectCount+1)
	}

	body, err := readLimited(resp.Body, s.maxBytes)
	if err != nil {
		return nil, err
	}

	headers := sanitizePreviewHeaders(resp.Header)
	if isHTMLResponse(headers) {
		body = injectBaseTag(body, parsed.String())
		headers.Del("Content-Length")
	}

	return &PreviewProxyResponse{
		StatusCode: resp.StatusCode,
		Header:     headers,
		Body:       body,
	}, nil
}

func newPreviewHTTPClient(targetIP string) *http.Client {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			_, port, _ := net.SplitHostPort(addr)
			target := net.JoinHostPort(targetIP, port)
			dialer := &net.Dialer{Timeout: 5 * time.Second}
			return dialer.DialContext(ctx, network, target)
		},
	}
	return &http.Client{
		Timeout:   12 * time.Second,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func newPreviewSessionID() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func validatePreviewURLWithResolver(rawURL string, resolver ipResolver) (*url.URL, []net.IP, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, nil, errURLNotAllowed
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, nil, errURLNotAllowed
	}
	host := parsed.Hostname()
	if host == "" || strings.EqualFold(host, "localhost") {
		return nil, nil, errURLNotAllowed
	}

	ips := []net.IP{}
	if ip := net.ParseIP(host); ip != nil {
		ips = append(ips, ip)
	} else {
		ips, err = resolver.LookupIP(host)
		if err != nil || len(ips) == 0 {
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

func resolveRedirectURL(base *url.URL, location string) (string, error) {
	next, err := url.Parse(location)
	if err != nil {
		return "", errURLNotAllowed
	}
	return base.ResolveReference(next).String(), nil
}

func readLimited(body io.Reader, maxBytes int64) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > maxBytes {
		return nil, NewValidationError("preview response too large")
	}
	return data, nil
}

func sanitizePreviewHeaders(source http.Header) http.Header {
	headers := source.Clone()
	headers.Del("Set-Cookie")
	headers.Del("X-Frame-Options")

	if csp := removeFrameAncestors(headers.Get("Content-Security-Policy")); csp != "" {
		headers.Set("Content-Security-Policy", csp)
	} else {
		headers.Del("Content-Security-Policy")
	}
	return headers
}

func removeFrameAncestors(csp string) string {
	if csp == "" {
		return ""
	}
	parts := strings.Split(csp, ";")
	kept := make([]string, 0, len(parts))
	for _, part := range parts {
		directive := strings.TrimSpace(part)
		if directive == "" {
			continue
		}
		name := strings.Fields(directive)
		if len(name) > 0 && strings.EqualFold(name[0], "frame-ancestors") {
			continue
		}
		kept = append(kept, directive)
	}
	return strings.Join(kept, "; ")
}

func isHTMLResponse(headers http.Header) bool {
	return strings.Contains(strings.ToLower(headers.Get("Content-Type")), "text/html")
}

func injectBaseTag(body []byte, baseURL string) []byte {
	tag := `<base href="` + html.EscapeString(baseURL) + `">`
	text := string(body)
	lower := strings.ToLower(text)
	if idx := strings.Index(lower, "<head>"); idx >= 0 {
		insertAt := idx + len("<head>")
		return []byte(text[:insertAt] + tag + text[insertAt:])
	}
	return []byte(tag + text)
}

type StaticResolverForTest map[string][]string

func (r StaticResolverForTest) LookupIP(host string) ([]net.IP, error) {
	raw := r[host]
	ips := make([]net.IP, 0, len(raw))
	for _, value := range raw {
		ips = append(ips, net.ParseIP(value))
	}
	return ips, nil
}

func (s *PreviewService) SetResolverForTest(resolver ipResolver) {
	s.resolver = resolver
}

func (s *PreviewService) SetIDFactoryForTest(factory previewIDFactory) {
	s.idFactory = factory
}
