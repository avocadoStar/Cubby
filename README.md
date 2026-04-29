# Cubby

Cubby 是一个个人书签管理工具，前端用 React，后端用 Go，支持文件夹整理、搜索、导入浏览器书签和 AI 整理建议。

## 怎么运行

### 方式 1：前端开发模式

适合你正在改界面。

1. 启动后端

```bash
cd backend
go run ./cmd/server
```

2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

3. 打开：

```text
http://localhost:5173
```

说明：
- 前端会自动把 `/api` 请求转到 `http://localhost:8080`
- 也就是说，开发时只需要访问前端端口

### 方式 2：不启动前端，只跑后端

适合你只想开一个服务。

1. 先打包前端

```bash
cd frontend
npm install
npm run build
```

2. 再启动后端

```bash
cd backend
go run ./cmd/server
```

3. 打开：

```text
http://localhost:8080
```

说明：
- 前端打包结果会自动放到后端的静态目录
- 后端启动后会直接把这套打包好的前端页面一起提供出来

## 现在的行为

- 如果你启动了前端，就访问 `5173`
- 如果你没启动前端，但已经打包过前端，就访问 `8080`
- 如果你既没启动前端，也没打包前端，`8080` 会显示一个说明页，不会直接报错

## 常用命令

前端检查：

```bash
cd frontend
npm run lint
npm run build
```

后端检查：

```bash
cd backend
go test ./...
```
