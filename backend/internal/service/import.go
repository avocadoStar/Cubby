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

	h3Re := regexp.MustCompile(`(?i)<H3[^>]*>(.*?)</H3>`)
	aRe := regexp.MustCompile(`(?i)<A[^>]*HREF="([^"]*)"[^>]*>(.*?)</A>`)
	dlEndRe := regexp.MustCompile(`(?i)</DL>`)

	lines := strings.Split(text, "\n")
	for _, line := range lines {
		// Check for folder name <H3>Name</H3>
		if h3Match := h3Re.FindStringSubmatch(line); h3Match != nil {
			name := stripTags(strings.TrimSpace(h3Match[1]))
			if name == "" || name == "Bookmarks" {
				continue // skip root level title
			}

			var parentID *string
			if len(folderStack) > 0 {
				parentID = &folderStack[len(folderStack)-1]
			}

			// Generate a stable sort key based on folder position
			sortKey := "n" + name[:min(len(name), 8)]

			folder, err := s.folderRepo.Create(name, parentID, sortKey)
			if err == nil {
				folderStack = append(folderStack, folder.ID)
				result.Folders++
			}
			continue
		}

		// Check for bookmark <A HREF="url">Title</A>
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

			sortKey := "n" + href[min(len(href), 4):min(len(href), 12)]
			if len(sortKey) < 3 {
				sortKey = "nimport"
			}

			s.bookmarkRepo.Create(title, href, folderID, sortKey)
			result.Bookmarks++
			continue
		}

		// Check for folder close </DL> → pop stack
		if dlEndRe.MatchString(line) && len(folderStack) > 0 {
			folderStack = folderStack[:len(folderStack)-1]
		}
	}

	return result, nil
}

func stripTags(s string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(s, "")
}
