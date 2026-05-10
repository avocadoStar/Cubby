package handler

import (
	"cubby/internal/config"
	"cubby/internal/db"
	"cubby/internal/repository"
	"cubby/internal/service"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupTestRouter(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	r := gin.New()

	database := db.MustOpen(":memory:")
	t.Cleanup(func() { database.Close() })

	cfg := &config.Config{Password: "testpassword"}

	folderRepo := repository.NewFolderRepo(database)
	bookmarkRepo := repository.NewBookmarkRepo(database)
	moveRepo := repository.NewMoveRepo(database)
	settingRepo := repository.NewSettingRepo(database)

	sortKeySvc := service.NewSortKeyService(bookmarkRepo, folderRepo)

	authSvc := service.NewAuthService(cfg, settingRepo)
	if err := authSvc.SyncConfiguredPassword(); err != nil {
		t.Fatalf("sync password: %v", err)
	}
	folderSvc := service.NewFolderService(folderRepo, bookmarkRepo, sortKeySvc)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo, sortKeySvc)
	moveSvc := service.NewMoveService(moveRepo, folderSvc, sortKeySvc)
	searchSvc := service.NewSearchService(bookmarkRepo)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)
	metadataSvc := service.NewMetadataService()

	SetupRoutes(r, authSvc, folderSvc, bookmarkSvc, searchSvc, importSvc, metadataSvc, moveSvc, cfg)
	return r
}

func TestPublicRoutes(t *testing.T) {
	r := setupTestRouter(t)

	t.Run("login returns 400 for missing body", func(t *testing.T) {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/auth/login", nil)
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Code)
		}
	})
}

func TestProtectedRoutesRequireAuth(t *testing.T) {
	r := setupTestRouter(t)

	protectedEndpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/api/folders"},
		{"GET", "/api/bookmarks"},
		{"GET", "/api/search?q=test"},
		{"GET", "/api/metadata?url=https://example.com"},
		{"GET", "/api/export"},
	}

	for _, ep := range protectedEndpoints {
		t.Run(ep.method+" "+ep.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest(ep.method, ep.path, nil)
			r.ServeHTTP(w, req)
			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected 401, got %d", w.Code)
			}
		})
	}
}
