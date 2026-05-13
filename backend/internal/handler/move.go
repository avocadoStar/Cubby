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
	req, ok := bindJSON[batchMoveRequest](c)
	if !ok {
		return
	}

	items := make([]service.BatchMoveItem, 0, len(req.Items))
	for _, item := range req.Items {
		items = append(items, service.BatchMoveItem{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			PrevID:   item.PrevID,
			NextID:   item.NextID,
			Version:  item.Version,
		})
	}

	result, err := h.svc.BatchMove(items)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
