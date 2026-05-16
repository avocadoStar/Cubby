package service

import (
	"html"
	"net/url"
	"regexp"
	"strings"
)

var titleRe = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)
var metaTagRe = regexp.MustCompile(`(?is)<meta\b[^>]*>`)
var linkTagRe = regexp.MustCompile(`(?is)<link\b[^>]*>`)
var attrRe = regexp.MustCompile(`(?is)\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)`)

func extractTitle(html string) string {
	match := titleRe.FindStringSubmatch(html)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}

func extractDescription(htmlText string) string {
	var openGraphDescription string
	for _, tag := range metaTagRe.FindAllString(htmlText, -1) {
		attrs := parseTagAttrs(tag)
		content := strings.TrimSpace(html.UnescapeString(attrs["content"]))
		if content == "" {
			continue
		}
		if strings.EqualFold(attrs["name"], "description") {
			return content
		}
		if openGraphDescription == "" && strings.EqualFold(attrs["property"], "og:description") {
			openGraphDescription = content
		}
	}
	return openGraphDescription
}

func iconCandidates(baseURL *url.URL, htmlText string) []string {
	seen := make(map[string]bool)
	var candidates []string
	add := func(raw string) {
		raw = strings.TrimSpace(html.UnescapeString(raw))
		if raw == "" {
			return
		}
		if strings.HasPrefix(raw, "data:image/") {
			if !seen[raw] {
				seen[raw] = true
				candidates = append(candidates, raw)
			}
			return
		}
		parsed, err := url.Parse(raw)
		if err != nil {
			return
		}
		resolved := baseURL.ResolveReference(parsed).String()
		if !seen[resolved] {
			seen[resolved] = true
			candidates = append(candidates, resolved)
		}
	}

	for _, tag := range linkTagRe.FindAllString(htmlText, -1) {
		attrs := parseTagAttrs(tag)
		rel := strings.ToLower(attrs["rel"])
		if !strings.Contains(rel, "icon") {
			continue
		}
		add(attrs["href"])
	}

	fallback := (&url.URL{Scheme: baseURL.Scheme, Host: baseURL.Host, Path: "/favicon.ico"}).String()
	if !seen[fallback] {
		candidates = append(candidates, fallback)
	}
	return candidates
}

func parseTagAttrs(tag string) map[string]string {
	attrs := make(map[string]string)
	for _, match := range attrRe.FindAllStringSubmatch(tag, -1) {
		if len(match) < 3 {
			continue
		}
		key := strings.ToLower(match[1])
		value := strings.Trim(match[2], `"'`)
		attrs[key] = value
	}
	return attrs
}
