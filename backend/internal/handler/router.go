package handler

import (
	"cubby/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	folderRepo *repository.FolderRepo,
	bookmarkRepo *repository.BookmarkRepo,
	settingRepo *repository.SettingRepo,
	folderHandler *FolderHandler,
	bookmarkHandler *BookmarkHandler,
	settingHandler *SettingHandler,
	aiHandler *AIHandler,
) *gin.Engine {
	r := gin.Default()

	api := r.Group("/api/v1")
	{
		folders := api.Group("/folders")
		{
			folders.GET("", folderHandler.GetTree)
			folders.POST("", folderHandler.Create)
			folders.PUT("/:id", folderHandler.Update)
			folders.DELETE("/:id", folderHandler.Delete)
			folders.PUT("/reorder", folderHandler.Reorder)
		}

		bookmarks := api.Group("/bookmarks")
		{
			bookmarks.GET("", bookmarkHandler.List)
			bookmarks.GET("/:id", bookmarkHandler.GetByID)
			bookmarks.POST("", bookmarkHandler.Create)
			bookmarks.PUT("/:id", bookmarkHandler.Update)
			bookmarks.DELETE("/:id", bookmarkHandler.Delete)
			bookmarks.PUT("/:id/favorite", bookmarkHandler.ToggleFavorite)
			bookmarks.PUT("/reorder", bookmarkHandler.Reorder)
			bookmarks.PUT("/:id/folder", bookmarkHandler.MoveToFolder)
			bookmarks.POST("/:id/fetch-metadata", bookmarkHandler.FetchMetadata)
			bookmarks.POST("/import", bookmarkHandler.Import)
		}

		settings := api.Group("/settings")
		{
			settings.GET("", settingHandler.GetAll)
			settings.PUT("", settingHandler.Update)
		}

		aiGroup := api.Group("/ai")
		{
			aiGroup.POST("/organize", aiHandler.Organize)
		}
	}

	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet && !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(http.StatusOK, gin.H{"app": "cubby"})
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return r
}
