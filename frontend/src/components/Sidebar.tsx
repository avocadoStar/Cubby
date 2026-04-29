import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useBookmarkMutations } from '../hooks/useBookmarkQueries'
import { flattenFolderTree, useFolderMutations, useFoldersQuery } from '../hooks/useFolderQueries'
import { useFolderStore } from '../stores/folderStore'
import type { Folder } from '../types'
import { Button } from './ui/Button'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Icon } from './ui/Icon'
import { LogoMark } from './ui/LogoMark'
import { Select } from './ui/Select'
import { Surface } from './ui/Surface'

type SidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

type ContextMenuState = {
  folderId: string
  x: number
  y: number
} | null

const quickLinks = [
  { id: null, icon: 'grid' as const, label: '全部书签' },
  { id: 'recent', icon: 'sparkles' as const, label: '最近添加' },
  { id: 'favorites', icon: 'heart-filled' as const, label: '我的收藏' },
  { id: 'unsorted', icon: 'folder' as const, label: '未分类' },
]

function containsSelectedFolder(folder: Folder, targetId: string | null): boolean {
  if (!targetId) {
    return false
  }

  return (folder.children ?? []).some((child) => child.id === targetId || containsSelectedFolder(child, targetId))
}

function findFolderById(folders: Folder[], folderId: string): Folder | null {
  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder
    }

    const nested = findFolderById(folder.children ?? [], folderId)
    if (nested) {
      return nested
    }
  }

  return null
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedFolderId, selectFolder } = useFolderStore()
  const { data: folders = [] } = useFoldersQuery()
  const folderMutations = useFolderMutations()
  const bookmarkMutations = useBookmarkMutations({ selection: selectedFolderId, query: '' })
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParent, setNewFolderParent] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [folderActionError, setFolderActionError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [pendingDeleteFolderId, setPendingDeleteFolderId] = useState<string | null>(null)
  const flatFolders = useMemo(() => flattenFolderTree(folders), [folders])

  const handleSelect = (nextSelection: string | null) => {
    setFolderActionError(null)
    selectFolder(nextSelection)
    if (location.pathname !== '/') {
      navigate('/')
    }
    onNavigate?.()
  }

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim()
    if (!trimmedName) {
      return
    }

    try {
      await folderMutations.createFolder.mutateAsync({ name: trimmedName, parentId: newFolderParent || null })
      setFolderActionError(null)
      setNewFolderName('')
      setNewFolderParent('')
      setShowNewFolder(false)
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '创建文件夹失败')
    }
  }

  const handleDropBookmarkToFolder = async (bookmarkId: string, folderId: string | null) => {
    try {
      await bookmarkMutations.moveBookmark.mutateAsync({ id: bookmarkId, folderId })
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '移动书签失败')
    }
  }

  const handleDropFolderBefore = async (
    draggedFolderId: string,
    targetFolder: Folder,
    siblingIds: string[],
    parentId: string | null,
  ) => {
    if (draggedFolderId === targetFolder.id) {
      return
    }

    const nextSiblingIds = siblingIds.filter((id) => id !== draggedFolderId)
    const targetIndex = nextSiblingIds.indexOf(targetFolder.id)
    nextSiblingIds.splice(targetIndex, 0, draggedFolderId)

    try {
      await folderMutations.moveFolder.mutateAsync({ id: draggedFolderId, parentId, sortOrder: targetIndex })
      await folderMutations.reorderFolders.mutateAsync(nextSiblingIds)
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '移动文件夹失败')
    }
  }

  const handleDropFolderInto = async (draggedFolderId: string, targetFolder: Folder) => {
    if (draggedFolderId === targetFolder.id) {
      return
    }

    try {
      await folderMutations.moveFolder.mutateAsync({
        id: draggedFolderId,
        parentId: targetFolder.id,
        sortOrder: targetFolder.children?.length ?? 0,
      })
      setExpandedIds((current) => ({ ...current, [targetFolder.id]: true }))
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '移动文件夹失败')
    }
  }

  const handleMoveFolderToRoot = async (draggedFolderId: string) => {
    const rootIds = folders.map((folder) => folder.id)
    const nextRootIds = rootIds.filter((id) => id !== draggedFolderId)
    nextRootIds.push(draggedFolderId)

    try {
      await folderMutations.moveFolder.mutateAsync({
        id: draggedFolderId,
        parentId: null,
        sortOrder: nextRootIds.length - 1,
      })
      await folderMutations.reorderFolders.mutateAsync(nextRootIds)
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '移动文件夹失败')
    }
  }

  const settingsActive = location.pathname === '/settings'
  const folderOptions = flatFolders.map((item) => ({
    label: `${'· '.repeat(item.depth)}${item.folder.name}`,
    value: item.folder.id,
  }))

  return (
    <aside className={`sidebar-shell ${mobile ? 'surface-elevated border-r border-[var(--color-border)]' : ''}`}>
      <div className="flex h-full flex-col gap-4 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
            <LogoMark className="h-5 w-5" compact />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold leading-5 text-[var(--color-text)]">Cubby</div>
            <div className="truncate text-[12px] leading-4 text-[var(--color-text-secondary)]">Bookmark workspace</div>
          </div>
        </div>

        <RootDropZone
          onDropFolder={handleMoveFolderToRoot}
          onDropUnsortedBookmark={(bookmarkId) => void handleDropBookmarkToFolder(bookmarkId, null)}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="sidebar-panel p-2">
            <div className="section-label px-2 pb-2">导航</div>
            <div className="sidebar-nav-list space-y-1 p-1">
              {quickLinks.map((item) => {
                const active = location.pathname === '/' && selectedFolderId === item.id
                const allowBookmarkDrop = item.id === 'unsorted'

                return (
                  <button
                    className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                    key={item.label}
                    onClick={() => handleSelect(item.id)}
                    onDragOver={(event) => {
                      if (allowBookmarkDrop && event.dataTransfer.types.includes('application/x-cubby-bookmark')) {
                        event.preventDefault()
                      }
                    }}
                    onDrop={(event) => {
                      if (!allowBookmarkDrop) {
                        return
                      }
                      event.preventDefault()
                      const bookmarkId = event.dataTransfer.getData('application/x-cubby-bookmark')
                      if (bookmarkId) {
                        void handleDropBookmarkToFolder(bookmarkId, null)
                      }
                    }}
                    type="button"
                  >
                    <span className="sidebar-item-icon">
                      <Icon className="text-[14px]" filled={item.icon === 'heart-filled'} name={item.icon} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sidebar-panel flex min-h-0 flex-1 flex-col overflow-hidden p-2">
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="section-label">文件夹</div>
              <Button
                leading={<Icon className="text-[13px]" name={showNewFolder ? 'close' : 'plus'} />}
                onClick={() => setShowNewFolder((current) => !current)}
                size="sm"
                variant="ghost"
              >
                {showNewFolder ? '收起' : '新建'}
              </Button>
            </div>

            {showNewFolder ? (
              <Surface className="mb-3 space-y-3 p-3" tone="panel">
                <label className="block space-y-2">
                  <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">名称</span>
                  <input
                    className="input-flat h-9 px-3 text-[14px]"
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="例如：研究 / 工具 / 灵感"
                    value={newFolderName}
                  />
                </label>

                <Select
                  label="上级文件夹"
                  onChange={(event) => setNewFolderParent(event.target.value)}
                  options={folderOptions}
                  placeholder="顶层文件夹"
                  value={newFolderParent}
                />

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => void handleCreateFolder()} size="sm" variant="primary">
                    保存
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowNewFolder(false)
                      setNewFolderName('')
                      setNewFolderParent('')
                    }}
                    size="sm"
                    variant="secondary"
                  >
                    取消
                  </Button>
                </div>
              </Surface>
            ) : null}

            {folderActionError ? (
              <p className="px-2 pb-2 text-[12px] leading-5 text-[var(--color-danger)]">{folderActionError}</p>
            ) : null}

            <div className="sidebar-tree min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {folders.length > 0 ? (
                <div className="space-y-0.5 pr-1">
                  {folders.map((folder) => (
                    <FolderNode
                      depth={0}
                      expandedIds={expandedIds}
                      folder={folder}
                      key={folder.id}
                      onContextMenu={setContextMenu}
                      onDropBookmark={(bookmarkId, folderId) => void handleDropBookmarkToFolder(bookmarkId, folderId)}
                      onDropFolderBefore={handleDropFolderBefore}
                      onDropFolderInto={handleDropFolderInto}
                      onSelect={handleSelect}
                      onToggleExpand={(id) => setExpandedIds((current) => ({ ...current, [id]: !current[id] }))}
                      selectedFolderId={selectedFolderId}
                      siblingIds={folders.map((item) => item.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="sidebar-tree-empty">还没有文件夹。你可以先新建一个，或者先把书签放到未分类。</div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar-panel p-2">
          <button
            className={`sidebar-item ${settingsActive ? 'sidebar-item-active' : ''}`}
            onClick={() => {
              navigate('/settings')
              onNavigate?.()
            }}
            type="button"
          >
            <span className="sidebar-item-icon">
              <Icon className="text-[14px]" name="settings" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">设置</span>
          </button>
        </div>
      </div>

      {contextMenu ? (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} role="presentation">
          <Surface className="fixed min-w-[176px] p-1.5" style={{ left: contextMenu.x, top: contextMenu.y }} tone="elevated">
            <button
              className="sidebar-menu-item text-[var(--color-danger)]"
              onClick={() => {
                setPendingDeleteFolderId(contextMenu.folderId)
                setContextMenu(null)
              }}
              type="button"
            >
              <Icon className="text-[13px]" name="trash" />
              删除文件夹
            </button>
          </Surface>
        </div>
      ) : null}

      <ConfirmDialog
        description="这会删除该文件夹及其所有下级文件夹。里面的书签会保留，但会回到未分类。"
        onClose={() => setPendingDeleteFolderId(null)}
        onConfirm={() => {
          if (!pendingDeleteFolderId) {
            return
          }

          const targetFolder = findFolderById(folders, pendingDeleteFolderId)
          const shouldResetSelection =
            selectedFolderId === pendingDeleteFolderId ||
            (targetFolder ? containsSelectedFolder(targetFolder, selectedFolderId) : false)

          void folderMutations.deleteFolder
            .mutateAsync(pendingDeleteFolderId)
            .then(() => {
              if (shouldResetSelection) {
                handleSelect(null)
              }
            })
            .catch((error: unknown) => {
              setFolderActionError(error instanceof Error ? error.message : '删除文件夹失败')
            })
            .finally(() => setPendingDeleteFolderId(null))
        }}
        open={Boolean(pendingDeleteFolderId)}
        title="确认删除文件夹"
      />
    </aside>
  )
}

type FolderNodeProps = {
  depth: number
  expandedIds: Record<string, boolean>
  folder: Folder
  onContextMenu: (value: ContextMenuState) => void
  onDropBookmark: (bookmarkId: string, folderId: string) => void
  onDropFolderBefore: (draggedFolderId: string, targetFolder: Folder, siblingIds: string[], parentId: string | null) => void
  onDropFolderInto: (draggedFolderId: string, targetFolder: Folder) => void
  onSelect: (id: string) => void
  onToggleExpand: (id: string) => void
  selectedFolderId: string | null
  siblingIds: string[]
}

function FolderNode({
  depth,
  expandedIds,
  folder,
  onContextMenu,
  onDropBookmark,
  onDropFolderBefore,
  onDropFolderInto,
  onSelect,
  onToggleExpand,
  selectedFolderId,
  siblingIds,
}: FolderNodeProps) {
  const hasChildren = Boolean(folder.children?.length)
  const isExpanded = expandedIds[folder.id] ?? true
  const isActive = selectedFolderId === folder.id
  const isInActivePath = containsSelectedFolder(folder, selectedFolderId)

  return (
    <div className="sidebar-tree-branch">
      <FolderDropLine
        depth={depth}
        onDrop={(draggedFolderId) => onDropFolderBefore(draggedFolderId, folder, siblingIds, folder.parent_id ?? null)}
      />

      <div
        className={`sidebar-tree-row ${isActive ? 'sidebar-tree-row-active' : isInActivePath ? 'sidebar-tree-row-path' : ''}`}
        draggable
        onContextMenu={(event) => {
          event.preventDefault()
          onContextMenu({ folderId: folder.id, x: event.clientX, y: event.clientY })
        }}
        onDragOver={(event) => {
          if (
            event.dataTransfer.types.includes('application/x-cubby-bookmark') ||
            event.dataTransfer.types.includes('application/x-cubby-folder')
          ) {
            event.preventDefault()
          }
        }}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('application/x-cubby-folder', folder.id)
        }}
        onDrop={(event) => {
          event.preventDefault()
          const bookmarkId = event.dataTransfer.getData('application/x-cubby-bookmark')
          const draggedFolderId = event.dataTransfer.getData('application/x-cubby-folder')
          if (bookmarkId) {
            onDropBookmark(bookmarkId, folder.id)
            return
          }
          if (draggedFolderId) {
            onDropFolderInto(draggedFolderId, folder)
          }
        }}
      >
        <button
          aria-label={isExpanded ? '折叠文件夹' : '展开文件夹'}
          className="sidebar-tree-toggle"
          disabled={!hasChildren}
          onClick={() => {
            if (hasChildren) {
              onToggleExpand(folder.id)
            }
          }}
          type="button"
        >
          {hasChildren ? (
            <Icon
              className={`text-[12px] transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              name="chevron-down"
            />
          ) : (
            <span className="block h-3 w-3" />
          )}
        </button>

        <span className="sidebar-tree-folder-icon">
          <Icon className="text-[13px]" name="folder" />
        </span>

        <button className="sidebar-tree-label" onClick={() => onSelect(folder.id)} type="button">
          {folder.name}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <div className="sidebar-tree-children" style={{ marginLeft: `${Math.min(6 + depth * 2, 12)}px` }}>
          {folder.children?.map((child) => (
            <FolderNode
              depth={depth + 1}
              expandedIds={expandedIds}
              folder={child}
              key={child.id}
              onContextMenu={onContextMenu}
              onDropBookmark={onDropBookmark}
              onDropFolderBefore={onDropFolderBefore}
              onDropFolderInto={onDropFolderInto}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              selectedFolderId={selectedFolderId}
              siblingIds={folder.children?.map((item) => item.id) ?? []}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FolderDropLine({ depth, onDrop }: { depth: number; onDrop: (folderId: string) => void }) {
  return (
    <div
      className="sidebar-drop-line"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-cubby-folder')) {
          event.preventDefault()
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        const draggedFolderId = event.dataTransfer.getData('application/x-cubby-folder')
        if (draggedFolderId) {
          onDrop(draggedFolderId)
        }
      }}
      style={{ marginLeft: `${Math.min(22 + depth * 10, 54)}px` }}
    >
      <div className="sidebar-drop-line-indicator" />
    </div>
  )
}

function RootDropZone({
  onDropFolder,
  onDropUnsortedBookmark,
}: {
  onDropFolder: (folderId: string) => void
  onDropUnsortedBookmark: (bookmarkId: string) => void
}) {
  return (
    <div
      className="sidebar-root-drop-zone"
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.includes('application/x-cubby-folder') ||
          event.dataTransfer.types.includes('application/x-cubby-bookmark')
        ) {
          event.preventDefault()
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        const folderId = event.dataTransfer.getData('application/x-cubby-folder')
        const bookmarkId = event.dataTransfer.getData('application/x-cubby-bookmark')
        if (folderId) {
          onDropFolder(folderId)
        } else if (bookmarkId) {
          onDropUnsortedBookmark(bookmarkId)
        }
      }}
    >
      拖到这里可移到顶层或未分类
    </div>
  )
}
