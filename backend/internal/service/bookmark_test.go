package service

import "testing"

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
