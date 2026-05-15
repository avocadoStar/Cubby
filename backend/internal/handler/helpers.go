package handler

import (
	"database/sql"
	"errors"
	"log"
	"net/http"

	"cubby/internal/service"

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

func bindJSON[T any](c *gin.Context) (*T, bool) {
	var req T
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "invalid request")
		return nil, false
	}
	return &req, true
}

func jsonList[T any](c *gin.Context, items []T) {
	if items == nil {
		items = []T{}
	}
	c.JSON(http.StatusOK, items)
}

// handleServiceError maps service-layer errors to appropriate HTTP responses.
// It prevents internal error messages from leaking to clients.
// deleteByID handles the common delete-by-path-param pattern.
func deleteByID(c *gin.Context, fn func(id string) error) {
	if err := fn(c.Param("id")); err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// restoreByID handles the common restore-by-path-param pattern.
func restoreByID[T any](c *gin.Context, fn func(id string) (T, error)) {
	result, err := fn(c.Param("id"))
	if err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// batchDeleteByIDs handles the common batch-delete pattern.
func batchDeleteByIDs(c *gin.Context, fn func(ids []string) error) {
	req, ok := bindJSON[batchDeleteRequest](c)
	if !ok {
		return
	}
	if err := fn(req.IDs); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// listWithOptionalFilter handles list endpoints with an optional query-param filter.
func listWithOptionalFilter[T any](c *gin.Context, queryParam string, fn func(*string) ([]T, error)) {
	val := c.Query(queryParam)
	var filter *string
	if val != "" {
		filter = &val
	}
	items, err := fn(filter)
	if err != nil {
		internalError(c, err)
		return
	}
	jsonList(c, items)
}

// handleServiceError maps service-layer errors to appropriate HTTP responses.
// It prevents internal error messages from leaking to clients.
func handleServiceError(c *gin.Context, err error) {
	var appErr *service.AppError
	if errors.As(err, &appErr) {
		switch appErr.Code {
		case "conflict":
			conflictError(c, appErr.Message)
		case "not_found":
			errorResponse(c, http.StatusNotFound, appErr.Message, err)
		case "invalid_input":
			badRequest(c, appErr.Message)
		default:
			internalError(c, err)
		}
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	internalError(c, err)
}
