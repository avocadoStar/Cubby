package handler

import (
	"cubby/internal/repository"
	"io/fs"
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
	staticFS fs.FS,
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

		api.POST("/fetch-title", bookmarkHandler.FetchTitle)

		settings := api.Group("/settings")
		{
			settings.GET("", settingHandler.GetAll)
			settings.PUT("", settingHandler.Update)
			settings.POST("/ai/test", settingHandler.TestAI)
		}

		aiGroup := api.Group("/ai")
		{
			aiGroup.POST("/organize", aiHandler.Organize)
		}
	}

	// Serve SPA: static assets directly, everything else falls back to index.html
	fileServer := http.FileServer(http.FS(staticFS))
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if c.Request.Method == http.MethodGet && !strings.HasPrefix(path, "/api") {
			// Try serving the exact file first
			f, err := staticFS.Open(strings.TrimPrefix(path, "/"))
			if err == nil {
				f.Close()
				fileServer.ServeHTTP(c.Writer, c.Request)
				return
			}
			// SPA fallback: serve index.html for client-side routing
			c.Request.URL.Path = "/"
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return r
}
