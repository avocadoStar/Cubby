# Cubby — Edge Favorites Clone 设计规格

## 概述

Cubby 是一个类 edge://favorites/ 的书签管理应用。纯 Edge Clone 路线，Fluent 风格，两栏布局。
Phase 1 聚焦收藏夹管理核心功能，Phase 2 引入轻量 AI 智能整理。

### 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 拖拽 | dnd-kit |
| 虚拟列表 | react-virtuoso |
| 状态管理 | Zustand |
| 后端 | Go + Gin |
| 数据库 | SQLite (WAL 模式) |
| 排序 | LexoRank (后端生成) |
| 认证 | 单用户密码 + JWT |

### Phase 1 功能

- 单用户密码登录
- 文件夹树（无限层级、展开折叠、拖拽排序/移动）
- 书签列表（fluent-tree-item 风格、虚拟滚动、多选、拖拽排序）
- 右键菜单（打开/重命名/删除/移动）
- HTML 书签导入/导出
- 全局搜索

### Phase 2 功能

- AI 智能整理（轻量 LLM 管线：发送标题+URL → LLM 分类 → Diff 预览 → 用户确认）

---

## 页面布局

### 整体结构

```
Page (两栏，无全局顶部栏)
├── Left Pane (280px)
│   ├── "收藏夹" 标题 (18px, semibold, Segoe UI)
│   ├── fluent-search "搜索收藏夹" (过滤文件夹树)
│   └── fluent-tree-view
│       ├── ⭐ 所有书签
│       ├── ▾ 📁 工作
│       │   └── ▾ 📁 前端
│       ├── ▸ 📁 设计
│       └── ▸ 📁 工具
│
└── Right Pane (flex: 1)
    ├── Toolbar (单行)
    │   ├── [左] Breadcrumb: 收藏夹 / 工作 / 前端
    │   └── [右] 添加收藏夹 | 添加文件夹 | ···
    └── Bookmark List (fluent-tree-items)
```

### 视觉系统

| 属性 | 值 |
|------|-----|
| 字体 | Segoe UI (系统默认), 正文 13px, 标题 18px, 次级 11-12px |
| 主色 | #0078D4 |
| 选中背景 | #E5F0FF |
| hover 背景 | #F5F5F5 |
| 页面背景 | #FFFFFF |
| 分割线 | 1px solid #E8E8E8 |
| 圆角 | 4px |
| 阴影 | 无 |
| 行高 | 32px (树节点/书签行) |
| 缩进 | depth × 20px |

### 按钮规范（Fluent subtle）

- appearance: subtle（透明默认，hover 浅灰底）
- height: 32px, padding: 0 10px, border-radius: 4px
- icon: SVG 20×20, fill="currentColor", gap 6px

### 书签行结构

```
[○] [favicon] 名称 ········· URL ········· 日期 [✕]
```

- 18px 圆形复选框（未选：灰边框空心 / 选中：蓝底白勾）
- X 删除按钮 hover 时显示（默认 opacity: 0）
- 无边框，透明默认，hover/selected 显示背景色

### 批量操作栏

- 选中 ≥1 项后右上角弹出 Alert Dialog
- 内容："已选择 N 项" + [删除(primary)] + [取消(default)]
- role="dialog", aria-modal="true"

### 滚动行为

- 左侧树内容超出 → 纵向滚动条
- 左侧文件夹名过长 → 横向滚动条
- 右侧书签列表超出 → 纵向滚动条

---

## 组件树

```
App
├── LoginPage
│
└── MainLayout (两栏)
    │
    ├── Sidebar (280px)
    │   ├── Title ("收藏夹")
    │   ├── SearchBox (fluent-search, 过滤树)
    │   └── FolderTree (虚拟列表)
    │       └── FolderNode (memo, 递归渲染)
    │           ├── ExpandIcon (▸/▾, 叶节点无)
    │           ├── FolderIcon (📁 金黄色)
    │           └── Name
    │
    ├── ContentPanel
    │   ├── Toolbar
    │   │   ├── Breadcrumb
    │   │   ├── AddFavoriteButton (subtle, 星+加号图标)
    │   │   ├── AddFolderButton (subtle, 文件夹+加号图标)
    │   │   └── MoreMenu (··· → 导入/导出)
    │   │
    │   ├── BatchActionBar (条件渲染: 选中 ≥1 项)
    │   │   ├── SelectionCount ("已选择 N 项")
    │   │   ├── DeleteButton (primary)
    │   │   └── CancelButton (default)
    │   │
    │   └── BookmarkList (虚拟列表)
    │       └── BookmarkRow (memo)
    │           ├── Checkbox (圆形, toggle 多选)
    │           ├── Favicon
    │           ├── Name
    │           ├── URL
    │           ├── Date
    │           └── DeleteButton (hover 显示)
    │
    ├── ContextMenu (全局右键菜单)
    ├── CreateFolderModal
    ├── EditBookmarkModal
    └── ImportModal
```

---

## 数据模型

### Folder 表

