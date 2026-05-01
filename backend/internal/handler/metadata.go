package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type MetadataHandler struct {
	svc *service.MetadataService
}

func NewMetadataHandler(svc *service.MetadataService) *MetadataHandler {
	return &MetadataHandler{svc: svc}
}

func (h *MetadataHandler) Fetch(c *gin.Context) {
	url := c.Query("url")
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url required"})
		return
	}
	meta, err := h.svc.FetchTitle(url)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"title": url})
		return
	}
	c.JSON(http.StatusOK, meta)
}
