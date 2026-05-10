package handler

import (
	"database/sql"
	"errors"
	"log"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

func errorResponse(c *gin.Context, status int, publicMsg string, err error) {
	if err != nil {
		log.Printf("[handler] %s %s: %v", c.Request.Method, c.Request.URL.Path, err)
	}
	c.JSON(status, gin.H{"error": publicMsg})
}

func internalError(c *gin.Context, err error) {
	errorResponse(c, http.StatusInternalServerError, "internal error", err)
}

func notFoundOrInternal(c *gin.Context, err error) {
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	internalError(c, err)
}

func badRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
}

func conflictError(c *gin.Context, msg string) {
	c.JSON(http.StatusConflict, gin.H{"error": msg})
}

func validateURL(rawURL string) (string, string, bool) {
	if len(rawURL) > maxURLLength {
		return "", "url exceeds maximum length of 2048 characters", false
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || !parsed.IsAbs() || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", "url must be a valid absolute URL with http or https scheme", false
	}
	return parsed.String(), "", true
}
