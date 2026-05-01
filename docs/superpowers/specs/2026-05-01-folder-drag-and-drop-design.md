# Folder Tree Drag-and-Drop Design

## Context

左侧文件夹树当前无拖拽功能。需要实现拖拽排序 + 改变父文件夹，交互丝滑。

## Architecture

```
数据层: folderStore (tree by parentId)
渲染层: flatten tree → useVirtualizer (@tanstack/react-virtual)
拖拽层: @dnd-kit/core + @dnd-kit/sortable
```

**替换**: `react-virtuoso` → `@tanstack/react-virtual`。原因：Virtuoso 回收 DOM 节点导致 @dnd-kit sortable 状态丢失。`useVirtualizer` 通过 CSS translate 隐藏视口外节点，DOM 始终存在。

## 三个核心能力

### 1. Drag Overlay

- `DndContext.DragOverlay` 渲染被拖拽节点的副本
- 原始节点 `opacity: 0.3`，不移动位置
- Overlay 内容从 `folderMap` 读取，不依赖虚拟列表 DOM
- Overlay 样式：`opacity: 0.85, box-shadow, scale(1.02)`

### 2. Drop Indicator

`onDragMove` 中根据 pointer 相对 droppable 的 rect 计算位置：

| 指针区域 | 判定 | 效果 |
|---|---|---|
| top 25% | `before` | 蓝色横线 (3px) 在目标上方 |
| middle 50% (目标为文件夹) | `inside` | 目标背景 `#E5F0FF` + 边框 `#0078D4` |
| bottom 25% | `after` | 蓝色横线在目标下方 |

- 横线通过 `createPortal` 渲染到 `document.body`
- 使用 `getBoundingClientRect` 定位
- **不使用 sortable 默认排序动画** — 其他项不移动

### 3. Hover Expand

- 拖入可展开文件夹时启动 500ms timer
- 触发后调用 `toggleExpand(id)` 展开子项
- pointer 离开时 clear timer
- `useRef<number>` 存 timer ID，防重复

## 文件变更

| 文件 | 动作 |
|---|---|
| `frontend/package.json` | 添加 `@tanstack/react-virtual` |
| `frontend/src/components/Sidebar.tsx` | 替换 Virtuoso，接入 DndContext + useVirtualizer + DragOverlay + DropIndicator |
| `frontend/src/components/FolderNode.tsx` | 接入 useSortable + useDroppable，hover expand timer，inside 高亮 |
| `frontend/src/stores/dndStore.ts` | **新建** — 拖拽状态 (activeId, overId, dropPosition, indicatorRect) |
| `frontend/src/stores/folderStore.ts` | 新增 `moveFolder` action |
| `frontend/src/components/DropIndicator.tsx` | **新建** — portal 渲染的横线指示器 |

## Drag Lifecycle

1. `onDragStart` → dndStore 设置 activeId，原节点 opacity: 0.3
2. `onDragMove` → collision detection → 计算 before/inside/after → 更新 indicatorRect + dropPosition
3. 若 over folder + middle 50% → 启动 hover expand timer
4. `onDragEnd` → 读取 dndStore 的 overId + dropPosition → 计算 prevId/nextId/parentId → 调用 `folderStore.moveFolder()` → `api.moveFolder()`
5. 成功后 → reload children for old and new parent folders

## 交互细节

- 拖拽激活：`PointerSensor` + `activationConstraint.distance: 5` (区分点击/拖拽)
- 展开节点列表：`isExpanded` 相同 depth 区间的所有兄弟节点
- 冲突处理：`api.moveFolder` 返回 409 时静默重新加载当前文件夹
- 拖拽不能放入自己：自身及其子孙节点 disable droppable

## Verification

1. 同级排序：拖拽文件夹到兄弟节点上方/下方 → 排序正确
2. 改变父级：拖拽文件夹悬停 500ms 等展开，拖入子文件夹 → 父级变更
3. 视觉反馈：横线指示器正确出现，目标高亮正确
4. 拖拽取消（ESC 或拖到无效区域）→ 无变化
5. 展开后取消拖拽 → 保持展开，原数据不变
6. 不能拖入自身或子孙 → droppable disabled
