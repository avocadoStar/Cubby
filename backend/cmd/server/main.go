package main

import (
	"cubby/internal/ai"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"embed"
	"io/fs"
	"log"
	"path/filepath"

	_ "modernc.org/sqlite"
)

//go:embed all:static
var staticFiles embed.FS

func main() {
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

	staticFS, _ := fs.Sub(staticFiles, "static")
	r := handler.SetupRouter(folderRepo, bookmarkRepo, settingRepo, folderHandler, bookmarkHandler, settingHandler, aiHandler, faviconDir, staticFS)

	log.Println("Cubby server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
