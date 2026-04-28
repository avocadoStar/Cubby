# Cubby 收藏夹管理系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个单体部署的个人书签管理 Web 应用，支持文件夹管理、全文搜索、元数据抓取、浏览器导入和 AI 智能整理。

**Architecture:** Go 服务器提供 REST API + 静态文件，React SPA 前端通过 Vite 构建，生产环境 Go embed 嵌入前端产物为单一二进制。SQLite 存储数据，外部 LLM API 提供 AI 功能。

**Tech Stack:** Go 1.22+ (Gin), SQLite (modernc.org/sqlite), React 18, TypeScript, Vite, TailwindCSS, Zustand

**可并行标记：** `[Codex]` = 可分配给 Codex 独立执行

---

### Task 1: 项目脚手架

**Files:**
- Create: `backend/go.mod`
- Create: `backend/cmd/server/main.go`
- Create: `frontend/` (Vite React TS 模板)
- Create: `Makefile`
- Create: `.gitignore`
- Create: `.superpowers/` → `.gitignore`

- [ ] **Step 1: 初始化 Go 后端项目**

```bash
mkdir -p backend/cmd/server backend/internal/{handler,service,repository,model,middleware,ai,metadata,importer}
cd backend && go mod init cubby
```

- [ ] **Step 2: 创建 main.go 入口 — 最小 HTTP 服务器**

```go
// backend/cmd/server/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("Cubby server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Cubby OK"))
	})))
}
```

- [ ] **Step 3: 创建前端项目**

```bash
cd e:/project/Cubby && npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install -D tailwindcss @tailwindcss/vite
npm install zustand react-router-dom axios @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 4: 配置 TailwindCSS v4**

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true }
    }
  }
})
```

```css
/* frontend/src/index.css */
@import "tailwindcss";
```

- [ ] **Step 5: 创建 Makefile**

```makefile
.PHONY: dev dev-frontend dev-backend build clean

dev-frontend:
	cd frontend && npm run dev

dev-backend:
	cd backend && go run ./cmd/server

build-frontend:
	cd frontend && npm run build

build-backend:
	cd backend && go build -o ../cubby ./cmd/server

build: build-frontend build-backend

clean:
	rm -rf cubby backend/cubby frontend/dist
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
dist/
cubby
cubby.db
*.exe
.superpowers/
```

- [ ] **Step 7: 验证两个服务都能启动**

```bash
# Terminal 1: go run ./backend/cmd/server
# Terminal 2: cd frontend && npm run dev
# 访问 http://localhost:5173 和 http://localhost:8080
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with Go backend and React frontend"
```

---

### Task 2: 数据库模型与迁移 `[Codex]`

**Files:**
- Create: `backend/internal/model/model.go`
- Create: `backend/internal/repository/db.go`

- [ ] **Step 1: 定义数据模型**

```go
// backend/internal/model/model.go
package model

import "time"

type Folder struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ParentID  *string   `json:"parent_id"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	URL            string    `json:"url"`
	Description    string    `json:"description"`
	FaviconURL     string    `json:"favicon_url"`
	ThumbnailURL   string    `json:"thumbnail_url"`
	FolderID       *string   `json:"folder_id"`
	IsFavorite     bool      `json:"is_favorite"`
	SortOrder      int       `json:"sort_order"`
	MetadataFetched bool     `json:"metadata_fetched"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}
```

- [ ] **Step 2: 实现 SQLite 初始化和迁移**

```go
// backend/internal/repository/db.go
package repository

import (
	"database/sql"
	"fmt"
	"cubby/internal/model"

	_ "modernc.org/sqlite"
)

func Init(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS folders (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		parent_id TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
		UNIQUE(parent_id, name)
	);
	CREATE TABLE IF NOT EXISTS bookmarks (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		url TEXT NOT NULL UNIQUE,
		description TEXT DEFAULT '',
		favicon_url TEXT DEFAULT '',
		thumbnail_url TEXT DEFAULT '',
		folder_id TEXT,
		is_favorite BOOLEAN NOT NULL DEFAULT 0,
		sort_order INTEGER NOT NULL DEFAULT 0,
		metadata_fetched BOOLEAN NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
	);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(is_favorite);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
	`
	_, err := db.Exec(schema)
	return err
}
```

- [ ] **Step 3: 验证数据库初始化**

写一个 `main.go` 调用 `repository.Init("cubby.db")`，运行确认创建 `cubby.db` 文件且表结构正确。

- [ ] **Step 4: Commit**

```bash
git add backend/internal/model/ backend/internal/repository/
git commit -m "feat: add SQLite database models and migration"
```

---

### Task 3: 文件夹 Repository `[Codex]`

**Files:**
- Create: `backend/internal/repository/folder.go`

- [ ] **Step 1: 实现文件夹 CRUD repository**

```go
// backend/internal/repository/folder.go
package repository

import (
	"database/sql"
	"cubby/internal/model"
	"strings"
)

type FolderRepo struct {
	db *sql.DB
}

func NewFolderRepo(db *sql.DB) *FolderRepo { return &FolderRepo{db: db} }

type FolderTree struct {
	model.Folder
	Children []FolderTree `json:"children"`
}

func (r *FolderRepo) GetTree() ([]FolderTree, error) {
	rows, err := r.db.Query(
		`SELECT id, name, parent_id, sort_order, created_at, updated_at
		 FROM folders ORDER BY parent_id IS NOT NULL, parent_id, sort_order`)
	if err != nil { return nil, err }
	defer rows.Close()

	var flat []model.Folder
	for rows.Next() {
		var f model.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortOrder, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		flat = append(flat, f)
	}
	return buildTree(flat), nil
}

func buildTree(flat []model.Folder) []FolderTree {
	m := make(map[string]*FolderTree)
	var roots []FolderTree
	for i := range flat {
		ft := FolderTree{Folder: flat[i]}
		m[flat[i].ID] = &ft
	}
	for i := range flat {
		ft := m[flat[i].ID]
		if flat[i].ParentID != nil {
			if parent, ok := m[*flat[i].ParentID]; ok {
				parent.Children = append(parent.Children, *ft)
				continue
			}
		}
		roots = append(roots, *ft)
	}
	return roots
}

func (r *FolderRepo) Create(f *model.Folder) error {
	_, err := r.db.Exec(
		`INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		f.ID, f.Name, f.ParentID, f.SortOrder)
	return err
}

func (r *FolderRepo) Update(id, name string, parentID *string, sortOrder int) error {
	_, err := r.db.Exec(
		`UPDATE folders SET name=?, parent_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		name, parentID, sortOrder, id)
	return err
}

func (r *FolderRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM folders WHERE id=?`, id)
	return err
}

func (r *FolderRepo) Exists(id string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM folders WHERE id=?`, id).Scan(&count)
	return count > 0, err
}

