package service

import (
	"strings"
	"testing"
)

func TestImportHTMLSkipsNonHTTPAbsoluteURLs(t *testing.T) {
	folderRepo := newStubFolderRepo()
	bookmarkRepo := newStubBookmarkRepo()
	svc := NewImportService(folderRepo, bookmarkRepo)

	input := `
<DL><p>
<DT><A HREF="relative/path">Relative</A>
<DT><A HREF="javascript:alert(1)">Script</A>
<DT><A HREF="ftp://example.com/file">FTP</A>
<DT><A HREF="https://example.com/ok">OK</A>
</DL><p>`

	result, err := svc.ImportHTML(strings.NewReader(input))
	if err != nil {
		t.Fatalf("import html: %v", err)
	}
	if result.Bookmarks != 1 {
		t.Fatalf("expected 1 imported bookmark, got %d", result.Bookmarks)
	}
	if result.Errors != 3 {
		t.Fatalf("expected 3 skipped invalid bookmarks, got %d", result.Errors)
	}
	for _, bookmark := range bookmarkRepo.items {
		if bookmark.URL != "https://example.com/ok" {
			t.Fatalf("unexpected imported URL %q", bookmark.URL)
		}
	}
}

func TestImportHTMLStoresDataIcon(t *testing.T) {
	folderRepo := newStubFolderRepo()
	bookmarkRepo := newStubBookmarkRepo()
	svc := NewImportService(folderRepo, bookmarkRepo)

	icon := "data:image/png;base64,aWNvbg=="
	input := `<DL><p>
<DT><A HREF="https://example.com/ok" ICON="` + icon + `">OK</A>
</DL><p>`

	result, err := svc.ImportHTML(strings.NewReader(input))
	if err != nil {
		t.Fatalf("import html: %v", err)
	}
	if result.Bookmarks != 1 {
		t.Fatalf("expected 1 imported bookmark, got %d", result.Bookmarks)
	}
	for _, bookmark := range bookmarkRepo.items {
		if bookmark.Icon != icon {
			t.Fatalf("expected imported icon %q, got %q", icon, bookmark.Icon)
		}
	}
}
