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

func TestFetchTitleReturnsLinkedIcon(t *testing.T) {
	svc := NewMetadataService()
	svc.resolver = staticResolver{"example.test": {"93.184.216.34"}}
	svc.clientFactory = func(targetIP string) *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				switch req.URL.Path {
				case "":
					fallthrough
				case "/":
					return &http.Response{
						StatusCode: http.StatusOK,
						Body:       io.NopCloser(strings.NewReader(`<html><head><title>Example</title><meta name="description" content=" Example description "><link rel="icon" href="/favicon.png"></head></html>`)),
						Request:    req,
					}, nil
				case "/favicon.png":
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     http.Header{"Content-Type": []string{"image/png"}},
						Body:       io.NopCloser(strings.NewReader("icon")),
						Request:    req,
					}, nil
				default:
					return &http.Response{StatusCode: http.StatusNotFound, Body: io.NopCloser(strings.NewReader("")), Request: req}, nil
				}
			}),
		}
	}

	meta, err := svc.FetchTitle("http://example.test")
	if err != nil {
		t.Fatalf("fetch title: %v", err)
	}
	if meta.Title != "Example" {
		t.Fatalf("expected title Example, got %q", meta.Title)
	}
	if meta.Description != "Example description" {
		t.Fatalf("expected description Example description, got %q", meta.Description)
	}
	if meta.Icon != "data:image/png;base64,aWNvbg==" {
		t.Fatalf("expected favicon data URI, got %q", meta.Icon)
	}
}
