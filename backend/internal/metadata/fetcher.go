package metadata

import (
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type Metadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	FaviconURL  string `json:"favicon_url"`
	OGImage     string `json:"og_image"`
}

func Fetch(rawURL string) (*Metadata, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Cubby/1.0)")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, io.ErrUnexpectedEOF
	}

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return nil, err
	}

	m := &Metadata{}
	extractMetadata(doc, rawURL, m)
	return m, nil
}

func extractMetadata(n *html.Node, baseURL string, m *Metadata) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "title":
			if n.FirstChild != nil && m.Title == "" {
				m.Title = n.FirstChild.Data
			}
		case "meta":
			var name, property, content string
			for _, attr := range n.Attr {
				switch attr.Key {
				case "name":
					name = attr.Val
				case "property":
					property = attr.Val
				case "content":
					content = attr.Val
				}
			}
			if name == "description" && m.Description == "" && content != "" {
				m.Description = content
			}
			if property == "og:image" && m.OGImage == "" && content != "" {
				m.OGImage = resolveURL(baseURL, content)
			}
		case "link":
			var rel, href string
			for _, attr := range n.Attr {
				if attr.Key == "rel" {
					rel = attr.Val
				}
				if attr.Key == "href" {
					href = attr.Val
				}
			}
			if strings.Contains(rel, "icon") && m.FaviconURL == "" && href != "" {
				m.FaviconURL = resolveURL(baseURL, href)
			}
		}
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractMetadata(c, baseURL, m)
	}
}

func resolveURL(base, ref string) string {
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return ref
	}
	if strings.HasPrefix(ref, "//") {
		return "https:" + ref
	}
	baseURL, err := url.Parse(base)
	if err != nil {
		return ref
	}
	refURL, err := url.Parse(ref)
	if err != nil {
		return ref
	}
	return baseURL.ResolveReference(refURL).String()
}

var domainRegex = regexp.MustCompile(`https?://([^/]+)`)

func ExtractDomain(rawURL string) string {
	matches := domainRegex.FindStringSubmatch(rawURL)
	if len(matches) > 1 {
		return matches[1]
	}
	return rawURL
}
