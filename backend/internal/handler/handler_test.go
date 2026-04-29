package handler

import (
	"bytes"
	"cubby/internal/ai"
	"cubby/internal/metadata"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"io/fs"
	"mime/multipart"
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
	faviconDir := filepath.Join(filepath.Dir(dbPath), "favicons")
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
	bookmarkHandler := NewBookmarkHandler(bookmarkRepo, folderRepo, faviconDir)
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
		faviconDir,
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
		"index.html":         {Data: []byte("<html><body>SPA</body></html>")},
		"assets/app.js":      {Data: []byte("console.log('ok')")},
		"nested/ignored.txt": {Data: []byte("ignored")},
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

func TestNoRouteServesFallbackPageWhenSPAIsMissing(t *testing.T) {
	_, _, _, router := newTestServer(t, testingfs.MapFS{
		".gitkeep": {Data: []byte{}},
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), "后端已启动") {
		t.Fatalf("expected fallback page, got %s", recorder.Body.String())
	}
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

func TestCreateBookmarkFetchesMetadataAndPersistsFavicon(t *testing.T) {
	_, _, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	siteServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(`<!doctype html><html><head><title>Local Title</title><meta name="description" content="Local Description"><meta property="og:image" content="/preview.png"></head><body>ok</body></html>`))
	}))
	defer siteServer.Close()

	faviconServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte("png"))
	}))
	defer faviconServer.Close()

	originalProvider := metadata.DefaultFaviconProvider
	metadata.DefaultFaviconProvider = faviconServer.URL + "/favicon?url=%s"
	t.Cleanup(func() {
		metadata.DefaultFaviconProvider = originalProvider
	})

	body := bytes.NewBufferString(`{"url":"` + siteServer.URL + `/article"}`)
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

	if bookmark.Title != "Local Title" {
		t.Fatalf("expected fetched title, got %#v", bookmark)
	}
	if bookmark.Description != "Local Description" {
		t.Fatalf("expected fetched description, got %#v", bookmark)
	}
	if bookmark.FaviconURL == "" || !strings.HasPrefix(bookmark.FaviconURL, "/favicons/") {
		t.Fatalf("expected persisted favicon url, got %#v", bookmark)
	}
	if !bookmark.MetadataFetched {
		t.Fatalf("expected metadata fetched to be true, got %#v", bookmark)
	}

	faviconReq := httptest.NewRequest(http.MethodGet, bookmark.FaviconURL, nil)
	faviconRecorder := httptest.NewRecorder()
	router.ServeHTTP(faviconRecorder, faviconReq)

	if faviconRecorder.Code != http.StatusOK {
		t.Fatalf("expected favicon to be served, got %d", faviconRecorder.Code)
	}
	if faviconRecorder.Body.String() != "png" {
		t.Fatalf("expected favicon body, got %q", faviconRecorder.Body.String())
	}
}

