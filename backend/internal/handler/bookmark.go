package handler

import (
	"bytes"
	"cubby/internal/metadata"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BookmarkHandler struct {
	fRepo      *repository.FolderRepo
	faviconDir string
	imports    *ImportTaskManager
	repo       *repository.BookmarkRepo
}

func NewBookmarkHandler(repo *repository.BookmarkRepo, fRepo *repository.FolderRepo, faviconDir string) *BookmarkHandler {
	return &BookmarkHandler{
		fRepo:      fRepo,
		faviconDir: faviconDir,
		imports:    NewImportTaskManager(),
		repo:       repo,
	}
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
	bookmark, err := h.repo.GetByID(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if bookmark == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, bookmark)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req struct {
		Title      string  `json:"title"`
		URL        string  `json:"url" binding:"required"`
		Desc       string  `json:"description"`
		FolderID   *string `json:"folder_id"`
		IsFavorite bool    `json:"is_favorite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 不能为空", "code": "INVALID_REQUEST"})
		return
	}

	normalizedURL, err := metadata.NormalizeURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL", "code": "INVALID_URL"})
		return
	}
	req.URL = normalizedURL

	autoTitle := strings.TrimSpace(req.Title) == ""
	if autoTitle {
		req.Title = req.URL
	}

	bookmark := &model.Bookmark{
		ID:          uuid.NewString(),
		Title:       req.Title,
		URL:         req.URL,
		Description: req.Desc,
		FolderID:    req.FolderID,
		IsFavorite:  req.IsFavorite,
		SortOrder:   999,
	}

	if err := h.repo.Create(bookmark); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			c.JSON(http.StatusConflict, gin.H{"error": "该 URL 已存在", "code": "DUPLICATE_URL"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	h.refreshMetadata(bookmark, repository.MetadataUpdateOptions{ForceTitle: autoTitle})

	saved, _ := h.repo.GetByID(bookmark.ID)
	if saved != nil {
		c.JSON(http.StatusCreated, saved)
		return
	}

	c.JSON(http.StatusCreated, bookmark)
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	id := c.Param("id")
	bookmark, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if bookmark == nil {
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

	normalizedURL := ""
	if req.URL != "" {
		normalizedURL, err = metadata.NormalizeURL(req.URL)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL", "code": "INVALID_URL"})
			return
		}
	}

	urlChanged := normalizedURL != "" && normalizedURL != bookmark.URL

	if req.Title != "" {
		bookmark.Title = req.Title
	}
	if normalizedURL != "" {
		bookmark.URL = normalizedURL
	}
	if req.Description != "" {
		bookmark.Description = req.Description
	}
	if req.FolderID != nil {
		bookmark.FolderID = req.FolderID
	}
	if req.IsFavorite != nil {
		bookmark.IsFavorite = *req.IsFavorite
	}

	if urlChanged {
		bookmark.FaviconURL = ""
		bookmark.MetadataFetched = false
		bookmark.ThumbnailURL = ""
	}

	if err := h.repo.Update(bookmark); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	if urlChanged {
		h.refreshMetadata(bookmark, repository.MetadataUpdateOptions{ForceTitle: true})
	}

	updated, _ := h.repo.GetByID(id)
	if updated != nil {
		c.JSON(http.StatusOK, updated)
		return
	}

	c.JSON(http.StatusOK, bookmark)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.repo.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) ToggleFavorite(c *gin.Context) {
	favorite, err := h.repo.ToggleFavorite(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_favorite": favorite})
}

func (h *BookmarkHandler) BatchDelete(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids 不能为空", "code": "INVALID_REQUEST"})
		return
	}

	if err := h.repo.BatchDelete(req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) BatchMove(c *gin.Context) {
	var req struct {
		FolderID *string  `json:"folder_id"`
		IDs      []string `json:"ids" binding:"required"`
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

	if err := h.repo.BatchMove(req.IDs, req.FolderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) BatchSetFavorite(c *gin.Context) {
	var req struct {
		IDs        []string `json:"ids" binding:"required"`
		IsFavorite bool     `json:"is_favorite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}

	if err := h.repo.BatchSetFavorite(req.IDs, req.IsFavorite); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
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
	bookmark, err := h.repo.GetByID(c.Param("id"))
	if err != nil || bookmark == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}

	normalizedURL, err := metadata.NormalizeURL(bookmark.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL", "code": "INVALID_URL"})
		return
	}
	bookmark.URL = normalizedURL

	h.refreshMetadata(bookmark, repository.MetadataUpdateOptions{ForceDescription: true, ForceTitle: true})

	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "元数据已刷新"})
}

