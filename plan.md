# Cubby 项目重构计划

## 项目现状

- GitNexus 索引：146 个文件、2204 个符号、5134 条关系、187 条执行流。
- 当前源码规模：`git ls-files` 为 151 个跟踪文件；过滤锁文件、二进制和构建产物后，主要源码约 147 个文件、11163 行。
- 技术栈：后端 Go 1.25 + Gin + SQLite + JWT；前端 React 19 + TypeScript + Vite + Zustand + dnd-kit。
- 基线验证：`go test ./...`、`npm test -- --run`、`npm run build` 在计划制定时通过。

## 重构硬约束

- 行为不变：相同输入保持相同输出。
- 对外接口名称不变：REST API、前端 `api` 对象、store action、Go service/repository 公共签名默认不改。
- 数据契约不变：SQLite schema、查询语义、排序语义、版本冲突语义默认不改。
- 错误文案、日志格式、Toast 文案默认不改。
- 每次修改函数、类、方法前运行 GitNexus upstream impact；HIGH/CRITICAL 风险必须记录。
- 每完成一个阶段后立即更新 TODO 和验证结果。

## 影响分析记录

- `frontend/src/services/api.ts` `request`：CRITICAL，20 个直接调用点，影响 17 条流程。
- `frontend/src/stores/bookmarkStore.ts` `useBookmarkStore`：CRITICAL，9 个直接调用点，影响桌面、移动、列表、备注等流程。
- `backend/internal/service/sortkey.go` `ComputeBookmarkSortKey`：HIGH，影响创建和移动书签流程。
- `backend/internal/handler/router.go` `SetupRoutes`：LOW，直接影响 `main` 和路由测试。

## 阶段 TODOList

### 第 0 阶段：建立重构基线

- [x] 在根目录创建 `plan.md`。
- [x] 记录当前规模、验证命令、硬约束。
- [x] 每完成一个阶段，更新本文件中的 TODO 状态和验证结果。

### 第 1 阶段：测试与安全网补强

- [x] 为 `frontend/src/services/api.ts` 补充请求封装测试。
- [x] 为添加书签公共逻辑补充 URL 规范化和重复 URL 错误测试。
- [x] 为 store 复杂逻辑保留现有测试并补充纯 helper 测试。
- [x] 为后端排序/移动保留现有测试。
- [x] 运行并记录：`go test ./...`、`npm test -- --run`、`npm run build`。

### 第 2 阶段：低风险后端结构整理

- [x] 修改前对 `main`、`SetupRoutes`、新增/迁移装配函数运行 GitNexus impact。
- [x] 从 `backend/cmd/server/main.go` 提取应用装配函数。
- [x] 保留静态资源回退逻辑和 `/api/*` 404 行为。
- [x] 运行 `cd backend && go test ./cmd/server ./internal/handler ./internal/config ./internal/db`。
- [x] 阶段完成后运行 `cd backend && go test ./...`。

### 第 3 阶段：前端 API 客户端职责拆分

- [x] 修改前对 `request`、`api`、`ConflictError` 运行 GitNexus impact。
- [x] 将 `ConflictError` 与错误文本解析提到独立模块，并从 `api.ts` re-export。
- [x] 将通用 `request<T>` 和 token header 逻辑提到 API 内部模块。
- [x] 保持 `api.ts` 作为业务 endpoint 聚合入口。
- [x] 运行 `cd frontend && npm test -- --run src/services/api.test.ts`。
- [x] 运行 `cd frontend && npm test -- --run && npm run build`。

### 第 4 阶段：提取添加书签公共逻辑

- [x] 修改前对 `Toolbar`、`MobileNav`、`shouldFetchMetadata`、`api.fetchMetadata`、`api.createBookmark` 运行 impact。
- [x] 提取 URL 输入规范化、提交前 URL 规范化、重复 URL 错误判断。
- [x] 桌面 `Toolbar` 和移动 `MobileNav` 复用公共逻辑。
- [x] 保留 metadata 失败静默忽略行为。
- [x] 运行添加书签相关测试、`npm test -- --run`、`npm run build`。

### 第 5 阶段：前端 store 轻量拆分

- [x] 修改前对 `useBookmarkStore`、`useFolderStore`、乐观更新 helper 运行 impact。
- [x] 将排序比较、快照创建、选择集清理、失败回滚等纯逻辑提取到 helper。
- [x] 保持 Zustand store 公共接口不变。
- [x] 运行所有前端测试和构建。

### 第 6 阶段：后端业务层细化

- [x] 修改前对低风险 `ExportService.Export` 运行 impact；排序/移动相关 HIGH 风险符号留待后续单独处理。
- [ ] 提取 service 中重复校验逻辑，保留错误类型和错误消息。
- [x] 对 export 做纯函数搬迁，不改变格式；import 解析保持原结构。
- [x] 阶段完成后运行 `go test ./...`。

### 第 7 阶段：数据访问层和数据库初始化整理

- [x] 修改前对 repository 具体方法和 `migrate` 运行 impact。
- [x] 将 `db.go` 中连接、schema 创建、迁移步骤拆成小函数。
- [x] 保留 `duplicate column name` 兼容处理逻辑。
- [ ] 阶段完成后运行 `go test ./...`。

### 第 8 阶段：收尾、残留引用和文档更新

- [ ] 全局搜索旧 helper、临时注释、未使用导出。
- [x] 运行 `go test ./...`、`npm test -- --run`、`npm run build`。
- [x] 运行 `gitnexus_detect_changes(scope="all", repo="Cubby")`。
- [x] 更新本文件的完成状态、验证结果、剩余风险。

## 验证结果

- `cd frontend && npm test -- --run src/services/apiErrors.test.ts src/services/httpClient.test.ts src/services/api.test.ts src/lib/addBookmark.test.ts`：通过，4 个测试文件，14 个测试。
- `cd frontend && npm test -- --run src/stores/bookmarkStoreHelpers.test.ts src/stores/bookmarkStore.test.ts`：通过，2 个测试文件，12 个测试。
- `cd backend && go test ./cmd/server ./internal/handler ./internal/config ./internal/db`：通过。
- `cd backend && go test ./internal/db ./internal/repository ./internal/service`：通过。
- `cd backend && go test ./internal/service ./internal/handler`：通过。
- `cd backend && go test ./...`：通过。
- `cd frontend && npm test -- --run`：通过，15 个测试文件，52 个测试。
- `cd frontend && npm run build`：通过。
- `cd frontend && npm run lint`：通过。
- `gitnexus_detect_changes(scope="all", repo="Cubby")`：完成，risk_level 为 critical；受影响流程集中在前端 API/store、Toolbar/MobileNav、后端 main/migrate/export，符合本轮重构范围。

## 剩余风险

- 第 6 阶段只完成 `ExportService.Export` 的低风险拆分；排序、移动、导入解析和校验逻辑深拆仍保持原结构，避免在本轮扩大 HIGH 风险变更。
- 第 7 阶段只完成 `db.go` 初始化和迁移步骤拆分，repository SQL helper 拆分尚未执行。
