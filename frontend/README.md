# Frontend

这个目录是 Cubby 的前端。

## 开发

```bash
npm install
npm run dev
```

默认地址：

```text
http://localhost:5173
```

开发时：
- 页面从 Vite 服务提供
- `/api` 请求会自动转发到 `http://localhost:8080`

## 打包

```bash
npm run build
```

打包结果不会放在 `frontend/dist`，而是会直接输出到：

```text
../backend/cmd/server/static
```

这样后端启动后，就可以直接通过 `http://localhost:8080` 提供完整前端页面。