func TestBatchMoveBookmarksMovesAllItems(t *testing.T) {
	bookmarkRepo, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	targetFolder := &model.Folder{
		ID:        uuid.NewString(),
		Name:      "Target",
		SortOrder: 1,
	}
	if err := folderRepo.Create(targetFolder); err != nil {
		t.Fatalf("seed folder: %v", err)
	}

	bookmarkA := &model.Bookmark{ID: uuid.NewString(), Title: "A", URL: "https://example.com/a"}
	bookmarkB := &model.Bookmark{ID: uuid.NewString(), Title: "B", URL: "https://example.com/b"}
	if err := bookmarkRepo.Create(bookmarkA); err != nil {
		t.Fatalf("seed bookmark a: %v", err)
	}
	if err := bookmarkRepo.Create(bookmarkB); err != nil {
		t.Fatalf("seed bookmark b: %v", err)
	}

	body := bytes.NewBufferString(`{"ids":["` + bookmarkA.ID + `","` + bookmarkB.ID + `"],"folder_id":"` + targetFolder.ID + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks/batch/move", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	updatedA, _ := bookmarkRepo.GetByID(bookmarkA.ID)
	updatedB, _ := bookmarkRepo.GetByID(bookmarkB.ID)
	if updatedA == nil || updatedA.FolderID == nil || *updatedA.FolderID != targetFolder.ID {
		t.Fatalf("expected bookmark a moved, got %#v", updatedA)
	}
	if updatedB == nil || updatedB.FolderID == nil || *updatedB.FolderID != targetFolder.ID {
		t.Fatalf("expected bookmark b moved, got %#v", updatedB)
	}
}

func TestMoveFolderRejectsMovingIntoDescendant(t *testing.T) {
	_, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	parent := &model.Folder{ID: uuid.NewString(), Name: "Parent", SortOrder: 1}
	if err := folderRepo.Create(parent); err != nil {
		t.Fatalf("seed parent: %v", err)
	}

	child := &model.Folder{ID: uuid.NewString(), Name: "Child", ParentID: &parent.ID, SortOrder: 1}
	if err := folderRepo.Create(child); err != nil {
		t.Fatalf("seed child: %v", err)
	}

	body := bytes.NewBufferString(`{"parent_id":"` + child.ID + `","sort_order":0}`)
	req := httptest.NewRequest(http.MethodPut, "/api/v1/folders/"+parent.ID+"/move", body)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d with body %s", recorder.Code, recorder.Body.String())
	}
}

