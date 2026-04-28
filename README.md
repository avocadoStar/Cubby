# Cubby

Cubby 是一个面向个人使用的书签管理器，采用前后端一体化架构实现。
它支持文件夹整理、全文搜索、浏览器书签导入、AI 辅助归类，并提供
接近 iOS 18 Liquid Glass 风格的界面体验。

## 主要特性

- 通过文件夹组织书签，支持层级结构
- 按标题、URL、描述进行全文搜索
- 导入浏览器导出的 HTML 书签文件
- AI 整理建议与一键应用
- 支持收藏、最近、未分类等视图
- 支持浅色 / 深色 Liquid Glass 主题
- 生产环境由 Go 后端直接提供 SPA 页面

## 技术栈

- 前端：React 19、TypeScript、Vite、Tailwind CSS v4、Zustand、Framer Motion
- 后端：Go、Gin、SQLite
- AI 接入：兼容 OpenAI 风格的 API 配置方式

## 项目结构

```text
Cubby/
|-- backend/
|   |-- cmd/server/
|   |-- internal/
|   |   |-- ai/
|   |   |-- handler/
|   |   |-- metadata/
|   |   |-- model/
|   |   `-- repository/
|   `-- go.mod
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- stores/
|   |   |-- types/
|   |   `-- utils/
|   `-- package.json
`-- docs/
```

## 本地开发

### 1. 启动后端

```bash
cd backend
go run ./cmd/server
```

默认地址：

```text
http://localhost:8080
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

## 生产构建

### 构建前端

```bash
cd frontend
npm install
npm run build
```

### 启动包含 SPA 的后端服务

将前端构建产物放到后端静态资源位置后，启动服务：

```bash
cd backend
go run ./cmd/server
```

后端会处理 `/api/v1/*` API 路由，并对其他非 API 路径返回 SPA 页面。

## 主要 API

### 文件夹

- `GET /api/v1/folders`
- `POST /api/v1/folders`
- `PUT /api/v1/folders/:id`
- `DELETE /api/v1/folders/:id`

### 书签

- `GET /api/v1/bookmarks`
- `POST /api/v1/bookmarks`
- `PUT /api/v1/bookmarks/:id`
- `DELETE /api/v1/bookmarks/:id`
- `PUT /api/v1/bookmarks/:id/favorite`
- `POST /api/v1/bookmarks/import`
- `POST /api/v1/fetch-title`

### 设置与 AI

- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `POST /api/v1/settings/ai/test`
- `POST /api/v1/ai/organize`

## 质量检查

前端：

```bash
cd frontend
npm run build
npm run lint
```

后端：

```bash
cd backend
go test ./...
```

## 说明

- 重复书签 URL 会返回明确的业务冲突错误
- 更新书签时，如果未传 `folder_id`，会保留原有目录归属
- 文件夹和书签的外键删除策略为 `ON DELETE SET NULL`，尽量保留数据
- 设置页支持通过后端测试 AI 连接是否可用

## License

MIT
