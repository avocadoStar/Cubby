# Cubby — 个人收藏夹管理器

一个面向个人使用的书签收藏管理 Web 应用，采用 iOS 18 毛玻璃风格暗色主题。

## 功能

- **文件夹管理** — 两级嵌套文件夹，拖拽排序，右键菜单
- **全文搜索** — 按标题、URL、描述搜索书签
- **元数据抓取** — 自动异步抓取网页标题、描述、Favicon
- **浏览器导入** — 一键导入 Chrome/Edge/Firefox 导出的 HTML 书签文件
- **AI 智能整理** — 调用外部 LLM API 自动分类书签（支持全局或指定文件夹）
- **收藏功能** — 标记 favorite 快速筛选

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS v4 + Zustand |
| 后端 | Go 1.22+ (Gin) + SQLite (modernc.org/sqlite) |
| AI | OpenAI / Anthropic / 自定义 API |

## 快速开始

```bash
# 启动后端
cd backend && go run ./cmd/server

# 启动前端（另开终端）
cd frontend && npm run dev
```

- 前端地址：http://localhost:5173
- 后端 API：http://localhost:8080/api/v1

## 项目结构

```
cubby/
├── backend/
│   ├── cmd/server/main.go          # 入口
│   └── internal/
│       ├── handler/                 # HTTP handlers
│       ├── repository/              # 数据库操作
│       ├── model/                   # 数据模型
│       ├── ai/                      # AI 服务封装
│       ├── metadata/                # 网页元数据抓取
│       └── middleware/
├── frontend/
│   └── src/
│       ├── components/              # UI 组件
│       ├── pages/                   # 页面
│       ├── services/api.ts          # API 调用
│       ├── stores/                  # Zustand 状态管理
│       └── types/                   # TypeScript 类型
├── docs/                            # 设计文档
└── Makefile
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/folders | 获取文件夹树 |
| POST | /api/v1/folders | 创建文件夹 |
| GET | /api/v1/bookmarks | 获取书签列表（支持搜索/过滤） |
| POST | /api/v1/bookmarks | 添加书签 |
| POST | /api/v1/bookmarks/import | 导入浏览器书签 |
| POST | /api/v1/ai/organize | AI 整理书签 |
| GET | /api/v1/settings | 获取配置 |

## License

MIT