func TestGetTreeIncludesNestedDescendants(t *testing.T) {
	_, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	root := &model.Folder{ID: uuid.NewString(), Name: "Root", SortOrder: 1}
	if err := folderRepo.Create(root); err != nil {
		t.Fatalf("seed root: %v", err)
	}

	child := &model.Folder{ID: uuid.NewString(), Name: "Child", ParentID: &root.ID, SortOrder: 1}
	if err := folderRepo.Create(child); err != nil {
		t.Fatalf("seed child: %v", err)
	}

	grandchild := &model.Folder{ID: uuid.NewString(), Name: "Grandchild", ParentID: &child.ID, SortOrder: 1}
	if err := folderRepo.Create(grandchild); err != nil {
		t.Fatalf("seed grandchild: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/folders", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var tree []repository.FolderTree
	if err := json.Unmarshal(recorder.Body.Bytes(), &tree); err != nil {
		t.Fatalf("decode tree: %v", err)
	}
	if len(tree) != 1 || len(tree[0].Children) != 1 || len(tree[0].Children[0].Children) != 1 {
		t.Fatalf("expected 3-level tree, got %#v", tree)
	}
	if tree[0].Children[0].Children[0].Name != "Grandchild" {
		t.Fatalf("expected nested grandchild, got %#v", tree)
	}
}

func TestDeleteFolderRemovesDescendantsAndUnsetsBookmarks(t *testing.T) {
	bookmarkRepo, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	root := &model.Folder{ID: uuid.NewString(), Name: "Root", SortOrder: 1}
	if err := folderRepo.Create(root); err != nil {
		t.Fatalf("seed root: %v", err)
	}

	child := &model.Folder{ID: uuid.NewString(), Name: "Child", ParentID: &root.ID, SortOrder: 1}
	if err := folderRepo.Create(child); err != nil {
		t.Fatalf("seed child: %v", err)
	}

	grandchild := &model.Folder{ID: uuid.NewString(), Name: "Grandchild", ParentID: &child.ID, SortOrder: 1}
	if err := folderRepo.Create(grandchild); err != nil {
		t.Fatalf("seed grandchild: %v", err)
	}

	bookmarkA := &model.Bookmark{ID: uuid.NewString(), Title: "A", URL: "https://example.com/a", FolderID: &child.ID}
	if err := bookmarkRepo.Create(bookmarkA); err != nil {
		t.Fatalf("seed bookmark a: %v", err)
	}

	bookmarkB := &model.Bookmark{ID: uuid.NewString(), Title: "B", URL: "https://example.com/b", FolderID: &grandchild.ID}
	if err := bookmarkRepo.Create(bookmarkB); err != nil {
		t.Fatalf("seed bookmark b: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/folders/"+root.ID, nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	tree, err := folderRepo.GetTree()
	if err != nil {
		t.Fatalf("reload tree: %v", err)
	}
	if len(tree) != 0 {
		t.Fatalf("expected tree to be empty, got %#v", tree)
	}

	reloadedA, err := bookmarkRepo.GetByID(bookmarkA.ID)
	if err != nil {
		t.Fatalf("reload bookmark a: %v", err)
	}
	if reloadedA == nil || reloadedA.FolderID != nil {
		t.Fatalf("expected bookmark a to become unsorted, got %#v", reloadedA)
	}

	reloadedB, err := bookmarkRepo.GetByID(bookmarkB.ID)
	if err != nil {
		t.Fatalf("reload bookmark b: %v", err)
	}
	if reloadedB == nil || reloadedB.FolderID != nil {
		t.Fatalf("expected bookmark b to become unsorted, got %#v", reloadedB)
	}
}

func TestImportBookmarksStreamsProgressAndResult(t *testing.T) {
	bookmarkRepo, folderRepo, _, router := newTestServer(t, testingfs.MapFS{
		"index.html": {Data: []byte("index")},
	})

	existing := &model.Bookmark{
		ID:        uuid.NewString(),
		Title:     "Existing",
		URL:       "https://example.com/a",
		SortOrder: 1,
	}
	if err := bookmarkRepo.Create(existing); err != nil {
		t.Fatalf("seed bookmark: %v", err)
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	fileWriter, err := writer.CreateFormFile("file", "bookmarks.html")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}

	html := `<!doctype html><html><body><dl><p><dt><h3>Tools</h3><dl><p><dt><a href="https://example.com/a">Existing</a><dt><a href="https://example.com/b">Fresh</a></dl><p></dl></body></html>`
	if _, err := fileWriter.Write([]byte(html)); err != nil {
		t.Fatalf("write html: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/bookmarks/import", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var task struct {
		TaskID string `json:"task_id"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &task); err != nil {
		t.Fatalf("decode task: %v", err)
	}
	if task.TaskID == "" {
		t.Fatalf("expected task id, got %s", recorder.Body.String())
	}

	streamReq := httptest.NewRequest(http.MethodGet, "/api/v1/bookmarks/import/"+task.TaskID+"/events", nil)
	streamRecorder := httptest.NewRecorder()
	router.ServeHTTP(streamRecorder, streamReq)

	if streamRecorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", streamRecorder.Code, streamRecorder.Body.String())
	}

	streamBody := streamRecorder.Body.String()
	if !strings.Contains(streamBody, `"status":"completed"`) {
		t.Fatalf("expected completed status, got %s", streamBody)
	}
	if !strings.Contains(streamBody, `"progress":100`) {
		t.Fatalf("expected 100 progress, got %s", streamBody)
	}
	if !strings.Contains(streamBody, `"created":1`) || !strings.Contains(streamBody, `"skipped":1`) {
		t.Fatalf("expected final counts, got %s", streamBody)
	}

	tree, err := folderRepo.GetTree()
	if err != nil {
		t.Fatalf("reload folders: %v", err)
	}
	if len(tree) != 1 || tree[0].Name != "Tools" {
		t.Fatalf("expected imported folder, got %#v", tree)
	}

	fresh, err := bookmarkRepo.GetByID(existing.ID)
	if err != nil {
		t.Fatalf("reload existing bookmark: %v", err)
	}
	if fresh == nil {
		t.Fatalf("expected existing bookmark to remain")
	}

	items, err := bookmarkRepo.List(repository.BookmarkQuery{FolderID: "all", Page: 1, PageSize: 20})
	if err != nil {
		t.Fatalf("list bookmarks: %v", err)
	}
	if items.Total != 2 {
		t.Fatalf("expected 2 bookmarks after import, got %#v", items)
	}
}
