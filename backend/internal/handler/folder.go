package handler

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FolderHandler struct {
	repo *repository.FolderRepo
}

func NewFolderHandler(repo *repository.FolderRepo) *FolderHandler {
	return &FolderHandler{repo: repo}
}

func (h *FolderHandler) GetTree(c *gin.Context) {
	tree, err := h.repo.GetTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if tree == nil {
		tree = []repository.FolderTree{}
	}
	c.JSON(http.StatusOK, tree)
}

func (h *FolderHandler) Create(c *gin.Context) {
	var req struct {
		Name     string  `json:"name" binding:"required"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "名称不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if req.ParentID != nil {
		exists, err := h.repo.Exists(*req.ParentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "父文件夹不存在", "code": "PARENT_NOT_FOUND"})
			return
		}
	}
	folder := &model.Folder{
		ID:        uuid.New().String(),
		Name:      req.Name,
		ParentID:  req.ParentID,
		SortOrder: 999,
	}
	if err := h.repo.Create(folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusCreated, folder)
}

func (h *FolderHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name      string  `json:"name" binding:"required"`
		ParentID  *string `json:"parent_id"`
		SortOrder *int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "名称不能为空", "code": "INVALID_REQUEST"})
		return
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	if err := h.repo.Update(id, req.Name, req.ParentID, sortOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *FolderHandler) Delete(c *gin.Context) {
	if err := h.repo.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *FolderHandler) Reorder(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids 不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if err := h.repo.Reorder(req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func parseIntDefault(s string, def int) int {
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return v
}
