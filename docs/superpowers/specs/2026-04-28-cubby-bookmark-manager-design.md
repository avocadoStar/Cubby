# Cubby — 个人收藏夹管理系统 设计文档

## 概述

Cubby 是一个面向个人使用的书签收藏管理 Web 应用，采用前后端一体的单体架构。用户通过文件夹（最多两级嵌套）组织书签，支持全文搜索、网页元数据自动抓取、浏览器书签导入，以及基于 AI 的智能整理功能。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | Go 1.22+ (Gin / Echo) |
| 数据库 | SQLite (通过 `modernc.org/sqlite` 纯 Go 驱动) |
| AI | 调用外部 LLM API (OpenAI / Anthropic / 自定义 endpoint) |
| 部署 | 单一二进制文件 + SQLite 数据库文件 |

## 架构

```
┌─────────────────────────────────────┐
│         Go Server (:8080)           │
│  ┌─────────────┐ ┌──────────────┐  │
│  │  REST API   │ │  Static SPA  │  │
│  │  /api/v1/*  │ │  /dist/*     │  │
│  └──────┬──────┘ └──────────────┘  │
│         │                          │
│  ┌──────▼───────────────────────┐  │
│  │      SQLite (cubby.db)      │  │
│  │  bookmarks / folders / settings │
│  └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

- Go 服务器同时提供 REST API 和前端静态文件
- 开发环境：Vite dev server (:5173) 代理 API 到 Go (:8080)
- 生产环境：Go 通过 `embed.FS` 嵌入编译后的 React SPA，单一二进制部署

## 数据模型

### folders（文件夹）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| name | TEXT NOT NULL | 文件夹名称 |
| parent_id | TEXT (UUID) / NULL | 父文件夹 ID，NULL 表示根级 |
| sort_order | INTEGER NOT NULL DEFAULT 0 | 同级排序序号 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

- 最多两级嵌套（根级 → 子级）
- 唯一约束：(parent_id, name)

### bookmarks（书签）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT (UUID) | 主键 |
| title | TEXT NOT NULL | 网页标题 |
| url | TEXT NOT NULL UNIQUE | 网页 URL |
| description | TEXT | 网页描述/备注 |
| favicon_url | TEXT | 网站图标 URL |
| thumbnail_url | TEXT | 网页缩略图 URL |
| folder_id | TEXT (UUID) / NULL | 所属文件夹，NULL 表示未分类 |
| is_favorite | BOOLEAN NOT NULL DEFAULT FALSE | 是否收藏 |
| sort_order | INTEGER NOT NULL DEFAULT 0 | 同文件夹内排序 |
| metadata_fetched | BOOLEAN NOT NULL DEFAULT FALSE | 元数据是否已抓取 |
| created_at | DATETIME NOT NULL | 创建时间 |
| updated_at | DATETIME NOT NULL | 更新时间 |

- 外键：folder_id → folders.id (ON DELETE SET NULL)

### settings（配置项）

| 字段 | 类型 | 说明 |
|------|------|------|
| key | TEXT PRIMARY KEY | 配置键 |
| value | TEXT NOT NULL | 配置值(JSON) |
| updated_at | DATETIME NOT NULL | 更新时间 |

预置配置键：
- `ai_provider` — AI 服务商 (`openai` / `anthropic` / `custom`)
- `ai_api_key` — API Key（加密存储）
- `ai_model` — 模型名称
- `ai_base_url` — 自定义 API 地址
- `ai_max_tokens` — 最大 token 数
- `theme` — 主题 (`dark` / `light`)
- `import_history` — 导入历史记录(JSON)

## API 设计

所有接口前缀 `/api/v1`，请求/响应格式 JSON。

### 文件夹

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /folders | 获取文件夹树（返回嵌套结构） |
| POST | /folders | 创建文件夹 |
| PUT | /folders/:id | 更新文件夹（名称、父级、排序） |
| DELETE | /folders/:id | 删除文件夹（子文件夹和书签变为未分类） |
| PUT | /folders/reorder | 批量更新文件夹排序 |

### 书签

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /bookmarks | 获取书签列表（支持分页、过滤 folder_id、搜索 q） |
| GET | /bookmarks/:id | 获取单个书签详情 |
| POST | /bookmarks | 添加书签（自动触发元数据抓取） |
| PUT | /bookmarks/:id | 更新书签 |
| DELETE | /bookmarks/:id | 删除书签 |
| PUT | /bookmarks/:id/favorite | 切换收藏状态 |
| PUT | /bookmarks/reorder | 批量更新书签排序 |
| POST | /bookmarks/import | 导入浏览器书签 HTML 文件 |
| POST | /bookmarks/:id/fetch-metadata | 手动重新抓取元数据 |

**GET /bookmarks 查询参数：**
- `folder_id` — 按文件夹过滤，`all` 返回全部
- `q` — 全文搜索（标题、URL、描述）
- `favorite` — `true` 仅收藏
- `unsorted` — `true` 仅未分类
- `recent` — `true` 按创建时间倒序，限制最近 50 条
- `page` / `page_size` — 分页

### AI 整理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /ai/organize | 整理全部书签（推荐文件夹分类） |
| POST | /ai/organize/:folder_id | 整理指定文件夹内的书签 |
| POST | /ai/organize/suggest/:bookmark_id | 为单个书签推荐分类 |

请求体示例（全局整理）：
```json
{
  "action": "suggest"  // "suggest" 仅返回建议, "apply" 自动应用
}
```

响应示例（建议）：
```json
{
  "suggestions": [
    {
      "bookmark_id": "uuid",
      "title": "Go by Example",
      "suggested_folder": "开发工具/Go",
      "confidence": 0.95,
      "reason": "这是一个 Go 语言教程网站"
    }
  ]
}
```

### 设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /settings | 获取所有配置（敏感字段脱敏） |
| PUT | /settings | 更新配置 |
| POST | /settings/ai/test | 测试 AI 配置是否可用 |

### 元数据抓取

添加书签时，后端自动异步抓取网页元数据：
1. 请求目标 URL
2. 解析 `<title>`, `<meta name="description">`, `<link rel="icon">`
3. 生成缩略图（可选，用外部截图服务或保存 og:image）
4. 更新 bookmark 记录

### 浏览器书签导入

解析 Chrome/Edge/Firefox 导出的 HTML 书签文件（Netscape Bookmark 格式）：
1. 接收上传的 HTML 文件
2. 解析 `<DT><A>` 标签提取 URL 和标题
3. 解析文件夹层级结构（`<DL>` 嵌套，最多映射到两级）
4. 创建对应文件夹，批量插入书签
5. 返回导入统计（新增书签数、跳过重复数）

## 前端设计

### 页面结构

- **主页面** — 侧边栏 + 书签网格/列表视图
- **设置页** — AI 模型配置（provider、API key、model、base_url）
- **书签详情弹窗** — 编辑书签信息、预览网页

### 侧边栏

- 品牌标识 + 全局搜索框（`⌘K` 快捷键）
- 快捷入口：全部收藏、最近添加、我的收藏、未分类
- 文件夹树（两级嵌套，可展开/折叠）
  - 右键菜单：重命名、删除、**AI 整理此文件夹**
  - 文件夹顶部悬浮按钮：AI 整理
- 新建文件夹按钮

### 顶栏工具栏

- 当前位置标题 + 书签计数
- 筛选搜索框
- 视图切换（网格/列表）
- **AI 整理** 按钮（全局整理，带渐变流光效果）
- **添加收藏** 按钮

### 书签卡片

- 渐变 favicon + 标题(1行) + 域名 + 描述(2行截断)
- Hover 浮起 + 渐变底纹 + 操作按钮淡入（编辑/移动/删除）
- 拖拽排序手柄
- AI 推荐徽章（脉冲指示灯）

### 设置页

- AI 服务商选择（OpenAI / Anthropic / 自定义）
- API Key 输入（密码框 + 显示/隐藏 + 测试连接按钮）
- 模型名称输入
- 自定义 API 地址输入
- Max Tokens 滑块
- 主题切换（暗色/亮色）

### 视觉风格

- iOS 18 设计语言
- 动态渐变背景（深蓝/紫色光球缓慢漂浮 + 噪声纹理）
- 毛玻璃面板（`backdrop-filter: blur(60px)`）
- 卡片 20px 圆角，hover 浮起 + 紫色光晕阴影
- 渐变 favicon（品牌色）
- 中文界面

## 项目结构

```
cubby/
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # 通用组件 (BookmarkCard, FolderTree, SearchBox...)
│   │   ├── pages/           # 页面 (MainPage, SettingsPage)
│   │   ├── hooks/           # 自定义 hooks
│   │   ├── services/        # API 调用封装
│   │   ├── stores/          # 状态管理 (Zustand)
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
├── backend/                 # Go 服务器
│   ├── cmd/
│   │   └── server/
│   │       └── main.go      # 入口
│   ├── internal/
│   │   ├── handler/         # HTTP handlers
│   │   ├── service/         # 业务逻辑
│   │   ├── repository/      # 数据库操作
│   │   ├── model/           # 数据模型
│   │   ├── middleware/      # 中间件 (CORS, Logger)
│   │   ├── ai/              # AI 服务封装
│   │   ├── metadata/        # 网页元数据抓取
│   │   └── importer/        # 书签导入解析
│   ├── go.mod
│   └── go.sum
├── docs/                    # 文档
├── Makefile                 # 构建脚本
└── .gitignore
```

## 关键技术决策

1. **SQLite** — 个人使用场景无需并发写冲突，零配置，数据库文件随二进制部署
2. **Go embed** — 生产环境嵌入前端构建产物，单一二进制分发
3. **无认证** — 纯个人工具，部署在内网或 localhost，无需登录系统
4. **异步元数据抓取** — 添加书签后立即返回，后台 goroutine 抓取元数据
5. **AI 通过配置页设置** — 用户自行填入 API Key 和模型信息，后端仅转发调用

## 错误处理

- API 统一返回 `{ "error": "错误描述", "code": "ERROR_CODE" }`
- 元数据抓取失败不影响书签保存，标记 `metadata_fetched = false`
- AI 整理失败返回明确错误（API Key 无效、网络问题等）
- 书签导入时重复 URL 跳过，返回冲突列表
