package service

import (
	"path/filepath"
	"testing"

	"cubby/internal/db"
	"cubby/internal/repository"
)

func newServiceStack(t *testing.T) (*FolderService, *BookmarkService, *MoveService) {
	t.Helper()
	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	t.Cleanup(func() { database.Close() })

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := NewMoveService(repository.NewMoveRepo(database), folderSvc, sortKeySvc)
	return folderSvc, bookmarkSvc, moveSvc
}

func TestCreateBookmarkAppendsAfterFolderSibling(t *testing.T) {
	folderSvc, bookmarkSvc, _ := newServiceStack(t)

	folder, err := folderSvc.Create("Folder", nil)
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com", nil)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}
	if bookmark.SortKey <= folder.SortKey {
		t.Fatalf("expected bookmark key after folder key, got bookmark=%q folder=%q", bookmark.SortKey, folder.SortKey)
	}
}

func TestMoveIgnoresClientSortKeyOverride(t *testing.T) {
	folderSvc, bookmarkSvc, _ := newServiceStack(t)

	folder, err := folderSvc.Create("Folder", nil)
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com", nil)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	moved, err := bookmarkSvc.Move(bookmark.ID, nil, &folder.ID, nil, ptr("!"), bookmark.Version)
	if err != nil {
		t.Fatalf("move bookmark: %v", err)
	}
	if moved.SortKey <= folder.SortKey {
		t.Fatalf("expected server-computed key after folder, got bookmark=%q folder=%q", moved.SortKey, folder.SortKey)
	}
}

func TestMoveRejectsMissingPreviousNeighbor(t *testing.T) {
	_, bookmarkSvc, _ := newServiceStack(t)

	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com", nil)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	if _, err := bookmarkSvc.Move(bookmark.ID, nil, ptr("missing"), nil, nil, bookmark.Version); err == nil {
		t.Fatal("expected missing previous neighbor to fail")
	}
}

func TestMoveRejectsNeighborFromDifferentParent(t *testing.T) {
	folderSvc, bookmarkSvc, _ := newServiceStack(t)

	parent, err := folderSvc.Create("Parent", nil)
	if err != nil {
		t.Fatalf("create parent: %v", err)
	}
	outside, err := folderSvc.Create("Outside", nil)
	if err != nil {
		t.Fatalf("create outside: %v", err)
	}
	bookmark, err := bookmarkSvc.Create("Bookmark", "https://example.com", &parent.ID)
	if err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	if _, err := bookmarkSvc.Move(bookmark.ID, &parent.ID, &outside.ID, nil, nil, bookmark.Version); err == nil {
		t.Fatal("expected cross-parent previous neighbor to fail")
	}
}