func (r *FolderRepo) ListByParent(parentID *string) ([]model.Folder, error) {
	var rows *sql.Rows
	var err error
	if parentID == nil {
		rows, err = r.db.Query(
			`SELECT id, name, parent_id, sort_order, created_at, updated_at FROM folders WHERE parent_id IS NULL ORDER BY sort_order`)
	} else {
		rows, err = r.db.Query(
			`SELECT id, name, parent_id, sort_order, created_at, updated_at FROM folders WHERE parent_id=? ORDER BY sort_order`, *parentID)
	}
	if err != nil { return nil, err }
	defer rows.Close()

	var folders []model.Folder
	for rows.Next() {
		var f model.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortOrder, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (r *FolderRepo) Reorder(ids []string) error {
	tx, err := r.db.Begin()
	if err != nil { return err }
	defer tx.Rollback()

	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE folders SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, i, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetDescendantIDs returns the folder ID and all child folder IDs (max 2 levels)
func (r *FolderRepo) GetDescendantIDs(folderID string) ([]string, error) {
	ids := []string{folderID}
	// Level 1 children
	rows, err := r.db.Query(`SELECT id FROM folders WHERE parent_id=?`, folderID)
	if err != nil { return nil, err }
	for rows.Next() {
		var childID string
		if err := rows.Scan(&childID); err != nil { return nil, err }
		ids = append(ids, childID)
	}
	rows.Close()
	// Level 2 children
	placeholders := make([]string, len(ids)-1)
	args := make([]any, len(ids)-1)
	for i, id := range ids[1:] {
		placeholders[i] = "?"
		args[i] = id
	}
	if len(placeholders) > 0 {
		rows, err = r.db.Query(
			`SELECT id FROM folders WHERE parent_id IN (`+strings.Join(placeholders, ",")+`)`, args...)
		if err != nil { return nil, err }
		for rows.Next() {
			var grandchildID string
			if err := rows.Scan(&grandchildID); err != nil { return nil, err }
			ids = append(ids, grandchildID)
		}
		rows.Close()
	}
	return ids, nil
}
```

- [ ] **Step 2: 验证编译通过**

```bash
cd backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/folder.go
git commit -m "feat: add folder repository with tree structure and CRUD"
```

---

### Task 4: 书签 Repository `[Codex]`

**Files:**
- Create: `backend/internal/repository/bookmark.go`

- [ ] **Step 1: 实现书签 CRUD + 搜索 + 分页**

```go
// backend/internal/repository/bookmark.go
package repository

import (
	"database/sql"
	"cubby/internal/model"
	"fmt"
	"strings"
)

type BookmarkRepo struct {
	db *sql.DB
}

func NewBookmarkRepo(db *sql.DB) *BookmarkRepo { return &BookmarkRepo{db: db} }

type BookmarkQuery struct {
	FolderID string
	Q        string
	Favorite bool
	Unsorted bool
	Recent   bool
	Page     int
	PageSize int
}

type BookmarkListResult struct {
	Items      []model.Bookmark `json:"items"`
	Total      int              `json:"total"`
	Page       int              `json:"page"`
	PageSize   int              `json:"page_size"`
}

func (r *BookmarkRepo) List(q BookmarkQuery) (*BookmarkListResult, error) {
	var conditions []string
	var args []any

	if q.FolderID != "" && q.FolderID != "all" {
		conditions = append(conditions, "folder_id = ?")
		args = append(args, q.FolderID)
	}
	if q.Favorite {
		conditions = append(conditions, "is_favorite = 1")
	}
	if q.Unsorted {
		conditions = append(conditions, "folder_id IS NULL")
	}
	if q.Q != "" {
		conditions = append(conditions, "(title LIKE ? OR url LIKE ? OR description LIKE ?")
		search := "%" + q.Q + "%"
		args = append(args, search, search, search)
		conditions[len(conditions)-1] += ")"
	}

	if q.Page < 1 { q.Page = 1 }
	if q.PageSize < 1 { q.PageSize = 50 }
	if q.PageSize > 200 { q.PageSize = 200 }

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	countSQL := "SELECT COUNT(*) FROM bookmarks " + where
	if err := r.db.QueryRow(countSQL, args...).Scan(&total); err != nil {
		return nil, err
	}

	orderBy := "b.sort_order ASC, b.created_at DESC"
	if q.Recent {
		orderBy = "b.created_at DESC"
		conditions = append(conditions, "1=1") // keep where for args
		args = append(args)
	}

	offset := (q.Page - 1) * q.PageSize
	query := fmt.Sprintf(
		`SELECT b.id, b.title, b.url, b.description, b.favicon_url, b.thumbnail_url,
		        b.folder_id, b.is_favorite, b.sort_order, b.metadata_fetched,
		        b.created_at, b.updated_at
		 FROM bookmarks b %s ORDER BY %s LIMIT ? OFFSET ?`,
		where, orderBy)

	queryArgs := append(args, q.PageSize, offset)
	rows, err := r.db.Query(query, queryArgs...)
	if err != nil { return nil, err }
	defer rows.Close()

	var items []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		if err := rows.Scan(&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
			&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
			&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}

	return &BookmarkListResult{Items: items, Total: total, Page: q.Page, PageSize: q.PageSize}, nil
}

func (r *BookmarkRepo) GetByID(id string) (*model.Bookmark, error) {
	b := &model.Bookmark{}
	err := r.db.QueryRow(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks WHERE id=?`, id).Scan(
		&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
		&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
		&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows { return nil, nil }
	return b, err
}

func (r *BookmarkRepo) Create(b *model.Bookmark) error {
	_, err := r.db.Exec(
		`INSERT INTO bookmarks (id, title, url, description, favicon_url, thumbnail_url,
		                        folder_id, is_favorite, sort_order, metadata_fetched,
		                        created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		b.ID, b.Title, b.URL, b.Description, b.FaviconURL, b.ThumbnailURL,
		b.FolderID, b.IsFavorite, b.SortOrder, b.MetadataFetched)
	return err
}

func (r *BookmarkRepo) Update(b *model.Bookmark) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=?, url=?, description=?, favicon_url=?, thumbnail_url=?,
		                        folder_id=?, is_favorite=?, sort_order=?,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		b.Title, b.URL, b.Description, b.FaviconURL, b.ThumbnailURL,
		b.FolderID, b.IsFavorite, b.SortOrder, b.ID)
	return err
}

func (r *BookmarkRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM bookmarks WHERE id=?`, id)
	return err
}

func (r *BookmarkRepo) ToggleFavorite(id string) (bool, error) {
	var fav bool
	err := r.db.QueryRow(
		`UPDATE bookmarks SET is_favorite = CASE WHEN is_favorite=1 THEN 0 ELSE 1 END,
		                         updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING is_favorite`, id).Scan(&fav)
	return fav == true, err
}

func (r *BookmarkRepo) UpdateMetadata(id, title, description, faviconURL, thumbnailURL string) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=COALESCE(NULLIF(?, ''), title),
		                        description=COALESCE(NULLIF(?, ''), description),
		                        favicon_url=COALESCE(NULLIF(?, ''), favicon_url),
		                        thumbnail_url=COALESCE(NULLIF(?, ''), thumbnail_url),
		                        metadata_fetched=1,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`, title, description, faviconURL, thumbnailURL, id)
	return err
}

func (r *BookmarkRepo) MoveToFolder(bookmarkID string, folderID *string) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET folder_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		folderID, bookmarkID)
	return err
}

func (r *BookmarkRepo) Reorder(ids []string) error {
	tx, err := r.db.Begin()
	if err != nil { return err }
	defer tx.Rollback()
	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE bookmarks SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, i, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *BookmarkRepo) ListByFolderIDs(folderIDs []string) ([]model.Bookmark, error) {
	if len(folderIDs) == 0 { return nil, nil }
	placeholders := make([]string, len(folderIDs))
	args := make([]any, len(folderIDs))
	for i, id := range folderIDs {
		placeholders[i] = "?"
		args[i] = id
	}
	rows, err := r.db.Query(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks WHERE folder_id IN (`+strings.Join(placeholders, ",")+`) ORDER BY sort_order, created_at DESC`, args...)
	if err != nil { return nil, err }
	defer rows.Close()

	var items []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		if err := rows.Scan(&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
			&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
			&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, nil
}

func (r *BookmarkRepo) ExistsByURL(url string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM bookmarks WHERE url=?`, url).Scan(&count)
	return count > 0, err
}

