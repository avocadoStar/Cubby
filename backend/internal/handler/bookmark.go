package handler

import (
	"net/http"
	"net/url"
	"strings"

	"cubby/internal/model"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

const (
	maxURLLength   = 2048
	maxTitleLength = 500
	maxNameLength  = 200
)

type BookmarkHandler struct {
	svc *service.BookmarkService
}

func NewBookmarkHandler(svc *service.BookmarkService) *BookmarkHandler {
	return &BookmarkHandler{svc: svc}
}

func (h *BookmarkHandler) List(c *gin.Context) {
	folderID := c.Query("folder_id")
	var fid *string
	if folderID != "" {
		fid = &folderID
	}
	bookmarks, err := h.svc.List(fid)
	if err != nil {
		internalError(c, err)
		return
	}
	if bookmarks == nil {
		bookmarks = []model.Bookmark{}
	}
	c.JSON(http.StatusOK, bookmarks)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req struct {
		Title    string  `json:"title"`
		URL      string  `json:"url"`
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Title == "" || req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and url required"})
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.URL = strings.TrimSpace(req.URL)

	if len(req.URL) > maxURLLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url exceeds maximum length of 2048 characters"})
		return
	}
	if len(req.Title) > maxTitleLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title exceeds maximum length of 500 characters"})
		return
	}

	parsed, err := url.Parse(req.URL)
	if err != nil || !parsed.IsAbs() || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url must be a valid absolute URL with http or https scheme"})
		return
	}
	req.URL = parsed.String()

	b, err := h.svc.Create(req.Title, req.URL, req.FolderID)
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	var req struct {
		Title   string `json:"title"`
		URL     string `json:"url"`
		Version int    `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Title == "" || req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title and url required"})
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.URL = strings.TrimSpace(req.URL)

	if len(req.URL) > maxURLLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url exceeds maximum length of 2048 characters"})
		return
	}
	if len(req.Title) > maxTitleLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title exceeds maximum length of 500 characters"})
		return
	}

	parsed, err := url.Parse(req.URL)
	if err != nil || !parsed.IsAbs() || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url must be a valid absolute URL with http or https scheme"})
		return
	}
	req.URL = parsed.String()

	b, err := h.svc.Update(c.Param("id"), req.Title, req.URL, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) Restore(c *gin.Context) {
	b, err := h.svc.Restore(c.Param("id"))
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) UpdateNotes(c *gin.Context) {
	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.svc.UpdateNotes(c.Param("id"), req.Notes); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) Move(c *gin.Context) {
	var req struct {
		ID       string  `json:"id"`
		FolderID *string `json:"folder_id"`
		PrevID   *string `json:"prev_id"`
		NextID   *string `json:"next_id"`
		SortKey  *string `json:"sort_key"`
		Version  int     `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	b, err := h.svc.Move(req.ID, req.FolderID, req.PrevID, req.NextID, req.SortKey, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) BatchDelete(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.svc.BatchDelete(req.IDs); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
