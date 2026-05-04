package service

import (
	"cubby/internal/repository"
	"fmt"
	"io"
	"net/url"
	"regexp"
	"strings"
)

var stripTagsRe = regexp.MustCompile(`<[^>]*>`)
var h3Re = regexp.MustCompile(`(?i)<H3[^>]*>(.*?)</H3>`)
var aRe = regexp.MustCompile(`(?i)<A[^>]*HREF="([^"]*)"[^>]*>(.*?)</A>`)
var dlEndRe = regexp.MustCompile(`(?i)</DL>`)

type ImportService struct {
	folderRepo   repository.FolderRepo
	bookmarkRepo repository.BookmarkRepo
}

func NewImportService(fr repository.FolderRepo, br repository.BookmarkRepo) *ImportService {
	return &ImportService{folderRepo: fr, bookmarkRepo: br}
}

type ImportResult struct {
	Bookmarks    int    `json:"bookmarks"`
	Folders      int    `json:"folders"`
	Errors       int    `json:"errors"`
	ErrorMessage string `json:"error_message,omitempty"`
}

// ImportHTML parses a Netscape-format bookmark HTML file.
// It uses line-by-line scanning with a stack to track folder nesting
// (<DT><H3> → push, </DL> → pop, <A> → create bookmark in current folder).
func (s *ImportService) ImportHTML(reader io.Reader) (*ImportResult, error) {
	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	text := string(content)
	result := &ImportResult{}

	var folderStack []string // stack of folder IDs, top = current folder

	// Track last sort key per parent scope to generate sequential LexoRank keys
	nextFolderSortKey := make(map[string]string)
	nextBookmarkSortKey := make(map[string]string)
	scopeKey := func(parentID *string) string {
		if parentID == nil {
			return "__root__"
		}
		return *parentID
	}

	lines := strings.Split(text, "\n")
	for _, line := range lines {
		if h3Match := h3Re.FindStringSubmatch(line); h3Match != nil {
			name := stripTags(strings.TrimSpace(h3Match[1]))
			if name == "" || name == "Bookmarks" {
				continue
			}

			var parentID *string
			if len(folderStack) > 0 {
				parentID = &folderStack[len(folderStack)-1]
			}

			sk := scopeKey(parentID)
			lastKey := nextFolderSortKey[sk]
			sortKey := after(lastKey)
			nextFolderSortKey[sk] = sortKey

			folder, err := s.folderRepo.Create(name, parentID, sortKey)
			if err != nil {
				result.Errors++
				continue
			}
			folderStack = append(folderStack, folder.ID)
			result.Folders++
			continue
		}

		if aMatch := aRe.FindStringSubmatch(line); aMatch != nil {
			href := strings.TrimSpace(aMatch[1])
			title := stripTags(strings.TrimSpace(aMatch[2]))
			if title == "" {
				title = href
			}
			if _, parseErr := url.Parse(href); parseErr != nil {
				continue
			}

			var folderID *string
			if len(folderStack) > 0 {
				folderID = &folderStack[len(folderStack)-1]
			}

			sk := scopeKey(folderID)
			lastKey := nextBookmarkSortKey[sk]
			sortKey := after(lastKey)
			nextBookmarkSortKey[sk] = sortKey

			_, err := s.bookmarkRepo.Create(title, href, folderID, sortKey)
			if err != nil {
				result.Errors++
				continue
			}
			result.Bookmarks++
			continue
		}

		if dlEndRe.MatchString(line) && len(folderStack) > 0 {
			folderStack = folderStack[:len(folderStack)-1]
		}
	}

	if result.Errors > 0 {
		result.ErrorMessage = fmt.Sprintf("%d items skipped due to errors", result.Errors)
	}

	return result, nil
}

func stripTags(s string) string {
	return stripTagsRe.ReplaceAllString(s, "")
}
