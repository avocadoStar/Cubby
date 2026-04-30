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

	// HTML export (Netscape Bookmark File Format)
	var b strings.Builder
	b.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n")
	b.WriteString("<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n")
	b.WriteString("<TITLE>Bookmarks</TITLE>\n")
	b.WriteString("<H1>Bookmarks</H1>\n")
	b.WriteString("<DL><p>\n")

	bookmarks, _ := h.bookmarkSvc.List(nil)
	for _, bm := range bookmarks {
		b.WriteString("<DT><A HREF=\"" + bm.URL + "\">" + bm.Title + "</A>\n")
	}

	b.WriteString("</DL><p>\n")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(b.String()))
}
