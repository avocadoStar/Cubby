package metadata

import (
	"compress/gzip"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNormalizeURL(t *testing.T) {
	t.Run("adds https for regular bare domains", func(t *testing.T) {
		normalized, err := NormalizeURL(" Example.COM/path/ ")
		if err != nil {
			t.Fatalf("normalize url: %v", err)
		}
		if normalized != "https://example.com/path" {
			t.Fatalf("expected normalized https url, got %q", normalized)
		}
	})

	t.Run("uses http for loopback hosts without scheme", func(t *testing.T) {
		normalized, err := NormalizeURL("127.0.0.1:8080/test")
		if err != nil {
			t.Fatalf("normalize url: %v", err)
		}
		if normalized != "http://127.0.0.1:8080/test" {
			t.Fatalf("expected loopback http url, got %q", normalized)
		}
	})

	t.Run("rejects invalid urls", func(t *testing.T) {
		if _, err := NormalizeURL("not a valid url"); err == nil {
			t.Fatalf("expected invalid url error")
		}
	})
}

func TestFetchPageMetadataParsesGzipEncodedHead(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")

		gz := gzip.NewWriter(w)
		defer gz.Close()

		_, _ = gz.Write([]byte(`<!doctype html><html><head><title>Compressed Title</title><meta name="description" content="Compressed Description"></head><body>ok</body></html>`))
	}))
	defer server.Close()

	meta, err := FetchPageMetadata(server.URL + "/compressed")
	if err != nil {
		t.Fatalf("fetch page metadata: %v", err)
	}

	if meta.Title != "Compressed Title" {
		t.Fatalf("expected compressed title, got %#v", meta)
	}
	if meta.Description != "Compressed Description" {
		t.Fatalf("expected compressed description, got %#v", meta)
	}
}
