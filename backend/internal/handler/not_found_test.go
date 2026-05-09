package handler

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"cubby/internal/db"
	"cubby/internal/repository"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

func TestBookmarkMissingResourcesReturnNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)
	handler := NewBookmarkHandler(service.NewBookmarkService(bookmarkRepo, sortKeySvc))

	router := gin.New()
	router.DELETE("/bookmarks/:id", handler.Delete)
	router.PUT("/bookmarks/:id/restore", handler.Restore)
	router.PATCH("/bookmarks/:id/notes", handler.UpdateNotes)

	tests := []struct {
		name   string
		method string
		path   string
		body   string
	}{
		{name: "delete", method: http.MethodDelete, path: "/bookmarks/missing"},
		{name: "restore", method: http.MethodPut, path: "/bookmarks/missing/restore"},
		{name: "update notes", method: http.MethodPatch, path: "/bookmarks/missing/notes", body: `{"notes":"x"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusNotFound {
				t.Fatalf("expected status 404, got %d: %s", rec.Code, rec.Body.String())
			}
			if !strings.Contains(rec.Body.String(), `"error":"not found"`) {
				t.Fatalf("expected not found error body, got %s", rec.Body.String())
			}
		})
	}
}

func TestFolderMissingResourcesReturnNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	database := db.MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)
	handler := NewFolderHandler(service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc))

	router := gin.New()
	router.DELETE("/folders/:id", handler.Delete)
	router.PUT("/folders/:id/restore", handler.Restore)

	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "delete", method: http.MethodDelete, path: "/folders/missing"},
		{name: "restore", method: http.MethodPut, path: "/folders/missing/restore"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusNotFound {
				t.Fatalf("expected status 404, got %d: %s", rec.Code, rec.Body.String())
			}
			if !strings.Contains(rec.Body.String(), `"error":"not found"`) {
				t.Fatalf("expected not found error body, got %s", rec.Body.String())
			}
		})
	}
}
