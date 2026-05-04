package main

import (
	"context"
	"cubby/internal/config"
	"cubby/internal/db"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"cubby/internal/service"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	database := db.MustOpen(cfg.DBPath)
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	settingRepo := repository.NewSettingRepo(database)

	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)

	authSvc := service.NewAuthService(cfg, settingRepo)
	if err := authSvc.SyncConfiguredPassword(); err != nil {
		log.Fatalf("sync configured password: %v", err)
	}
	folderSvc := service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo, sortKeySvc)
	searchSvc := service.NewSearchService(bookmarkRepo)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)
	metadataSvc := service.NewMetadataService()

	r := gin.Default()
	handler.SetupRoutes(r, authSvc, folderSvc, bookmarkSvc, searchSvc, importSvc, metadataSvc, cfg)

	// Serve frontend static files in production
	r.Static("/assets", "./cmd/server/static/assets")
	r.StaticFile("/favicon.svg", "./cmd/server/static/favicon.svg")
	r.NoRoute(func(c *gin.Context) {
		c.File("./cmd/server/static/index.html")
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r.Handler(),
	}

	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown: %s", err)
	}
	log.Println("server stopped")
}
