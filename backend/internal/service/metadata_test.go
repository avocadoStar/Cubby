package service

import (
	"io"
	"net"
	"net/http"
	"strings"
	"testing"
)

type staticResolver map[string][]string

func (r staticResolver) LookupIP(host string) ([]net.IP, error) {
	raw := r[host]
	ips := make([]net.IP, 0, len(raw))
	for _, value := range raw {
		ips = append(ips, net.ParseIP(value))
	}
	return ips, nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestValidateURLRejectsMulticastIP(t *testing.T) {
	if err := validateURL("http://224.0.0.1"); err == nil {
		t.Fatal("expected multicast IPv4 address to be rejected")
	}
	if err := validateURL("http://[ff02::1]"); err == nil {
		t.Fatal("expected multicast IPv6 address to be rejected")
	}
}

func TestFetchTitleRejectsRedirects(t *testing.T) {
	svc := NewMetadataService()
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.clientFactory = func(targetIP string) *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				return &http.Response{
					StatusCode: http.StatusFound,
					Header:     http.Header{"Location": []string{"http://127.0.0.1/"}},
					Body:       io.NopCloser(strings.NewReader("")),
					Request:    req,
				}, nil
			}),
		}
	}

	if _, err := svc.FetchTitle("http://example.test"); err == nil {
		t.Fatal("expected redirect response to be rejected")
	}
}
