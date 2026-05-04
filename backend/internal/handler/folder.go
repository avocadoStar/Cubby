package handler

import (
	"net/http"
	"strings"

	"cubby/internal/model"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type FolderHandler struct {
	svc *service.FolderService
}

func NewFolderHandler(svc *service.FolderService) *FolderHandler {
	return &FolderHandler{svc: svc}
}

func (h *FolderHandler) List(c *gin.Context) {
	parentID := c.Query("parent_id")
	var pid *string
	if parentID != "" {
		pid = &parentID
	}
	folders, err := h.svc.List(pid)
	if err != nil {
		internalError(c, err)
		return
	}
	if folders == nil {
		folders = []model.Folder{}
	}
	c.JSON(http.StatusOK, folders)
}

func (h *FolderHandler) Create(c *gin.Context) {
	var req struct {
		Name     string  `json:"name"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) > maxNameLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name exceeds maximum length of 200 characters"})
		return
	}

	f, err := h.svc.Create(req.Name, req.ParentID)
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusCreated, f)
}

func (h *FolderHandler) Update(c *gin.Context) {
	var req struct {
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name required"})
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if len(req.Name) > maxNameLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name exceeds maximum length of 200 characters"})
		return
	}

	f, err := h.svc.Update(c.Param("id"), req.Name, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "conflict"})
		return
	}
	c.JSON(http.StatusOK, f)
}

func (h *FolderHandler) Delete(c *gin.Context) {
	if err := h.svc.Delete(c.Param("id")); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *FolderHandler) Restore(c *gin.Context) {
	f, err := h.svc.Restore(c.Param("id"))
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusOK, f)
}

func (h *FolderHandler) BatchDelete(c *gin.Context) {
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

func (h *FolderHandler) Move(c *gin.Context) {
	var req struct {
		ID       string  `json:"id"`
		ParentID *string `json:"parent_id"`
		PrevID   *string `json:"prev_id"`
		NextID   *string `json:"next_id"`
		SortKey  *string `json:"sort_key"`
		Version  int     `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	f, err := h.svc.Move(req.ID, req.ParentID, req.PrevID, req.NextID, req.SortKey, req.Version)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, f)
}
