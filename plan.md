# Cubby 项目重构计划

## 摘要

- 当前规模：162 个 Git 跟踪文件；主要源码/测试/样式 145 个文件，约 11,445 行。
- 技术栈：后端 Go 1.25 + Gin + SQLite + JWT；前端 React 19 + TypeScript + Vite + Zustand + dnd-kit。
- GitNexus：索引最新，158 files、2310 symbols、5449 relationships、196 flows。
- 当前基线：`go test ./...`、`npm test -- --run`、`npm run lint`、`npm run build` 在计划执行前均通过。
- 工作区状态：仅 `preview/` 为未跟踪目录，不属于本轮重构范围。

## 代码结构与主要问题

- 后端分层清晰：`cmd/server` 装配服务，`handler` 暴露 REST，`service` 承载业务，`repository` 访问 SQLite，`db` 管迁移，`lexorank` 管排序。
- 前端按职责分为 `components`、`mobile`、`hooks`、`stores`、`lib`、`services`、`types`，但状态和交互逻辑仍偏集中。
- 主要热点：
  - `frontend/src/components/mobile/MobileNav.tsx`、`Toolbar.tsx` 仍有添加书签、metadata、防重复等相似流程。
  - `bookmarkStore.ts`、`folderStore.ts` 承担 API、乐观更新、回滚、选择集同步等多种职责。
  - `dragPlacement.ts` 内单拖/多拖有重复的 sibling、sortKey、target 计算。
  - 后端 `service` 中移动、递归删除、校验、排序冲突处理仍是行为风险最高区域。
  - `db.go` 迁移逻辑已拆过一次，但 schema、兼容列、唯一索引修复仍集中在单文件。

## 重构硬约束

- 行为不变：相同输入保持相同输出。
- REST API 路径、请求体、响应体不变。
- 前端 `api` 对象方法名与参数不变。
- Zustand store 的 state 字段与 action 名称不变。
- Go service/repository 对外签名默认不变；如必须新增 helper，只使用未导出函数。
- SQLite schema、迁移语义、LexoRank 排序语义、版本冲突语义不变。
- 中文错误文案、Toast 文案、日志格式不变。
- 修改函数、类、方法前必须运行 GitNexus upstream impact；HIGH/CRITICAL 风险先记录影响面。
- 每完成一个阶段后立即更新本文件 TODO、验证结果和剩余风险。

## 影响分析记录

- `useBookmarkStore`：CRITICAL；直接影响 `useListItems`、`Toolbar`、`NotesPanel`、`DesktopMainLayout`、`EditBookmarkModal`、`BookmarkRow`、`BatchActionBar`、`MobileNav`、`MobileLayout`、`MobileBottomSheet`；影响桌面/移动列表、备注、批量操作等流程。
- `useFolderStore`：HIGH；直接影响 `useListItems`、`Toolbar`、`Sidebar`、`DesktopMainLayout`、`FolderNode`、`CreateFolderModal`、`Breadcrumb`、`MobileNav`、`MobileLayout`、`MobileFilterDrawer`、`MobileBookmarkList`。
- `httpClient.request`：CRITICAL；影响全部 API endpoint。
- `FolderService.isDescendant`：HIGH；影响单个文件夹移动、批量移动、handler 移动流程及排序集成测试。
- `MoveService.BatchMove`：LOW；直接调用方为 `MoveHandler.BatchMove`。
- `computeSingleFolderDrop`、`computeMultiDragDrop`：LOW；直接调用方为 `useDragAndDrop.handleDragEnd`。
- `migrate`：LOW；直接调用方为 `MustOpen`，间接覆盖启动流程和 DB/service 集成测试。

## 阶段 TODOList

### 第 0 阶段：计划落盘与基线冻结

- [x] 更新 `plan.md`。
- [x] 记录当前规模、测试命令、GitNexus 状态、工作区状态。
- [x] 明确硬约束。

### 第 1 阶段：安全网补强

- [x] 补拖拽放置测试：单拖文件夹、单拖书签、多选拖拽、跨父级、空目标、重复 sort key 邻居。
- [x] 补添加书签流程测试：防重复 URL、保存中禁用控件；metadata 行为由 `useAddBookmarkFlow` 与既有 addBookmark helper 覆盖。
- [x] 补 folder store 测试：创建、删除撤销、父节点 `has_children` 更新；移动 helper 覆盖在新 helper 测试中。
- [x] 补后端移动/循环检测测试：循环移动、缺失邻居、跨类型批量排序。
- [x] 运行 `go test ./...`。
- [x] 运行 `npm test -- --run`。

### 第 2 阶段：前端添加书签流程收敛

- [x] impact：`Toolbar`，LOW。
- [x] impact：`MobileNav`，LOW。
- [x] 新增 `useAddBookmarkFlow`，统一 title/url/icon、metadata debounce、duplicate error、saving 状态。
- [x] 桌面 `Toolbar` 接入。
- [x] 移动端 `MobileNav` 接入。
- [x] 运行前端测试与 build。

### 第 3 阶段：拖拽计算逻辑去重

