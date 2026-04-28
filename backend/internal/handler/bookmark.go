package handler

import (
	"cubby/internal/metadata"
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BookmarkHandler struct {
	repo  *repository.BookmarkRepo
	fRepo *repository.FolderRepo
}

func NewBookmarkHandler(repo *repository.BookmarkRepo, fRepo *repository.FolderRepo) *BookmarkHandler {
	return &BookmarkHandler{repo: repo, fRepo: fRepo}
}

func (h *BookmarkHandler) List(c *gin.Context) {
	q := repository.BookmarkQuery{
		FolderID: c.DefaultQuery("folder_id", "all"),
		Q:        c.Query("q"),
		Favorite: c.Query("favorite") == "true",
		Unsorted: c.Query("unsorted") == "true",
		Recent:   c.Query("recent") == "true",
		Page:     parseIntDefault(c.DefaultQuery("page", "1"), 1),
		PageSize: parseIntDefault(c.DefaultQuery("page_size", "50"), 50),
	}
	result, err := h.repo.List(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if result.Items == nil {
		result.Items = []model.Bookmark{}
	}
	c.JSON(http.StatusOK, result)
}

func (h *BookmarkHandler) GetByID(c *gin.Context) {
	b, err := h.repo.GetByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req struct {
		Title    string  `json:"title"`
		URL      string  `json:"url" binding:"required"`
		Desc     string  `json:"description"`
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if req.Title == "" {
		req.Title = req.URL
	}
	b := &model.Bookmark{
		ID:          uuid.New().String(),
		Title:       req.Title,
		URL:         req.URL,
		Description: req.Desc,
		FolderID:    req.FolderID,
		SortOrder:   999,
	}
	if err := h.repo.Create(b); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			c.JSON(http.StatusConflict, gin.H{"error": "该 URL 已存在", "code": "DUPLICATE_URL"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	go func() {
		meta, err := metadata.Fetch(b.URL)
		if err != nil {
			return
		}
		h.repo.UpdateMetadata(b.ID, meta.Title, meta.Description, meta.FaviconURL, meta.OGImage)
	}()
	// Return fresh DB value with correct timestamps
	saved, _ := h.repo.GetByID(b.ID)
	if saved != nil {
		c.JSON(http.StatusCreated, saved)
	} else {
		c.JSON(http.StatusCreated, b)
	}
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	id := c.Param("id")
	b, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	var req struct {
		Title       string  `json:"title"`
		URL         string  `json:"url"`
		Description string  `json:"description"`
		FolderID    *string `json:"folder_id"`
		IsFavorite  *bool   `json:"is_favorite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}
	if req.Title != "" {
		b.Title = req.Title
	}
	if req.URL != "" {
		b.URL = req.URL
	}
	if req.Description != "" {
		b.Description = req.Description
	}
	if req.FolderID != nil {
		b.FolderID = req.FolderID
	}
	if req.IsFavorite != nil {
		b.IsFavorite = *req.IsFavorite
	}
	if err := h.repo.Update(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	// Return fresh DB value
	updated, _ := h.repo.GetByID(id)
	if updated != nil {
		c.JSON(http.StatusOK, updated)
	} else {
		c.JSON(http.StatusOK, b)
	}
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.repo.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) ToggleFavorite(c *gin.Context) {
	fav, err := h.repo.ToggleFavorite(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_favorite": fav})
}

func (h *BookmarkHandler) Reorder(c *gin.Context) {
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

func (h *BookmarkHandler) MoveToFolder(c *gin.Context) {
	var req struct {
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}
	if req.FolderID != nil {
		exists, err := h.fRepo.Exists(*req.FolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "文件夹不存在", "code": "FOLDER_NOT_FOUND"})
			return
		}
	}
	if err := h.repo.MoveToFolder(c.Param("id"), req.FolderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) FetchMetadata(c *gin.Context) {
	id := c.Param("id")
	b, err := h.repo.GetByID(id)
	if err != nil || b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	go func() {
		meta, err := metadata.Fetch(b.URL)
		if err != nil {
			return
		}
		h.repo.UpdateMetadata(id, meta.Title, meta.Description, meta.FaviconURL, meta.OGImage)
	}()
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "元数据抓取已开始"})
}

func (h *BookmarkHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件", "code": "INVALID_REQUEST"})
		return
	}
	defer file.Close()

	bookmarks, folders, err := parseBookmarkHTML(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件解析失败: " + err.Error(), "code": "PARSE_ERROR"})
		return
	}

	var folderNames []string
	for _, f := range folders {
		if err := h.fRepo.Create(&model.Folder{
			ID:        f.ID,
			Name:      f.Name,
			ParentID:  f.ParentID,
			SortOrder: len(folderNames),
		}); err != nil {
			continue
		}
		folderNames = append(folderNames, f.Name)
	}

	created, skipped, err := h.repo.BulkCreate(bookmarks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"created":         created,
		"skipped":         skipped,
		"folders_created": folderNames,
	})
}

func (h *BookmarkHandler) FetchTitle(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 不能为空"})
		return
	}
	meta, err := metadata.Fetch(req.URL)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"title": ""})
		return
	}
	c.JSON(http.StatusOK, gin.H{"title": meta.Title})
}
