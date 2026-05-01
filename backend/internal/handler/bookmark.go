package handler

import (
	"net/http"

	"cubby/internal/model"
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
	b, err := h.svc.Create(req.Title, req.URL, req.FolderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
	b, err := h.svc.Update(c.Param("id"), req.Title, req.URL, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	b, err := h.svc.Move(req.ID, req.FolderID, req.PrevID, req.NextID, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) BatchMove(c *gin.Context) {
	var req struct {
		IDs            []string `json:"ids"`
		TargetFolderID string   `json:"target_folder_id"`
		AnchorID       string   `json:"anchor_id"`
		Position       string   `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.svc.BatchMove(req.IDs, req.TargetFolderID, req.AnchorID, req.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// -- stubs for router compatibility --

func (h *BookmarkHandler) GetByID(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) ToggleFavorite(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) Reorder(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) MoveToFolder(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) BatchSetFavorite(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) FetchMetadata(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) StartImport(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) StreamImport(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) FetchTitle(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}

func (h *BookmarkHandler) FetchMetadataPreview(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "not implemented"})
}
