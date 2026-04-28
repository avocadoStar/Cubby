import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import type { Folder } from '../types'

export function Sidebar() {
  const navigate = useNavigate()
  const { folders, selectedFolderId, fetchFolders, selectFolder, createFolder, deleteFolder } = useFolderStore()
  const { fetchBookmarks } = useBookmarkStore()
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: string } | null>(null)

  useEffect(() => { fetchFolders() }, [])

  const handleSelect = (id: string | null) => {
    selectFolder(id)
    if (id === null) fetchBookmarks({})
    else if (id === 'recent') fetchBookmarks({ recent: 'true' })
    else if (id === 'favorites') fetchBookmarks({ favorite: 'true' })
    else if (id === 'unsorted') fetchBookmarks({ unsorted: 'true' })
    else fetchBookmarks({ folder_id: id })
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ id, x: e.clientX, y: '0px' })
  }

  const navItems = [
    { id: null, icon: '🔗', label: '全部收藏', count: null },
    { id: 'recent' as any, icon: '🕐', label: '最近添加', count: null },
    { id: 'favorites' as any, icon: '❤️', label: '我的收藏', count: null },
    { id: 'unsorted' as any, icon: '📋', label: '未分类', count: null },
  ]

  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-[60px]"
      style={{ backdropFilter: 'blur(60px) saturate(180%)' }}>

      <div className="p-5 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(145deg, #7C6AEF, #5B4FCF)', boxShadow: '0 4px 16px rgba(124,106,239,0.35)' }}>
            🏷️
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-white/65 bg-clip-text text-transparent">Cubby</span>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input className="w-full py-2.5 pl-9 pr-3 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-white placeholder:text-white/30 outline-none focus:border-[#7C6AEF]/35 focus:bg-white/[0.07] transition-all"
            placeholder="搜索收藏…  ⌘K" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && search) fetchBookmarks({ q: search }) }}
          />
        </div>
      </div>

      <div className="px-3">
        <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/30">快捷入口</div>
        {navItems.map(item => (
          <div key={item.label}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-medium cursor-pointer transition-all mb-0.5 relative
              ${selectedFolderId === item.id ? 'bg-[#7C6AEF]/12 text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90'}`}
            onClick={() => handleSelect(item.id)}>
            {selectedFolderId === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-sm bg-[#7C6AEF]" style={{ boxShadow: '0 0 12px rgba(124,106,239,0.25)' }} />
            )}
            <span className="w-5 text-center text-sm">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      <div className="px-3 mt-5 flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-white/30">文件夹</div>
        {folders.map(folder => (
          <FolderItem key={folder.id} folder={folder}
            selected={selectedFolderId === folder.id}
            onSelect={() => handleSelect(folder.id)}
            onContextMenu={handleContextMenu}
          />
        ))}
        {showNewFolder ? (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <input className="flex-1 py-1 px-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white outline-none"
              placeholder="文件夹名称" value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
              autoFocus />
            <button className="text-xs text-[#7C6AEF] font-semibold" onClick={handleCreateFolder}>确定</button>
          </div>
        ) : (
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-white/30 hover:text-white/50 transition-colors w-full"
            onClick={() => setShowNewFolder(true)}>
            <span>＋</span> 新建文件夹
          </button>
        )}
      </div>

      <div className="p-4 border-t border-white/[0.06]">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all w-full"
          onClick={() => navigate('/settings')}>
          ⚙️ 设置
        </button>
      </div>

      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div className="fixed bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/[0.1] rounded-xl py-1 shadow-2xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.08] hover:text-white"
              onClick={() => { deleteFolder(contextMenu.id); setContextMenu(null) }}>🗑️ 删除</button>
            <button className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/[0.08] hover:text-white"
              onClick={() => { /* AI organize */ setContextMenu(null) }}>🤖 AI 整理此文件夹</button>
          </div>
        </div>
      )}
    </aside>
  )
}

function FolderItem({ folder, selected, onSelect, onContextMenu, depth = 0 }: {
  folder: Folder; selected: boolean; onSelect: () => void
  onContextMenu: (e: React.MouseEvent, id: string) => void; depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = folder.children && folder.children.length > 0

  return (
    <>
      <div className={`flex items-center gap-2 px-3 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all mb-0.5 ${selected ? 'bg-[#7C6AEF]/12 text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white/85'}`}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
        onClick={onSelect}
        onContextMenu={e => onContextMenu(e, folder.id)}>
        {hasChildren && (
          <span className="text-[9px] opacity-30 w-3" onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}>
            {expanded ? '▾' : '▸'}
          </span>
        )}
        <span className="opacity-70">📁</span>
        <span className="truncate">{folder.name}</span>
      </div>
      {expanded && hasChildren && folder.children!.map(child => (
        <FolderItem key={child.id} folder={child} selected={false} onSelect={onSelect}
          onContextMenu={onContextMenu} depth={depth + 1} />
      ))}
    </>
  )
}
