package handler

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

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
