import { useState } from 'react'
import { api } from '../services/api'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'

type Status = 'idle' | 'importing' | 'done' | 'error'

interface ImportResult {
  bookmarks: number
  folders: number
}

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setStatus('importing')
    setError(null)
    try {
      const data = await api.importBookmarks(file) as unknown as ImportResult
      setResult(data)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败')
      setStatus('error')
    }
  }

  const handleDone = async () => {
    await useFolderStore.getState().loadChildren(null)
    await useBookmarkStore.getState().load(null)
    onClose()
  }

  const handleRetry = () => {
    setStatus('idle')
    setError(null)
    setResult(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--overlay)' }} onClick={onClose}>
      <div className="rounded-lg shadow-xl p-6 w-96" style={{ background: 'var(--app-card)', border: 'var(--input-border)', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--app-text)' }}>导入收藏夹</h3>

        {status === 'idle' && (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200"
            style={{ borderColor: 'var(--app-border)', color: 'var(--app-text2)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--app-accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--app-border)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="text-sm" style={{ color: 'var(--app-text2)' }}>选择浏览器导出的 HTML 文件</span>
            <span className="text-xs" style={{ color: 'var(--app-text3)' }}>支持 Chrome / Edge / Firefox 导出格式</span>
            <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }} />
          </label>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--app-text2)' }}>正在导入…</p>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700 mb-2">导入完成!</p>
            <p className="text-sm" style={{ color: 'var(--app-text2)' }}>
              共导入 {result?.bookmarks ?? 0} 条书签
              {(result?.folders ?? 0) > 0 && `, ${result!.folders} 个文件夹`}
            </p>
            <button onClick={handleDone} className="mt-4 h-8 px-6 border-none rounded text-white text-body font-medium cursor-default"
              style={{ background: 'var(--app-accent)' }}>
              完成
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-red-600 mb-1">导入失败</p>
            <p className="text-xs mb-4 max-h-16 overflow-auto" style={{ color: 'var(--app-text2)' }}>{error}</p>
            <div className="flex justify-center gap-2">
              <button onClick={onClose} className="h-8 px-4 rounded text-body cursor-default"
                style={{ border: 'var(--input-border)', boxShadow: 'var(--input-shadow)', background: 'var(--input-bg)', color: 'var(--app-text)' }}>
                取消
              </button>
              <button onClick={handleRetry} className="h-8 px-4 border-none rounded text-white text-body font-medium cursor-default"
                style={{ background: 'var(--app-accent)' }}>
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
