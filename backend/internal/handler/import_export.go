package handler

import (
	"encoding/json"
	"html"
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
		internalError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ImportExportHandler) exportFolder(b *strings.Builder, parentID *string, folders map[string][]model.Folder, bookmarks map[string][]model.Bookmark) {
	for _, f := range folders[key(parentID)] {
		b.WriteString("<DT><H3>" + html.EscapeString(f.Name) + "</H3>\n")
		b.WriteString("<DL><p>\n")
		for _, bm := range bookmarks[f.ID] {
			b.WriteString("<DT><A HREF=\"" + html.EscapeString(bm.URL) + "\">" + html.EscapeString(bm.Title) + "</A>\n")
		}
		h.exportFolder(b, &f.ID, folders, bookmarks)
		b.WriteString("</DL><p>\n")
	}
}

func key(pid *string) string {
	if pid == nil {
		return "__root__"
	}
	return *pid
}

func (h *ImportExportHandler) Export(c *gin.Context) {
	format := c.DefaultQuery("format", "html")

	folderMap := make(map[string][]model.Folder)
	bookmarkMap := make(map[string][]model.Bookmark)
	allFolders := []model.Folder{}
	allBookmarks := []model.Bookmark{}
	var loadAll func(pid *string) error
	loadAll = func(pid *string) error {
		children, err := h.folderSvc.List(pid)
		if err != nil {
			return err
		}
		folderMap[key(pid)] = children
		allFolders = append(allFolders, children...)
		bms, err := h.bookmarkSvc.List(pid)
		if err != nil {
			return err
		}
		bookmarkMap[key(pid)] = bms
		allBookmarks = append(allBookmarks, bms...)
		for _, f := range children {
			if err := loadAll(&f.ID); err != nil {
				return err
			}
		}
		return nil
	}
	if err := loadAll(nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load data for export"})
		return
	}

	if format == "json" {
		if allFolders == nil {
			allFolders = []model.Folder{}
		}
		if allBookmarks == nil {
			allBookmarks = []model.Bookmark{}
		}
		data := gin.H{"folders": allFolders, "bookmarks": allBookmarks}
		j, err := json.Marshal(data)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to marshal export data"})
			return
		}
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

	// Export root bookmarks
	for _, bm := range bookmarkMap["__root__"] {
		b.WriteString("<DT><A HREF=\"" + html.EscapeString(bm.URL) + "\">" + html.EscapeString(bm.Title) + "</A>\n")
	}

	// Export folder tree recursively
	h.exportFolder(&b, nil, folderMap, bookmarkMap)

	b.WriteString("</DL><p>\n")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}
