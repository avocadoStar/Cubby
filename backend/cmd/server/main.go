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

	r := gin.Default()
	handler.SetupRoutes(r, authSvc, folderSvc, bookmarkSvc, searchSvc, importSvc, cfg)

	r.Run(":" + cfg.Port)
}