func (r *BookmarkRepo) BulkCreate(bookmarks []model.Bookmark) (int, int, error) {
	created := 0
	skipped := 0
	for _, b := range bookmarks {
		exists, err := r.ExistsByURL(b.URL)
		if err != nil { return created, skipped, err }
		if exists { skipped++; continue }
		if err := r.Create(&b); err != nil { return created, skipped, err }
		created++
	}
	return created, skipped, nil
}
```

- [ ] **Step 2: 验证编译通过**

```bash
cd backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/bookmark.go
git commit -m "feat: add bookmark repository with CRUD, search and pagination"
```

---

### Task 5: Settings Repository `[Codex]`

**Files:**
- Create: `backend/internal/repository/setting.go`

- [ ] **Step 1: 实现 settings CRUD**

```go
// backend/internal/repository/setting.go
package repository

import (
	"database/sql"
	"cubby/internal/model"
)

type SettingRepo struct {
	db *sql.DB
}

func NewSettingRepo(db *sql.DB) *SettingRepo { return &SettingRepo{db: db} }

func (r *SettingRepo) Get(key string) (*model.Setting, error) {
	s := &model.Setting{}
	err := r.db.QueryRow(`SELECT key, value, updated_at FROM settings WHERE key=?`, key).Scan(&s.Key, &s.Value, &s.UpdatedAt)
	if err == sql.ErrNoRows { return nil, nil }
	return s, err
}

func (r *SettingRepo) GetAll() (map[string]string, error) {
	rows, err := r.db.Query(`SELECT key, value FROM settings`)
	if err != nil { return nil, err }
	defer rows.Close()

	result := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil { return nil, err }
		result[k] = v
	}
	return result, nil
}

func (r *SettingRepo) Set(key, value string) error {
	_, err := r.db.Exec(
		`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
		key, value)
	return err
}
```

- [ ] **Step 2: 验证编译**

```bash
cd backend && go build ./...
```

- [ ] **Step 3: Commit**

```bash
git add backend/internal/repository/setting.go
git commit -m "feat: add settings repository"
```

---

### Task 6: Gin 路由 + 文件夹/书签 Handlers

**Files:**
- Create: `backend/internal/handler/folder.go`
- Create: `backend/internal/handler/bookmark.go`
- Create: `backend/internal/handler/router.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: 安装 Gin 依赖**

```bash
cd backend && go get github.com/gin-gonic/gin github.com/google/uuid
```

- [ ] **Step 2: 实现文件夹 handler**

```go
// backend/internal/handler/folder.go
package handler

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type FolderHandler struct {
	repo *repository.FolderRepo
}

func NewFolderHandler(repo *repository.FolderRepo) *FolderHandler { return &FolderHandler{repo: repo} }

func (h *FolderHandler) GetTree(c *gin.Context) {
	tree, err := h.repo.GetTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func (h *FolderHandler) Create(c *gin.Context) {
	var req struct {
		Name     string  `json:"name" binding:"required"`
		ParentID *string `json:"parent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "名称不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if req.ParentID != nil {
		exists, err := h.repo.Exists(*req.ParentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "父文件夹不存在", "code": "PARENT_NOT_FOUND"})
			return
		}
	}
	folder := &model.Folder{
		ID:        uuid.New().String(),
		Name:      req.Name,
		ParentID:  req.ParentID,
		SortOrder: 999,
	}
	if err := h.repo.Create(folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusCreated, folder)
}

func (h *FolderHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name      string  `json:"name" binding:"required"`
		ParentID  *string `json:"parent_id"`
		SortOrder *int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "名称不能为空", "code": "INVALID_REQUEST"})
		return
	}
	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}
	if err := h.repo.Update(id, req.Name, req.ParentID, sortOrder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *FolderHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.repo.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *FolderHandler) Reorder(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids 不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if err := h.repo.Reorder(req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func parseIntDefault(s string, def int) int {
	v, err := strconv.Atoi(s)
	if err != nil { return def }
	return v
}
```

- [ ] **Step 3: 实现书签 handler**

```go
// backend/internal/handler/bookmark.go
package handler

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BookmarkHandler struct {
	repo  *repository.BookmarkRepo
	fRepo *repository.FolderRepo
	meta  *repository.BookmarkRepo
}

func NewBookmarkHandler(repo *repository.BookmarkRepo, fRepo *repository.FolderRepo) *BookmarkHandler {
	return &BookmarkHandler{repo: repo, fRepo: fRepo}
}

func (h *BookmarkHandler) List(c *gin.Context) {
	q := repository.BookmarkQuery{
		FolderID: c.DefaultQuery("folder_id", "all"),
		Q:        c.Query("q"),
		Favorite: c.Query("favorite") == "true",
		Unsorted: c.Query("unsorted") == "true",
		Recent:   c.Query("recent") == "true",
		Page:     parseIntDefault(c.DefaultQuery("page", "1"), 1),
		PageSize: parseIntDefault(c.DefaultQuery("page_size", "50"), 50),
	}
	result, err := h.repo.List(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if result.Items == nil { result.Items = []model.Bookmark{} }
	c.JSON(http.StatusOK, result)
}

func (h *BookmarkHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	b, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Create(c *gin.Context) {
	var req struct {
		Title    string  `json:"title"`
		URL      string  `json:"url" binding:"required"`
		Desc     string  `json:"description"`
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL 不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if req.Title == "" { req.Title = req.URL }

	b := &model.Bookmark{
		ID:        uuid.New().String(),
		Title:     req.Title,
		URL:       req.URL,
		Description: req.Desc,
		FolderID:  req.FolderID,
		SortOrder: 999,
	}
	if err := h.repo.Create(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BookmarkHandler) Update(c *gin.Context) {
	id := c.Param("id")
	b, err := h.repo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	var req struct {
		Title       string  `json:"title"`
		URL         string  `json:"url"`
		Description string  `json:"description"`
		FolderID    *string `json:"folder_id"`
		IsFavorite  *bool   `json:"is_favorite"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}
	if req.Title != "" { b.Title = req.Title }
	if req.URL != "" { b.URL = req.URL }
	if req.Description != "" { b.Description = req.Description }
	b.FolderID = req.FolderID
	if req.IsFavorite != nil { b.IsFavorite = *req.IsFavorite }
	if err := h.repo.Update(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, b)
}

func (h *BookmarkHandler) Delete(c *gin.Context) {
	if err := h.repo.Delete(c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) ToggleFavorite(c *gin.Context) {
	fav, err := h.repo.ToggleFavorite(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"is_favorite": fav})
}

func (h *BookmarkHandler) Reorder(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ids 不能为空", "code": "INVALID_REQUEST"})
		return
	}
	if err := h.repo.Reorder(req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *BookmarkHandler) MoveToFolder(c *gin.Context) {
	var req struct {
		FolderID *string `json:"folder_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求格式错误", "code": "INVALID_REQUEST"})
		return
	}
	if req.FolderID != nil {
		exists, err := h.fRepo.Exists(*req.FolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "文件夹不存在", "code": "FOLDER_NOT_FOUND"})
			return
		}
	}
	if err := h.repo.MoveToFolder(c.Param("id"), req.FolderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
```

- [ ] **Step 4: 创建路由注册 + 更新 main.go**

```go
// backend/internal/handler/router.go
package handler

import (
	"cubby/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	folderRepo *repository.FolderRepo,
	bookmarkRepo *repository.BookmarkRepo,
	settingRepo *repository.SettingRepo,
	folderHandler *FolderHandler,
	bookmarkHandler *BookmarkHandler,
) *gin.Engine {
	r := gin.Default()

	api := r.Group("/api/v1")
	{
		folders := api.Group("/folders")
		{
			folders.GET("", folderHandler.GetTree)
			folders.POST("", folderHandler.Create)
			folders.PUT("/:id", folderHandler.Update)
			folders.DELETE("/:id", folderHandler.Delete)
			folders.PUT("/reorder", folderHandler.Reorder)
		}

		bookmarks := api.Group("/bookmarks")
		{
			bookmarks.GET("", bookmarkHandler.List)
			bookmarks.GET("/:id", bookmarkHandler.GetByID)
			bookmarks.POST("", bookmarkHandler.Create)
			bookmarks.PUT("/:id", bookmarkHandler.Update)
			bookmarks.DELETE("/:id", bookmarkHandler.Delete)
			bookmarks.PUT("/:id/favorite", bookmarkHandler.ToggleFavorite)
			bookmarks.PUT("/reorder", bookmarkHandler.Reorder)
			bookmarks.PUT("/:id/folder", bookmarkHandler.MoveToFolder)
		}
	}

	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet && c.Request.URL.Path != "/api/" {
			c.File("./frontend/dist/index.html")
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return r
}
```

```go
// backend/cmd/server/main.go
package main

import (
	"cubby/internal/handler"
	"cubby/internal/repository"
	"log"

	_ "modernc.org/sqlite"
)

func main() {
	db, err := repository.Init("cubby.db")
	if err != nil {
		log.Fatalf("Failed to init database: %v", err)
	}

	folderRepo := repository.NewFolderRepo(db)
	bookmarkRepo := repository.NewBookmarkRepo(db)
	settingRepo := repository.NewSettingRepo(db)

	folderHandler := handler.NewFolderHandler(folderRepo)
	bookmarkHandler := handler.NewBookmarkHandler(bookmarkRepo, folderRepo)

	r := handler.SetupRouter(folderRepo, bookmarkRepo, settingRepo, folderHandler, bookmarkHandler)

	log.Println("Cubby server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

- [ ] **Step 5: 验证 API 可用**

```bash
cd backend && go run ./cmd/server
# curl http://localhost:8080/api/v1/folders → []
# curl http://localhost:8080/api/v1/bookmarks → {"items":[],"total":0,...}
# curl -X POST http://localhost:8080/api/v1/folders -d '{"name":"开发工具"}' → 201
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add Gin HTTP handlers for folders and bookmarks API"
```

---

### Task 7: 元数据抓取服务 `[Codex]`

**Files:**
- Create: `backend/internal/metadata/fetcher.go`
- Modify: `backend/internal/handler/bookmark.go` (添加 fetch-metadata 端点)

- [ ] **Step 1: 实现网页元数据抓取器**

```go
// backend/internal/metadata/fetcher.go
package metadata

import (
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/net/html"
)

type Metadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	FaviconURL  string `json:"favicon_url"`
	OGImage     string `json:"og_image"`
}

func Fetch(url string) (*Metadata, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil { return nil, err }
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Cubby/1.0)")
	resp, err := client.Do(req)
	if err != nil { return nil, err }
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, io.ErrUnexpectedEOF
	}

	doc, err := html.Parse(resp.Body)
	if err != nil { return nil, err }

	m := &Metadata{}
	extractMetadata(doc, url, m)
	return m, nil
}

func extractMetadata(n *html.Node, baseURL string, m *Metadata) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "title":
			if n.FirstChild != nil && m.Title == "" {
				m.Title = n.FirstChild.Data
			}
		case "meta":
			for i, attr := range n.Attr {
				switch attr.Key {
				case "name":
					if attr.Val == "description" && m.Description == "" {
						for j := range n.Attr {
							if n.Attr[j].Key == "content" {
								m.Description = n.Attr[j].Val
								break
							}
						}
					}
				case "property":
					if attr.Val == "og:image" && m.OGImage == "" {
						for j := range n.Attr {
							if n.Attr[j].Key == "content" {
								m.OGImage = resolveURL(baseURL, n.Attr[j].Val)
								break
							}
						}
					}
				case "content":
					// handled above
					_ = i
				}
			}
		case "link":
			var rel, href string
			for _, attr := range n.Attr {
				if attr.Key == "rel" { rel = attr.Val }
				if attr.Key == "href" { href = attr.Val }
			}
			if strings.Contains(rel, "icon") && m.FaviconURL == "" && href != "" {
				m.FaviconURL = resolveURL(baseURL, href)
			}
		}
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractMetadata(c, baseURL, m)
	}
}

