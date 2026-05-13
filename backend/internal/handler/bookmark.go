package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
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
	jsonList(c, bookmarks)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	req, ok := bindJSON[createBookmarkRequest](c)
	if !ok {
		return
	}
	if req.Title == "" || req.URL == "" {
		badRequest(c, "title and url required")
		return
	}

	b, err := h.svc.Create(req.Title, req.URL, req.FolderID, req.Icon)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	req, ok := bindJSON[updateBookmarkRequest](c)
	if !ok {
		return
	}
	if req.Title == "" || req.URL == "" {
		badRequest(c, "title and url required")
		return
	}

	b, err := h.svc.Update(c.Param("id"), req.Title, req.URL, req.Version)
	if err != nil {
		handleServiceError(c, err)
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
	req, ok := bindJSON[updateNotesRequest](c)
	if !ok {
		return
	}
	if err := h.svc.UpdateNotes(c.Param("id"), req.Notes); err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) Move(c *gin.Context) {
	req, ok := bindJSON[moveBookmarkRequest](c)
	if !ok {
		return
	}
	b, err := h.svc.Move(req.ID, req.FolderID, req.PrevID, req.NextID, nil, req.Version)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) BatchDelete(c *gin.Context) {
	req, ok := bindJSON[batchDeleteRequest](c)
	if !ok {
		return
	}
	if err := h.svc.BatchDelete(req.IDs); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
