package service

import (
	"errors"
	"testing"
)

func TestCreateBookmarkSanitizesIcon(t *testing.T) {
	bookmarkRepo := newStubBookmarkRepo()
	folderRepo := newStubFolderRepo()
	svc := NewBookmarkService(bookmarkRepo, NewSortKeyService(bookmarkRepo, folderRepo))

	validIcon := "data:image/png;base64,aWNvbg=="
	valid, err := svc.Create("Valid", "https://example.com/valid", nil, validIcon)
	if err != nil {
		t.Fatalf("create valid bookmark: %v", err)
	}
	if valid.Icon != validIcon {
		t.Fatalf("expected valid icon to be stored, got %q", valid.Icon)
	}

	invalid, err := svc.Create("Invalid", "https://example.com/invalid", nil, "https://example.com/favicon.ico")
	if err != nil {
		t.Fatalf("create invalid bookmark: %v", err)
	}
	if invalid.Icon != "" {
		t.Fatalf("expected invalid icon to be cleared, got %q", invalid.Icon)
	}
}

func TestCreateBookmarkRejectsDuplicateActiveURL(t *testing.T) {
	bookmarkRepo := newStubBookmarkRepo()
	folderRepo := newStubFolderRepo()
	svc := NewBookmarkService(bookmarkRepo, NewSortKeyService(bookmarkRepo, folderRepo))

	if _, err := svc.Create("First", "https://example.com/same", nil); err != nil {
		t.Fatalf("create first bookmark: %v", err)
	}
	if _, err := svc.Create("Second", "https://example.com/same", nil); !errors.Is(err, ErrBookmarkExists) {
		t.Fatalf("expected ErrBookmarkExists, got %v", err)
	}
}

func TestCreateBookmarkAllowsDeletedDuplicateURL(t *testing.T) {
	bookmarkRepo := newStubBookmarkRepo()
	folderRepo := newStubFolderRepo()
	svc := NewBookmarkService(bookmarkRepo, NewSortKeyService(bookmarkRepo, folderRepo))

	first, err := svc.Create("First", "https://example.com/deleted", nil)
	if err != nil {
		t.Fatalf("create first bookmark: %v", err)
	}
	deletedAt := "2026-05-09T00:00:00Z"
	stored := bookmarkRepo.items[first.ID]
	stored.DeletedAt = &deletedAt
	bookmarkRepo.items[first.ID] = stored

	if _, err := svc.Create("Second", "https://example.com/deleted", nil); err != nil {
		t.Fatalf("deleted duplicate URL should not block create: %v", err)
	}
}
