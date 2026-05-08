# Cubby

类 edge://favorites/ 的书签管理器，Fluent 风格两栏布局。

## 环境要求

- [Go](https://go.dev/dl/) 1.25+
- [Node.js](https://nodejs.org/) 20+

## 项目结构

```
├── backend/               # Go + Gin + SQLite
│   ├── cmd/server/        # 入口
│   └── internal/
│       ├── config/        # 配置（YAML 文件）
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

## 配置

复制示例配置文件并修改：

```powershell
cp config.example.yaml config.yaml
```

`config.yaml` 内容：

```yaml
port: "8080"                          # HTTP 监听端口
db_path: "cubby.db"                   # SQLite 数据库文件路径
jwt_secret: "change-me-in-production" # JWT 签名密钥（生产环境务必修改）
password: "your-password"             # 登录密码（启动时自动 bcrypt 加密）
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
