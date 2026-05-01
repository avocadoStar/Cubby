package handler

import (
	"cubby/internal/config"
	"cubby/internal/middleware"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	r *gin.Engine,
	authSvc *service.AuthService,
	folderSvc *service.FolderService,
	bookmarkSvc *service.BookmarkService,
	searchSvc *service.SearchService,
	importSvc *service.ImportService,
	cfg *config.Config,
) {
	authH := NewAuthHandler(authSvc)
	folderH := NewFolderHandler(folderSvc)
	bookmarkH := NewBookmarkHandler(bookmarkSvc)
	searchH := NewSearchHandler(searchSvc)
	importExportH := NewImportExportHandler(importSvc, folderSvc, bookmarkSvc)

	api := r.Group("/api")

	// Public routes
	api.POST("/auth/login", authH.Login)
	api.POST("/auth/setup", authH.Setup)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired(authSvc))
	{
		// Folders
		protected.GET("/folders", folderH.List)
		protected.POST("/folders", folderH.Create)
		protected.PUT("/folders/:id", folderH.Update)
		protected.DELETE("/folders/:id", folderH.Delete)
		protected.POST("/folders/move", folderH.Move)
			protected.POST("/folders/batch-delete", folderH.BatchDelete)

		// Bookmarks
		protected.GET("/bookmarks", bookmarkH.List)
		protected.POST("/bookmarks", bookmarkH.Create)
		protected.PUT("/bookmarks/:id", bookmarkH.Update)
		protected.DELETE("/bookmarks/:id", bookmarkH.Delete)
		protected.POST("/bookmarks/move", bookmarkH.Move)
		protected.POST("/bookmarks/batch-move", bookmarkH.BatchMove)
		protected.POST("/bookmarks/batch-delete", bookmarkH.BatchDelete)

		// Search
		protected.GET("/search", searchH.Search)

		// Import/Export
		protected.POST("/import", importExportH.Import)
		protected.GET("/export", importExportH.Export)
	}
}