```sql
CREATE TABLE folder (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES folder(id) ON DELETE CASCADE,
  sort_key   TEXT NOT NULL,
  version    INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_folder_parent_sort ON folder(parent_id, sort_key);
CREATE UNIQUE INDEX idx_folder_parent_sort_unique
  ON folder(parent_id, sort_key) WHERE deleted_at IS NULL;
```

### Bookmark 表

```sql
CREATE TABLE bookmark (
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
CREATE INDEX idx_bookmark_folder_sort ON bookmark(folder_id, sort_key);
CREATE UNIQUE INDEX idx_bookmark_folder_sort_unique
  ON bookmark(folder_id, sort_key) WHERE deleted_at IS NULL;
```

### Setting 表

```sql
CREATE TABLE setting (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 关键约束

- updated_at 由后端 UPDATE 语句直接设置（不使用 trigger 避免递归风险）
- 所有查询必须 `WHERE deleted_at IS NULL`（DAO 层封装）
- UPDATE 必须带 `WHERE version = oldVersion`（乐观锁），冲突返回 409
- sort_key 由后端唯一生成，前端绝不参与
- folder 删除后 bookmark.folder_id = NULL，UI 显示"未分类"区域
- UNIQUE(parent_id, sort_key) 防止并发插入冲突

---

## sort_key 生成规则

```
仅后端生成，使用 LexoRank 算法。

insert at head (prev_id = null):
  new_key = before(first_child.sort_key)

insert at tail (next_id = null):
  new_key = after(last_child.sort_key)

insert between (both exist):
  new_key = between(prev.sort_key, next.sort_key)

rebalance:
  触发: 当相邻 key 的 gap 小于阈值时
  范围: 仅限同一 parent_id 下的 children（局部化）
  方式: 异步重排，重新分配均匀间隔的 sort_key

并发安全:
  UNIQUE constraint 冲突 → retry loop (最多 3 次)
```

---

## API 设计

### 认证

```
POST /api/auth/login
  Request:  { password: string }
  Response: { token: string }  // JWT, 7天过期
```

### 文件夹

```
GET    /api/folders?parent_id=xxx
        → Folder[]

POST   /api/folders
        { name, parent_id }
        → Folder

PUT    /api/folders/:id
        { name, version }
        → Folder | 409

DELETE /api/folders/:id
        → 204  (软删除，设置 deleted_at)

POST   /api/folders/move
        { id, parent_id, prev_id, next_id, version }
        → Folder | 409
```

### 书签

```
GET    /api/bookmarks?folder_id=xxx
        → Bookmark[]

POST   /api/bookmarks
        { title, url, folder_id }
        → Bookmark

PUT    /api/bookmarks/:id
        { title, url, version }
        → Bookmark | 409

DELETE /api/bookmarks/:id
        → 204  (软删除)

POST   /api/bookmarks/move
        { id, folder_id, prev_id, next_id, version }
        → Bookmark | 409
```

### 批量操作

```
POST /api/bookmarks/batch-move
  {
    ids: string[],              // 数组顺序 = 最终相对顺序
    target_folder_id: string,
    anchor_id: string,
    position: "before" | "after"
  }
  → Bookmark[] | 409

POST /api/bookmarks/batch-delete
  { ids: string[] }
  → 204
```

### 搜索 / 导入导出

```
GET  /api/search?q=keyword&folder_id=xxx
      → Bookmark[]

POST /api/import
      multipart/form-data (HTML 文件)
      → { imported: number, folders: number }

GET  /api/export?format=html|json
      → 文件下载
```

### Move API 验证规则

- prev_id / next_id 必须与目标 parent_id 下的 children 一致
- 跨 parent 不一致时返回 400
- 409 冲突策略: retry once → fail → refetch + rebase UI

### 乐观锁 UPDATE 模板

```sql
UPDATE folder
SET name = ?, version = version + 1
WHERE id = ? AND version = ? AND deleted_at IS NULL;
-- rows affected = 0 → 返回 409
```

---

## Phase 2: AI 智能整理

轻量管线，不引入 embedding / vector DB。

```
用户点击"自动整理"
  → 后端收集所有书签 [{title, url}]
  → 发送到 LLM，Prompt:
    "将以下书签按语义分类，生成文件夹结构（最多3层），
     避免过度拆分，保持中文/英文自然分组"
  → LLM 返回 { folders: [{ name, children: [...], bookmarks: [...] }] }
  → 前端展示 Before/After Diff
  → 用户确认后应用
```

安全约束: AI 只生成 plan，不直接写 DB。用户确认后才执行。

---

## 实现补强要点

1. DAO 层统一封装 `WHERE deleted_at IS NULL`
2. 后端 UPDATE 直接设置 `updated_at`，不用 trigger
3. Sort_key rebalance 用 gap-based 触发，per-parent 局部化，异步执行
4. Move API 服务端验证 prev_id/next_id 与 parent_id 一致性
5. Batch-move 明确 ids[] 顺序 = 最终相对顺序
6. 409 冲突: retry once → refetch + rebase UI
7. 所有 sort_key 操作带 retry loop（UNIQUE constraint 冲突时）
