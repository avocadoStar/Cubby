<h1 align="center">Cubby</h1>

<p align="center">轻量级自托管书签管理器，灵感来自 <code>edge://favorites/</code></p>

<p align="center">
多层级书签管理 · 快速拖拽排序 · 本地优先部署 · PC/移动端一致体验
</p>

---

## 功能特性

**书签管理**
无限层级文件夹 · 展开/折叠/拖拽排序 · 创建、编辑、删除、恢复、批量操作 · LexoRank 排序

**导入与搜索**
Chrome/Edge/Firefox HTML 书签导入导出 · 全局搜索 · 模糊匹配和关键词高亮

**使用体验**
备注自动保存 · PC 与移动端响应式布局 · 右键菜单 · 删除撤销 Toast · 明暗主题 · 字体大小调节

**安全与存储**
JWT Token 认证 · 密码启动时自动加密 · SQLite 本地存储，无需额外数据库

---

## 快速开始

**环境要求** — [Go](https://go.dev/dl/) 1.25+ / [Node.js](https://nodejs.org/) 20+

```bash
git clone https://github.com/avocadoStar/Cubby.git
cd Cubby
cp config.example.yaml config.yaml
```

安装依赖并启动：

```bash
# 后端
cd backend
go mod download
go run ./cmd/server

# 前端（新终端）
cd frontend
npm install
npm run dev
```

默认后端 `http://localhost:8080`，前端 `http://localhost:5173`，`/api` 请求自动代理到后端。

---

## 配置说明

编辑 `config.yaml`（从 `config.example.yaml` 复制）：

| 配置项               | 默认值        | 说明                 |
| ----------------- | ---------- | ------------------ |
| `backend_port`    | `8080`     | 后端 HTTP 服务监听端口     |
| `frontend_port`   | `5173`     | 前端开发服务器监听端口       |
| `db_path`         | `cubby.db` | SQLite 数据库文件路径     |
| `jwt_secret`      | 无          | JWT 签名密钥，必须使用安全随机值 |
| `password`        | 无          | 登录密码，至少 8 个字符      |
| `allowed_origins` | `[]`       | CORS 允许来源          |
| `trusted_proxies` | `[]`       | Gin 可信代理列表         |

---

## 构建与部署

**前端构建**

```bash
cd frontend
npm run build
```

产物输出到 `frontend/dist`，构建完成后只需运行后端即可。

**后端构建与运行**

```bash
cd backend
go build -o ../cubby-server ./cmd/server
cd ..
./cubby-server
```

**Makefile 快捷命令**（需要安装 `make`）

| 命令                  | 说明       |
| ------------------- | -------- |
| `make dev-backend`  | 启动后端开发服务 |
| `make dev-frontend` | 启动前端开发服务 |
| `make build`        | 构建后端和前端  |
| `make run`          | 构建并运行服务  |
| `make clean`        | 清理构建产物   |

<details>
<summary>可选部署配置</summary>

默认查找 `frontend/dist`，可通过环境变量覆盖：

```bash
CUBBY_FRONTEND_DIST=/path/to/dist ./cubby-server
```

</details>

---

## 技术栈

| 模块    | 技术                                         |
| ----- | ------------------------------------------ |
| 后端    | Go 1.25, Gin, SQLite, JWT                  |
| 前端    | React 19, TypeScript, Vite, Tailwind CSS 4 |
| 状态与交互 | Zustand, dnd-kit, @tanstack/react-virtual  |
| 构建工具  | Go toolchain, npm, Makefile                |

---

## 项目结构

```text
.
├── backend/                    # Go + Gin + SQLite 后端
│   ├── cmd/server/             # 后端入口
│   └── internal/
│       ├── config/             # 配置加载
│       ├── db/                 # 数据库初始化与迁移
│       ├── handler/            # HTTP 处理器
│       ├── lexorank/           # 排序算法
│       ├── middleware/         # 中间件
│       ├── model/              # 数据模型
│       ├── repository/         # 数据访问层
│       └── service/            # 业务逻辑
├── frontend/                   # React + Vite 前端
│   ├── public/                 # 静态资源
│   └── src/
│       ├── components/         # UI 组件
│       ├── hooks/              # 自定义 Hooks
│       ├── lib/                # 工具函数
│       ├── services/           # API 客户端
│       ├── stores/             # Zustand 状态管理
│       └── types/              # TypeScript 类型
├── config.example.yaml         # 配置模板
├── config.yaml                 # 本地配置文件
└── Makefile                    # 构建与开发命令
```

## License

[MIT](LICENSE)
