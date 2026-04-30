package service

import (
	"cubby/internal/repository"
	"io"
	"net/url"
	"regexp"
	"strings"
)

type ImportService struct {
	folderRepo   *repository.FolderRepo
	bookmarkRepo *repository.BookmarkRepo
}

func NewImportService(fr *repository.FolderRepo, br *repository.BookmarkRepo) *ImportService {
	return &ImportService{folderRepo: fr, bookmarkRepo: br}
}

type ImportResult struct {
	Bookmarks int `json:"bookmarks"`
	Folders   int `json:"folders"`
}

func (s *ImportService) ImportHTML(reader io.Reader) (*ImportResult, error) {
	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	text := string(content)
	result := &ImportResult{}

	aRe := regexp.MustCompile(`(?i)<A[^>]*HREF="([^"]*)"[^>]*>(.*?)</A>`)
	matches := aRe.FindAllStringSubmatch(text, -1)

	for _, m := range matches {
		href := strings.TrimSpace(m[1])
		title := stripTags(strings.TrimSpace(m[2]))
		if title == "" {
			title = href
		}
		if _, parseErr := url.Parse(href); parseErr != nil {
			continue
		}
		sortKey := "n" + href[min(len(href), 4):min(len(href), 12)]
		if len(sortKey) < 3 {
			sortKey = "nimport"
		}
		s.bookmarkRepo.Create(title, href, nil, sortKey)
		result.Bookmarks++
	}
	return result, nil
}

func stripTags(s string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(s, "")
}
