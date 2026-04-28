package main

import (
	"cubby/internal/ai"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := repository.Init("cubby.db")
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}

	folderRepo := repository.NewFolderRepo(db)
	bookmarkRepo := repository.NewBookmarkRepo(db)
	settingRepo := repository.NewSettingRepo(db)

	folderHandler := handler.NewFolderHandler(folderRepo)
	bookmarkHandler := handler.NewBookmarkHandler(bookmarkRepo, folderRepo)
	settingHandler := handler.NewSettingHandler(settingRepo)
	aiClient := ai.NewClient(settingRepo)
	aiHandler := handler.NewAIHandler(aiClient, bookmarkRepo, folderRepo)

	r := handler.SetupRouter(folderRepo, bookmarkRepo, settingRepo, folderHandler, bookmarkHandler, settingHandler, aiHandler)

	log.Println("Cubby server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