func resolveURL(base, ref string) string {
	if strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") {
		return ref
	}
	if strings.HasPrefix(ref, "//") {
		return "https:" + ref
	}
	return base + ref
}

var domainRegex = regexp.MustCompile(`https?://([^/]+)`)

func ExtractDomain(url string) string {
	matches := domainRegex.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	return url
}
```

- [ ] **Step 2: 在 bookmark handler 中添加 fetch-metadata 端点和异步抓取**

在 `bookmark.go` 中添加一个方法并注册到路由。创建书签时自动触发 goroutine 异步抓取。

```go
// 添加到 BookmarkHandler 结构体
type BookmarkHandler struct {
	repo  *repository.BookmarkRepo
	fRepo *repository.FolderRepo
}

// 新增 FetchMetadata 方法
func (h *BookmarkHandler) FetchMetadata(c *gin.Context) {
	id := c.Param("id")
	b, err := h.repo.GetByID(id)
	if err != nil || b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "书签不存在", "code": "NOT_FOUND"})
		return
	}
	go func() {
		meta, err := metadata.Fetch(b.URL)
		if err != nil { return }
		h.repo.UpdateMetadata(id, meta.Title, meta.Description, meta.FaviconURL, meta.OGImage)
	}()
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "元数据抓取已开始"})
}
```

在 `Create` 方法末尾触发异步抓取：
```go
// 在 Create handler 的成功返回之前添加
go func() {
	meta, err := metadata.Fetch(b.URL)
	if err != nil { return }
	h.repo.UpdateMetadata(b.ID, meta.Title, meta.Description, meta.FaviconURL, meta.OGImage)
}()
```

- [ ] **Step 3: 安装依赖并验证编译**

```bash
cd backend && go get golang.org/x/net/html && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add async webpage metadata fetching service"
```

---

### Task 8: 浏览器书签导入 `[Codex]`

**Files:**
- Create: `backend/internal/importer/importer.go`
- Modify: `backend/internal/handler/router.go` (添加 import 路由)

- [ ] **Step 1: 实现 Netscape Bookmark HTML 解析器**

```go
// backend/internal/importer/importer.go
package importer

import (
	"cubby/internal/model"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"
	"golang.org/x/net/html"
)

type ImportResult struct {
	Created int      `json:"created"`
	Skipped int      `json:"skipped"`
	Folders []string `json:"folders_created"`
}

type parseState struct {
	depth      int
	folderPath []string // 当前文件夹层级路径
	bookmarks  []model.Bookmark
	folders    []folderDef
}

type folderDef struct {
	Name     string
	ParentID *string
	ID       string
}

// Parse parses a Netscape bookmark HTML file and returns bookmarks and folder definitions.
// Only maps up to 2 levels of nesting.
func Parse(r io.Reader) ([]model.Bookmark, []folderDef, error) {
	doc, err := html.Parse(r)
	if err != nil { return nil, nil, err }

	state := &parseState{}
	walk(doc, state)
	return state.bookmarks, state.folders, nil
}

