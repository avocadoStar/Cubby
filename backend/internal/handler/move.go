package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type MoveHandler struct {
	svc *service.MoveService
}

func NewMoveHandler(svc *service.MoveService) *MoveHandler {
	return &MoveHandler{svc: svc}
}

func (h *MoveHandler) BatchMove(c *gin.Context) {
	var req struct {
		Items []struct {
			Kind     string  `json:"kind"`
			ID       string  `json:"id"`
			ParentID *string `json:"parent_id"`
			SortKey  string  `json:"sort_key"`
			Version  int     `json:"version"`
		} `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	items := make([]service.BatchMoveItem, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, service.BatchMoveItem{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  item.SortKey,
			Version:  item.Version,
		})
	}

	result, err := h.svc.BatchMove(items)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
