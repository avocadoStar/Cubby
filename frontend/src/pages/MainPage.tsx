import { useEffect, useState } from 'react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import type { Bookmark, AISuggestion } from '../types'
import * as api from '../services/api'

export function MainPage() {
  const { result, loading, viewMode, fetchBookmarks, createBookmark, deleteBookmark, toggleFavorite, setViewMode } = useBookmarkStore()
  const { folders } = useFolderStore()
  const [showAdd, setShowAdd] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  useEffect(() => { fetchBookmarks({}) }, [])

  const handleAdd = async () => {
    if (!addUrl.trim()) return
    await createBookmark({ title: addTitle || addUrl, url: addUrl })
    setAddUrl(''); setAddTitle(''); setShowAdd(false)
  }

  const handleAI = async () => {
    setAiLoading(true)
    try {
      const folderId = useFolderStore.getState().selectedFolderId
      const res = await api.aiOrganize(folderId || undefined)
      setAiSuggestions(res.suggestions || [])
      setShowAI(true)
    } catch (e: any) {
      alert(e.response?.data?.error || 'AI 整理失败')
    }
    setAiLoading(false)
  }

  const handleAIApply = async () => {
    const folderId = useFolderStore.getState().selectedFolderId
    await api.aiOrganize(folderId || undefined, 'apply')
    setShowAI(false)
    fetchBookmarks({})
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await api.importBookmarks(file)
    setImportResult(res)
    fetchBookmarks({})
  }

  const domain = (url: string) => { try { return new URL(url).hostname } catch { return url } }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-7 py-4 border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-[40px] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🔗</span>
          <h1 className="text-lg font-bold tracking-tight">全部收藏</h1>
          <span className="bg-white/[0.06] px-2.5 py-0.5 rounded-full text-xs text-white/40 font-semibold">{result.total}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="px-4 py-2 rounded-[10px] text-sm font-medium bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.09] transition-all"
            onClick={() => setShowImport(true)}>📥 导入</button>
          <button className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #7C6AEF, #9B6AEF, #6C5CE7)', backgroundSize: '200% 200%', animation: 'aiShimmer 4s ease infinite', boxShadow: '0 4px 20px rgba(124,106,239,0.3)' }}
            onClick={handleAI} disabled={aiLoading}>
            ✨ AI 整理
          </button>
          <button className="px-4 py-2 rounded-[10px] text-sm font-semibold bg-white/[0.07] border border-white/[0.08] text-white hover:bg-white/[0.12] transition-all hover:-translate-y-0.5"
            onClick={() => setShowAdd(true)}>＋ 添加收藏</button>
        </div>
      </header>

      {/* Bookmark Grid */}
      <div className="flex-1 overflow-y-auto p-7">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-white/30">加载中…</div>
        ) : result.items.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-white/30">暂无书签，点击右上角添加</div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-[repeat(auto-fill,minmax(310px,1fr))]' : 'grid-cols-1 max-w-3xl'}`}>
            {result.items.map(b => (
              <BookmarkCard key={b.id} bookmark={b}
                onFavorite={() => toggleFavorite(b.id)}
                onDelete={() => deleteBookmark(b.id)}
                domain={domain(b.url)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      {showAdd && (
        <Dialog title="添加收藏" onClose={() => setShowAdd(false)}>
          <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40 mb-3"
            placeholder="URL（必填）" value={addUrl} onChange={e => setAddUrl(e.target.value)} />
          <input className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm outline-none focus:border-[#7C6AEF]/40 mb-4"
            placeholder="标题（可选，默认使用 URL）" value={addTitle} onChange={e => setAddTitle(e.target.value)} />
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7C6AEF, #5B4FCF)' }}
            onClick={handleAdd}>添加</button>
        </Dialog>
      )}

      {/* AI Dialog */}
      {showAI && (
        <Dialog title="AI 整理建议" onClose={() => setShowAI(false)}>
          <div className="max-h-[400px] overflow-y-auto space-y-3 mb-4">
            {aiSuggestions.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">暂无建议</p>
            ) : aiSuggestions.map(s => (
              <div key={s.bookmark_id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-xs text-[#a78bfa] mt-1">→ {s.suggested_folder} <span className="text-white/30">({Math.round(s.confidence * 100)}%)</span></div>
                <div className="text-xs text-white/40 mt-1">{s.reason}</div>
              </div>
            ))}
          </div>
          {aiSuggestions.length > 0 && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7C6AEF, #5B4FCF)' }}
              onClick={handleAIApply}>全部应用</button>
          )}
        </Dialog>
      )}

      {/* Import Dialog */}
      {showImport && (
        <Dialog title="导入浏览器书签" onClose={() => { setShowImport(false); setImportResult(null) }}>
          {importResult ? (
            <div className="text-center py-4">
              <p className="text-lg font-semibold text-white mb-2">导入完成</p>
              <p className="text-sm text-white/50">新增 {importResult.created} 个，跳过 {importResult.skipped} 个重复</p>
              {importResult.folders_created?.length > 0 && (
                <p className="text-sm text-white/40 mt-2">创建文件夹：{importResult.folders_created.join('、')}</p>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/[0.1] rounded-xl cursor-pointer hover:border-white/20 transition-all">
              <span className="text-3xl mb-2">📥</span>
              <span className="text-sm text-white/50">点击选择 .html 书签文件</span>
              <input type="file" accept=".html,.htm" className="hidden" onChange={handleImport} />
            </label>
          )}
        </Dialog>
      )}
    </div>
  )
}

function BookmarkCard({ bookmark, onFavorite, onDelete, domain }: {
  bookmark: Bookmark; onFavorite: () => void; onDelete: () => void; domain: string
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div className="relative rounded-[20px] p-5 cursor-pointer transition-all duration-300 bg-white/[0.035] border border-white/[0.06]"
      style={{ backdropFilter: 'blur(24px)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseOver={e => {
        (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.065)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.35), 0 0 60px rgba(124,106,239,0.06)'
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.035)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}>
      {hovered && (
        <div className="absolute top-3.5 right-3.5 flex gap-1.5 z-10">
          <button className="w-[30px] h-[30px] rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs hover:bg-white/20 transition-all"
            title="收藏" onClick={e => { e.stopPropagation(); onFavorite() }}>
            {bookmark.is_favorite ? '❤️' : '🤍'}
          </button>
          <a className="w-[30px] h-[30px] rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs hover:bg-white/20 transition-all"
            href={bookmark.url} target="_blank" rel="noopener noreferrer" title="打开链接"
            onClick={e => e.stopPropagation()}>🔗</a>
          <button className="w-[30px] h-[30px] rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-xs hover:bg-red-500/30 transition-all"
            title="删除" onClick={e => { e.stopPropagation(); onDelete() }}>🗑️</button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-[42px] h-[42px] rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-white/10"
          style={{ background: 'linear-gradient(145deg, #7C6AEF22, #5B4FCF11)' }}>
          {bookmark.favicon_url ? <img src={bookmark.favicon_url} className="w-6 h-6 rounded" alt="" /> : '🌐'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14.5px] tracking-tight truncate">{bookmark.title}</div>
          <div className="text-xs text-white/30 mt-0.5 truncate">{domain}</div>
        </div>
      </div>
      {bookmark.description && (
        <p className="text-[13px] text-white/40 mt-3.5 leading-relaxed line-clamp-2">{bookmark.description}</p>
      )}
    </div>
  )
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#161b22]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="text-white/30 hover:text-white/60 text-xl" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
