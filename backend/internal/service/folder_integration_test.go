package service

import (
	"path/filepath"
	"testing"

	"cubby/internal/db"
	"cubby/internal/repository"
)

func newFolderIntegrationServices(t *testing.T) (*FolderService, *BookmarkService, repository.FolderRepo, repository.BookmarkRepo) {
	t.Helper()

	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	t.Cleanup(func() { database.Close() })

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := NewSortKeyService(bookmarkRepo, folderRepo)
	return NewFolderService(folderRepo, bookmarkRepo, sortKeySvc), NewBookmarkService(bookmarkRepo, sortKeySvc), folderRepo, bookmarkRepo
}

func TestFolderDeleteAndRestoreApplyToEntireSubtree(t *testing.T) {
	folderSvc, bookmarkSvc, folderRepo, bookmarkRepo := newFolderIntegrationServices(t)

	root, err := folderSvc.Create("Root", nil)
	if err != nil {
		t.Fatalf("create root: %v", err)
	}
	child, err := folderSvc.Create("Child", &root.ID)
	if err != nil {
		t.Fatalf("create child: %v", err)
	}
	bookmark, err := bookmarkSvc.Create("Nested", "https://example.com/nested", &child.ID)
	if err != nil {
		t.Fatalf("create nested bookmark: %v", err)
	}

	if err := folderSvc.Delete(root.ID); err != nil {
		t.Fatalf("delete root: %v", err)
	}

	rootFolders, err := folderRepo.List(nil)
	if err != nil {
		t.Fatalf("list root folders: %v", err)
	}
	if len(rootFolders) != 0 {
		t.Fatalf("expected deleted root to be hidden, got %d folders", len(rootFolders))
	}
	childFolders, err := folderRepo.List(&root.ID)
	if err != nil {
		t.Fatalf("list child folders: %v", err)
	}
	if len(childFolders) != 0 {
		t.Fatalf("expected deleted child to be hidden, got %d folders", len(childFolders))
	}
	childBookmarks, err := bookmarkRepo.List(&child.ID)
	if err != nil {
		t.Fatalf("list child bookmarks: %v", err)
	}
	if len(childBookmarks) != 0 {
		t.Fatalf("expected deleted bookmark to be hidden, got %d bookmarks", len(childBookmarks))
	}
	results, err := bookmarkRepo.SearchBoth("Nested")
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("expected deleted subtree to be hidden from search, got %d results", len(results))
	}

	restored, err := folderSvc.Restore(root.ID)
	if err != nil {
		t.Fatalf("restore root: %v", err)
	}
	if restored.ID != root.ID {
		t.Fatalf("restored wrong folder: got %s want %s", restored.ID, root.ID)
	}
	restoredChildren, err := folderRepo.List(&root.ID)
	if err != nil {
		t.Fatalf("list restored children: %v", err)
	}
	if len(restoredChildren) != 1 || restoredChildren[0].ID != child.ID {
		t.Fatalf("expected restored child %s, got %#v", child.ID, restoredChildren)
	}
	restoredBookmarks, err := bookmarkRepo.List(&child.ID)
	if err != nil {
		t.Fatalf("list restored bookmarks: %v", err)
	}
	if len(restoredBookmarks) != 1 || restoredBookmarks[0].ID != bookmark.ID {
		t.Fatalf("expected restored bookmark %s, got %#v", bookmark.ID, restoredBookmarks)
	}
}
