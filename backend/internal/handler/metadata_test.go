package handler

import (
	"cubby/internal/service"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMetadataFetchRejectsLocalhostAsBadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	handler := NewMetadataHandler(service.NewMetadataService())
	r.GET("/metadata", handler.Fetch)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/metadata?url=http%3A%2F%2Flocalhost%3A5173%2F", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}
