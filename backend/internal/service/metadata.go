package service

import (
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

type MetadataService struct{}

func NewMetadataService() *MetadataService {
	return &MetadataService{}
}

type Metadata struct {
	Title string `json:"title"`
}

func (s *MetadataService) FetchTitle(rawURL string) (*Metadata, error) {
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read up to 512KB to find </title>
	var buf strings.Builder
	limited := io.LimitReader(resp.Body, 512*1024)
	chunk := make([]byte, 4096)
	for {
		n, err := limited.Read(chunk)
		if n > 0 {
			buf.Write(chunk[:n])
			if strings.Contains(buf.String(), "</title>") {
				break
			}
		}
		if err != nil {
			break
		}
	}

	html := buf.String()
	title := extractTitle(html)
	if title == "" {
		title = rawURL
	}
	return &Metadata{Title: title}, nil
}

var titleRe = regexp.MustCompile(`(?is)<title[^>]*>(.*?)</title>`)

func extractTitle(html string) string {
	match := titleRe.FindStringSubmatch(html)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}
