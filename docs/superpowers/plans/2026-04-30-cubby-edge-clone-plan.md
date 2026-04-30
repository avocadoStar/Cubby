# Cubby Edge Favorites Clone 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建类 edge://favorites/ 的书签管理应用，含 Go 后端 + React 前端

**Architecture:** 两栏布局 (左树右表)，parentId + LexoRank 排序，Flat Store + 虚拟列表，单用户 JWT 认证，SQLite WAL 模式

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + dnd-kit + react-virtuoso + Zustand | Go + Gin + SQLite

---

## 文件结构

```
backend/
├── cmd/server/main.go
├── go.mod
├── internal/
│   ├── config/config.go
│   ├── model/model.go
│   ├── db/db.go
│   ├── repository/
│   │   ├── folder.go
│   │   ├── bookmark.go
│   │   └── setting.go
│   ├── service/
│   │   ├── auth.go
│   │   ├── folder.go          # 含 LexoRank
│   │   ├── bookmark.go        # 含 LexoRank
│   │   ├── search.go
│   │   └── import.go
│   ├── handler/
│   │   ├── router.go
│   │   ├── auth.go
│   │   ├── folder.go
│   │   ├── bookmark.go
│   │   ├── import_export.go
│   │   └── search.go
│   └── middleware/
│       └── auth.go

frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── types/index.ts
│   ├── services/api.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── folderStore.ts
│   │   └── bookmarkStore.ts
│   ├── hooks/
│   │   ├── useFolders.ts
│   │   └── useBookmarks.ts
│   ├── components/
│   │   ├── LoginPage.tsx
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── FolderNode.tsx
│   │   ├── Toolbar.tsx
│   │   ├── Breadcrumb.tsx
│   │   ├── SearchBox.tsx
│   │   ├── BookmarkRow.tsx
│   │   ├── BatchActionBar.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── MoreMenu.tsx
│   │   ├── CreateFolderModal.tsx
│   │   ├── EditBookmarkModal.tsx
│   │   └── ImportModal.tsx
│   └── utils/
│       ├── favicon.ts
│       └── url.ts
```

---

### Task 1: 项目脚手架 — 后端

**Files:**
- Create: `backend/go.mod`
- Create: `backend/cmd/server/main.go`
- Create: `backend/internal/config/config.go`

- [ ] **Step 1: 初始化 Go module**

```bash
cd backend && go mod init cubby
```

- [ ] **Step 2: 安装依赖**

```bash
cd backend && go get github.com/gin-gonic/gin github.com/golang-jwt/jwt/v5 github.com/mattn/go-sqlite3 golang.org/x/crypto
```

- [ ] **Step 3: 创建配置模块**

`backend/internal/config/config.go`:

```go
package config

import "os"

type Config struct {
	Port       string
	DBPath     string
	JWTSecret  string
	Password   string // bcrypt hash
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" { dbPath = "cubby.db" }
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" { jwtSecret = "change-me-in-production" }

	return &Config{
		Port:      port,
		DBPath:    dbPath,
		JWTSecret: jwtSecret,
	}
}
```

- [ ] **Step 4: 创建入口文件**

`backend/cmd/server/main.go`:

```go
package main

import (
	"cubby/internal/config"
	"cubby/internal/db"
	"cubby/internal/handler"
	"cubby/internal/repository"
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	database := db.MustOpen(cfg.DBPath)
	defer database.Close()

	folderRepo := &repository.FolderRepo{DB: database}
	bookmarkRepo := &repository.BookmarkRepo{DB: database}
	settingRepo := &repository.SettingRepo{DB: database}

	authSvc := service.NewAuthService(cfg, settingRepo)
	folderSvc := service.NewFolderService(folderRepo)
	bookmarkSvc := service.NewBookmarkService(bookmarkRepo)
	searchSvc := service.NewSearchService(bookmarkRepo)
	importSvc := service.NewImportService(folderRepo, bookmarkRepo)

	r := gin.Default()
	handler.SetupRoutes(r, authSvc, folderSvc, bookmarkSvc, searchSvc, importSvc, cfg)

	r.Run(":" + cfg.Port)
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/ && git commit -m "feat: scaffold Go backend with Gin and config"
```

---

### Task 2: 数据库初始化 + 模型定义

**Files:**
- Create: `backend/internal/model/model.go`
- Create: `backend/internal/db/db.go`

- [ ] **Step 1: 创建模型**

`backend/internal/model/model.go`:

```go
package model

type Folder struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ParentID  *string `json:"parent_id"`
	SortKey   string  `json:"sort_key"`
	Version   int     `json:"version"`
	DeletedAt *string `json:"-"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type Bookmark struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	URL       string  `json:"url"`
	FolderID  *string `json:"folder_id"`
	SortKey   string  `json:"sort_key"`
	Version   int     `json:"version"`
	DeletedAt *string `json:"-"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type Setting struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
```

- [ ] **Step 2: 创建数据库初始化**

`backend/internal/db/db.go`:

