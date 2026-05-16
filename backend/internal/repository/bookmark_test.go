package repository

import (
	"cubby/internal/db"
	"path/filepath"
	"testing"
)

func TestBookmarkRepoCreateStoresNotes(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	repo := NewBookmarkRepo(database)
	bookmark, err := repo.Create("With notes", "https://example.com/notes", nil, "n", "", "Fetched description")
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}
	if bookmark.Notes != "Fetched description" {
		t.Fatalf("expected fetched description in notes, got %q", bookmark.Notes)
	}
}
