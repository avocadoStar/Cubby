package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type PreviewHandler struct {
	svc *service.PreviewService
}

func NewPreviewHandler(svc *service.PreviewService) *PreviewHandler {
	return &PreviewHandler{svc: svc}
}

func (h *PreviewHandler) CreateSession(c *gin.Context) {
	req, ok := bindJSON[createPreviewSessionRequest](c)
	if !ok {
		return
	}
	session, err := h.svc.CreateSession(req.URL, req.Mode)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, session)
}

func (h *PreviewHandler) Proxy(c *gin.Context) {
	resp, err := h.svc.Proxy(c.Param("id"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	for key, values := range resp.Header {
		for _, value := range values {
			c.Writer.Header().Add(key, value)
		}
	}
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), resp.Body)
}
