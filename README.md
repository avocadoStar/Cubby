# Cubby

轻量级自托管书签管理器，灵感来自 `edge://favorites/`。

Cubby 专注于：

* 多层级书签管理
* 快速拖拽排序
* 本地优先与低依赖部署
* PC / 移动端一致体验

## 功能特性

### 书签管理

* 无限层级文件夹
* 展开、折叠和拖拽排序
* 书签创建、编辑、删除、恢复和批量操作
* LexoRank 排序算法，保证 PC 与移动端排序逻辑一致

### 导入与搜索

* 导入导出 Chrome、Edge、Firefox HTML 书签文件
* 全局搜索
* 模糊匹配和关键词高亮

### 使用体验

* 书签备注自动保存
* PC 和移动端响应式布局
* 右键菜单与移动端操作菜单
* 删除撤销 Toast
* 明暗主题切换
* 字体大小调节

### 安全与存储

* JWT Token 认证
* 登录密码启动时自动加密存储
* SQLite 本地存储，无需额外数据库服务

## Quick Start

### 环境要求

* [Go](https://go.dev/dl/) 1.25 或更高版本
* [Node.js](https://nodejs.org/) 20 或更高版本

### 克隆项目

```bash
git clone https://github.com/avocadoStar/Cubby.git
cd Cubby
```

### 创建配置文件

```bash
cp config.example.yaml config.yaml
```

### 安装依赖

后端：

```bash
cd backend
go mod download
```

前端：

```bash
cd ../frontend
npm install
```

### 启动开发环境

启动后端：

```bash
cd backend
go run ./cmd/server
```

启动前端：

```bash
cd frontend
npm run dev
```

默认情况下：

* 后端运行在 `http://localhost:8080`
* 前端运行在 `http://localhost:5173`
* `/api` 请求会自动代理到后端

---

## 配置说明

Cubby 使用 `config.yaml` 管理后端配置：

```bash
cp config.example.yaml config.yaml
```

常用配置项：

| 配置项               | 默认值        | 说明                 |
| ----------------- | ---------- | ------------------ |
| `port`            | `8080`     | 后端 HTTP 服务监听端口     |
| `db_path`         | `cubby.db` | SQLite 数据库文件路径     |
| `jwt_secret`      | 无          | JWT 签名密钥，必须使用安全随机值 |
| `password`        | 无          | 登录密码，至少 8 个字符      |
| `allowed_origins` | `[]`       | CORS 允许来源          |
| `trusted_proxies` | `[]`       | Gin 可信代理列表         |

---

## 构建项目

### 构建前端资源

```bash
cd frontend
npm run build
```

构建产物会生成到 `frontend/dist`。

构建完成后，只运行后端即可访问完整前端页面。

### 构建后端

```bash
cd backend
go build -o ../cubby-server ./cmd/server
```

运行：

```bash
cd ..
./cubby-server
```

服务默认运行在：

```text
http://localhost:8080
```

---

## Makefile

如果本机安装了 `make`，可以使用以下命令：

```bash
make build
./cubby-server
```

常用命令：

| 命令                  | 说明       |
| ------------------- | -------- |
| `make dev-backend`  | 启动后端开发服务 |
| `make dev-frontend` | 启动前端开发服务 |
| `make build`        | 构建后端和前端  |
| `make run`          | 构建并运行服务  |
| `make clean`        | 清理构建产物   |

---

## 自定义前端构建目录

默认情况下，后端会自动查找：

```text
frontend/dist
```

如果需要使用其他目录，可以设置：

```bash
CUBBY_FRONTEND_DIST=/path/to/dist ./cubby-server
```

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

---

## License

[MIT](LICENSE)
