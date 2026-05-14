package service

import (
	"encoding/json"
	"html"
	"strings"

	"cubby/internal/model"
)

type ExportResult struct {
	Data        []byte
	ContentType string
}

type ExportService struct {
	folderSvc   *FolderService
	bookmarkSvc *BookmarkService
}

type exportTree struct {
	folderMap    map[string][]model.Folder
	bookmarkMap  map[string][]model.Bookmark
	allFolders   []model.Folder
	allBookmarks []model.Bookmark
}

func NewExportService(folderSvc *FolderService, bookmarkSvc *BookmarkService) *ExportService {
	return &ExportService{folderSvc: folderSvc, bookmarkSvc: bookmarkSvc}
}

func (s *ExportService) Export(format string) (*ExportResult, error) {
	tree, err := s.loadExportTree()
	if err != nil {
		return nil, err
	}

	if format == "json" {
		return renderJSONExport(tree)
	}

	return renderHTMLExport(tree), nil
}

func (s *ExportService) loadExportTree() (*exportTree, error) {
	tree := &exportTree{
		folderMap:   make(map[string][]model.Folder),
		bookmarkMap: make(map[string][]model.Bookmark),
	}
	if err := s.loadExportScope(tree, nil); err != nil {
		return nil, err
	}
	return tree, nil
}

func (s *ExportService) loadExportScope(tree *exportTree, pid *string) error {
	children, err := s.folderSvc.List(pid)
	if err != nil {
		return err
	}
	tree.folderMap[exportKey(pid)] = children
	tree.allFolders = append(tree.allFolders, children...)

	bookmarks, err := s.bookmarkSvc.List(pid)
	if err != nil {
		return err
	}
	tree.bookmarkMap[exportKey(pid)] = bookmarks
	tree.allBookmarks = append(tree.allBookmarks, bookmarks...)

	for _, folder := range children {
		if err := s.loadExportScope(tree, &folder.ID); err != nil {
			return err
		}
	}
	return nil
}

func renderJSONExport(tree *exportTree) (*ExportResult, error) {
	folders := tree.allFolders
	if folders == nil {
		folders = []model.Folder{}
	}
	bookmarks := tree.allBookmarks
	if bookmarks == nil {
		bookmarks = []model.Bookmark{}
	}
	data, err := json.Marshal(map[string]any{"folders": folders, "bookmarks": bookmarks})
	if err != nil {
		return nil, err
	}
	return &ExportResult{Data: data, ContentType: "application/json"}, nil
}

func renderHTMLExport(tree *exportTree) *ExportResult {
	// HTML export (Netscape Bookmark File Format)
	var b strings.Builder
	b.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	b.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	b.WriteString("<TITLE>Bookmarks</TITLE>\n")
	b.WriteString("<H1>Bookmarks</H1>\n")
	b.WriteString("<DL><p>\n")

	for _, bm := range tree.bookmarkMap["__root__"] {
		writeBookmarkHTML(&b, bm)
	}
	exportFolder(&b, nil, tree.folderMap, tree.bookmarkMap)

	b.WriteString("</DL><p>\n")
	return &ExportResult{Data: []byte(b.String()), ContentType: "text/html; charset=utf-8"}
}

func exportFolder(b *strings.Builder, parentID *string, folders map[string][]model.Folder, bookmarks map[string][]model.Bookmark) {
	for _, f := range folders[exportKey(parentID)] {
		b.WriteString("<DT><H3>" + html.EscapeString(f.Name) + "</H3>\n")
		b.WriteString("<DL><p>\n")
		for _, bm := range bookmarks[f.ID] {
			writeBookmarkHTML(b, bm)
		}
		exportFolder(b, &f.ID, folders, bookmarks)
		b.WriteString("</DL><p>\n")
	}
}

func writeBookmarkHTML(b *strings.Builder, bm model.Bookmark) {
	b.WriteString("<DT><A HREF=\"" + html.EscapeString(bm.URL) + "\"")
	if bm.Icon != "" {
		b.WriteString(" ICON=\"" + html.EscapeString(bm.Icon) + "\"")
	}
	b.WriteString(">" + html.EscapeString(bm.Title) + "</A>\n")
}

func exportKey(pid *string) string {
	if pid == nil {
		return "__root__"
	}
	return *pid
}
