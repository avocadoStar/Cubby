package handler

import (
	"cubby/internal/repository"
	"io/fs"
	"net/http"
	"os"
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
	authHandler *AuthHandler,
	faviconDir string,
	staticFS fs.FS,
) *gin.Engine {
	r := gin.Default()
	hasSPAIndex := fileExists(staticFS, "index.html")

	if faviconDir != "" {
		_ = os.MkdirAll(faviconDir, 0o755)
		if authHandler != nil {
			favicons := r.Group("/favicons")
			favicons.Use(authHandler.RequireAuth())
			favicons.StaticFS("/", gin.Dir(faviconDir, false))
		} else {
			r.Static("/favicons", faviconDir)
		}
	}

	api := r.Group("/api/v1")
	{
		if authHandler != nil {
			authRoutes := api.Group("/auth")
			authHandler.RegisterRoutes(authRoutes)
		}

		protected := api.Group("")
		if authHandler != nil {
			protected.Use(authHandler.RequireAuth())
		}

		folders := protected.Group("/folders")
		{
			folders.GET("", folderHandler.GetTree)
			folders.POST("", folderHandler.Create)
			folders.PUT("/:id", folderHandler.Update)
			folders.PUT("/:id/move", folderHandler.Move)
			folders.DELETE("/:id", folderHandler.Delete)
			folders.PUT("/reorder", folderHandler.Reorder)
		}

		bookmarks := protected.Group("/bookmarks")
		{
			bookmarks.GET("", bookmarkHandler.List)
			bookmarks.GET("/:id", bookmarkHandler.GetByID)
			bookmarks.POST("", bookmarkHandler.Create)
			bookmarks.PUT("/:id", bookmarkHandler.Update)
			bookmarks.DELETE("/:id", bookmarkHandler.Delete)
			bookmarks.PUT("/:id/favorite", bookmarkHandler.ToggleFavorite)
			bookmarks.PUT("/reorder", bookmarkHandler.Reorder)
			bookmarks.PUT("/:id/folder", bookmarkHandler.MoveToFolder)
			bookmarks.POST("/batch/delete", bookmarkHandler.BatchDelete)
			bookmarks.POST("/batch/move", bookmarkHandler.BatchMove)
			bookmarks.POST("/batch/favorite", bookmarkHandler.BatchSetFavorite)
			bookmarks.POST("/:id/fetch-metadata", bookmarkHandler.FetchMetadata)
			bookmarks.POST("/import", bookmarkHandler.StartImport)
			bookmarks.GET("/import/:taskID/events", bookmarkHandler.StreamImport)
		}

		protected.POST("/fetch-title", bookmarkHandler.FetchTitle)
		protected.POST("/metadata-preview", bookmarkHandler.FetchMetadataPreview)

		settings := protected.Group("/settings")
		{
			settings.GET("", settingHandler.GetAll)
			settings.PUT("", settingHandler.Update)
			settings.POST("/ai/test", settingHandler.TestAI)
		}

		aiGroup := protected.Group("/ai")
		{
			aiGroup.POST("/organize", aiHandler.Organize)
		}
	}

	// Serve SPA: static assets directly, everything else falls back to index.html
	fileServer := http.FileServer(http.FS(staticFS))
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if c.Request.Method == http.MethodGet && !strings.HasPrefix(path, "/api") {
			if !hasSPAIndex {
				c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(devFallbackHTML))
				return
			}
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

func fileExists(staticFS fs.FS, path string) bool {
	f, err := staticFS.Open(path)
	if err != nil {
		return false
	}
	_ = f.Close()
	return true
}

const devFallbackHTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cubby</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, sans-serif;
      }
      body {
        margin: 0;
        display: grid;
        min-height: 100vh;
        place-items: center;
        background: #ffffff;
        color: #0f1419;
      }
      main {
        max-width: 560px;
        padding: 24px;
        line-height: 1.6;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      p {
        margin: 0 0 10px;
      }
      code {
        padding: 2px 6px;
        border-radius: 6px;
        background: #f3f4f6;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #111417;
          color: #e8eef2;
        }
        code {
          background: #1b2127;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Cubby 后端已启动</h1>
      <p>当前还没有可用的前端打包文件，所以这里显示的是说明页。</p>
      <p>开发时请访问 <code>http://localhost:5173</code>，它会自动把 API 请求转到后端。</p>
      <p>如果你想直接访问后端端口，请先在 <code>frontend</code> 目录运行 <code>npm run build</code>。</p>
      <p>打包完成后，后端会自动使用打包后的前端页面。</p>
    </main>
  </body>
</html>`