- [x] impact：`computeSingleFolderDrop`，LOW。
- [x] impact：`computeSingleBookmarkDrop`，LOW。
- [x] impact：`computeMultiDragDrop`，LOW。
- [x] 在 `dragPlacement.ts` 内提取共享 `buildDropHelpers`。
- [x] 保持三个导出函数签名不变。
- [x] 运行拖拽相关测试。
- [x] 运行 `npm test -- --run`。

### 第 4 阶段：Zustand store 职责拆分

- [x] impact：`useBookmarkStore`，CRITICAL。
- [x] impact：`useFolderStore`，HIGH。
- [x] 拆 bookmark 删除/撤销 helper。
- [x] 拆 bookmark notes/upsert/list helper；批量移动 reconcile 保持既有 `optimisticUpdates` helper。
- [x] 拆 folder childrenMap/helper。
- [x] 拆 folder 移动乐观映射 helper；回滚仍复用快照恢复以保持行为不变。
- [x] 运行 store 测试、全量前端测试、build。

### 第 5 阶段：后端业务层校验与移动逻辑细化

- [x] impact：`FolderService.isDescendant`，HIGH。
- [x] impact：`MoveService.BatchMove`，LOW。
- [x] impact：`BookmarkService.Create`，LOW/partial。
- [x] impact：`FolderService.Create`，LOW/partial。
- [x] 提取循环检测公共函数。
- [x] 提取批量移动 item 校验与 repo item 构造。
- [x] 提取 bookmark/folder 创建重试 sort key 小 helper。
- [x] 运行 `go test ./internal/service ./internal/handler`。
- [x] 运行 `go test ./...`。

### 第 6 阶段：数据库迁移与 repository 收尾

- [x] impact：`migrate`，LOW。
- [x] 整理 `db.go` 迁移步骤命名。
- [x] 补迁移表驱动测试。
- [x] 运行 `go test ./internal/db ./internal/service`。
- [x] 运行 `go test ./...`。

### 第 7 阶段：文档、残留引用与最终验收

- [x] 全局搜索旧 helper、重复逻辑、临时注释、未使用导出；仅发现既有 `Task 1.5/1.6` 注释和测试 fixture `console.log`。
- [x] 更新 `plan.md` 的完成状态、实际变更摘要、验证结果、剩余风险。
- [x] 运行 `go test ./...`。
- [x] 运行 `npm test -- --run`。
- [x] 运行 `npm run lint`。
- [x] 运行 `npm run build`。
- [x] 运行 `npx gitnexus detect-changes --scope all --repo Cubby`。

## 实际变更摘要

- 新增 `useAddBookmarkFlow`，让桌面 `Toolbar` 与移动 `MobileNav` 共享添加书签状态、metadata 获取、URL 规范化、重复 URL 处理和保存状态。
- 为 `dragPlacement` 提取共享 `buildDropHelpers`，保留 `computeSingleFolderDrop`、`computeSingleBookmarkDrop`、`computeMultiDragDrop` 签名不变。
- 扩展 bookmark/folder store helper，拆出 notes/upsert/delete/restore、folder map 创建/删除/乐观移动等纯逻辑。
- 后端 service 提取 `ensureCanMoveFolder`、批量移动 item 准备函数、创建 sort key 重试 helper，错误消息和重试次数保持不变。
- DB 迁移函数命名更明确，并补充兼容列与同父级唯一 sort key 测试。

## 验收标准

- `cd backend && go test ./...` 通过。
- `cd frontend && npm test -- --run` 通过。
- `cd frontend && npm run lint` 通过。
- `cd frontend && npm run build` 通过。
- `npx gitnexus detect-changes --scope all --repo Cubby` 输出影响范围与计划一致。

## 验证结果

- 计划落盘前：`npx gitnexus status` 显示索引 up-to-date。
- 局部前端：`npm test -- --run src/lib/dragPlacement.test.ts src/stores/folderStore.test.ts src/components/mobile/MobileNav.test.tsx` 通过，3 个测试文件，23 个测试。
- 局部 store：`npm test -- --run src/stores/bookmarkStoreHelpers.test.ts src/stores/bookmarkStore.test.ts src/stores/folderStoreHelpers.test.ts src/stores/folderStore.test.ts` 通过，4 个测试文件，39 个测试。
- 局部后端：`go test ./internal/service ./internal/handler` 通过。
- 局部 DB：`go test ./internal/db ./internal/service` 通过。
- 全量后端：`cd backend && go test ./...` 通过。
- 全量前端：`cd frontend && npm test -- --run` 通过，18 个测试文件，83 个测试。
- 前端 lint：`cd frontend && npm run lint` 通过。
- 前端构建：`cd frontend && npm run build` 通过。
- GitNexus：`npx gitnexus detect-changes --scope all --repo Cubby` 完成；risk level 为 critical，影响集中在本计划预期的添加书签、拖拽、store、service、db 迁移路径。

## 剩余风险

- GitNexus detect-changes 因本轮触及 `useBookmarkStore`、`useFolderStore`、拖拽和后端移动流程，整体风险仍标记为 critical；已用全量测试、lint、build 覆盖。
- `httpClient.request` 未在本轮修改。
- 工作区中 `.gitignore` 已存在额外修改，内容为忽略 `plan.md` 与 `preview/`；该变更不属于本轮重构实现。