func (h *BookmarkHandler) StartImport(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件", "code": "INVALID_REQUEST"})
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "文件读取失败", "code": "READ_ERROR"})
		return
	}

	task := h.imports.CreateTask()
	h.imports.Update(task.TaskID, func(snapshot *importTaskSnapshot) {
		snapshot.Message = "文件已接收"
		snapshot.Progress = 5
		snapshot.Stage = importTaskStageFileReceived
		snapshot.Status = importTaskStatusRunning
	})

	go h.runImportTask(task.TaskID, data)

	c.JSON(http.StatusAccepted, gin.H{
		"message":  "文件已接收",
		"progress": 5,
		"stage":    importTaskStageFileReceived,
		"status":   importTaskStatusRunning,
		"task_id":  task.TaskID,
	})
}

func (h *BookmarkHandler) StreamImport(c *gin.Context) {
	updates, cancel, ok := h.imports.Subscribe(c.Param("taskID"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "导入任务不存在", "code": "NOT_FOUND"})
		return
	}
	defer cancel()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprint(c.Writer, ": ping\n\n")
			c.Writer.Flush()
		case snapshot, open := <-updates:
			if !open {
				return
			}
			if err := writeImportEvent(c, snapshot); err != nil {
				return
			}
			if snapshot.Status == importTaskStatusCompleted || snapshot.Status == importTaskStatusFailed {
				return
			}
		}
	}
}

func (h *BookmarkHandler) FetchTitle(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 不能为空"})
		return
	}

	normalizedURL, err := metadata.NormalizeURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL", "code": "INVALID_URL"})
		return
	}

	title, err := metadata.FetchTitle(normalizedURL)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"title": ""})
		return
	}

	c.JSON(http.StatusOK, gin.H{"title": title})
}

func (h *BookmarkHandler) FetchMetadataPreview(c *gin.Context) {
	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 涓嶈兘涓虹┖", "code": "INVALID_REQUEST"})
		return
	}

	normalizedURL, err := metadata.NormalizeURL(req.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL", "code": "INVALID_URL"})
		return
	}

	pageMetadata, err := metadata.FetchPageMetadata(normalizedURL)
	if err != nil || pageMetadata == nil {
		c.JSON(http.StatusOK, gin.H{"url": normalizedURL, "title": "", "description": ""})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":         normalizedURL,
		"title":       pageMetadata.Title,
		"description": pageMetadata.Description,
	})
}

func (h *BookmarkHandler) refreshMetadata(bookmark *model.Bookmark, options repository.MetadataUpdateOptions) {
	normalizedURL, err := metadata.NormalizeURL(bookmark.URL)
	if err != nil {
		return
	}
	bookmark.URL = normalizedURL

	var (
		description  string
		faviconURL   string
		thumbnailURL string
		title        string
	)

	pageMetadata, metadataErr := metadata.FetchPageMetadata(normalizedURL)
	if metadataErr == nil && pageMetadata != nil {
		description = pageMetadata.Description
		thumbnailURL = pageMetadata.OGImage
		title = pageMetadata.Title
	}

	downloadedFavicon, faviconErr := metadata.DownloadFavicon(normalizedURL, h.faviconDir)
	if faviconErr == nil {
		faviconURL = downloadedFavicon
	}

	if metadataErr != nil && faviconErr != nil {
		return
	}

	_ = h.repo.UpdateMetadata(
		bookmark.ID,
		title,
		description,
		faviconURL,
		thumbnailURL,
		options,
	)
}

