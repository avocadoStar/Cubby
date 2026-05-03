package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"cubby/internal/model"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type ImportExportHandler struct {
	importSvc   *service.ImportService
	folderSvc   *service.FolderService
	bookmarkSvc *service.BookmarkService
}

func NewImportExportHandler(is *service.ImportService, fs *service.FolderService, bs *service.BookmarkService) *ImportExportHandler {
	return &ImportExportHandler{importSvc: is, folderSvc: fs, bookmarkSvc: bs}
}

func (h *ImportExportHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	result, err := h.importSvc.ImportHTML(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ImportExportHandler) exportFolder(b *strings.Builder, parentID *string, folders map[string][]model.Folder, bookmarks map[string][]model.Bookmark) {
	for _, f := range folders[key(parentID)] {
		b.WriteString("<DT><H3>" + escapeHTML(f.Name) + "</H3>\n")
		b.WriteString("<DL><p>\n")
		// Bookmarks in this folder
		for _, bm := range bookmarks[f.ID] {
			b.WriteString("<DT><A HREF=\"" + escapeHTML(bm.URL) + "\">" + escapeHTML(bm.Title) + "</A>\n")
		}
		// Recursively export sub-folders
		h.exportFolder(b, &f.ID, folders, bookmarks)
		b.WriteString("</DL><p>\n")
	}
}

func key(pid *string) string {
	if pid == nil { return "__root__" }
	return *pid
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}

func (h *ImportExportHandler) Export(c *gin.Context) {
	format := c.DefaultQuery("format", "html")

	if format == "json" {
		folders, _ := h.folderSvc.List(nil)
		bookmarks, _ := h.bookmarkSvc.List(nil)
		if folders == nil { folders = []model.Folder{} }
		if bookmarks == nil { bookmarks = []model.Bookmark{} }
		data := gin.H{"folders": folders, "bookmarks": bookmarks}
		j, _ := json.Marshal(data)
		c.Data(http.StatusOK, "application/json", j)
		return
	}

	// HTML export (Netscape Bookmark File Format — Chrome/Edge compatible)
	var b strings.Builder
	b.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	b.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	b.WriteString("<TITLE>Bookmarks</TITLE>\n")
	b.WriteString("<H1>Bookmarks</H1>\n")
	b.WriteString("<DL><p>\n")

	// Build folder tree
	folderMap := make(map[string][]model.Folder)
	allFolders, _ := h.folderSvc.List(nil)
	var loadAll func(pid *string)
	loadAll = func(pid *string) {
		children, _ := h.folderSvc.List(pid)
		folderMap[key(pid)] = children
		for _, f := range children {
			loadAll(&f.ID)
		}
	}
	loadAll(nil)
	_ = allFolders

	// Build bookmark map by folder
	bookmarkMap := make(map[string][]model.Bookmark)
	allBMs, _ := h.bookmarkSvc.List(nil)
	var loadBMs func(pid *string)
	loadBMs = func(pid *string) {
		bms, _ := h.bookmarkSvc.List(pid)
		bookmarkMap[key(pid)] = bms
		for _, f := range folderMap[key(pid)] {
			loadBMs(&f.ID)
		}
	}
	loadBMs(nil)
	_ = allBMs

	// Export root bookmarks
	for _, bm := range bookmarkMap["__root__"] {
		b.WriteString("<DT><A HREF=\"" + escapeHTML(bm.URL) + "\">" + escapeHTML(bm.Title) + "</A>\n")
	}

	// Export folder tree recursively
	h.exportFolder(&b, nil, folderMap, bookmarkMap)

	b.WriteString("</DL><p>\n")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}
