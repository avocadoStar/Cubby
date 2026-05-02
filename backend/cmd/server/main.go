package main

import (
	"cubby/internal/config"
	"cubby/internal/db"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database := db.MustOpen(cfg.DBPath)
	defer database.Close()

	folderRepo := &repository.FolderRepo{DB: database}
	bookmarkRepo := &repository.BookmarkRepo{DB: database}
	settingRepo := &repository.SettingRepo{DB: database}

	authSvc := service.NewAuthService(cfg, settingRepo)
	folderSvc := service.NewFolderService(folderRepo)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo)
	searchSvc := service.NewSearchService(bookmarkRepo)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)
	metadataSvc := service.NewMetadataService()
	folderSvc.SetBookmarkRepo(bookmarkRepo)
	bookmarkSvc.SetFolderRepo(folderRepo)

	r := gin.Default()
	handler.SetupRoutes(r, authSvc, folderSvc, bookmarkSvc, searchSvc, importSvc, metadataSvc, cfg)

	// Serve frontend static files in production
	r.Static("/assets", "./cmd/server/static/assets")
	r.StaticFile("/favicon.svg", "./cmd/server/static/favicon.svg")
	r.NoRoute(func(c *gin.Context) {
		c.File("./cmd/server/static/index.html")
	})

	r.Run(":" + cfg.Port)
}
