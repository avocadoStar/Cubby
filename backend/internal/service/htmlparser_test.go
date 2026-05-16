package service

import "testing"

func TestExtractDescriptionUsesMetaDescription(t *testing.T) {
	html := `<html><head><meta name="description" content="  Primary description  "><meta property="og:description" content="Open graph description"></head></html>`

	if got := extractDescription(html); got != "Primary description" {
		t.Fatalf("expected primary description, got %q", got)
	}
}

func TestExtractDescriptionFallsBackToOpenGraphDescription(t *testing.T) {
	html := `<html><head><meta property="og:description" content="  Open graph description  "></head></html>`

	if got := extractDescription(html); got != "Open graph description" {
		t.Fatalf("expected open graph description, got %q", got)
	}
}

func TestExtractDescriptionReturnsEmptyWhenMissing(t *testing.T) {
	html := `<html><head><title>Example</title></head></html>`

	if got := extractDescription(html); got != "" {
		t.Fatalf("expected empty description, got %q", got)
	}
}