func walk(n *html.Node, state *parseState) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "dl":
			state.depth++
			if state.depth > 2 {
				// Skip deeper nesting, still walk children
			}
		case "dt":
			// Container, process children
		case "h3":
			if n.FirstChild != nil && state.depth <= 2 {
				name := extractText(n)
				if name != "" {
					folderID := uuid.New().String()
					var parentID *string
					if len(state.folderPath) > 0 {
						pid := state.folderPath[len(state.folderPath)-1]
						parentID = &pid
					}
					state.folders = append(state.folders, folderDef{
						Name: name, ParentID: parentID, ID: folderID,
					})
					state.folderPath = append(state.folderPath, folderID)
				}
			}
		case "a":
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					title := extractText(n)
					if title == "" { title = attr.Val }
					var folderID *string
					if len(state.folderPath) > 0 {
						fid := state.folderPath[len(state.folderPath)-1]
						folderID = &fid
					}
					state.bookmarks = append(state.bookmarks, model.Bookmark{
						ID:        uuid.New().String(),
						Title:     title,
						URL:       attr.Val,
						FolderID:  folderID,
						SortOrder: len(state.bookmarks),
					})
					break
				}
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walk(c, state)
	}

	if n.Type == html.ElementNode && n.Data == "dl" {
		state.depth--
		if state.depth < len(state.folderPath) {
			state.folderPath = state.folderPath[:state.depth]
		}
	}
}

func extractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return strings.TrimSpace(n.Data)
	}
	var parts []string
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parts = append(parts, extractText(c))
	}
	return strings.TrimSpace(strings.Join(parts, " "))
}

// BuildFolderMap maps folder IDs to folder names for creating folders in order.
func BuildFolderMap(folders []folderDef) []folderDef {
	idToName := make(map[string]string)
	for _, f := range folders { idToName[f.ID] = f.Name }
	return folders
}

func (fd folderDef) String() string {
	if fd.ParentID != nil {
		return fmt.Sprintf("%s (parent: %s)", fd.Name, *fd.ParentID)
	}
	return fd.Name
}
```

- [ ] **Step 2: 在 bookmark handler 添加 import 端点**

```go
// 添加到 BookmarkHandler
func (h *BookmarkHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请上传文件", "code": "INVALID_REQUEST"})
		return
	}
	defer file.Close()

	bookmarks, folders, err := importer.Parse(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "文件解析失败: " + err.Error(), "code": "PARSE_ERROR"})
		return
	}

	// Create folders first
	var folderNames []string
	folderIDMap := make(map[string]string) // temp ID → actual folder name for response
	for _, f := range folders {
		if err := h.fRepo.Create(&model.Folder{
			ID:        f.ID,
			Name:      f.Name,
			ParentID:  f.ParentID,
			SortOrder: len(folderNames),
		}); err != nil {
			// Skip duplicate folders
			continue
		}
		folderNames = append(folderNames, f.Name)
	}

	// Create bookmarks
	created, skipped, err := h.repo.BulkCreate(bookmarks)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	c.JSON(http.StatusOK, importer.ImportResult{
		Created: created,
		Skipped: skipped,
		Folders: folderNames,
	})
}
```

在 `router.go` 注册：
```go
bookmarks.POST("/import", bookmarkHandler.Import)
```

- [ ] **Step 3: 验证编译**

```bash
cd backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat: add browser bookmark import (Netscape HTML format)"
```

---

### Task 9: Settings Handler + AI 服务骨架

**Files:**
- Create: `backend/internal/handler/setting.go`
- Create: `backend/internal/ai/client.go`
- Create: `backend/internal/handler/ai.go`
- Modify: `backend/internal/handler/router.go`

- [ ] **Step 1: 实现 settings handler**

```go
// backend/internal/handler/setting.go
package handler

import (
	"cubby/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SettingHandler struct {
	repo *repository.SettingRepo
}

func NewSettingHandler(repo *repository.SettingRepo) *SettingHandler { return &SettingHandler{repo: repo} }

type settingsResponse struct {
	Settings map[string]string `json:"settings"`
}

func (h *SettingHandler) GetAll(c *gin.Context) {
	settings, err := h.repo.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}
	// Mask sensitive fields
	if v, ok := settings["ai_api_key"]; ok && len(v) > 8 {
		settings["ai_api_key"] = v[:4] + "****" + v[len(v)-4:]
	}
	c.JSON(http.StatusOK, settingsResponse{Settings: settings})
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
```

- [ ] **Step 2: 实现 AI 客户端**

```go
// backend/internal/ai/client.go
package ai

import (
	"bytes"
	"cubby/internal/model"
	"cubby/internal/repository"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	settingRepo *repository.SettingRepo
	httpClient  *http.Client
}

func NewClient(settingRepo *repository.SettingRepo) *Client {
	return &Client{
		settingRepo: settingRepo,
		httpClient:  &http.Client{Timeout: 60 * time.Second},
	}
}

type OrganizeRequest struct {
	Action   string `json:"action"`   // "suggest" or "apply"
	FolderID string `json:"folder_id"` // empty for all
}

type Suggestion struct {
	BookmarkID       string  `json:"bookmark_id"`
	Title            string  `json:"title"`
	SuggestedFolder  string  `json:"suggested_folder"`
	NewFolderName    string  `json:"new_folder_name,omitempty"`
	Confidence       float64 `json:"confidence"`
	Reason           string  `json:"reason"`
}

type OrganizeResponse struct {
	Suggestions []Suggestion `json:"suggestions"`
}

func (c *Client) Organize(bookmarks []model.Bookmark, folders []repository.FolderTree, req OrganizeRequest) (*OrganizeResponse, error) {
	settings, err := c.settingRepo.GetAll()
	if err != nil { return nil, err }

	provider := settings["ai_provider"]
	apiKey := settings["ai_api_key"]
	modelName := settings["ai_model"]
	baseURL := settings["ai_base_url"]

	if apiKey == "" { return nil, fmt.Errorf("请先在设置中配置 AI API Key") }
	if modelName == "" { modelName = defaultModel(provider) }

	// Build folder summary
	var folderList strings.Builder
	for _, f := range folders {
		folderList.WriteString(fmt.Sprintf("- %s", f.Name))
		for _, child := range f.Children {
			folderList.WriteString(fmt.Sprintf(" / %s", child.Name))
		}
		folderList.WriteString("\n")
	}

	// Build bookmark list
	var bmList strings.Builder
	for _, b := range bookmarks {
		folderName := "未分类"
		if b.FolderID != nil {
			folderName = *b.FolderID // Will be resolved by handler
		}
		bmList.WriteString(fmt.Sprintf("[%s] %s | %s\n", b.ID, b.Title, b.URL))
	}

	prompt := fmt.Sprintf(`你是一个书签整理助手。根据以下书签列表和现有文件夹结构，为每个书签推荐最合适的分类。

现有文件夹结构:
%s

书签列表:
%s

请为每个书签推荐分类。使用现有文件夹路径（如 "开发工具/Go"），如果都不合适可以建议新建文件夹。
以 JSON 数组格式返回，每个元素包含:
- bookmark_id: 书签ID
- suggested_folder: 推荐的文件夹路径
- new_folder_name: 如需新建则填写名称，否则为空
- confidence: 置信度 0-1
- reason: 推荐理由（中文，一句话）

仅返回 JSON，不要其他内容。`, folderList.String(), bmList.String())

	messages := []map[string]string{
		{"role": "system", "content": "你是一个书签整理助手，始终以 JSON 格式返回结果。"},
		{"role": "user", "content": prompt},
	}

	var respBody string
	switch provider {
	case "anthropic":
		respBody, err = c.callAnthropic(baseURL, apiKey, modelName, messages)
	default:
		respBody, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	}
	if err != nil { return nil, err }

	var suggestions []Suggestion
	if err := json.Unmarshal([]byte(respBody), &suggestions); err != nil {
		return nil, fmt.Errorf("AI 返回格式解析失败: %w", err)
	}

	return &OrganizeResponse{Suggestions: suggestions}, nil
}

