package service

import (
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestPreviewSessionAllowsNonStandardPorts(t *testing.T) {
	svc := NewPreviewService("http://localhost:8081")
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.idFactory = func() (string, error) { return "preview-id", nil }

	session, err := svc.CreateSession("https://example.test:3000/app", "mobile")
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	if session.Src != "http://localhost:8081/preview/sessions/preview-id" {
		t.Fatalf("unexpected session src %q", session.Src)
	}
}

func TestPreviewSessionUsesConfiguredPreviewOrigin(t *testing.T) {
	svc := NewPreviewService("https://preview.example.com")
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.idFactory = func() (string, error) { return "preview-id", nil }

	session, err := svc.CreateSession("https://example.test/app", "mobile")
	if err != nil {
		t.Fatalf("create session: %v", err)
	}

	if session.Src != "https://preview.example.com/preview/sessions/preview-id" {
		t.Fatalf("unexpected session src %q", session.Src)
	}
}

func TestPreviewSessionRejectsBlockedHosts(t *testing.T) {
	svc := NewPreviewService()

	if _, err := svc.CreateSession("http://127.0.0.1:3000", "mobile"); err == nil {
		t.Fatal("expected loopback preview URL to be rejected")
	}
}

func TestPreviewProxyUsesMobileUAAndSanitizesHeaders(t *testing.T) {
	svc := NewPreviewService()
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.idFactory = func() (string, error) { return "preview-id", nil }
	svc.clientFactory = func(targetIP string) *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				if !strings.Contains(req.UserAgent(), "iPhone") {
					t.Fatalf("expected mobile user agent, got %q", req.UserAgent())
				}
				return &http.Response{
					StatusCode: http.StatusOK,
					Header: http.Header{
						"Content-Type":            []string{"text/html; charset=utf-8"},
						"Set-Cookie":              []string{"sid=secret"},
						"X-Frame-Options":         []string{"DENY"},
						"Content-Security-Policy": []string{"default-src 'self'; frame-ancestors 'none'; img-src https:"},
					},
					Body:    io.NopCloser(strings.NewReader("<html><head><title>x</title></head><body>ok</body></html>")),
					Request: req,
				}, nil
			}),
		}
	}

	if _, err := svc.CreateSession("https://example.test/app", "mobile"); err != nil {
		t.Fatalf("create session: %v", err)
	}

	proxyResp, err := svc.Proxy("preview-id")
	if err != nil {
		t.Fatalf("proxy: %v", err)
	}

	if proxyResp.Header.Get("Set-Cookie") != "" {
		t.Fatal("expected Set-Cookie to be stripped")
	}
	if proxyResp.Header.Get("X-Frame-Options") != "" {
		t.Fatal("expected X-Frame-Options to be stripped")
	}
	csp := proxyResp.Header.Get("Content-Security-Policy")
	if strings.Contains(csp, "frame-ancestors") || !strings.Contains(csp, "img-src https:") {
		t.Fatalf("unexpected sanitized CSP %q", csp)
	}
	if !strings.Contains(string(proxyResp.Body), `<base href="https://example.test/app">`) {
		t.Fatalf("expected base tag injection, got %s", string(proxyResp.Body))
	}
}

func TestPreviewProxyRejectsExpiredSessions(t *testing.T) {
	now := time.Date(2026, 5, 16, 10, 0, 0, 0, time.UTC)
	svc := NewPreviewService()
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.idFactory = func() (string, error) { return "preview-id", nil }
	svc.now = func() time.Time { return now }

	if _, err := svc.CreateSession("https://example.test", "mobile"); err != nil {
		t.Fatalf("create session: %v", err)
	}

	svc.now = func() time.Time { return now.Add(3 * time.Minute) }
	if _, err := svc.Proxy("preview-id"); err == nil {
		t.Fatal("expected expired session to be rejected")
	}
}

func TestPreviewProxyRejectsDangerousRedirects(t *testing.T) {
	svc := NewPreviewService()
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.idFactory = func() (string, error) { return "preview-id", nil }
	svc.clientFactory = func(targetIP string) *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusFound,
					Header:     http.Header{"Location": []string{"http://127.0.0.1:3000/"}},
					Body:       io.NopCloser(strings.NewReader("")),
					Request:    req,
				}, nil
			}),
		}
	}

	if _, err := svc.CreateSession("https://example.test", "mobile"); err != nil {
		t.Fatalf("create session: %v", err)
	}
	if _, err := svc.Proxy("preview-id"); err == nil {
		t.Fatal("expected redirect to loopback to be rejected")
	}
}
