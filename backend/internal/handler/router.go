package handler

import (
	"cubby/internal/config"
	"cubby/internal/middleware"
	"cubby/internal/service"
	"time"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(
	r *gin.Engine,
	authSvc *service.AuthService,
	folderSvc *service.FolderService,
	bookmarkSvc *service.BookmarkService,
	searchSvc *service.SearchService,
	importSvc *service.ImportService,
	exportSvc *service.ExportService,
	metadataSvc *service.MetadataService,
	moveSvc *service.MoveService,
	cfg *config.Config,
) {
	authH := NewAuthHandler(authSvc)
	folderH := NewFolderHandler(folderSvc)
	bookmarkH := NewBookmarkHandler(bookmarkSvc)
	searchH := NewSearchHandler(searchSvc)
	importExportH := NewImportExportHandler(importSvc, exportSvc)
	metadataH := NewMetadataHandler(metadataSvc)
	moveH := NewMoveHandler(moveSvc)

	api := r.Group("/api")

	// Public routes
	api.POST("/auth/login", middleware.RateLimit(5, time.Minute), authH.Login)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired(authSvc))
	{
		// Folders
		protected.GET("/folders", folderH.List)
		protected.POST("/folders", folderH.Create)
		protected.PUT("/folders/:id", folderH.Update)
		protected.DELETE("/folders/:id", folderH.Delete)
		protected.PUT("/folders/:id/restore", folderH.Restore)
		protected.POST("/folders/move", folderH.Move)
		protected.POST("/folders/batch-delete", folderH.BatchDelete)

		// Moves
		protected.POST("/moves/batch", moveH.BatchMove)

		// Bookmarks
		protected.GET("/bookmarks", bookmarkH.List)
		protected.POST("/bookmarks", bookmarkH.Create)
		protected.PUT("/bookmarks/:id", bookmarkH.Update)
		protected.DELETE("/bookmarks/:id", bookmarkH.Delete)
		protected.PATCH("/bookmarks/:id/notes", bookmarkH.UpdateNotes)
		protected.PUT("/bookmarks/:id/restore", bookmarkH.Restore)
		protected.POST("/bookmarks/move", bookmarkH.Move)
		protected.POST("/bookmarks/batch-delete", bookmarkH.BatchDelete)

		// Search
		protected.GET("/search", searchH.Search)
		protected.GET("/metadata", metadataH.Fetch)

		// Import/Export
		protected.POST("/import", importExportH.Import)
		protected.GET("/export", importExportH.Export)
	}
}