func (c *Client) callOpenAI(baseURL, apiKey, model string, messages []map[string]string) (string, error) {
	if baseURL == "" { baseURL = "https://api.openai.com/v1" }
	url := baseURL + "/chat/completions"

	body := map[string]any{
		"model":    model,
		"messages": messages,
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil { return "", err }
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	var result map[string]any
	json.Unmarshal(respData, &result)

	choices := result["choices"].([]any)
	if len(choices) == 0 { return "", fmt.Errorf("AI 返回为空") }
	message := choices[0].(map[string]any)["message"].(map[string]any)
	return message["content"].(string), nil
}

func (c *Client) callAnthropic(baseURL, apiKey, model string, messages []map[string]string) (string, error) {
	if baseURL == "" { baseURL = "https://api.anthropic.com/v1" }
	url := baseURL + "/messages"

	systemMsg := ""
	var chatMsgs []map[string]string
	for _, m := range messages {
		if m["role"] == "system" { systemMsg = m["content"]; continue }
		chatMsgs = append(chatMsgs, m)
	}

	body := map[string]any{
		"model":     model,
		"max_tokens": 4096,
		"messages":  chatMsgs,
	}
	if systemMsg != "" { body["system"] = systemMsg }
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil { return "", err }
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	var result map[string]any
	json.Unmarshal(respData, &result)

	content := result["content"].([]any)
	if len(content) == 0 { return "", fmt.Errorf("AI 返回为空") }
	return content[0].(map[string]any)["text"].(string), nil
}

func (c *Client) TestConnection() error {
	settings, err := c.settingRepo.GetAll()
	if err != nil { return err }
	if settings["ai_api_key"] == "" { return fmt.Errorf("请先配置 API Key") }

	modelName := settings["ai_model"]
	if modelName == "" { modelName = defaultModel(settings["ai_provider"]) }

	messages := []map[string]string{{"role": "user", "content": "请回复\"连接成功\""}}
	_, err = c.Organize(nil, nil, OrganizeRequest{})
	if err != nil { return err }

	// Simple test: just check if API key is valid by making a minimal call
	provider := settings["ai_provider"]
	baseURL := settings["ai_base_url"]
	apiKey := settings["ai_api_key"]

	switch provider {
	case "anthropic":
		_, err = c.callAnthropic(baseURL, apiKey, modelName, messages)
	default:
		_, err = c.callOpenAI(baseURL, apiKey, modelName, messages)
	}
	return err
}

func defaultModel(provider string) string {
	switch provider {
	case "anthropic": return "claude-sonnet-4-20250514"
	default: return "gpt-4o-mini"
	}
}
```

- [ ] **Step 3: 实现 AI handler**

```go
// backend/internal/handler/ai.go
package handler

import (
	"cubby/internal/ai"
	"cubby/internal/model"
	"cubby/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AIHandler struct {
	aiClient      *ai.Client
	bookmarkRepo  *repository.BookmarkRepo
	folderRepo    *repository.FolderRepo
	folderHandler *FolderHandler
}

func NewAIHandler(aiClient *ai.Client, bookmarkRepo *repository.BookmarkRepo, folderRepo *repository.FolderRepo, folderHandler *FolderHandler) *AIHandler {
	return &AIHandler{aiClient: aiClient, bookmarkRepo: bookmarkRepo, folderRepo: folderRepo, folderHandler: folderHandler}
}

func (h *AIHandler) Organize(c *gin.Context) {
	var req ai.OrganizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Default to suggest
		req.Action = "suggest"
	}

	var bookmarks []model.Bookmark
	var err error

	if req.FolderID != "" {
		// Organize within a specific folder
		ids, err := h.folderRepo.GetDescendantIDs(req.FolderID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		ids = append([]string{req.FolderID}, ids...)
		bookmarks, err = h.bookmarkRepo.ListByFolderIDs(ids)
	} else {
		q := repository.BookmarkQuery{FolderID: "all", PageSize: 200}
		result, err := h.bookmarkRepo.List(q)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
			return
		}
		bookmarks = result.Items
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	if len(bookmarks) == 0 {
		c.JSON(http.StatusOK, ai.OrganizeResponse{Suggestions: []ai.Suggestion{}})
		return
	}

	tree, err := h.folderRepo.GetTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error(), "code": "INTERNAL_ERROR"})
		return
	}

	resp, err := h.aiClient.Organize(bookmarks, tree, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "AI_ERROR"})
		return
	}

	if req.Action == "apply" {
		for _, s := range resp.Suggestions {
			if s.NewFolderName != "" {
				// Create new folder
				newFolder := &model.Folder{
					ID:   generateUUID(),
					Name: s.NewFolderName,
					SortOrder: 999,
				}
				// Parse suggested path for parent
				parts := splitPath(s.SuggestedFolder)
				if len(parts) > 1 {
					newFolder.Name = parts[len(parts)-1]
					// Find parent folder
					parentName := parts[0]
					for _, f := range tree {
						if f.Name == parentName {
							pid := f.ID
							newFolder.ParentID = &pid
							break
						}
					}
				}
				if err := h.folderRepo.Create(newFolder); err == nil {
					_ = h.bookmarkRepo.MoveToFolder(s.BookmarkID, &newFolder.ID)
				}
			} else {
				// Move to existing folder - find folder by name
				folderID := findFolderIDByName(tree, s.SuggestedFolder)
				if folderID != nil {
					_ = h.bookmarkRepo.MoveToFolder(s.BookmarkID, folderID)
				}
			}
		}
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AIHandler) TestConnection(c *gin.Context) {
	if err := h.aiClient.TestConnection(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "code": "AI_TEST_FAILED"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "message": "AI 连接成功"})
}
```

- [ ] **Step 4: 更新 router.go 注册所有新路由**

在 `SetupRouter` 中添加 settings 和 ai 路由组，并更新 `main.go` 注入依赖。

- [ ] **Step 5: 验证编译**

```bash
cd backend && go build ./...
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add settings handler, AI organize service and endpoint"
```

---

### Task 10: 前端基础 — 路由 + 布局 + 状态管理

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/pages/MainPage.tsx`
- Create: `frontend/src/pages/SettingsPage.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/stores/bookmarkStore.ts`
- Create: `frontend/src/stores/folderStore.ts`
- Create: `frontend/src/stores/settingsStore.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: 定义 TypeScript 类型**

```typescript
// frontend/src/types/index.ts
export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
  children?: Folder[]
}

export interface Bookmark {
  id: string
  title: string
  url: string
  description: string
  favicon_url: string
  thumbnail_url: string
  folder_id: string | null
  is_favorite: boolean
  sort_order: number
  metadata_fetched: boolean
  created_at: string
  updated_at: string
}

export interface BookmarkListResult {
  items: Bookmark[]
  total: number
  page: number
  page_size: number
}

export interface AISuggestion {
  bookmark_id: string
  title: string
  suggested_folder: string
  new_folder_name?: string
  confidence: number
  reason: string
}
```

- [ ] **Step 2: 创建 API 服务层**

```typescript
// frontend/src/services/api.ts
import axios from 'axios'
import type { Folder, Bookmark, BookmarkListResult, AISuggestion } from '../types'

const api = axios.create({ baseURL: '/api/v1' })

// Folders
export const getFolders = () => api.get<Folder[]>('/folders').then(r => r.data)
export const createFolder = (data: { name: string; parent_id?: string | null }) =>
  api.post<Folder>('/folders', data).then(r => r.data)
