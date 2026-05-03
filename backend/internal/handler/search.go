package handler

import (
	"net/http"

	"cubby/internal/model"
	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type SearchHandler struct {
	svc *service.SearchService
}

func NewSearchHandler(svc *service.SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

func (h *SearchHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusOK, []model.SearchResult{})
		return
	}
	results, err := h.svc.Search(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if results == nil {
		results = []model.SearchResult{}
	}
	c.JSON(http.StatusOK, results)
}
