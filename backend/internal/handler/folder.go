package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type FolderHandler struct {
	svc *service.FolderService
}

func NewFolderHandler(svc *service.FolderService) *FolderHandler {
	return &FolderHandler{svc: svc}
}

func (h *FolderHandler) List(c *gin.Context) {
	listWithOptionalFilter(c, "parent_id", h.svc.List)
}

func (h *FolderHandler) Create(c *gin.Context) {
	req, ok := bindJSON[createFolderRequest](c)
	if !ok {
		return
	}
	if req.Name == "" {
		badRequest(c, "name required")
		return
	}

	f, err := h.svc.Create(req.Name, req.ParentID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, f)
}

func (h *FolderHandler) Update(c *gin.Context) {
	req, ok := bindJSON[updateFolderRequest](c)
	if !ok {
		return
	}
	if req.Name == "" {
		badRequest(c, "name required")
		return
	}

	f, err := h.svc.Update(c.Param("id"), req.Name, req.Version)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, f)
}

func (h *FolderHandler) Delete(c *gin.Context) {
	deleteByID(c, h.svc.Delete)
}

func (h *FolderHandler) Restore(c *gin.Context) {
	restoreByID(c, h.svc.Restore)
}

func (h *FolderHandler) BatchDelete(c *gin.Context) {
	batchDeleteByIDs(c, h.svc.BatchDelete)
}

func (h *FolderHandler) Move(c *gin.Context) {
	req, ok := bindJSON[moveFolderRequest](c)
	if !ok {
		return
	}
	f, err := h.svc.Move(req.ID, req.ParentID, req.PrevID, req.NextID, nil, req.Version)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, f)
}