export const updateFolder = (id: string, data: { name: string; parent_id?: string | null }) =>
  api.put(`/folders/${id}`, data).then(r => r.data)
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`).then(r => r.data)
export const reorderFolders = (ids: string[]) => api.put('/folders/reorder', { ids }).then(r => r.data)

// Bookmarks
export const getBookmarks = (params?: Record<string, string>) =>
  api.get<BookmarkListResult>('/bookmarks', { params }).then(r => r.data)
export const getBookmark = (id: string) => api.get<Bookmark>(`/bookmarks/${id}`).then(r => r.data)
export const createBookmark = (data: Partial<Bookmark>) =>
  api.post<Bookmark>('/bookmarks', data).then(r => r.data)
export const updateBookmark = (id: string, data: Partial<Bookmark>) =>
  api.put<Bookmark>(`/bookmarks/${id}`, data).then(r => r.data)
export const deleteBookmark = (id: string) => api.delete(`/bookmarks/${id}`).then(r => r.data)
export const toggleFavorite = (id: string) => api.put(`/bookmarks/${id}/favorite`).then(r => r.data)
export const reorderBookmarks = (ids: string[]) => api.put('/bookmarks/reorder', { ids }).then(r => r.data)
export const moveBookmark = (id: string, folder_id: string | null) =>
  api.put(`/bookmarks/${id}/folder`, { folder_id }).then(r => r.data)
export const importBookmarks = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/bookmarks/import', fd).then(r => r.data)
}
export const fetchMetadata = (id: string) => api.post(`/bookmarks/${id}/fetch-metadata`).then(r => r.data)

// AI
export const aiOrganize = (folderId?: string, action: 'suggest' | 'apply' = 'suggest') =>
  api.post<{ suggestions: AISuggestion[] }>('/ai/organize', { folder_id: folderId || '', action }).then(r => r.data)

// Settings
export const getSettings = () => api.get<Record<string, string>>('/settings').then(r => r.data)
export const updateSettings = (data: Record<string, string>) => api.put('/settings', data).then(r => r.data)
export const testAIConnection = () => api.post('/settings/ai/test').then(r => r.data)
```

- [ ] **Step 3: 创建 Zustand stores**

```typescript
// frontend/src/stores/folderStore.ts
import { create } from 'zustand'
import type { Folder } from '../types'
import * as api from '../services/api'

interface FolderStore {
  folders: Folder[]
  selectedFolderId: string | null // null = all, 'unsorted', 'recent', 'favorites'
  loading: boolean
  fetchFolders: () => Promise<void>
  createFolder: (name: string, parentId?: string | null) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  updateFolder: (id: string, name: string, parentId?: string | null) => Promise<void>
  selectFolder: (id: string | null) => void
}

export const useFolderStore = create<FolderStore>((set, get) => ({
  folders: [],
  selectedFolderId: null,
  loading: false,
  fetchFolders: async () => {
    set({ loading: true })
    const folders = await api.getFolders()
    set({ folders, loading: false })
  },
  createFolder: async (name, parentId) => {
    await api.createFolder({ name, parent_id: parentId })
    await get().fetchFolders()
  },
  deleteFolder: async (id) => {
    await api.deleteFolder(id)
    await get().fetchFolders()
  },
  updateFolder: async (id, name, parentId) => {
    await api.updateFolder(id, { name, parent_id: parentId })
    await get().fetchFolders()
  },
  selectFolder: (id) => set({ selectedFolderId: id }),
}))
```

```typescript
// frontend/src/stores/bookmarkStore.ts
import { create } from 'zustand'
import type { Bookmark, BookmarkListResult } from '../types'
import * as api from '../services/api'

interface BookmarkStore {
  result: BookmarkListResult
  loading: boolean
  viewMode: 'grid' | 'list'
  fetchBookmarks: (params?: Record<string, string>) => Promise<void>
  createBookmark: (data: Partial<Bookmark>) => Promise<Bookmark>
  updateBookmark: (id: string, data: Partial<Bookmark>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  setViewMode: (mode: 'grid' | 'list') => void
  refresh: () => void
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  result: { items: [], total: 0, page: 1, page_size: 50 },
  loading: false,
  viewMode: 'grid',
  fetchBookmarks: async (params) => {
    set({ loading: true })
    const result = await api.getBookmarks(params)
    set({ result, loading: false })
  },
  createBookmark: async (data) => {
    const bookmark = await api.createBookmark(data)
    await get().refresh()
    return bookmark
  },
  updateBookmark: async (id, data) => {
    await api.updateBookmark(id, data)
    await get().refresh()
  },
  deleteBookmark: async (id) => {
    await api.deleteBookmark(id)
    await get().refresh()
  },
  toggleFavorite: async (id) => {
    await api.toggleFavorite(id)
    await get().refresh()
  },
  setViewMode: (mode) => set({ viewMode: mode }),
  refresh: () => {
    const { result } = get()
    // Re-fetch with same params is handled by the page component
    get().fetchBookmarks()
  },
}))
```

```typescript
// frontend/src/stores/settingsStore.ts
import { create } from 'zustand'
import * as api from '../services/api'

interface SettingsStore {
  settings: Record<string, string>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: Record<string, string>) => Promise<void>
  testAI: () => Promise<{ ok: boolean; message?: string }>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {},
  loading: false,
  fetchSettings: async () => {
    set({ loading: true })
    const settings = await api.getSettings()
    set({ settings, loading: false })
  },
  updateSettings: async (data) => {
    await api.updateSettings(data)
    set((s) => ({ settings: { ...s.settings, ...data } }))
  },
  testAI: async () => {
    try {
      await api.testAIConnection()
      return { ok: true, message: '连接成功' }
    } catch (e: any) {
      return { ok: false, message: e.response?.data?.error || '连接失败' }
    }
  },
}))
```

- [ ] **Step 4: 创建路由和布局**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MainPage } from './pages/MainPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<MainPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

```tsx
// frontend/src/components/Layout.tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
```

```tsx
// frontend/src/pages/MainPage.tsx — placeholder
export function MainPage() {
  return <div className="p-6">主页面内容</div>
}
```

```tsx
// frontend/src/pages/SettingsPage.tsx — placeholder
export function SettingsPage() {
  return <div className="p-6">设置页内容</div>
}
```

```tsx
// frontend/src/components/Sidebar.tsx — placeholder
export function Sidebar() {
  return <div className="w-70 border-r border-white/10">侧边栏</div>
}
```

- [ ] **Step 5: 验证前端能启动**

```bash
cd frontend && npm run dev
# 访问 http://localhost:5173
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add frontend routing, layout, types, API service and Zustand stores"
```

---

### Task 11: 前端 — 侧边栏组件（iOS 18 毛玻璃风格）

**Files:**
- Rewrite: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: 实现完整的毛玻璃侧边栏**

实现包含品牌标识、搜索框、快捷入口、文件夹树（展开/折叠、右键菜单含"AI 整理此文件夹"）的完整侧边栏。使用 TailwindCSS 实现 iOS 18 毛玻璃效果 (`backdrop-blur-xl bg-white/[0.03]`)。

关键交互：
- `⌘K` 快捷键聚焦搜索框
- 文件夹展开/折叠（`▾`/`▸` 图标切换）
- 文件夹右键菜单：重命名、删除、AI 整理此文件夹
- 底部设置入口（齿轮图标，链接到 `/settings`）

> 完整的 Tailwind 类和 JSX 代码较长，由执行代理根据设计 spec 和 UI mockup 实现。

