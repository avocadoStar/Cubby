package handler

import (
	"errors"
	"net/http"
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
		Icon     string  `json:"icon"`
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "invalid request")
		return
	}
	if req.Title == "" || req.URL == "" {
		badRequest(c, "title and url required")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.URL = strings.TrimSpace(req.URL)

	if len(req.Title) > maxTitleLength {
		badRequest(c, "title exceeds maximum length of 500 characters")
		return
	}

	validatedURL, errMsg, ok := validateURL(req.URL)
	if !ok {
		badRequest(c, errMsg)
		return
	}
	req.URL = validatedURL

	b, err := h.svc.Create(req.Title, req.URL, req.FolderID, req.Icon)
	if err != nil {
		if errors.Is(err, service.ErrBookmarkExists) {
			conflictError(c, "已存在")
			return
		}
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
		badRequest(c, "invalid request")
		return
	}
	if req.Title == "" || req.URL == "" {
		badRequest(c, "title and url required")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.URL = strings.TrimSpace(req.URL)

	if len(req.Title) > maxTitleLength {
		badRequest(c, "title exceeds maximum length of 500 characters")
		return
	}

	validatedURL, errMsg, ok := validateURL(req.URL)
	if !ok {
		badRequest(c, errMsg)
		return
	}
	req.URL = validatedURL

	b, err := h.svc.Update(c.Param("id"), req.Title, req.URL, req.Version)
	if err != nil {
		conflictError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) Restore(c *gin.Context) {
	b, err := h.svc.Restore(c.Param("id"))
	if err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) UpdateNotes(c *gin.Context) {
	var req struct {
		Notes string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "invalid request")
		return
	}
	if err := h.svc.UpdateNotes(c.Param("id"), req.Notes); err != nil {
		notFoundOrInternal(c, err)
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
		Version  int     `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "invalid request")
		return
	}
	b, err := h.svc.Move(req.ID, req.FolderID, req.PrevID, req.NextID, nil, req.Version)
	if err != nil {
		conflictError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) BatchDelete(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "invalid request")
		return
	}
	if err := h.svc.BatchDelete(req.IDs); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
