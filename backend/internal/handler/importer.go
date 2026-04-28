package handler

import (
	"cubby/internal/model"
	"io"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/net/html"
)

type folderDef struct {
	Name     string
	ParentID *string
	ID       string
}

func parseBookmarkHTML(r io.Reader) ([]model.Bookmark, []folderDef, error) {
	doc, err := html.Parse(r)
	if err != nil {
		return nil, nil, err
	}
	state := &importState{}
	walkHTML(doc, state)
	return state.bookmarks, state.folders, nil
}

type importState struct {
	depth      int
	folderPath []string
	bookmarks  []model.Bookmark
	folders    []folderDef
}

func walkHTML(n *html.Node, state *importState) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "dl":
			state.depth++
		case "h3":
			if n.FirstChild != nil && state.depth <= 2 {
				name := extractText(n)
				if name != "" {
					folderID := uuid.New().String()
					var parentID *string
					if len(state.folderPath) > 0 {
						pid := state.folderPath[len(state.folderPath)-1]
						parentID = &pid
					}
					state.folders = append(state.folders, folderDef{
						Name: name, ParentID: parentID, ID: folderID,
					})
					state.folderPath = append(state.folderPath, folderID)
				}
			}
		case "a":
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					title := extractText(n)
					if title == "" {
						title = attr.Val
					}
					var folderID *string
					if len(state.folderPath) > 0 {
						fid := state.folderPath[len(state.folderPath)-1]
						folderID = &fid
					}
					state.bookmarks = append(state.bookmarks, model.Bookmark{
						ID:        uuid.New().String(),
						Title:     title,
						URL:       attr.Val,
						FolderID:  folderID,
						SortOrder: len(state.bookmarks),
					})
					break
				}
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walkHTML(c, state)
	}

	if n.Type == html.ElementNode && n.Data == "dl" {
		state.depth--
		if state.depth < len(state.folderPath) {
			state.folderPath = state.folderPath[:state.depth]
		}
	}
}

func extractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return strings.TrimSpace(n.Data)
	}
	var parts []string
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parts = append(parts, extractText(c))
	}
	return strings.TrimSpace(strings.Join(parts, " "))
}
