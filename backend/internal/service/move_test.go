package service

import (
	"path/filepath"
	"testing"

	"cubby/internal/db"
	"cubby/internal/repository"
)

func TestBatchMoveGeneratesSortKeysFromPlacement(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)

	first, err := bookmarkSvc.Create("First", "https://example.com/first", nil)
	if err != nil {
		t.Fatalf("create first: %v", err)
	}
	second, err := bookmarkSvc.Create("Second", "https://example.com/second", nil)
	if err != nil {
		t.Fatalf("create second: %v", err)
	}

	result, err := moveSvc.BatchMove([]BatchMoveItem{{
		Kind:    "bookmark",
		ID:      second.ID,
		PrevID:  nil,
		NextID:  &first.ID,
		Version: second.Version,
	}})
	if err != nil {
		t.Fatalf("batch move: %v", err)
	}
	if len(result.Bookmarks) != 1 {
		t.Fatalf("expected 1 moved bookmark, got %d", len(result.Bookmarks))
	}
	moved := result.Bookmarks[0]
	if moved.SortKey == "" {
		t.Fatal("expected backend-generated sort key")
	}
	if moved.SortKey >= first.SortKey {
		t.Fatalf("expected moved bookmark sort key before %q, got %q", first.SortKey, moved.SortKey)
	}
	if moved.Version != second.Version+1 {
		t.Fatalf("expected version %d, got %d", second.Version+1, moved.Version)
	}
}

func TestBatchMoveUsesPendingSortKeyAcrossKinds(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)

	dest, err := folderSvc.Create("Destination", nil)
	if err != nil {
		t.Fatalf("create destination: %v", err)
	}
	folder, err := folderSvc.Create("Folder", nil)
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	if _, err := database.Exec(`UPDATE folder SET sort_key='z' WHERE id=?`, folder.ID); err != nil {
		t.Fatalf("force source folder sort key: %v", err)
	}
	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com/bookmark", nil)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	result, err := moveSvc.BatchMove([]BatchMoveItem{
		{
			Kind:     "folder",
			ID:       folder.ID,
			ParentID: &dest.ID,
			Version:  folder.Version,
		},
		{
			Kind:     "bookmark",
			ID:       bookmark.ID,
			ParentID: &dest.ID,
			PrevID:   &folder.ID,
			Version:  bookmark.Version,
		},
	})
	if err != nil {
		t.Fatalf("batch move: %v", err)
	}
	if len(result.Folders) != 1 || len(result.Bookmarks) != 1 {
		t.Fatalf("expected moved folder and bookmark, got %#v", result)
	}
	movedFolder := result.Folders[0]
	movedBookmark := result.Bookmarks[0]
	if movedBookmark.SortKey <= movedFolder.SortKey {
		t.Fatalf("expected bookmark key after pending folder key, got bookmark=%q folder=%q", movedBookmark.SortKey, movedFolder.SortKey)
	}
	if movedBookmark.SortKey >= "z" {
		t.Fatalf("expected bookmark key to use pending folder key instead of old folder key, got %q", movedBookmark.SortKey)
	}
}

func TestBatchMoveGeneratesDenseBetweenKeysForMultipleFolders(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)

	dest, err := folderSvc.Create("Destination", nil)
	if err != nil {
		t.Fatalf("create destination: %v", err)
	}
	before, err := folderSvc.Create("Before", &dest.ID)
	if err != nil {
		t.Fatalf("create before: %v", err)
	}
	after, err := folderSvc.Create("After", &dest.ID)
	if err != nil {
		t.Fatalf("create after: %v", err)
	}
	if _, err := database.Exec(`UPDATE folder SET sort_key='a' WHERE id=?`, before.ID); err != nil {
		t.Fatalf("force before sort key: %v", err)
	}
	if _, err := database.Exec(`UPDATE folder SET sort_key='b' WHERE id=?`, after.ID); err != nil {
		t.Fatalf("force after sort key: %v", err)
	}
	first, err := folderSvc.Create("First", nil)
	if err != nil {
		t.Fatalf("create first: %v", err)
	}
	second, err := folderSvc.Create("Second", nil)
	if err != nil {
		t.Fatalf("create second: %v", err)
	}

	result, err := moveSvc.BatchMove([]BatchMoveItem{
		{
			Kind:     "folder",
			ID:       first.ID,
			ParentID: &dest.ID,
			PrevID:   &before.ID,
			NextID:   &after.ID,
			Version:  first.Version,
		},
		{
			Kind:     "folder",
			ID:       second.ID,
			ParentID: &dest.ID,
			PrevID:   &first.ID,
			NextID:   &after.ID,
			Version:  second.Version,
		},
	})
	if err != nil {
		t.Fatalf("batch move: %v", err)
	}
	if len(result.Folders) != 2 {
		t.Fatalf("expected 2 moved folders, got %d", len(result.Folders))
	}
	movedFirst := result.Folders[0]
	movedSecond := result.Folders[1]
	if !("a" < movedFirst.SortKey && movedFirst.SortKey < movedSecond.SortKey && movedSecond.SortKey < "b") {
		t.Fatalf("expected dense keys between a and b, got first=%q second=%q", movedFirst.SortKey, movedSecond.SortKey)
	}
}

func TestBatchMoveRejectsFolderCycle(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)

	parent, err := folderSvc.Create("Parent", nil)
	if err != nil {
		t.Fatalf("create parent: %v", err)
	}
	child, err := folderSvc.Create("Child", &parent.ID)
	if err != nil {
		t.Fatalf("create child: %v", err)
	}

	_, err = moveSvc.BatchMove([]BatchMoveItem{{
		Kind:     "folder",
		ID:       parent.ID,
		ParentID: &child.ID,
		Version:  parent.Version,
	}})
	if err == nil {
		t.Fatal("expected moving a folder into its descendant to fail")
	}
}

func TestBatchMoveRejectsMissingPreviousNeighbor(t *testing.T) {
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)

	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com/missing-prev", nil)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	_, err = moveSvc.BatchMove([]BatchMoveItem{{
		Kind:    "bookmark",
		ID:      bookmark.ID,
		PrevID:  ptr("missing"),
		Version: bookmark.Version,
	}})
	if err == nil {
		t.Fatal("expected missing previous neighbor to fail")
	}
}
