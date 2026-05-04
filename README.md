# <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='0' fill='%23F0F0F0'/%3E%3Crect x='14' y='14' width='36' height='36' fill='%23E53935'/%3E%3Cpath d='M24 22h16v24l-8-6-8 6z' fill='%23fff'/%3E%3C/svg%3E" width="28" height="28" alt=""> Cubby

类 edge://favorites/ 的书签管理器，Fluent 风格两栏布局。

## 环境要求

- [Go](https://go.dev/dl/) 1.21+
- [Node.js](https://nodejs.org/) 20+

## 项目结构

```
├── backend/               # Go + Gin + SQLite
│   ├── cmd/server/        # 入口
│   └── internal/
│       ├── config/        # 配置（环境变量）
│       ├── db/            # 数据库初始化 & 迁移
│       ├── handler/       # HTTP 处理器（路由、认证、CRUD）
│       ├── middleware/     # JWT 中间件
│       ├── model/         # 数据模型
│       ├── repository/    # 数据访问层（SQL）
│       └── service/       # 业务逻辑（LexoRank、认证、搜索、导入）
│
├── frontend/              # React + Vite + Tailwind
│   └── src/
│       ├── components/    # UI 组件
│       ├── services/      # API 客户端
│       ├── stores/        # Zustand 状态管理
│       └── types/         # TypeScript 类型
│
├── docs/                  # 设计文档 & 实施计划
└── Makefile               # 构建脚本（可选，需要 make）
```

## 开发模式启动

**两个终端分别启动：**

终端 1 — 后端（端口 8080）：

```powershell
cd backend
go run ./cmd/server/
```

终端 2 — 前端（端口 5173，自动代理 API 到 8080）：

```powershell
cd frontend
npm install    # 首次运行需要
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 生产构建

```powershell
# 1. 编译后端
cd backend
go build -o ../cubby-server.exe ./cmd/server/

# 2. 打包前端
cd ..\frontend
npm install
npm run build

# 3. 复制静态文件
mkdir ..\backend\cmd\server\static
xcopy /E /Y dist\* ..\backend\cmd\server\static\

# 4. 启动
cd ..
.\cubby-server.exe
```

浏览器打开 `http://localhost:8080`。

> 如果你安装了 make：`make build && ./cubby-server` 一键完成上述步骤。

## 首次配置密码

Cubby 是单用户模式，首次使用需要设置密码：

```powershell
curl -X POST http://localhost:8080/api/auth/setup `
  -H "Content-Type: application/json" `
  -d '{\"password\":\"你的密码\"}'
```

设置后在登录页输入密码即可进入。密码以 bcrypt 哈希存储在 SQLite 中。

## 配置

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8080` | 后端端口 |
| `DB_PATH` | `cubby.db` | SQLite 数据库文件路径 |
| `JWT_SECRET` | `change-me-in-production` | JWT 签名密钥（生产环境务必修改） |

示例：

```powershell
$env:PORT="3000"
$env:DB_PATH="D:\data\cubby.db"
$env:JWT_SECRET="your-random-secret"
go run ./cmd/server/
```

## 功能

- 无限层级文件夹树，展开/折叠，拖拽排序
- 书签列表（虚拟滚动，支持大量书签）
- 卡片式行设计，弧形圆角 + 边框
- 多选复选框 + 批量删除
- 右键菜单（打开 / 重命名 / 删除）
- HTML 书签文件导入/导出（Chrome / Edge / Firefox 兼容）
- 全局搜索（实时搜索 + 关键词高亮）
- 书签备注（右侧详情面板，自动保存）
- 字体大小控制（3 档预设）
- 删除撤销（Toast + 撤销按钮）
