package metadata

import (
	"bytes"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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

const (
	maxHeadBytes           = 512 * 1024
	defaultFaviconSize     = "64"
	defaultFaviconBasePath = "/favicons"
)

var (
	DefaultUserAgent       = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
	DefaultFaviconProvider = "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=%s&size=" + defaultFaviconSize
	headCloseTag           = []byte("</head>")
	filenameSanitizer      = regexp.MustCompile(`\W+`)
	domainRegex            = regexp.MustCompile(`https?://([^/]+)`)
)

func FetchPageMetadata(rawURL string) (*Metadata, error) {
	normalizedURL, err := NormalizeURL(rawURL)
	if err != nil {
		return nil, err
	}

	headContent, err := loadHead(normalizedURL)
	if err != nil {
		return nil, err
	}

	return parseMetadata(headContent, normalizedURL), nil
}

func FetchTitle(rawURL string) (string, error) {
	meta, err := FetchPageMetadata(rawURL)
	if err != nil {
		return "", err
	}

	return meta.Title, nil
}

func DownloadFavicon(rawURL, targetDir string) (string, error) {
	baseURL, err := normalizeSiteURL(rawURL)
	if err != nil {
		return "", err
	}

	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", err
	}

	filenameBase := filenameSanitizer.ReplaceAllString(baseURL, "_")
	if existingPath := findExistingFavicon(targetDir, filenameBase); existingPath != "" {
		return publicFaviconPath(filepath.Base(existingPath)), nil
	}

	providerURL := fmt.Sprintf(DefaultFaviconProvider, url.QueryEscape(baseURL))
	req, err := http.NewRequest(http.MethodGet, providerURL, nil)
	if err != nil {
		return "", err
	}
	applyRequestHeaders(req)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("favicon provider returned %d", resp.StatusCode)
	}

	contentType := strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])
	if contentType != "" && !strings.HasPrefix(contentType, "image/") {
		return "", fmt.Errorf("unexpected favicon content type %q", contentType)
	}

	fileExtension := guessExtension(contentType)
	fileName := filenameBase + fileExtension
	filePath := filepath.Join(targetDir, fileName)

	file, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := io.Copy(file, resp.Body); err != nil {
		return "", err
	}

	return publicFaviconPath(fileName), nil
}

func loadHead(rawURL string) ([]byte, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	applyRequestHeaders(req)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("metadata request returned %d", resp.StatusCode)
	}

	buffer := bytes.NewBuffer(nil)
	chunk := make([]byte, 8192)

	for buffer.Len() < maxHeadBytes {
		n, readErr := resp.Body.Read(chunk)
		if n > 0 {
			buffer.Write(chunk[:n])
			lowerContent := bytes.ToLower(buffer.Bytes())
			if endOfHead := bytes.Index(lowerContent, headCloseTag); endOfHead >= 0 {
				return buffer.Bytes()[:endOfHead+len(headCloseTag)], nil
			}
		}

		if readErr != nil {
			if readErr == io.EOF {
				return buffer.Bytes(), nil
			}
			return nil, readErr
		}
	}

	return buffer.Bytes(), nil
}

func parseMetadata(content []byte, baseURL string) *Metadata {
	meta := &Metadata{}
	tokenizer := html.NewTokenizer(bytes.NewReader(content))
	inTitle := false
	titleBuilder := strings.Builder{}

	for {
		switch tokenizer.Next() {
		case html.ErrorToken:
			meta.Title = strings.TrimSpace(titleBuilder.String())
			return meta
		case html.StartTagToken, html.SelfClosingTagToken:
			token := tokenizer.Token()
			switch token.Data {
			case "title":
				inTitle = true
			case "meta":
				applyMetaTag(meta, token, baseURL)
			}
		case html.TextToken:
			if inTitle {
				titleBuilder.WriteString(string(tokenizer.Text()))
			}
		case html.EndTagToken:
			token := tokenizer.Token()
			switch token.Data {
			case "title":
				inTitle = false
			case "head":
				meta.Title = strings.TrimSpace(titleBuilder.String())
				return meta
			}
		}
	}
}

func applyMetaTag(meta *Metadata, token html.Token, baseURL string) {
	var (
		content  string
		name     string
		property string
	)

	for _, attr := range token.Attr {
		switch strings.ToLower(attr.Key) {
		case "content":
			content = strings.TrimSpace(attr.Val)
		case "name":
			name = strings.ToLower(strings.TrimSpace(attr.Val))
		case "property":
			property = strings.ToLower(strings.TrimSpace(attr.Val))
		}
	}

	if content == "" {
		return
	}

	switch {
	case name == "description" && meta.Description == "":
		meta.Description = content
	case property == "og:description" && meta.Description == "":
		meta.Description = content
	case property == "og:image" && meta.OGImage == "":
		meta.OGImage = resolveURL(baseURL, content)
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

func normalizeSiteURL(rawURL string) (string, error) {
	normalizedURL, err := NormalizeURL(rawURL)
	if err != nil {
		return "", err
	}

	parsedURL, err := url.Parse(normalizedURL)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Hostname()), nil
}

func findExistingFavicon(targetDir, filenameBase string) string {
	entries, err := os.ReadDir(targetDir)
	if err != nil {
		return ""
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		base := strings.TrimSuffix(entry.Name(), filepath.Ext(entry.Name()))
		if base == filenameBase {
			return filepath.Join(targetDir, entry.Name())
		}
	}

	return ""
}

func guessExtension(contentType string) string {
	switch contentType {
	case "image/vnd.microsoft.icon", "image/x-icon":
		return ".ico"
	case "image/svg+xml":
		return ".svg"
	}

	if extensions, err := mime.ExtensionsByType(contentType); err == nil && len(extensions) > 0 {
		return extensions[0]
	}

	return ".png"
}

func publicFaviconPath(fileName string) string {
	return defaultFaviconBasePath + "/" + fileName
}

func applyRequestHeaders(req *http.Request) {
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml")
	req.Header.Set("DNT", "1")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	req.Header.Set("User-Agent", DefaultUserAgent)
}

func ExtractDomain(rawURL string) string {
	matches := domainRegex.FindStringSubmatch(rawURL)
	if len(matches) > 1 {
		return matches[1]
	}
	return rawURL
}
