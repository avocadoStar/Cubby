package handler

import (
	"bytes"
	"cubby/internal/ai"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/google/uuid"
	testingfs "testing/fstest"
)

func newTestServer(t *testing.T, staticFS fs.FS) (*repository.BookmarkRepo, *repository.FolderRepo, *repository.SettingRepo, http.Handler) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "test.db")
	db, err := repository.Init(dbPath)
	if err != nil {
		t.Fatalf("init db: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	folderRepo := repository.NewFolderRepo(db)
	bookmarkRepo := repository.NewBookmarkRepo(db)
	settingRepo := repository.NewSettingRepo(db)

	folderHandler := NewFolderHandler(folderRepo)
	bookmarkHandler := NewBookmarkHandler(bookmarkRepo, folderRepo)
	aiClient := ai.NewClient(settingRepo)
	settingHandler := NewSettingHandler(settingRepo, aiClient)
	aiHandler := NewAIHandler(aiClient, bookmarkRepo, folderRepo)

	router := SetupRouter(
		folderRepo,
		bookmarkRepo,
		settingRepo,
		folderHandler,
		bookmarkHandler,
		settingHandler,
		aiHandler,
		staticFS,
	)

	return bookmarkRepo, folderRepo, settingRepo, router
}

func TestCreateBookmarkReturnsConflictForDuplicateURL(t *testing.T) {
	bookmarkRepo, _, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	existing := &model.Bookmark{
		ID:        uuid.NewString(),
		Title:     "Existing",
		URL:       "https://example.com/duplicate",
		SortOrder: 1,
	}
	if err := bookmarkRepo.Create(existing); err != nil {
		t.Fatalf("seed bookmark: %v", err)
	}

	body := bytes.NewBufferString(`{"title":"Duplicate","url":"https://example.com/duplicate"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "DUPLICATE_URL") {
		t.Fatalf("expected duplicate error code, got %s", recorder.Body.String())
	}
}

func TestUpdateBookmarkPreservesFolderWhenFolderIDIsOmitted(t *testing.T) {
	bookmarkRepo, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	folder := &model.Folder{
		ID:        uuid.NewString(),
		Name:      "Folder",
		SortOrder: 1,
	}
	if err := folderRepo.Create(folder); err != nil {
		t.Fatalf("seed folder: %v", err)
	}

	bookmark := &model.Bookmark{
		ID:        uuid.NewString(),
		Title:     "Original",
		URL:       "https://example.com/original",
		FolderID:  &folder.ID,
		SortOrder: 1,
	}
	if err := bookmarkRepo.Create(bookmark); err != nil {
		t.Fatalf("seed bookmark: %v", err)
	}

	body := bytes.NewBufferString(`{"title":"Updated"}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/bookmarks/"+bookmark.ID, body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	updated, err := bookmarkRepo.GetByID(bookmark.ID)
	if err != nil {
		t.Fatalf("reload bookmark: %v", err)
	}
	if updated == nil || updated.FolderID == nil || *updated.FolderID != folder.ID {
		t.Fatalf("expected folder_id to remain %q, got %#v", folder.ID, updated)
	}
}

func TestSettingsAITestReturnsNoAPIKeyError(t *testing.T) {
	_, _, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/settings/ai/test", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), "NO_API_KEY") {
		t.Fatalf("expected NO_API_KEY error, got %s", recorder.Body.String())
	}
}

func TestNoRouteServesSPAIndexFallback(t *testing.T) {
	_, _, _, router := newTestServer(t, testingfs.MapFS{
		"index.html":            {Data: []byte("<html><body>SPA</body></html>")},
		"assets/app.js":         {Data: []byte("console.log('ok')")},
		"nested/ignored.txt":    {Data: []byte("ignored")},
	})

	t.Run("serves index for client routes", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/settings", nil)
		recorder := httptest.NewRecorder()

		router.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "SPA") {
			t.Fatalf("expected SPA html, got %s", recorder.Body.String())
		}
	})

	t.Run("serves static assets directly", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
		recorder := httptest.NewRecorder()

		router.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", recorder.Code)
		}
		if !strings.Contains(recorder.Body.String(), "console.log") {
			t.Fatalf("expected static asset, got %s", recorder.Body.String())
		}
	})
}

func TestCreateBookmarkReturnsFreshTimestamps(t *testing.T) {
	_, _, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	body := bytes.NewBufferString(`{"title":"Timestamped","url":"https://example.com/timestamped"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var bookmark model.Bookmark
	if err := json.Unmarshal(recorder.Body.Bytes(), &bookmark); err != nil {
		t.Fatalf("decode bookmark: %v", err)
	}
	if bookmark.CreatedAt.IsZero() || bookmark.UpdatedAt.IsZero() {
		t.Fatalf("expected non-zero timestamps, got %#v", bookmark)
	}
}