- [ ] **Step 2: 验证侧边栏渲染**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat: implement iOS 18 glassmorphism sidebar with folder tree"
```

---

### Task 12: 前端 — 书签网格 + 卡片组件

**Files:**
- Create: `frontend/src/components/BookmarkGrid.tsx`
- Create: `frontend/src/components/BookmarkCard.tsx`
- Create: `frontend/src/components/AddBookmarkDialog.tsx`
- Create: `frontend/src/components/AISuggestDialog.tsx`
- Rewrite: `frontend/src/pages/MainPage.tsx`

- [ ] **Step 1: 实现书签卡片组件**

iOS 18 毛玻璃卡片：渐变 favicon + 标题(1行) + 域名 + 描述(2行截断)，hover 浮起 + 操作按钮淡入（编辑/移动/删除），拖拽手柄，AI 推荐徽章。

- [ ] **Step 2: 实现书签网格**

响应式网格布局，支持网格/列表视图切换。整合搜索过滤逻辑。接收 folder store 的 selectedFolderId 变化，重新 fetch 书签。

- [ ] **Step 3: 实现添加收藏弹窗**

URL 输入 → 自动填充标题 → 选择文件夹 → 提交。

- [ ] **Step 4: 实现 AI 整理弹窗**

显示 AI 建议列表（书签名、推荐文件夹、置信度、理由），每个建议可接受/拒绝，底部"全部应用"按钮。

- [ ] **Step 5: 重写 MainPage 整合所有组件**

顶栏（标题 + 搜索 + 视图切换 + AI 整理按钮 + 添加收藏按钮）+ 书签网格区域。

- [ ] **Step 6: 验证完整页面交互**

```bash
cd frontend && npm run dev
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: implement bookmark grid, cards, dialogs and main page"
```

---

### Task 13: 前端 — 设置页

**Files:**
- Rewrite: `frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 实现设置页面**

iOS 18 风格表单：
- AI 服务商选择（下拉框：OpenAI / Anthropic / 自定义）
- API Key（密码输入框 + 显示/隐藏 + "测试连接" 按钮）
- 模型名称（文本输入）
- 自定义 API 地址（文本输入，选择自定义时显示）
- 暗色/亮色主题切换

> 由执行代理根据设计 spec 实现。

- [ ] **Step 2: 验证设置页**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SettingsPage.tsx
git commit -m "feat: implement settings page with AI configuration"
```

---

### Task 14: 前端 — 动态背景 + 全局样式

**Files:**
- Create: `frontend/src/components/AnimatedBackground.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: 实现动态渐变背景**

三个漂浮光球（CSS animation `orbFloat`）+ SVG 噪声纹理叠加。使用 TailwindCSS 的自定义类 + 内联样式。

- [ ] **Step 2: 整合到 Layout**

在 `Layout.tsx` 中添加 `<AnimatedBackground />` 作为固定背景层。

- [ ] **Step 3: 配置全局样式**

在 `index.css` 中设置 body 基础样式、自定义滚动条、Inter 字体导入。

- [ ] **Step 4: 验证视觉效果**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/
git commit -m "feat: add animated gradient background and global styles"
```

---

### Task 15: 前端 — 书签导入功能

**Files:**
- Create: `frontend/src/components/ImportDialog.tsx`
- Modify: `frontend/src/pages/MainPage.tsx` (添加导入入口)

- [ ] **Step 1: 实现导入弹窗**

文件拖拽上传区域 + 浏览器选择按钮（仅接受 `.html` 文件）。上传后显示导入结果（新增数、跳过数、创建的文件夹列表）。

- [ ] **Step 2: 在顶栏添加导入按钮**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: add bookmark import dialog with drag-and-drop"
```

---

### Task 16: Go embed + 生产构建

**Files:**
- Create: `backend/embed.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `backend/internal/handler/router.go`

- [ ] **Step 1: 创建 embed 文件**

```go
// backend/embed.go
//go:build !dev

package backend

import "embed"

//go:embed all:../frontend/dist
var FrontendFS embed.FS
```

- [ ] **Step 2: 更新 router.go 使用 embed**

在生产模式下从 `embed.FS` 提供静态文件。开发模式下使用文件系统。

```go
// 在 router.go 中
import (
	"io/fs"
	"net/http"
)

// 生产模式：从 embed.FS 读取前端文件
// 开发模式：由 Vite dev server 处理
```

- [ ] **Step 3: 更新 main.go**

```go
package main

import (
	"cubby/internal/handler"
	"cubby/internal/repository"
	"cubby/internal/ai"
	"log"
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:../../frontend/dist
var frontendFS embed.FS

func main() {
	db, err := repository.Init("cubby.db")
	if err != nil { log.Fatalf("Failed to init database: %v", err) }

	folderRepo := repository.NewFolderRepo(db)
	bookmarkRepo := repository.NewBookmarkRepo(db)
	settingRepo := repository.NewSettingRepo(db)

	folderHandler := handler.NewFolderHandler(folderRepo)
	bookmarkHandler := handler.NewBookmarkHandler(bookmarkRepo, folderRepo)
	settingHandler := handler.NewSettingHandler(settingRepo)
	aiClient := ai.NewClient(settingRepo)
	aiHandler := handler.NewAIHandler(aiClient, bookmarkRepo, folderRepo, folderHandler)

	r := handler.SetupRouter(folderRepo, bookmarkRepo, settingRepo, folderHandler, bookmarkHandler, settingHandler, aiHandler)

	// Serve embedded frontend
	frontendDist, _ := fs.Sub(frontendFS, "frontend/dist")
	r.StaticFS("/", http.FS(frontendDist))

	log.Println("Cubby server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
```

- [ ] **Step 4: 更新 Makefile**

添加 `build` 目标：先构建前端，再编译 Go（嵌入前端）。

- [ ] **Step 5: 验证生产构建**

```bash
make build
./cubby
# 访问 http://localhost:8080 看到完整应用
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Go embed for production single-binary deployment"
```

---

### Task 17: 集成测试 + 最终验证

**Files:**
- All previous files

- [ ] **Step 1: 启动完整应用**

```bash
# Terminal 1: cd backend && go run ./cmd/server
# Terminal 2: cd frontend && npm run dev
```

- [ ] **Step 2: 手动测试核心流程**

1. 创建文件夹（根级 + 子级）
2. 添加书签（手动 + URL 自动抓取元数据）
3. 编辑/删除书签
4. 拖拽排序
5. 全文搜索
6. 收藏/取消收藏
7. 导入浏览器书签 HTML
8. AI 整理（全局 + 单文件夹）
9. 设置页配置 AI
10. 视图切换（网格/列表）

- [ ] **Step 3: 验证生产构建**

```bash
make build && ./cubby
```

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "chore: integration testing and final adjustments"
```

---

## 任务依赖关系

```
Task 1 (脚手架)
  ├─→ Task 2 (数据库) ──→ Task 3 (Folder Repo) ──┐
  │                      ──→ Task 4 (Bookmark Repo) ─┤
  │                      ──→ Task 5 (Settings Repo) ─┤
  │                                                    ├─→ Task 6 (Handlers)
  │                                                    ├─→ Task 7 (元数据抓取) [Codex]
  │                                                    ├─→ Task 8 (导入) [Codex]
  │                                                    └─→ Task 9 (Settings + AI)
  │
  └─→ Task 10 (前端基础)
        ├─→ Task 11 (侧边栏)
        ├─→ Task 12 (书签网格)
        ├─→ Task 13 (设置页)
        ├─→ Task 14 (动态背景)
        └─→ Task 15 (导入弹窗)

Task 6-9 (全部后端) + Task 10-15 (全部前端) ──→ Task 16 (embed 构建) ──→ Task 17 (集成测试)
```

**可并行执行（Codex 分配）：** Task 2/3/4/5 可并行，Task 7/8 可并行，Task 11/12/13/14/15 可并行。
