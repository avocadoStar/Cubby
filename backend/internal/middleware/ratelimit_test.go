package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestRateLimitKeepsDifferentPoliciesSeparate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	globalLimiters = map[string]*rateLimiter{}

	router := gin.New()
	router.GET("/strict", RateLimit(1, time.Minute), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	router.GET("/loose", RateLimit(2, time.Minute), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	for _, path := range []string{"/strict", "/loose", "/loose"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req.RemoteAddr = "192.0.2.10:1234"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("expected %s to be allowed, got %d", path, rec.Code)
		}
	}
}
