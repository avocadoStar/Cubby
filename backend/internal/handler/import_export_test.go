package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"cubby/internal/db"
	"cubby/internal/model"
	"cubby/internal/repository"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

func TestJSONExportIncludesEntireTree(t *testing.T) {
	gin.SetMode(gin.TestMode)

	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo, sortKeySvc)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)

	root, err := folderSvc.Create("Root", nil)
	if err != nil {
		t.Fatalf("create root: %v", err)
	}
	child, err := folderSvc.Create("Child", &root.ID)
	if err != nil {
		t.Fatalf("create child: %v", err)
	}
	nested, err := bookmarkSvc.Create("Nested", "https://example.com/nested", &child.ID)
	if err != nil {
		t.Fatalf("create nested bookmark: %v", err)
	}

	router := gin.New()
	handler := NewImportExportHandler(importSvc, folderSvc, bookmarkSvc)
	router.GET("/export", handler.Export)

	req := httptest.NewRequest(http.MethodGet, "/export?format=json", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var payload struct {
		Folders   []model.Folder   `json:"folders"`
		Bookmarks []model.Bookmark `json:"bookmarks"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode export json: %v", err)
	}
	if len(payload.Folders) != 2 {
		t.Fatalf("expected 2 exported folders, got %d", len(payload.Folders))
	}
	if len(payload.Bookmarks) != 1 {
		t.Fatalf("expected 1 exported bookmark, got %d", len(payload.Bookmarks))
	}
	if payload.Bookmarks[0].ID != nested.ID {
		t.Fatalf("expected nested bookmark %s, got %s", nested.ID, payload.Bookmarks[0].ID)
	}
}

func TestHTMLExportIncludesBookmarkIcon(t *testing.T) {
	gin.SetMode(gin.TestMode)

	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)
	folderSvc := service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo, sortKeySvc)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)

	icon := "data:image/png;base64,aWNvbg=="
	if _, err := bookmarkSvc.Create("With Icon", "https://example.com", nil, icon); err != nil {
		t.Fatalf("create bookmark: %v", err)
	}

	router := gin.New()
	handler := NewImportExportHandler(importSvc, folderSvc, bookmarkSvc)
	router.GET("/export", handler.Export)

	req := httptest.NewRequest(http.MethodGet, "/export", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `ICON="`+icon+`"`) {
		t.Fatalf("expected exported icon in HTML, got %s", rec.Body.String())
	}
}
