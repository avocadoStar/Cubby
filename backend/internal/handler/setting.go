package handler

import (
	"cubby/internal/ai"
	"cubby/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	repo     *repository.SettingRepo
	aiClient *ai.Client
}

func NewSettingHandler(repo *repository.SettingRepo, aiClient *ai.Client) *SettingHandler {
	return &SettingHandler{repo: repo, aiClient: aiClient}
}

func (h *SettingHandler) GetAll(c *gin.Context) {
	settings, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if v, ok := settings["ai_api_key"]; ok && len(v) > 8 {
		settings["ai_api_key"] = v[:4] + "****" + v[len(v)-4:]
	}
	c.JSON(http.StatusOK, gin.H{"settings": settings})
}

func (h *SettingHandler) Update(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}
	for k, v := range req {
		if err := h.repo.Set(k, v); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *SettingHandler) TestAI(c *gin.Context) {
	if err := h.aiClient.Test(); err != nil {
		errMsg := err.Error()
		if strings.Contains(errMsg, "API Key") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "请先配置 API Key", "code": "NO_API_KEY"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg, "code": "AI_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "连接成功"})
}
