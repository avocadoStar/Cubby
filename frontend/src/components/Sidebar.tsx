import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFolderStore } from '../stores/folderStore'
import { Button } from './ui/Button'
import { Surface } from './ui/Surface'
import type { Folder } from '../types'

type SidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

type ContextMenuState = {
  folderId: string
  x: number
  y: number
} | null

const quickLinks: Array<{ id: string | null; icon: string; label: string; subtitle: string }> = [
  { id: null, icon: '⌂', label: '全部收藏', subtitle: '所有链接' },
  { id: 'recent', icon: '◔', label: '最近添加', subtitle: '最新收纳' },
  { id: 'favorites', icon: '♥', label: '我的收藏', subtitle: '常用入口' },
  { id: 'unsorted', icon: '◌', label: '未分类', subtitle: '待整理' },
]

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { folders, selectedFolderId, fetchFolders, createFolder, deleteFolder, error: folderError, selectFolder } = useFolderStore()
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParent, setNewFolderParent] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)
  const [folderActionError, setFolderActionError] = useState<string | null>(null)

  useEffect(() => {
    void fetchFolders()
  }, [fetchFolders])

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
      await createFolder(trimmedName, newFolderParent || null)
      setFolderActionError(null)
      setNewFolderName('')
      setNewFolderParent('')
      setShowNewFolder(false)
    } catch (error) {
      setFolderActionError(error instanceof Error ? error.message : '创建文件夹失败')
    }
  }

  return (
    <Surface
      className={`flex h-full min-h-[calc(100vh-2rem)] flex-col overflow-hidden px-4 py-4 ${
        mobile ? 'w-full max-w-[320px]' : 'w-[292px]'
      }`}
      tone="elevated"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[var(--accent-gradient)] text-lg text-white shadow-[0_18px_50px_rgba(0,113,227,0.22)]">
          ⌘
        </div>
        <div className="min-w-0">
          <div className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">Cubby</div>
          <div className="text-[12px] text-[var(--text-tertiary)]">Liquid glass bookmark space</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="section-label">快捷入口</div>
        <div className="space-y-1">
          {quickLinks.map((item) => {
            const active = selectedFolderId === item.id
            return (
              <button
                key={item.label}
                className={`sidebar-item ${active ? 'sidebar-item-active' : ''}`}
                onClick={() => handleSelect(item.id)}
                type="button"
              >
                <span className="sidebar-item-icon">{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{item.label}</span>
                  <span className="block truncate text-[11px] text-[var(--text-quaternary)]">{item.subtitle}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between">
          <div className="section-label">文件夹</div>
          <Button onClick={() => setShowNewFolder((current) => !current)} size="sm" variant="ghost">
            {showNewFolder ? '收起' : '新建'}
          </Button>
        </div>

        {showNewFolder ? (
          <Surface className="mb-3 space-y-3 p-3" tone="subtle">
            <label className="space-y-2">
              <span className="text-[12px] text-[var(--text-tertiary)]">名称</span>
              <input
                className="input-liquid h-11"
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="例如：研究 / 灵感 / 工具"
                value={newFolderName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-[12px] text-[var(--text-tertiary)]">父级</span>
              <select
                className="input-liquid h-11"
                onChange={(event) => setNewFolderParent(event.target.value)}
                value={newFolderParent}
              >
                <option value="">一级文件夹</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void handleCreateFolder()} variant="primary">
                保存
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setShowNewFolder(false)
                  setNewFolderName('')
                  setNewFolderParent('')
                }}
                variant="secondary"
              >
                取消
              </Button>
            </div>
          </Surface>
        ) : null}

        {folderActionError || folderError ? (
          <p className="mb-3 text-[12px] text-[var(--danger)]">{folderActionError ?? folderError}</p>
        ) : null}

        <div className="scroll-fade min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            {folders.map((folder) => (
              <FolderNode
                folder={folder}
                key={folder.id}
                onContextMenu={setContextMenu}
                onSelect={handleSelect}
                selectedFolderId={selectedFolderId}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-white/8 pt-4">
        <Button className="w-full justify-start" leading="⌘" onClick={() => navigate('/settings')} variant="secondary">
          AI 与偏好设置
        </Button>
      </div>

      {contextMenu ? (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} role="presentation">
          <Surface
            className="fixed min-w-[180px] p-2"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            tone="elevated"
          >
            <button
              className="sidebar-menu-item text-[var(--danger)]"
              onClick={async () => {
                try {
                  await deleteFolder(contextMenu.folderId)
                  setFolderActionError(null)
                } catch (error) {
                  setFolderActionError(error instanceof Error ? error.message : '删除文件夹失败')
                }
                setContextMenu(null)
              }}
              type="button"
            >
              删除文件夹
            </button>
          </Surface>
        </div>
      ) : null}
    </Surface>
  )
}

type FolderNodeProps = {
  depth?: number
  folder: Folder
  onContextMenu: (value: ContextMenuState) => void
  onSelect: (id: string) => void
  selectedFolderId: string | null
}

function FolderNode({ depth = 0, folder, onContextMenu, onSelect, selectedFolderId }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = Boolean(folder.children?.length)
  const isActive = selectedFolderId === folder.id

  return (
    <>
      <div
        className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
        onContextMenu={(event) => {
          event.preventDefault()
          onContextMenu({ folderId: folder.id, x: event.clientX, y: event.clientY })
        }}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        <button
          aria-label={expanded ? '折叠文件夹' : '展开文件夹'}
          className="sidebar-item-icon shrink-0 text-[11px]"
          disabled={!hasChildren}
          onClick={() => {
            if (hasChildren) {
              setExpanded((current) => !current)
            }
          }}
          type="button"
        >
          {hasChildren ? (
            <svg
              className="transition-transform duration-200"
              fill="none"
              height="10"
              style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              viewBox="0 0 24 24"
              width="10"
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" />
            </svg>
          ) : (
            <span className="text-[10px] text-[var(--text-quaternary)]">•</span>
          )}
        </button>
        <button
          className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-[var(--text-primary)]"
          onClick={() => onSelect(folder.id)}
          type="button"
        >
          {folder.name}
        </button>
      </div>

      {hasChildren && expanded
        ? folder.children?.map((child) => (
            <FolderNode
              depth={depth + 1}
              folder={child}
              key={child.id}
              onContextMenu={onContextMenu}
              onSelect={onSelect}
              selectedFolderId={selectedFolderId}
            />
          ))
        : null}
    </>
  )
}
