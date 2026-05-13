package handler

import (
	"net/http"

	"cubby/internal/service"

	"github.com/gin-gonic/gin"
)

type ImportExportHandler struct {
	importSvc *service.ImportService
	exportSvc *service.ExportService
}

func NewImportExportHandler(importSvc *service.ImportService, exportSvc *service.ExportService) *ImportExportHandler {
	return &ImportExportHandler{importSvc: importSvc, exportSvc: exportSvc}
}

func (h *ImportExportHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}
	defer file.Close()

	result, err := h.importSvc.ImportHTML(file)
	if err != nil {
		internalError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *ImportExportHandler) Export(c *gin.Context) {
	result, err := h.exportSvc.Export(c.DefaultQuery("format", "html"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export"})
		return
	}
	c.Data(http.StatusOK, result.ContentType, result.Data)
}
