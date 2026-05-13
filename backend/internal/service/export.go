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

func NewExportService(folderSvc *FolderService, bookmarkSvc *BookmarkService) *ExportService {
	return &ExportService{folderSvc: folderSvc, bookmarkSvc: bookmarkSvc}
}

func (s *ExportService) Export(format string) (*ExportResult, error) {
	folderMap := make(map[string][]model.Folder)
	bookmarkMap := make(map[string][]model.Bookmark)
	var allFolders []model.Folder
	var allBookmarks []model.Bookmark

	var loadAll func(pid *string) error
	loadAll = func(pid *string) error {
		children, err := s.folderSvc.List(pid)
		if err != nil {
			return err
		}
		folderMap[exportKey(pid)] = children
		allFolders = append(allFolders, children...)
		bms, err := s.bookmarkSvc.List(pid)
		if err != nil {
			return err
		}
		bookmarkMap[exportKey(pid)] = bms
		allBookmarks = append(allBookmarks, bms...)
		for _, f := range children {
			if err := loadAll(&f.ID); err != nil {
				return err
			}
		}
		return nil
	}
	if err := loadAll(nil); err != nil {
		return nil, err
	}

	if format == "json" {
		if allFolders == nil {
			allFolders = []model.Folder{}
		}
		if allBookmarks == nil {
			allBookmarks = []model.Bookmark{}
		}
		data, err := json.Marshal(map[string]any{"folders": allFolders, "bookmarks": allBookmarks})
		if err != nil {
			return nil, err
		}
		return &ExportResult{Data: data, ContentType: "application/json"}, nil
	}

	// HTML export (Netscape Bookmark File Format)
	var b strings.Builder
	b.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	b.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	b.WriteString("<TITLE>Bookmarks</TITLE>\n")
	b.WriteString("<H1>Bookmarks</H1>\n")
	b.WriteString("<DL><p>\n")

	for _, bm := range bookmarkMap["__root__"] {
		writeBookmarkHTML(&b, bm)
	}
	exportFolder(&b, nil, folderMap, bookmarkMap)

	b.WriteString("</DL><p>\n")
	return &ExportResult{Data: []byte(b.String()), ContentType: "text/html; charset=utf-8"}, nil
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
