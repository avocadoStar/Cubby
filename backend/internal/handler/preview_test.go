package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

func TestPreviewSessionsRequireAuth(t *testing.T) {
	r := setupTestRouter(t)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/preview-sessions", bytes.NewReader([]byte(`{"url":"https://example.com","mode":"mobile"}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestPreviewHandlerCreatesSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := service.NewPreviewService()
	svc.SetIDFactoryForTest(func() (string, error) { return "preview-id", nil })
	svc.SetResolverForTest(service.StaticResolverForTest{"example.test": {"93.184.216.34"}})
	handler := NewPreviewHandler(svc)
	r := gin.New()
	r.POST("/preview-sessions", handler.CreateSession)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/preview-sessions", bytes.NewReader([]byte(`{"url":"https://example.test:3000","mode":"mobile"}`)))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var body struct {
		Src       string    `json:"src"`
		ExpiresAt time.Time `json:"expires_at"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Src != "http://localhost:8080/preview/sessions/preview-id" {
		t.Fatalf("unexpected src %q", body.Src)
	}
	if body.ExpiresAt.IsZero() {
		t.Fatal("expected expires_at")
	}
}
