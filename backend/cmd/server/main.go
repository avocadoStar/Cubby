package main

import (
	"cubby/internal/ai"
	"cubby/internal/config"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"embed"
	"errors"
	"io/fs"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

//go:embed all:static
var staticFiles embed.FS

func main() {
	cfg, err := config.Load(".env")
	if err != nil {
		if errors.Is(err, config.ErrConfigCreated) {
			log.Printf("Config file created at %s. Set your password and restart the server.", ".env")
			os.Exit(1)
		}
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := repository.Init("cubby.db")
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}

	folderRepo := repository.NewFolderRepo(db)
	bookmarkRepo := repository.NewBookmarkRepo(db)
	settingRepo := repository.NewSettingRepo(db)
	faviconDir := filepath.Join("data", "favicons")

	folderHandler := handler.NewFolderHandler(folderRepo)
	bookmarkHandler := handler.NewBookmarkHandler(bookmarkRepo, folderRepo, faviconDir)
	aiClient := ai.NewClient(settingRepo)
	settingHandler := handler.NewSettingHandler(settingRepo, aiClient)
	aiHandler := handler.NewAIHandler(aiClient, bookmarkRepo, folderRepo)
	authHandler, err := handler.NewAuthHandler(cfg.PasswordHash)
	if err != nil {
		log.Fatalf("Failed to init auth: %v", err)
	}

	staticFS, _ := fs.Sub(staticFiles, "static")
	r := handler.SetupRouter(folderRepo, bookmarkRepo, settingRepo, folderHandler, bookmarkHandler, settingHandler, aiHandler, authHandler, faviconDir, staticFS)

	log.Printf("Cubby server starting on %s", cfg.Address())
	if err := r.Run(cfg.Address()); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
