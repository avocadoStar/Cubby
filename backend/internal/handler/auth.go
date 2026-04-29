package handler

import (
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookieName = "cubby_session"

type AuthHandler struct {
	mu           sync.RWMutex
	passwordHash string
	sessions     map[string]struct{}
}

func NewAuthHandler(passwordHash string) (*AuthHandler, error) {
	if _, err := bcrypt.Cost([]byte(passwordHash)); err != nil {
		return nil, err
	}

	return &AuthHandler{
		passwordHash: passwordHash,
		sessions:     make(map[string]struct{}),
	}, nil
}

func (h *AuthHandler) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("/status", h.Status)
	group.POST("/login", h.Login)
	group.POST("/logout", h.Logout)
}

func (h *AuthHandler) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, ok := h.sessionTokenFromContext(c)
		if !ok || !h.hasSession(token) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"code": "UNAUTHORIZED", "error": "Unauthorized"})
			return
		}
		c.Next()
	}
}

func (h *AuthHandler) Status(c *gin.Context) {
	token, ok := h.sessionTokenFromContext(c)
	c.JSON(http.StatusOK, gin.H{"authenticated": ok && h.hasSession(token)})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Password) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": "INVALID_REQUEST", "error": "Password is required"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(h.passwordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "INVALID_PASSWORD", "error": "Incorrect password"})
		return
	}

	token := uuid.NewString()
	h.mu.Lock()
	h.sessions[token] = struct{}{}
	h.mu.Unlock()

	h.writeSessionCookie(c, token, false)
	c.JSON(http.StatusOK, gin.H{"authenticated": true})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, ok := h.sessionTokenFromContext(c)
	if ok {
		h.mu.Lock()
		delete(h.sessions, token)
		h.mu.Unlock()
	}

	h.writeSessionCookie(c, "", true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) hasSession(token string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	_, ok := h.sessions[token]
	return ok
}

func (h *AuthHandler) sessionTokenFromContext(c *gin.Context) (string, bool) {
	token, err := c.Cookie(sessionCookieName)
	if err != nil || strings.TrimSpace(token) == "" {
		return "", false
	}
	return token, true
}

func (h *AuthHandler) writeSessionCookie(c *gin.Context, token string, clear bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   map[bool]int{true: -1, false: 0}[clear],
		SameSite: http.SameSiteLaxMode,
		Secure:   requestIsHTTPS(c.Request),
	})
}

func requestIsHTTPS(r *http.Request) bool {
	if r == nil {
		return false
	}
	if r.TLS != nil {
		return true
	}

	proto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	return strings.EqualFold(proto, "https")
}
