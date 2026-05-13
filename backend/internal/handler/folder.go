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
	parentID := c.Query("parent_id")
	var pid *string
	if parentID != "" {
		pid = &parentID
	}
	folders, err := h.svc.List(pid)
	if err != nil {
		internalError(c, err)
		return
	}
	jsonList(c, folders)
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
	if err := h.svc.Delete(c.Param("id")); err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *FolderHandler) Restore(c *gin.Context) {
	f, err := h.svc.Restore(c.Param("id"))
	if err != nil {
		notFoundOrInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, f)
}

func (h *FolderHandler) BatchDelete(c *gin.Context) {
	req, ok := bindJSON[batchDeleteRequest](c)
	if !ok {
		return
	}
	if err := h.svc.BatchDelete(req.IDs); err != nil {
		internalError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
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
