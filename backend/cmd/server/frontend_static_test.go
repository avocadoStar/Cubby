package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func writeFrontendDist(t *testing.T) string {
	t.Helper()

	distDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(distDir, "assets"), 0o755); err != nil {
		t.Fatalf("create assets dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("<!doctype html><div id=\"root\"></div>"), 0o644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "assets", "app.js"), []byte("console.log('cubby')"), 0o644); err != nil {
		t.Fatalf("write asset: %v", err)
	}

	return distDir
}

func TestSetupFrontendRoutesServesBuiltAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	setupFrontendRoutes(router, writeFrontendDist(t))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "console.log('cubby')") {
		t.Fatalf("expected static asset body, got %s", rec.Body.String())
	}
}

func TestSetupFrontendRoutesFallsBackToIndexForSpaRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	setupFrontendRoutes(router, writeFrontendDist(t))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/folders/nested/path", nil)

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `id="root"`) {
		t.Fatalf("expected index.html body, got %s", rec.Body.String())
	}
}

func TestSetupFrontendRoutesKeepsApiNotFoundAsJson(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	setupFrontendRoutes(router, writeFrontendDist(t))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/missing", nil)

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"error":"not found"`) {
		t.Fatalf("expected JSON not found body, got %s", rec.Body.String())
	}
}
