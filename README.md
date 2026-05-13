<div align="center">

# Cubby

**轻量级自托管书签管理器**

灵感来自 `edge://favorites/` — 简洁、快速、开箱即用

</div>

---

Cubby 是一个轻量级自托管书签管理器，支持无限层级文件夹、拖拽排序、导入导出、全局搜索、备注、批量操作，以及 PC / 移动端自适应。单二进制部署，零外部依赖。

## 亮点

- **无限层级文件夹** — 树形结构，展开 / 折叠 / 拖拽排序
- **高性能渲染** — 虚拟滚动，流畅处理大量书签
- **跨浏览器导入导出** — 兼容 Chrome、Edge、Firefox HTML 书签文件
- **实时搜索** — 模糊匹配 + 关键词高亮
- **移动端友好** — 响应式布局，触控操作
- **单二进制部署** — 前端嵌入 Go 服务，一个文件即可运行
- **低资源占用** — SQLite 存储，无需额外数据库

<details>
<summary>更多功能</summary>

- 书签备注，自动保存
- 多选和批量删除
- 右键菜单操作
- 删除撤销 Toast
- 明暗主题切换
- 字体大小调节
- JWT Token 认证，密码自动加密
- Lexorank 排序算法，PC 与移动端统一

</details>

## 技术栈

| | 技术 |
|---|---|
| **后端** | Go · Gin · SQLite · JWT |
| **前端** | React 19 · TypeScript · Vite · Tailwind CSS 4 |
| **关键库** | Zustand · dnd-kit · @tanstack/react-virtual |

## 环境要求

- [Go](https://go.dev/dl/) 1.25+
- [Node.js](https://nodejs.org/) 20+

## 快速开始

### 1. 克隆与配置

```bash
git clone https://github.com/avocadoStar/Cubby.git
cd Cubby
cp config.example.yaml config.yaml
```

配置项说明见 `config.example.yaml` 内的注释。

### 2. 开发模式

需要两个终端分别运行前后端。

**后端：**

```bash
cd backend
go run ./cmd/server/
```

**前端：**

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`，API 请求自动代理到后端。

### 3. 生产构建

```bash
make build
./cubby-server
```

浏览器打开 `http://localhost:8080`。

<details>
<summary>手动构建步骤</summary>

```bash
# 编译后端
cd backend && go build -o ../cubby-server ./cmd/server/

# 打包前端
cd ../frontend && npm install && npm run build

# 复制静态文件
mkdir -p ../backend/cmd/server/static
cp -r dist/* ../backend/cmd/server/static/

# 启动
cd .. && ./cubby-server
```

</details>

## 项目结构

```
├── backend/                    # Go + Gin + SQLite
│   ├── cmd/server/             # 入口 main.go + 静态文件
│   └── internal/
│       ├── handler/            # HTTP 处理器（路由、认证、CRUD）
│       ├── service/            # 业务逻辑（LexoRank、认证、搜索、导入）
│       ├── repository/         # 数据访问层（SQL）
│       ├── model/              # 数据模型
│       ├── middleware/         # JWT 中间件
│       └── db/                 # 数据库初始化与迁移
│
├── frontend/                   # React + Vite + Tailwind
│   └── src/
│       ├── components/         # UI 组件
│       ├── hooks/              # 自定义 Hooks
│       ├── services/           # API 客户端
│       ├── stores/             # Zustand 状态管理
│       ├── lib/                # 工具函数
│       └── types/              # TypeScript 类型
│
├── config.example.yaml         # 配置模板
└── Makefile                    # 构建命令
```

## Makefile

| 命令 | 说明 |
|------|------|
| `make dev-backend` | 启动后端开发服务 |
| `make dev-frontend` | 启动前端开发服务 |
| `make build` | 完整生产构建 |
| `make run` | 构建并运行 |
| `make clean` | 清理构建产物 |

## 许可证

[MIT](LICENSE)