func (h *BookmarkHandler) runImportTask(taskID string, data []byte) {
	h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
		snapshot.Message = "正在解析书签"
		snapshot.Progress = 12
		snapshot.Stage = importTaskStageParsing
		snapshot.Status = importTaskStatusRunning
	})

	bookmarks, folders, err := parseBookmarkHTML(bytes.NewReader(data))
	if err != nil {
		h.failImportTask(taskID, "文件解析失败: "+err.Error())
		return
	}

	const (
		parseProgress       = 20
		folderEndProgress   = 42
		bookmarkEndProgress = 95
	)

	h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
		snapshot.Message = "正在创建文件夹"
		snapshot.Progress = parseProgress
		snapshot.Stage = importTaskStageCreatingFolders
		snapshot.Status = importTaskStatusRunning
	})

	folderNames := make([]string, 0, len(folders))
	for index, folder := range folders {
		if err := h.fRepo.Create(&model.Folder{
			ID:        folder.ID,
			Name:      folder.Name,
			ParentID:  folder.ParentID,
			SortOrder: len(folderNames),
		}); err == nil {
			folderNames = append(folderNames, folder.Name)
		}

		progress := folderEndProgress
		if len(folders) > 0 {
			progress = parseProgress + ((index + 1) * (folderEndProgress - parseProgress) / len(folders))
		}

		currentIndex := index + 1
		h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
			snapshot.Message = fmt.Sprintf("正在创建文件夹 %d/%d", currentIndex, len(folders))
			snapshot.Progress = progress
			snapshot.Stage = importTaskStageCreatingFolders
			snapshot.Status = importTaskStatusRunning
		})
	}

	totalBookmarks := len(bookmarks)
	if totalBookmarks == 0 {
		h.completeImportTask(taskID, 0, 0, folderNames)
		return
	}

	h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
		snapshot.Message = "正在写入书签"
		snapshot.Progress = folderEndProgress
		snapshot.Stage = importTaskStageImportingEntries
		snapshot.Status = importTaskStatusRunning
	})

	created := 0
	skipped := 0
	for index := range bookmarks {
		inserted, err := h.repo.CreateIfNotExists(&bookmarks[index])
		if err != nil {
			h.failImportTask(taskID, err.Error())
			return
		}
		if inserted {
			created++
		} else {
			skipped++
		}

		progress := folderEndProgress + ((index + 1) * (bookmarkEndProgress - folderEndProgress) / totalBookmarks)
		currentIndex := index + 1
		h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
			snapshot.Message = fmt.Sprintf("正在写入书签 %d/%d", currentIndex, totalBookmarks)
			snapshot.Progress = progress
			snapshot.Stage = importTaskStageImportingEntries
			snapshot.Status = importTaskStatusRunning
		})
	}

	h.completeImportTask(taskID, created, skipped, folderNames)
}

func (h *BookmarkHandler) completeImportTask(taskID string, created int, skipped int, folderNames []string) {
	h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
		snapshot.Message = "导入完成"
		snapshot.Progress = 100
		snapshot.Result = &importTaskResult{
			Created:        created,
			FoldersCreated: folderNames,
			Skipped:        skipped,
		}
		snapshot.Stage = importTaskStageCompleted
		snapshot.Status = importTaskStatusCompleted
	})
}

func (h *BookmarkHandler) failImportTask(taskID string, message string) {
	h.imports.Update(taskID, func(snapshot *importTaskSnapshot) {
		snapshot.Error = message
		snapshot.Message = "导入失败"
		snapshot.Stage = importTaskStageFailed
		snapshot.Status = importTaskStatusFailed
	})
}

func writeImportEvent(c *gin.Context, snapshot importTaskSnapshot) error {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(c.Writer, "data: %s\n\n", payload); err != nil {
		return err
	}
	c.Writer.Flush()
	return nil
}