```go
package db

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func MustOpen(path string) *sql.DB {
	db, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil { panic(err) }
	db.SetMaxOpenConns(1) // SQLite single-writer
	migrate(db)
	return db
}

func migrate(db *sql.DB) {
	ddl := `
	CREATE TABLE IF NOT EXISTS folder (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		parent_id  TEXT REFERENCES folder(id) ON DELETE CASCADE,
		sort_key   TEXT NOT NULL,
		version    INTEGER NOT NULL DEFAULT 1,
		deleted_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS idx_folder_parent_sort ON folder(parent_id, sort_key);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_parent_sort_unique
		ON folder(parent_id, sort_key) WHERE deleted_at IS NULL;

	CREATE TABLE IF NOT EXISTS bookmark (
		id         TEXT PRIMARY KEY,
		title      TEXT NOT NULL,
		url        TEXT NOT NULL,
		folder_id  TEXT REFERENCES folder(id) ON DELETE SET NULL,
		sort_key   TEXT NOT NULL,
		version    INTEGER NOT NULL DEFAULT 1,
		deleted_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS idx_bookmark_folder_sort ON bookmark(folder_id, sort_key);
	CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_folder_sort_unique
		ON bookmark(folder_id, sort_key) WHERE deleted_at IS NULL;

	CREATE TABLE IF NOT EXISTS setting (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`
	if _, err := db.Exec(ddl); err != nil { panic(err) }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/model/ backend/internal/db/ && git commit -m "feat: add data models and SQLite migration"
```

---

### Task 3: Repository 层

**Files:**
- Create: `backend/internal/repository/folder.go`
- Create: `backend/internal/repository/bookmark.go`
- Create: `backend/internal/repository/setting.go`

- [ ] **Step 1: Folder Repository**

`backend/internal/repository/folder.go`:

```go
package repository

import (
	"cubby/internal/model"
	"database/sql"
	"github.com/google/uuid"
)

type FolderRepo struct{ DB *sql.DB }

func (r *FolderRepo) List(parentID *string) ([]model.Folder, error) {
	var rows *sql.Rows
	var err error
	if parentID == nil {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
			FROM folder WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY sort_key`)
	} else {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
			FROM folder WHERE parent_id=? AND deleted_at IS NULL ORDER BY sort_key`, *parentID)
	}
	if err != nil { return nil, err }
	defer rows.Close()
	var folders []model.Folder
	for rows.Next() {
		var f model.Folder
		rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt)
		folders = append(folders, f)
	}
	return folders, nil
}

func (r *FolderRepo) Create(name string, parentID *string, sortKey string) (*model.Folder, error) {
	f := &model.Folder{ID: uuid.New().String(), Name: name, ParentID: parentID, SortKey: sortKey}
	_, err := r.DB.Exec(`INSERT INTO folder (id,name,parent_id,sort_key) VALUES (?,?,?,?)`,
		f.ID, f.Name, f.ParentID, f.SortKey)
	return f, err
}

func (r *FolderRepo) Update(id, name string, version int) (*model.Folder, error) {
	var f model.Folder
	err := r.DB.QueryRow(`UPDATE folder SET name=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL
		RETURNING id,name,parent_id,sort_key,version,created_at,updated_at`,
		name, id, version).Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt)
	if err == sql.ErrNoRows { return nil, ErrConflict }
	return &f, err
}

func (r *FolderRepo) SoftDelete(id string) error {
	_, err := r.DB.Exec(`UPDATE folder SET deleted_at=datetime('now') WHERE id=?`, id)
	return err
}
```

- [ ] **Step 2: Bookmark Repository**

`backend/internal/repository/bookmark.go`:

```go
package repository

import (
	"cubby/internal/model"
	"database/sql"
	"github.com/google/uuid"
)

var ErrConflict = sql.ErrNoRows

type BookmarkRepo struct{ DB *sql.DB }

func (r *BookmarkRepo) List(folderID *string) ([]model.Bookmark, error) {
	var rows *sql.Rows
	var err error
	if folderID == nil {
		rows, err = r.DB.Query(`SELECT id,title,url,folder_id,sort_key,version,created_at,updated_at
			FROM bookmark WHERE folder_id IS NULL AND deleted_at IS NULL ORDER BY sort_key`)
	} else {
		rows, err = r.DB.Query(`SELECT id,title,url,folder_id,sort_key,version,created_at,updated_at
			FROM bookmark WHERE folder_id=? AND deleted_at IS NULL ORDER BY sort_key`, *folderID)
	}
	if err != nil { return nil, err }
	defer rows.Close()
	var bookmarks []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		rows.Scan(&b.ID, &b.Title, &b.URL, &b.FolderID, &b.SortKey, &b.Version, &b.CreatedAt, &b.UpdatedAt)
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
}

func (r *BookmarkRepo) Create(title, url string, folderID *string, sortKey string) (*model.Bookmark, error) {
	b := &model.Bookmark{ID: uuid.New().String(), Title: title, URL: url, FolderID: folderID, SortKey: sortKey}
	_, err := r.DB.Exec(`INSERT INTO bookmark (id,title,url,folder_id,sort_key) VALUES (?,?,?,?,?)`,
		b.ID, b.Title, b.URL, b.FolderID, b.SortKey)
	return b, err
}

func (r *BookmarkRepo) Update(id, title, url string, version int) (*model.Bookmark, error) {
	var b model.Bookmark
	err := r.DB.QueryRow(`UPDATE bookmark SET title=?, url=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL
		RETURNING id,title,url,folder_id,sort_key,version,created_at,updated_at`,
		title, url, id, version).Scan(&b.ID, &b.Title, &b.URL, &b.FolderID, &b.SortKey, &b.Version, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows { return nil, ErrConflict }
	return &b, err
}

func (r *BookmarkRepo) SoftDelete(id string) error {
	_, err := r.DB.Exec(`UPDATE bookmark SET deleted_at=datetime('now') WHERE id=?`, id)
	return err
}

func (r *BookmarkRepo) BatchSoftDelete(ids []string) error {
	tx, _ := r.DB.Begin()
	defer tx.Rollback()
	for _, id := range ids {
		if _, err := tx.Exec(`UPDATE bookmark SET deleted_at=datetime('now') WHERE id=?`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
```

- [ ] **Step 3: Setting Repository**

`backend/internal/repository/setting.go`:

```go
package repository

import "database/sql"

type SettingRepo struct{ DB *sql.DB }

func (r *SettingRepo) Get(key string) (string, error) {
	var v string
	err := r.DB.QueryRow(`SELECT value FROM setting WHERE key=?`, key).Scan(&v)
	return v, err
}

func (r *SettingRepo) Set(key, value string) error {
	_, err := r.DB.Exec(`INSERT OR REPLACE INTO setting (key,value) VALUES (?,?)`, key, value)
	return err
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/repository/ && git commit -m "feat: add repository layer for folder, bookmark, setting"
```

---

### Task 4: LexoRank 排序服务

**Files:**
- Create: `backend/internal/service/lexorank.go`

- [ ] **Step 1: LexoRank 实现**

`backend/internal/service/lexorank.go`:

```go
package service

import (
	"fmt"
	"strings"
)

// between generates a sort key between prev and next.
// Uses character-by-character midpoint insertion with fallback to appending.
func between(prev, next string) string {
	minLen := len(prev)
	if len(next) < minLen { minLen = len(next) }

	i := 0
	for i < minLen && prev[i] == next[i] { i++ }

	if i == minLen {
		if len(prev) < len(next) {
			return prev + midpoint('a', next[i])
		}
		return prev + "n"
	}

	pc := int(prev[i])
	nc := int(next[i])
	if nc-pc > 1 {
		return prev[:i] + string(rune(pc+(nc-pc)/2))
	}

	return prev[:i] + string(rune(pc)) + "n"
}

func midpoint(a, b byte) string {
	return string(rune((int(a) + int(b)) / 2))
}

// after returns a sort key after the given key.
func after(key string) string {
	return key + "n"
}

// before returns a sort key before the given key.
func before(key string) string {
	return key[:len(key)-1] + string(key[len(key)-1]-1) + "n"
}

// rebalanceThreshold is the minimum distance between adjacent keys before rebalance.
const rebalanceThreshold = 2

func needsRebalance(prev, next string) bool {
	if prev == "" || next == "" { return false }
	diff := 0
	minLen := len(prev)
	if len(next) < minLen { minLen = len(next) }
	for i := 0; i < minLen; i++ {
		diff += int(next[i]) - int(prev[i])
	}
	return diff <= rebalanceThreshold
}

// rebalance generates evenly-spaced sort keys for n children.
func rebalanceKeys(n int) []string {
	keys := make([]string, n)
	step := 256 / (n + 1)
	for i := 0; i < n; i++ {
		keys[i] = string(rune((i + 1) * step))
	}
	return keys
}
```

- [ ] **Step 2: LexoRank 测试**

`backend/internal/service/lexorank_test.go`:

```go
package service

import "testing"

func TestBetween(t *testing.T) {
	b := between("a", "c")
	if b <= "a" || b >= "c" {
		t.Errorf("between('a','c') = %s, want between 'a' and 'c'", b)
	}
}

func TestBetweenAdjacent(t *testing.T) {
	b := between("a", "b")
	if b <= "a" || b >= "b" {
		t.Errorf("between('a','b') = %s, want between 'a' and 'b'", b)
	}
}

func TestAfter(t *testing.T) {
	a := after("m")
	if a <= "m" {
		t.Errorf("after('m') = %s, want > 'm'", a)
	}
}

func TestBefore(t *testing.T) {
	b := before("n")
	if b >= "n" {
		t.Errorf("before('n') = %s, want < 'n'", b)
	}
}

func TestNeedsRebalance(t *testing.T) {
	if needsRebalance("a", "d") {
		t.Error("gap 3 should not trigger rebalance")
	}
	if !needsRebalance("a", "b") {
		t.Error("gap 1 should trigger rebalance")
	}
}
```

- [ ] **Step 3: 运行测试**

```bash
cd backend && go test ./internal/service/ -v
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/lexorank.go backend/internal/service/lexorank_test.go && git commit -m "feat: add LexoRank sort key generation with tests"
```

---

### Task 5: Auth 服务

**Files:**
- Create: `backend/internal/service/auth.go`
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/handler/auth.go`

- [ ] **Step 1: Auth 服务**

`backend/internal/service/auth.go`:

```go
package service

import (
	"cubby/internal/config"
	"cubby/internal/repository"
	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
	"time"
)

type AuthService struct {
	cfg    *config.Config
	setting *repository.SettingRepo
}

func NewAuthService(cfg *config.Config, setting *repository.SettingRepo) *AuthService {
	return &AuthService{cfg: cfg, setting: setting}
}

func (s *AuthService) SetupPassword(password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil { return err }
	return s.setting.Set("password_hash", string(hash))
}

func (s *AuthService) VerifyPassword(password string) bool {
	hash, err := s.setting.Get("password_hash")
	if err != nil { return false }
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) GenerateToken() (string, error) {
	claims := jwt.MapClaims{"exp": time.Now().Add(7 * 24 * time.Hour).Unix()}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
```

- [ ] **Step 2: JWT 中间件**

`backend/internal/middleware/auth.go`:

```go
package middleware

import (
	"cubby/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"strings"
)

func AuthRequired(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			return []byte(cfg.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Next()
	}
}
```

- [ ] **Step 3: Auth Handler**

`backend/internal/handler/auth.go`:

```go
package handler

import (
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type AuthHandler struct{ svc *service.AuthService }

func NewAuthHandler(svc *service.AuthService) *AuthHandler { return &AuthHandler{svc: svc} }

func (h *AuthHandler) Login(c *gin.Context) {
	var req struct{ Password string `json:"password"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if !h.svc.VerifyPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong password"})
		return
	}
	token, err := h.svc.GenerateToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

func (h *AuthHandler) Setup(c *gin.Context) {
	var req struct{ Password string `json:"password"` }
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.svc.SetupPassword(req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "setup failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/auth.go backend/internal/middleware/auth.go backend/internal/handler/auth.go && git commit -m "feat: add auth service, JWT middleware, and auth handler"
```

---

### Task 6: Folder 服务 + Handler

**Files:**
- Create: `backend/internal/service/folder.go`
- Create: `backend/internal/handler/folder.go`

- [ ] **Step 1: Folder 服务（含 LexoRank move）**

`backend/internal/service/folder.go`:

```go
package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"errors"
	"fmt"
)

type FolderService struct {
	repo *repository.FolderRepo
}

func NewFolderService(repo *repository.FolderRepo) *FolderService {
	return &FolderService{repo: repo}
}

func (s *FolderService) List(parentID *string) ([]model.Folder, error) {
	return s.repo.List(parentID)
}

func (s *FolderService) Create(name string, parentID *string) (*model.Folder, error) {
	var children []model.Folder
	if parentID == nil {
		children, _ = s.repo.List(nil)
	} else {
		children, _ = s.repo.List(parentID)
	}
	sortKey := "n"
	if len(children) > 0 {
		sortKey = after(children[len(children)-1].SortKey)
	}
	for i := 0; i < 3; i++ {
		f, err := s.repo.Create(name, parentID, sortKey)
		if err == nil { return f, nil }
		sortKey = after(sortKey)
	}
	return nil, errors.New("failed to create folder after retries")
}

func (s *FolderService) Update(id, name string, version int) (*model.Folder, error) {
	return s.repo.Update(id, name, version)
}

func (s *FolderService) Delete(id string) error { return s.repo.SoftDelete(id) }

func (s *FolderService) Move(id string, parentID *string, prevID, nextID *string, version int) (*model.Folder, error) {
	sortKey, err := s.computeSortKey(parentID, prevID, nextID)
	if err != nil { return nil, err }
	return s.repo.Move(id, parentID, sortKey, version)
}

func (s *FolderService) computeSortKey(parentID, prevID, nextID *string) (string, error) {
	if prevID == nil && nextID == nil {
		return "n", nil // only child
	}
	if prevID == nil && nextID != nil {
		next, err := s.repo.Get(*nextID)
		if err != nil { return "", err }
		return before(next.SortKey), nil
	}
	if prevID != nil && nextID == nil {
		prev, err := s.repo.Get(*prevID)
		if err != nil { return "", err }
		return after(prev.SortKey), nil
	}
	prev, err := s.repo.Get(*prevID)
	if err != nil { return "", err }
	next, err2 := s.repo.Get(*nextID)
	if err2 != nil { return "", err2 }
	// Validate same parent
	if fmt.Sprint(prev.ParentID) != fmt.Sprint(next.ParentID) {
		return "", errors.New("prev and next not in same parent")
	}
	if needsRebalance(prev.SortKey, next.SortKey) {
		return "", ErrRebalanceNeeded
	}
	return between(prev.SortKey, next.SortKey), nil
}

var ErrRebalanceNeeded = errors.New("rebalance needed")
```

- [ ] **Step 2: Folder Repository 补充**

在 `backend/internal/repository/folder.go` 添加:

```go
func (r *FolderRepo) Get(id string) (*model.Folder, error) {
	var f model.Folder
	err := r.DB.QueryRow(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
		FROM folder WHERE id=? AND deleted_at IS NULL`, id).
		Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt)
	return &f, err
}

func (r *FolderRepo) Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error) {
	var f model.Folder
	err := r.DB.QueryRow(`UPDATE folder SET parent_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL
		RETURNING id,name,parent_id,sort_key,version,created_at,updated_at`,
		parentID, sortKey, id, version).
		Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt)
	if err == sql.ErrNoRows { return nil, ErrConflict }
	return &f, err
}
```

- [ ] **Step 3: Folder Handler**

`backend/internal/handler/folder.go`:

```go
package handler

import (
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type FolderHandler struct{ svc *service.FolderService }

func NewFolderHandler(svc *service.FolderService) *FolderHandler { return &FolderHandler{svc: svc} }

func (h *FolderHandler) List(c *gin.Context) {
	parentID := c.Query("parent_id")
	var pid *string
	if parentID != "" { pid = &parentID }
	folders, err := h.svc.List(pid)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(200, folders)
}

func (h *FolderHandler) Create(c *gin.Context) {
	var req struct {
		Name     string  `json:"name"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	f, err := h.svc.Create(req.Name, req.ParentID)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(201, f)
}

func (h *FolderHandler) Update(c *gin.Context) {
	var req struct {
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	f, err := h.svc.Update(c.Param("id"), req.Name, req.Version)
	if err != nil { c.JSON(409, gin.H{"error": "conflict"}); return }
	c.JSON(200, f)
}

func (h *FolderHandler) Delete(c *gin.Context) {
	h.svc.Delete(c.Param("id"))
	c.Status(204)
}

func (h *FolderHandler) Move(c *gin.Context) {
	var req struct {
		ID       string  `json:"id"`
		ParentID *string `json:"parent_id"`
		PrevID   *string `json:"prev_id"`
		NextID   *string `json:"next_id"`
		Version  int     `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	f, err := h.svc.Move(req.ID, req.ParentID, req.PrevID, req.NextID, req.Version)
	if err != nil { c.JSON(409, gin.H{"error": "conflict"}); return }
	c.JSON(200, f)
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/folder.go backend/internal/handler/folder.go backend/internal/repository/folder.go && git commit -m "feat: add folder service with LexoRank move and folder handler"
```

---

### Task 7: Bookmark 服务 + Handler

**Files:**
- Create: `backend/internal/service/bookmark.go`
- Create: `backend/internal/handler/bookmark.go`

- [ ] **Step 1: Bookmark 服务**

`backend/internal/service/bookmark.go`:

```go
package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

type BookmarkService struct {
	repo *repository.BookmarkRepo
}

func NewBookmarkService(repo *repository.BookmarkRepo) *BookmarkService {
	return &BookmarkService{repo: repo}
}

func (s *BookmarkService) List(folderID *string) ([]model.Bookmark, error) {
	return s.repo.List(folderID)
}

func (s *BookmarkService) Create(title, url string, folderID *string) (*model.Bookmark, error) {
	children, _ := s.repo.List(folderID)
	sortKey := "n"
	if len(children) > 0 {
		sortKey = after(children[len(children)-1].SortKey)
	}
	for i := 0; i < 3; i++ {
		b, err := s.repo.Create(title, url, folderID, sortKey)
		if err == nil { return b, nil }
		sortKey = after(sortKey)
	}
	return nil, repository.ErrConflict
}

func (s *BookmarkService) Update(id, title, url string, version int) (*model.Bookmark, error) {
	return s.repo.Update(id, title, url, version)
}

func (s *BookmarkService) Delete(id string) error { return s.repo.SoftDelete(id) }

func (s *BookmarkService) Move(id string, folderID *string, prevID, nextID *string, version int) (*model.Bookmark, error) {
	var prev, next *model.Bookmark
	if prevID != nil { prev, _ = s.repo.GetByID(*prevID) }
	if nextID != nil { next, _ = s.repo.GetByID(*nextID) }
	var sortKey string
	if prev == nil && next == nil { sortKey = "n" } else
	if prev == nil { sortKey = before(next.SortKey) } else
	if next == nil { sortKey = after(prev.SortKey) } else {
		if needsRebalance(prev.SortKey, next.SortKey) {
			return nil, ErrRebalanceNeeded
		}
		sortKey = between(prev.SortKey, next.SortKey)
	}
	return s.repo.Move(id, folderID, sortKey, version)
}

func (s *BookmarkService) BatchMove(ids []string, targetFolderID, anchorID, position string) error {
	return s.repo.BatchMove(ids, targetFolderID, anchorID, position)
}

func (s *BookmarkService) BatchDelete(ids []string) error {
	return s.repo.BatchSoftDelete(ids)
}
```

- [ ] **Step 2: Bookmark Repository 补充**

在 `backend/internal/repository/bookmark.go` 添加:

```go
func (r *BookmarkRepo) GetByID(id string) (*model.Bookmark, error) {
	var b model.Bookmark
	err := r.DB.QueryRow(`SELECT id,title,url,folder_id,sort_key,version,created_at,updated_at
		FROM bookmark WHERE id=? AND deleted_at IS NULL`, id).
		Scan(&b.ID, &b.Title, &b.URL, &b.FolderID, &b.SortKey, &b.Version, &b.CreatedAt, &b.UpdatedAt)
	return &b, err
}

func (r *BookmarkRepo) Move(id string, folderID *string, sortKey string, version int) (*model.Bookmark, error) {
	var b model.Bookmark
	err := r.DB.QueryRow(`UPDATE bookmark SET folder_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL
		RETURNING id,title,url,folder_id,sort_key,version,created_at,updated_at`,
		folderID, sortKey, id, version).
		Scan(&b.ID, &b.Title, &b.URL, &b.FolderID, &b.SortKey, &b.Version, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows { return nil, ErrConflict }
	return &b, err
}

func (r *BookmarkRepo) BatchMove(ids []string, targetFolderID, anchorID, position string) error {
	tx, _ := r.DB.Begin()
	defer tx.Rollback()
	// Simplified: move each sequentially after anchor
	for _, id := range ids {
		tx.Exec(`UPDATE bookmark SET folder_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
			WHERE id=? AND deleted_at IS NULL`, targetFolderID, "n"+id[:8], id)
	}
	return tx.Commit()
}

func (r *BookmarkRepo) Search(query string, folderID *string) ([]model.Bookmark, error) {
	q := "%" + query + "%"
	rows, err := r.DB.Query(`SELECT id,title,url,folder_id,sort_key,version,created_at,updated_at
		FROM bookmark WHERE (title LIKE ? OR url LIKE ?) AND deleted_at IS NULL ORDER BY sort_key`, q, q)
	if err != nil { return nil, err }
	defer rows.Close()
	var bookmarks []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		rows.Scan(&b.ID, &b.Title, &b.URL, &b.FolderID, &b.SortKey, &b.Version, &b.CreatedAt, &b.UpdatedAt)
		bookmarks = append(bookmarks, b)
	}
	return bookmarks, nil
}
```

- [ ] **Step 3: Bookmark Handler**

`backend/internal/handler/bookmark.go`:

```go
package handler

import (
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type BookmarkHandler struct{ svc *service.BookmarkService }

func NewBookmarkHandler(svc *service.BookmarkService) *BookmarkHandler {
	return &BookmarkHandler{svc: svc}
}

func (h *BookmarkHandler) List(c *gin.Context) {
	folderID := c.Query("folder_id")
	var fid *string
	if folderID != "" { fid = &folderID }
	bookmarks, err := h.svc.List(fid)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(200, bookmarks)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req struct {
		Title    string  `json:"title"`
		URL      string  `json:"url"`
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	b, err := h.svc.Create(req.Title, req.URL, req.FolderID)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(201, b)
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	var req struct {
		Title   string `json:"title"`
		URL     string `json:"url"`
		Version int    `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	b, err := h.svc.Update(c.Param("id"), req.Title, req.URL, req.Version)
	if err != nil { c.JSON(409, gin.H{"error": "conflict"}); return }
	c.JSON(200, b)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	h.svc.Delete(c.Param("id"))
	c.Status(204)
}

func (h *BookmarkHandler) Move(c *gin.Context) {
	var req struct {
		ID       string  `json:"id"`
		FolderID *string `json:"folder_id"`
		PrevID   *string `json:"prev_id"`
		NextID   *string `json:"next_id"`
		Version  int     `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	b, err := h.svc.Move(req.ID, req.FolderID, req.PrevID, req.NextID, req.Version)
	if err != nil { c.JSON(409, gin.H{"error": "conflict"}); return }
	c.JSON(200, b)
}

func (h *BookmarkHandler) BatchMove(c *gin.Context) {
	var req struct {
		IDs            []string `json:"ids"`
		TargetFolderID string   `json:"target_folder_id"`
		AnchorID       string   `json:"anchor_id"`
		Position       string   `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	if err := h.svc.BatchMove(req.IDs, req.TargetFolderID, req.AnchorID, req.Position); err != nil {
		c.JSON(500, gin.H{"error": err.Error()}); return
	}
	c.Status(204)
}

func (h *BookmarkHandler) BatchDelete(c *gin.Context) {
	var req struct{ IDs []string `json:"ids"` }
	if err := c.ShouldBindJSON(&req); err != nil { c.JSON(400, gin.H{"error": "invalid"}); return }
	if err := h.svc.BatchDelete(req.IDs); err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.Status(204)
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/bookmark.go backend/internal/handler/bookmark.go backend/internal/repository/bookmark.go && git commit -m "feat: add bookmark service and handler with batch operations"
```

---

### Task 8: 搜索 + 导入导出

**Files:**
- Create: `backend/internal/service/search.go`
- Create: `backend/internal/service/import.go`
- Create: `backend/internal/handler/search.go`
- Create: `backend/internal/handler/import_export.go`

- [ ] **Step 1: 搜索服务**

`backend/internal/service/search.go`:

```go
package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

type SearchService struct{ repo *repository.BookmarkRepo }

func NewSearchService(repo *repository.BookmarkRepo) *SearchService {
	return &SearchService{repo: repo}
}

func (s *SearchService) Search(query string, folderID *string) ([]model.Bookmark, error) {
	return s.repo.Search(query, folderID)
}
```

- [ ] **Step 2: 导入服务**

`backend/internal/service/import.go`:

```go
package service

import (
	"cubby/internal/repository"
	"io"
	"net/url"
	"regexp"
	"strings"
)

type ImportService struct {
	folderRepo *repository.FolderRepo
	bookmarkRepo *repository.BookmarkRepo
}

func NewImportService(fr *repository.FolderRepo, br *repository.BookmarkRepo) *ImportService {
	return &ImportService{folderRepo: fr, bookmarkRepo: br}
}

type ImportResult struct {
	Bookmarks int `json:"bookmarks"`
	Folders   int `json:"folders"`
}

func (s *ImportService) ImportHTML(reader io.Reader) (*ImportResult, error) {
	content, err := io.ReadAll(reader)
	if err != nil { return nil, err }
	text := string(content)
	result := &ImportResult{}
	// Parse <A> tags for bookmarks, <DT><H3> for folders
	aRe := regexp.MustCompile(`<A[^>]*HREF="([^"]*)"[^>]*>(.*?)</A>`)
	matches := aRe.FindAllStringSubmatch(text, -1)
	for _, m := range matches {
		href := strings.TrimSpace(m[1])
		title := stripTags(strings.TrimSpace(m[2]))
		if title == "" { title = href }
		if _, parseErr := url.Parse(href); parseErr != nil { continue }
		s.bookmarkRepo.Create(title, href, nil, "n"+href[:min(len(href),4)])
		result.Bookmarks++
	}
	return result, nil
}

func stripTags(s string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	return re.ReplaceAllString(s, "")
}
```

- [ ] **Step 3: 搜索 Handler + 导入导出 Handler**

`backend/internal/handler/search.go`:

```go
package handler

import (
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type SearchHandler struct{ svc *service.SearchService }

func NewSearchHandler(svc *service.SearchService) *SearchHandler {
	return &SearchHandler{svc: svc}
}

func (h *SearchHandler) Search(c *gin.Context) {
	q := c.Query("q")
	folderID := c.Query("folder_id")
	var fid *string
	if folderID != "" { fid = &folderID }
	results, err := h.svc.Search(q, fid)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(200, results)
}
```

`backend/internal/handler/import_export.go`:

```go
package handler

import (
	"cubby/internal/model"
	"cubby/internal/service"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"net/http"
	"strings"
)

type ImportExportHandler struct {
	importSvc   *service.ImportService
	folderSvc   *service.FolderService
	bookmarkSvc *service.BookmarkService
}

func NewImportExportHandler(is *service.ImportService, fs *service.FolderService, bs *service.BookmarkService) *ImportExportHandler {
	return &ImportExportHandler{importSvc: is, folderSvc: fs, bookmarkSvc: bs}
}

func (h *ImportExportHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil { c.JSON(400, gin.H{"error": "no file"}); return }
	result, err := h.importSvc.ImportHTML(file)
	if err != nil { c.JSON(500, gin.H{"error": err.Error()}); return }
	c.JSON(200, result)
}

func (h *ImportExportHandler) Export(c *gin.Context) {
	format := c.DefaultQuery("format", "html")
	if format == "json" {
		folders, _ := h.folderSvc.List(nil)
		bookmarks, _ := h.bookmarkSvc.List(nil)
		data := gin.H{"folders": folders, "bookmarks": bookmarks}
		j, _ := json.Marshal(data)
		c.Data(200, "application/json", j)
		return
	}
	// HTML export
	var b strings.Builder
	b.WriteString("<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV=\"Content-Type\" CONTENT=\"text/html; charset=UTF-8\">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n")
	exportBookmarks(&b, h.bookmarkSvc, nil)
	b.WriteString("</DL><p>\n")
	c.Data(200, "text/html; charset=utf-8", []byte(b.String()))
}

func exportBookmarks(b *strings.Builder, svc *service.BookmarkService, folderID *string) {
	bookmarks, _ := svc.List(folderID)
	for _, bm := range bookmarks {
		b.WriteString("<DT><A HREF=\"" + bm.URL + "\">" + bm.Title + "</A>\n")
	}
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/service/search.go backend/internal/service/import.go backend/internal/handler/search.go backend/internal/handler/import_export.go && git commit -m "feat: add search, import, and export services and handlers"
```

---

### Task 9: 路由注册

**Files:**
- Create: `backend/internal/handler/router.go`

- [ ] **Step 1: 路由设置**

`backend/internal/handler/router.go`:

```go
package handler

import (
	"cubby/internal/config"
	"cubby/internal/middleware"
	"cubby/internal/service"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, authSvc *service.AuthService, folderSvc *service.FolderService,
	bookmarkSvc *service.BookmarkService, searchSvc *service.SearchService,
	importSvc *service.ImportService, cfg *config.Config) {

	authH := NewAuthHandler(authSvc)
	folderH := NewFolderHandler(folderSvc)
	bookmarkH := NewBookmarkHandler(bookmarkSvc)
	searchH := NewSearchHandler(searchSvc)
	importExportH := NewImportExportHandler(importSvc, folderSvc, bookmarkSvc)

	api := r.Group("/api")

	// Auth
	api.POST("/auth/login", authH.Login)
	api.POST("/auth/setup", authH.Setup)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthRequired(cfg))
	{
		protected.GET("/folders", folderH.List)
		protected.POST("/folders", folderH.Create)
		protected.PUT("/folders/:id", folderH.Update)
		protected.DELETE("/folders/:id", folderH.Delete)
		protected.POST("/folders/move", folderH.Move)

		protected.GET("/bookmarks", bookmarkH.List)
		protected.POST("/bookmarks", bookmarkH.Create)
		protected.PUT("/bookmarks/:id", bookmarkH.Update)
		protected.DELETE("/bookmarks/:id", bookmarkH.Delete)
		protected.POST("/bookmarks/move", bookmarkH.Move)
		protected.POST("/bookmarks/batch-move", bookmarkH.BatchMove)
		protected.POST("/bookmarks/batch-delete", bookmarkH.BatchDelete)

		protected.GET("/search", searchH.Search)
		protected.POST("/import", importExportH.Import)
		protected.GET("/export", importExportH.Export)
	}
}
```

- [ ] **Step 2: 修正 main.go 中的路径引用**

确认 `backend/cmd/server/main.go` 中的 import 路径与模块一致 (`cubby/...`)

- [ ] **Step 3: 编译验证**

```bash
cd backend && go build ./cmd/server/
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/handler/router.go && git commit -m "feat: wire up all routes with auth middleware"
```

---

### Task 10: 前端脚手架

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: 初始化项目**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
npm install react-router-dom zustand @dnd-kit/core @dnd-kit/sortable react-virtuoso lucide-react
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: 配置 Tailwind**

`frontend/src/index.css`:

```css
@import "tailwindcss";

:root {
  --color-accent: #0078D4;
  --color-selected: #E5F0FF;
  --color-hover: #F5F5F5;
  --color-border: #E8E8E8;
}

body {
  font-family: 'Segoe UI', -apple-system, sans-serif;
  font-size: 13px;
  background: #FFFFFF;
  color: #1a1a1a;
  margin: 0;
}
```

- [ ] **Step 3: 入口文件**

`frontend/src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

`frontend/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './components/LoginPage'
import MainLayout from './components/MainLayout'

export default function App() {
  const token = useAuthStore(s => s.token)
  if (!token) {
    return <LoginPage />
  }
  return (
    <Routes>
      <Route path="/*" element={<MainLayout />} />
    </Routes>
  )
}
```

- [ ] **Step 4: 验证启动**

```bash
cd frontend && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add frontend/ && git commit -m "feat: scaffold React frontend with Vite, Tailwind, and routing"
```

---

### Task 11: 类型定义 + API 客户端

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: 类型定义**

`frontend/src/types/index.ts`:

```ts
export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_key: string
  version: number
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  folder_id: string | null
  sort_key: string
  version: number
  created_at: string
  updated_at: string
}

export interface MoveRequest {
  id: string
  parent_id?: string | null
  prev_id?: string | null
  next_id?: string | null
  version: number
}

export interface BatchMoveRequest {
  ids: string[]
  target_folder_id: string
  anchor_id: string
  position: 'before' | 'after'
}
```

- [ ] **Step 2: API 客户端**

`frontend/src/services/api.ts`:

```ts
import { Folder, Bookmark, MoveRequest, BatchMoveRequest } from '../types'

const BASE = '/api'

function headers(): Record<string, string> {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, { ...options, headers: { ...headers(), ...options?.headers } })
  if (res.status === 401) { localStorage.removeItem('token'); window.location.reload() }
  if (res.status === 409) throw new ConflictError()
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return undefined as T
  return res.json()
}

export class ConflictError extends Error { constructor() { super('conflict') } }

export const api = {
  // Auth
  login: (password: string) => request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),

  // Folders
  getFolders: (parentId?: string | null) =>
    request<Folder[]>(`/folders${parentId ? `?parent_id=${parentId}` : ''}`),
  createFolder: (name: string, parentId?: string | null) =>
    request<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name, parent_id: parentId }) }),
  updateFolder: (id: string, name: string, version: number) =>
    request<Folder>(`/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name, version }) }),
  deleteFolder: (id: string) =>
    request<void>(`/folders/${id}`, { method: 'DELETE' }),
  moveFolder: (req: MoveRequest) =>
    request<Folder>('/folders/move', { method: 'POST', body: JSON.stringify(req) }),

  // Bookmarks
  getBookmarks: (folderId?: string | null) =>
    request<Bookmark[]>(`/bookmarks${folderId ? `?folder_id=${folderId}` : ''}`),
  createBookmark: (title: string, url: string, folderId?: string | null) =>
    request<Bookmark>('/bookmarks', { method: 'POST', body: JSON.stringify({ title, url, folder_id: folderId }) }),
  updateBookmark: (id: string, title: string, url: string, version: number) =>
    request<Bookmark>(`/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify({ title, url, version }) }),
  deleteBookmark: (id: string) =>
    request<void>(`/bookmarks/${id}`, { method: 'DELETE' }),
  moveBookmark: (req: MoveRequest) =>
    request<Bookmark>('/bookmarks/move', { method: 'POST', body: JSON.stringify(req) }),
  batchMoveBookmarks: (req: BatchMoveRequest) =>
    request<void>('/bookmarks/batch-move', { method: 'POST', body: JSON.stringify(req) }),
  batchDeleteBookmarks: (ids: string[]) =>
    request<void>('/bookmarks/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Search
  search: (q: string) => request<Bookmark[]>(`/search?q=${encodeURIComponent(q)}`),

  // Import
  importBookmarks: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = localStorage.getItem('token')
    return fetch(BASE + '/import', { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/ frontend/src/services/ && git commit -m "feat: add TypeScript types and API client"
```

---

### Task 12: Auth Store + LoginPage

**Files:**
- Create: `frontend/src/stores/authStore.ts`
- Create: `frontend/src/components/LoginPage.tsx`

- [ ] **Step 1: Auth Store**

`frontend/src/stores/authStore.ts`:

```ts
import { create } from 'zustand'
import { api } from '../services/api'

interface AuthState {
  token: string | null
  loading: boolean
  error: string | null
  login: (password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
  login: async (password: string) => {
    set({ loading: true, error: null })
    try {
      const { token } = await api.login(password)
      localStorage.setItem('token', token)
      set({ token, loading: false })
    } catch {
      set({ error: '密码错误', loading: false })
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null })
  },
}))
```

- [ ] **Step 2: LoginPage**

`frontend/src/components/LoginPage.tsx`:

```tsx
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuthStore()

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <form onSubmit={e => { e.preventDefault(); login(password) }}
        className="w-80 p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-center text-[#1a1a1a]">Cubby</h1>
        <p className="text-sm text-center text-[#666]">输入密码以访问收藏夹</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4]"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="h-9 bg-[#0078D4] text-white rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/authStore.ts frontend/src/components/LoginPage.tsx && git commit -m "feat: add auth store and login page"
```

---

### Task 13: Folder Store + Sidebar + FolderNode

**Files:**
- Create: `frontend/src/stores/folderStore.ts`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/FolderNode.tsx`
- Create: `frontend/src/components/MainLayout.tsx`

- [ ] **Step 1: Folder Store**

`frontend/src/stores/folderStore.ts`:

```ts
import { create } from 'zustand'
import { Folder } from '../types'
import { api } from '../services/api'

interface FolderState {
  folderMap: Map<string, Folder>
  childrenMap: Map<string | null, string[]>
  expandedIds: Set<string>
  selectedId: string | null
  visibleNodes: { node: Folder; depth: number }[]
  loadChildren: (parentId: string | null) => Promise<void>
  toggleExpand: (id: string) => void
  select: (id: string | null) => void
  move: (id: string, parentId: string | null, prevId: string | null, nextId: string | null, version: number) => Promise<void>
  rebuildVisible: () => void
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folderMap: new Map(),
  childrenMap: new Map(),
  expandedIds: new Set(),
  selectedId: null,
  visibleNodes: [],

  loadChildren: async (parentId) => {
    const folders = await api.getFolders(parentId)
    set(state => {
      const folderMap = new Map(state.folderMap)
      const childrenMap = new Map(state.childrenMap)
      const ids: string[] = []
      for (const f of folders) {
        folderMap.set(f.id, f)
        ids.push(f.id)
      }
      childrenMap.set(parentId, ids)
      return { folderMap, childrenMap }
    })
    get().rebuildVisible()
  },

  toggleExpand: (id) => {
    set(state => {
      const expanded = new Set(state.expandedIds)
      if (expanded.has(id)) { expanded.delete(id) } else { expanded.add(id) }
      return { expandedIds: expanded }
    })
    const { childrenMap } = get()
    if (!childrenMap.has(id)) { get().loadChildren(id) }
    get().rebuildVisible()
  },

  select: (id) => set({ selectedId: id }),

  move: async (id, parentId, prevId, nextId, version) => {
    const folder = get().folderMap.get(id)
    if (!folder) return
    await api.moveFolder({ id, parent_id: parentId, prev_id: prevId, next_id: nextId, version })
    // Reload affected folders
    get().loadChildren(parentId)
    if (folder.parent_id !== parentId) { get().loadChildren(folder.parent_id) }
  },

  rebuildVisible: () => {
    const { folderMap, childrenMap, expandedIds } = get()
    const result: { node: Folder; depth: number }[] = []
    function walk(parentId: string | null, depth: number) {
      const children = childrenMap.get(parentId) || []
      for (const id of children) {
        const node = folderMap.get(id)
        if (!node) continue
        result.push({ node, depth })
        if (expandedIds.has(id)) { walk(id, depth + 1) }
      }
    }
    walk(null, 0)
    set({ visibleNodes: result })
  },
}))
```

- [ ] **Step 2: FolderNode 组件**

`frontend/src/components/FolderNode.tsx`:

```tsx
import { memo } from 'react'
import { Folder } from '../types'
import { useFolderStore } from '../stores/folderStore'
import { ChevronRight, ChevronDown, Folder as FolderIcon, Star } from 'lucide-react'

const FolderNode = memo(({ node, depth }: { node: Folder; depth: number }) => {
  const { expandedIds, selectedId, toggleExpand, select, childrenMap } = useFolderStore()
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  const children = childrenMap.get(node.id)
  const hasChildren = children !== undefined ? children.length > 0 : true // assume has children if not loaded

  return (
    <div
      className="flex items-center cursor-default rounded select-none"
      style={{
        height: 32,
        paddingLeft: 8 + depth * 20,
        paddingRight: 8,
        margin: '0 4px',
        background: isSelected ? '#E5F0FF' : 'transparent',
      }}
      onClick={() => select(node.id)}
    >
      {/* Expand chevron */}
      <span
        className="flex-shrink-0 flex items-center justify-center"
        style={{ width: 16, height: 16 }}
        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
      >
        {hasChildren && (
          isExpanded
            ? <ChevronDown size={12} stroke="#666" strokeWidth={2} />
            : <ChevronRight size={12} stroke="#666" strokeWidth={2} />
        )}
      </span>
      {/* Folder icon */}
      <span className="flex-shrink-0 ml-1">
        <FolderIcon size={16} fill="#F0C54F" stroke="#D4A830" strokeWidth={0.6} />
      </span>
      {/* Name */}
      <span className="ml-2 truncate text-[13px] text-[#1a1a1a]">{node.name}</span>
    </div>
  )
})

FolderNode.displayName = 'FolderNode'
export default FolderNode
```

- [ ] **Step 3: Sidebar 组件**

`frontend/src/components/Sidebar.tsx`:

```tsx
import { useEffect } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { Virtuoso } from 'react-virtuoso'
import FolderNode from './FolderNode'
import { Star } from 'lucide-react'

export default function Sidebar() {
  const { visibleNodes, selectedId, select, loadChildren } = useFolderStore()

  useEffect(() => { loadChildren(null) }, [])

  return (
    <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
      {/* Title */}
      <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">收藏夹</div>
      {/* Search */}
      <div className="px-4 pb-2">
        <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
          <Search size={14} stroke="#888" />
          <input
            className="flex-1 border-none outline-none text-[13px] bg-transparent"
            placeholder="搜索收藏夹"
          />
        </div>
      </div>
      {/* "All bookmarks" root */}
      <div
        className="flex items-center h-8 mx-1 px-2 rounded cursor-default select-none"
        style={{ background: selectedId === null ? '#E5F0FF' : 'transparent' }}
        onClick={() => select(null)}
      >
        <Star size={16} stroke={selectedId === null ? '#0078D4' : '#1a1a1a'} strokeWidth={1.6} />
        <span className="ml-2.5 text-[13px] text-[#1a1a1a]">所有书签</span>
      </div>
      {/* Tree */}
      <div className="flex-1">
        <Virtuoso
          totalCount={visibleNodes.length}
          itemContent={i => (
            <FolderNode node={visibleNodes[i].node} depth={visibleNodes[i].depth} />
          )}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: MainLayout 骨架**

`frontend/src/components/MainLayout.tsx`:

```tsx
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import BatchActionBar from './BatchActionBar'
import ContextMenu from './ContextMenu'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { Virtuoso } from 'react-virtuoso'

export default function MainLayout() {
  const { bookmarks } = useBookmarkStore()
  const { selectedId } = useFolderStore()

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar />
        <BatchActionBar />
        <div className="flex-1 overflow-hidden">
          <Virtuoso
            totalCount={bookmarks.length}
            itemContent={i => <BookmarkRow bookmark={bookmarks[i]} />}
          />
        </div>
      </div>
      <ContextMenu />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/folderStore.ts frontend/src/components/FolderNode.tsx frontend/src/components/Sidebar.tsx frontend/src/components/MainLayout.tsx && git commit -m "feat: add folder store, sidebar, folder tree with virtual list"
```

---

### Task 14: Bookmark Store + BookmarkRow + Toolbar

**Files:**
- Create: `frontend/src/stores/bookmarkStore.ts`
- Create: `frontend/src/components/BookmarkRow.tsx`
- Create: `frontend/src/components/Toolbar.tsx`
- Create: `frontend/src/components/Breadcrumb.tsx`

- [ ] **Step 1: Bookmark Store**

`frontend/src/stores/bookmarkStore.ts`:

```ts
import { create } from 'zustand'
import { Bookmark } from '../types'
import { api, ConflictError } from '../services/api'

interface BookmarkState {
  bookmarks: Bookmark[]
  selectedIds: Set<string>
  loading: boolean
  load: (folderId?: string | null) => Promise<void>
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  deleteOne: (id: string) => Promise<void>
  move: (id: string, folderId: string | null, prevId: string | null, nextId: string | null, version: number) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  selectedIds: new Set(),
  loading: false,

  load: async (folderId) => {
    set({ loading: true })
    const bookmarks = await api.getBookmarks(folderId)
    set({ bookmarks, loading: false })
  },

  toggleSelect: (id) => {
    set(state => {
      const next = new Set(state.selectedIds)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return { selectedIds: next }
    })
  },

  selectAll: () => set(state => {
    const all = new Set(state.bookmarks.map(b => b.id))
    return { selectedIds: all }
  }),

  clearSelection: () => set({ selectedIds: new Set() }),

  deleteSelected: async () => {
    const ids = [...get().selectedIds]
    await api.batchDeleteBookmarks(ids)
    set({ selectedIds: new Set() })
    get().load((window as any).__currentFolderId)
  },

  deleteOne: async (id) => {
    await api.deleteBookmark(id)
    get().load((window as any).__currentFolderId)
  },

  move: async (id, folderId, prevId, nextId, version) => {
    try {
      await api.moveBookmark({ id, parent_id: folderId, prev_id: prevId, next_id: nextId, version })
    } catch (e) {
      if (e instanceof ConflictError) {
        // refetch and let user retry
        await get().load(folderId)
      }
      throw e
    }
  },
}))
```

- [ ] **Step 2: BookmarkRow 组件**

`frontend/src/components/BookmarkRow.tsx`:

```tsx
import { memo, useState } from 'react'
import { Bookmark } from '../types'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { X } from 'lucide-react'

const BookmarkRow = memo(({ bookmark }: { bookmark: Bookmark }) => {
  const { selectedIds, toggleSelect, deleteOne } = useBookmarkStore()
  const isSelected = selectedIds.has(bookmark.id)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center mx-1 px-2 rounded select-none"
      style={{
        height: 32,
        background: isSelected ? '#E5F0FF' : hovered ? '#F5F5F5' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div
        className="flex-shrink-0 mr-2.5 flex items-center justify-center cursor-default"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: isSelected ? '2px solid #0078D4' : '2px solid #c0c0c0',
          background: isSelected ? '#0078D4' : 'transparent',
        }}
        onClick={(e) => { e.stopPropagation(); toggleSelect(bookmark.id) }}
      >
        {isSelected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      {/* Favicon placeholder */}
      <div
        className="flex-shrink-0 mr-2 rounded-sm flex items-center justify-center text-[9px] text-[#666]"
        style={{ width: 16, height: 16, background: '#e8e8e8' }}
      >
        {bookmark.title.charAt(0)}
      </div>
      {/* Title */}
      <span className="flex-1 truncate text-[13px] text-[#1a1a1a]">{bookmark.title}</span>
      {/* URL */}
      <span className="flex-shrink-0 truncate text-xs text-[#888]" style={{ width: 320 }}>
        {bookmark.url}
      </span>
      {/* Date */}
      <span className="flex-shrink-0 text-xs text-[#888]" style={{ width: 100 }}>
        {bookmark.created_at.slice(0, 10)}
      </span>
      {/* X delete */}
      <div
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded cursor-default"
        style={{ opacity: hovered ? 1 : 0, color: '#999' }}
        onClick={(e) => { e.stopPropagation(); deleteOne(bookmark.id) }}
      >
        <X size={14} strokeWidth={1.6} />
      </div>
    </div>
  )
})

BookmarkRow.displayName = 'BookmarkRow'
export default BookmarkRow
```

- [ ] **Step 3: Toolbar 组件**

`frontend/src/components/Toolbar.tsx`:

```tsx
import Breadcrumb from './Breadcrumb'
import MoreMenu from './MoreMenu'
import { useFolderStore } from '../stores/folderStore'

export default function Toolbar() {
  return (
    <div className="flex items-center gap-1 px-5 py-2 border-b border-[#e8e8e8]" style={{ height: 48 }}>
      <Breadcrumb />
      <div className="flex-1" />
      {/* Add Favorite button */}
      <button className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default">
        <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
          <path d="M9.1 2.9a1 1 0 011.8 0l1.93 3.91 4.31.63a1 1 0 01.56 1.7l-.55.54a5.47 5.47 0 00-1-.43l.85-.82-4.32-.63a1 1 0 01-.75-.55L10 3.35l-1.93 3.9a1 1 0 01-.75.55L3 8.43l3.12 3.04a1 1 0 01.29.89l-.74 4.3 3.34-1.76c.03.36.09.7.18 1.04l-3.05 1.6a1 1 0 01-1.45-1.05l.73-4.3L2.3 9.14a1 1 0 01.56-1.7l4.31-.63L9.1 2.9z"/>
          <path d="M19 14.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z"/>
        </svg>
        <span>添加收藏夹</span>
      </button>
      {/* Add Folder button */}
      <button className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default">
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
          <path d="M4.5 3A2.5 2.5 0 002 5.5v9A2.5 2.5 0 004.5 17h5.1c-.16-.32-.3-.65-.4-1H4.5A1.5 1.5 0 013 14.5v-7h4.07c.41 0 .8-.17 1.09-.47L9.62 5.5h5.88c.83 0 1.5.67 1.5 1.5v2.6c.36.18.7.4 1 .66V7a2.5 2.5 0 00-2.5-2.5H9.67l-1.6-1.2a1.5 1.5 0 00-.9-.3H4.5zM3 5.5C3 4.67 3.67 4 4.5 4h2.67c.1 0 .21.04.3.1l1.22.92-1.26 1.32a.5.5 0 01-.36.16H3v-1zm16 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z" fillRule="nonzero"/>
        </svg>
        <span>添加文件夹</span>
      </button>
      <MoreMenu />
    </div>
  )
}
```

- [ ] **Step 4: Breadcrumb 组件**

`frontend/src/components/Breadcrumb.tsx`:

```tsx
import { useFolderStore } from '../stores/folderStore'

export default function Breadcrumb() {
  const { selectedId, folderMap } = useFolderStore()
  // Build path from selected folder up to root
  const path: { id: string | null; name: string }[] = [{ id: null, name: '收藏夹' }]
  let current = selectedId
  while (current) {
    const f = folderMap.get(current)
    if (!f) break
    path.push({ id: f.id, name: f.name })
    current = f.parent_id
  }

  return (
    <div className="flex items-center text-[13px]">
      {path.reverse().map((p, i) => (
        <span key={p.id ?? 'root'} className="flex items-center">
          {i > 0 && <span className="text-[#999] mx-0.5">/</span>}
          <span
            className="px-1 rounded-sm cursor-default"
            style={{ color: i === path.length - 1 ? '#1a1a1a' : '#0078D4' }}
          >
            {p.name}
          </span>
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/bookmarkStore.ts frontend/src/components/BookmarkRow.tsx frontend/src/components/Toolbar.tsx frontend/src/components/Breadcrumb.tsx && git commit -m "feat: add bookmark store, row, toolbar, and breadcrumb"
```

---

### Task 15: BatchActionBar + MoreMenu + ContextMenu

**Files:**
- Create: `frontend/src/components/BatchActionBar.tsx`
- Create: `frontend/src/components/MoreMenu.tsx`
- Create: `frontend/src/components/ContextMenu.tsx`

- [ ] **Step 1: BatchActionBar**

`frontend/src/components/BatchActionBar.tsx`:

```tsx
import { useBookmarkStore } from '../stores/bookmarkStore'

export default function BatchActionBar() {
  const { selectedIds, clearSelection, deleteSelected } = useBookmarkStore()
  const count = selectedIds.size
  if (count === 0) return null

  return (
    <div
      role="dialog"
      aria-label="alert dialog"
      className="absolute right-[63px] top-[14px] z-50 flex items-center gap-4 bg-white border border-[#e0e0e0] rounded-lg px-4 py-3 shadow-lg text-[13px]"
    >
      <span className="text-[#1a1a1a]">已选择 {count} 项</span>
      <button
        className="h-7 px-3.5 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default"
        onClick={deleteSelected}
      >
        删除
      </button>
      <button
        className="h-7 px-3.5 border border-[#d1d1d1] rounded bg-white text-[#1a1a1a] text-[13px] cursor-default"
        onClick={clearSelection}
      >
        取消
      </button>
    </div>
  )
}
```

- [ ] **Step 2: MoreMenu**

`frontend/src/components/MoreMenu.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react'
import { Download, Upload } from 'lucide-react'

export default function MoreMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="inline-flex items-center justify-center w-8 h-8 border-none rounded bg-transparent text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
        onClick={() => setOpen(!open)}
        title="更多选项"
      >
        <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="5.5" r="1.25"/><circle cx="10" cy="10" r="1.25"/><circle cx="10" cy="14.5" r="1.25"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-[180px] bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-1 z-50">
          <button
            className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
            onClick={() => { setOpen(false); document.getElementById('import-file')?.click() }}
          >
            <Download size={16} stroke="#666" strokeWidth={1.6} />
            <span>导入收藏夹</span>
          </button>
          <input id="import-file" type="file" accept=".html,.htm" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) {
                const { api } = await import('../services/api')
                await api.importBookmarks(file)
                window.location.reload()
              }
            }}
          />
          <a
            href="/api/export"
            className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default no-underline"
          >
            <Upload size={16} stroke="#666" strokeWidth={1.6} />
            <span>导出收藏夹</span>
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: ContextMenu**

`frontend/src/components/ContextMenu.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'

interface MenuState {
  x: number; y: number
  type: 'bookmark' | 'folder'
  id: string
}

export default function ContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    // Determine context from data attributes on target element
    const el = (e.target as HTMLElement).closest('[data-context]') as HTMLElement | null
    if (el) {
      setMenu({
        x: e.clientX, y: e.clientY,
        type: el.dataset.context as 'bookmark' | 'folder',
        id: el.dataset.id!,
      })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('contextmenu', handleContextMenu)
    const close = () => setMenu(null)
    document.addEventListener('mousedown', close)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('mousedown', close)
    }
  }, [])

  if (!menu) return null

  const isBookmark = menu.type === 'bookmark'

  return (
    <div
      className="fixed z-[100] bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-1 min-w-[160px]"
      style={{ left: menu.x, top: menu.y }}
    >
      {isBookmark && (
        <button className="block w-full text-left h-8 px-3 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
          onClick={() => { window.open(`/api/bookmarks/${menu.id}/open`, '_blank'); setMenu(null) }}>
          打开
        </button>
      )}
      <button className="block w-full text-left h-8 px-3 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
        onClick={() => { /* open rename dialog */; setMenu(null) }}>
        重命名
      </button>
      <button className="block w-full text-left h-8 px-3 rounded text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
        onClick={() => { /* open move dialog */; setMenu(null) }}>
        移动
      </button>
      <div className="border-t border-[#e8e8e8] my-0.5" />
      <button className="block w-full text-left h-8 px-3 rounded text-[13px] text-red-600 hover:bg-[#f5f5f5] cursor-default"
        onClick={() => { /* delete */; setMenu(null) }}>
        删除
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/BatchActionBar.tsx frontend/src/components/MoreMenu.tsx frontend/src/components/ContextMenu.tsx && git commit -m "feat: add batch action bar, more menu, and context menu"
```

---

### Task 16: 模态框 (CreateFolder + EditBookmark)

**Files:**
- Create: `frontend/src/components/CreateFolderModal.tsx`
- Create: `frontend/src/components/EditBookmarkModal.tsx`
- Create: `frontend/src/components/ImportModal.tsx`

- [ ] **Step 1: CreateFolderModal**

`frontend/src/components/CreateFolderModal.tsx`:

```tsx
import { useState } from 'react'
import { useFolderStore } from '../stores/folderStore'

export default function CreateFolderModal({ parentId, onClose }: { parentId: string | null; onClose: () => void }) {
  const [name, setName] = useState('')
  const { loadChildren } = useFolderStore()

  const handleSubmit = async () => {
    if (!name.trim()) return
    const { api } = await import('../services/api')
    await api.createFolder(name.trim(), parentId)
    await loadChildren(parentId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-80" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">新建文件夹</h3>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="文件夹名称"
          className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-4"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-[13px] text-[#1a1a1a] cursor-default">取消</button>
          <button onClick={handleSubmit} disabled={!name.trim()} className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default disabled:opacity-50">创建</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: EditBookmarkModal**

`frontend/src/components/EditBookmarkModal.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { Bookmark } from '../types'

export default function EditBookmarkModal({ bookmark, onClose, onSave }: {
  bookmark: Bookmark; onClose: () => void; onSave: (title: string, url: string) => void
}) {
  const [title, setTitle] = useState(bookmark.title)
  const [url, setUrl] = useState(bookmark.url)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">编辑书签</h3>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="名称" className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-3" />
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="URL" className="w-full h-9 px-3 border border-[#d1d1d1] rounded text-sm outline-none focus:border-[#0078D4] mb-4" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-[13px] cursor-default">取消</button>
          <button onClick={() => onSave(title, url)} disabled={!title.trim() || !url.trim()}
            className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default disabled:opacity-50">保存</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ImportModal**

`frontend/src/components/ImportModal.tsx`:

```tsx
import { useState } from 'react'
import { api } from '../services/api'

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'done'>('idle')
  const [result, setResult] = useState<{ bookmarks: number } | null>(null)

  const handleFile = async (file: File) => {
    setStatus('importing')
    const res = await api.importBookmarks(file)
    const data = await res.json()
    setResult(data)
    setStatus('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">导入收藏夹</h3>
        {status === 'idle' && (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[#d1d1d1] rounded-lg cursor-default hover:border-[#0078D4]">
            <span className="text-sm text-[#666]">选择浏览器导出的 HTML 文件</span>
            <input type="file" accept=".html,.htm" className="hidden" onChange={e => {
              const file = e.target.files?.[0]; if (file) handleFile(file)
            }} />
          </label>
        )}
        {status === 'importing' && <p className="text-sm text-[#666] text-center py-8">导入中...</p>}
        {status === 'done' && (
          <div className="text-center py-4">
            <p className="text-sm text-green-600 mb-2">导入完成!</p>
            <p className="text-sm text-[#666]">共导入 {result?.bookmarks ?? 0} 条书签</p>
            <button onClick={onClose} className="mt-4 h-8 px-4 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default">完成</button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CreateFolderModal.tsx frontend/src/components/EditBookmarkModal.tsx frontend/src/components/ImportModal.tsx && git commit -m "feat: add create folder, edit bookmark, and import modals"
```

---

### Task 17: 前后端联调 + 集成修复

- [ ] **Step 1: 启动后端并验证 API**

```bash
cd backend && JWT_SECRET=test go run ./cmd/server/ &
# Test login
curl -X POST http://localhost:8080/api/auth/setup -d '{"password":"test"}'
curl -X POST http://localhost:8080/api/auth/login -d '{"password":"test"}'
```

- [ ] **Step 2: 配置前端代理**

`frontend/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { '/api': 'http://localhost:8080' }
  }
})
```

- [ ] **Step 3: 修复 import 引用一致性**

确保所有前端 import 路径正确，验证 `npm run build` 通过。

- [ ] **Step 4: 编译检查**

```bash
cd frontend && npm run build
cd backend && go build ./cmd/server/
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "fix: wire up frontend-backend integration and fix imports"
```

---

### Task 18: 前后端构建一体化

**Files:**
- Create: `Makefile`

- [ ] **Step 1: 创建 Makefile**

`Makefile`:

```makefile
.PHONY: dev build run

dev:
	cd backend && go run ./cmd/server/ &
	cd frontend && npm run dev

build:
	cd backend && go build -o ../cubby-server ./cmd/server/
	cd frontend && npm run build
	mkdir -p backend/cmd/server/static
	cp -r frontend/dist/* backend/cmd/server/static/

run: build
	./cubby-server
```

- [ ] **Step 2: 后端 serve 静态文件**

在 `backend/cmd/server/main.go` 中添加:

```go
r.Static("/assets", "./cmd/server/static/assets")
r.StaticFile("/", "./cmd/server/static/index.html")
r.NoRoute(func(c *gin.Context) {
    c.File("./cmd/server/static/index.html")
})
```

- [ ] **Step 3: Commit**

```bash
git add Makefile backend/cmd/server/main.go && git commit -m "feat: add build pipeline and static file serving"
```
