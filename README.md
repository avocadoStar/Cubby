# Cubby

类 edge://favorites/ 的书签管理器 — Fluent 风格，两栏布局。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + dnd-kit |
| 后端 | Go + Gin + SQLite (WAL) |
| 认证 | 单用户密码 + JWT |

## 快速开始

```bash
# 开发模式（前后端分开启动）
make dev-backend    # 后端 :8080
make dev-frontend   # 前端 :5173

# 生产构建
make build          # 编译后端 + 打包前端
./cubby-server      # 单文件运行，访问 :8080
```

## 首次使用

```bash
# 设置密码
curl -X POST http://localhost:8080/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# 浏览器打开 http://localhost:8080，输入密码登录
```

## 功能

- 文件夹树（无限层级、展开折叠、拖拽排序）
- 书签管理（fluent-tree-item 风格、虚拟滚动、多选）
- 右键菜单（打开/重命名/删除）
- HTML 书签导入/导出
- 全局搜索
- Phase 2: AI 智能整理（轻量 LLM 管线）
