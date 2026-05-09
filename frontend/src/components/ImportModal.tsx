import { useState, type CSSProperties } from 'react'
import { api } from '../services/api'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'

type Status = 'idle' | 'importing' | 'done' | 'error'

interface ImportResult {
  bookmarks: number
  folders: number
}

const panelStyle: CSSProperties = {
  width: 'min(92vw, 520px)',
  background: 'var(--app-card)',
  border: 'var(--input-border)',
  borderRadius: 'var(--card-radius)',
  boxShadow: 'var(--shadow-lg)',
  padding: 28,
}

const uploadZoneStyle: CSSProperties = {
  minHeight: 188,
  borderColor: 'var(--app-border)',
  color: 'var(--app-text2)',
  background: 'var(--input-bg)',
  boxShadow: 'var(--shadow)',
}

const statusBlockStyle: CSSProperties = {
  minHeight: 188,
}

const secondaryButtonStyle: CSSProperties = {
  border: 'var(--input-border)',
  boxShadow: 'var(--shadow)',
  background: 'var(--app-card)',
  color: 'var(--app-text)',
}

const primaryButtonStyle: CSSProperties = {
  background: 'var(--app-accent)',
  boxShadow: 'var(--shadow)',
  color: 'var(--text-on-accent)',
}

const closeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  background: 'var(--app-card)',
  border: 'var(--input-border)',
  boxShadow: 'var(--shadow)',
  color: 'var(--app-text2)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-title font-semibold" style={{ color: 'var(--app-text)' }}>导入收藏夹</h3>
          <button
            aria-label="关闭"
            className="inline-flex items-center justify-center rounded cursor-default"
            style={closeButtonStyle}
            onClick={onClose}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {status === 'idle' && (
          <label className="flex flex-col items-center justify-center gap-3 p-7 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200"
            style={uploadZoneStyle}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--app-accent)'
              e.currentTarget.style.background = 'var(--accent-light)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--app-border)'
              e.currentTarget.style.background = 'var(--input-bg)'
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="1.6">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="text-body font-medium" style={{ color: 'var(--app-text)' }}>选择浏览器导出的 HTML 文件</span>
            <span className="text-caption" style={{ color: 'var(--app-text3)' }}>支持 Chrome / Edge / Firefox 导出格式</span>
            <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }} />
          </label>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-8" style={statusBlockStyle}>
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }} />
            <p className="text-body" style={{ color: 'var(--app-text2)' }}>正在导入…</p>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center justify-center text-center py-4" style={statusBlockStyle}>
            <div className="w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--success-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-body font-medium mb-2" style={{ color: 'var(--app-accent)' }}>导入完成!</p>
            <p className="text-body" style={{ color: 'var(--app-text2)' }}>
              共导入 {result?.bookmarks ?? 0} 条书签
              {(result?.folders ?? 0) > 0 && `, ${result!.folders} 个文件夹`}
            </p>
            <button onClick={handleDone} className="mt-5 h-10 px-6 border-none rounded text-body font-medium cursor-default"
              style={primaryButtonStyle}>
              完成
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center text-center py-4" style={statusBlockStyle}>
            <div className="w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-bg)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--app-danger)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <p className="text-body font-medium mb-2" style={{ color: 'var(--app-danger)' }}>导入失败</p>
            <p className="text-caption mb-5 max-h-16 overflow-auto" style={{ color: 'var(--app-text2)' }}>{error}</p>
            <div className="flex justify-center gap-2">
              <button onClick={onClose} className="h-10 px-5 rounded text-body cursor-default"
                style={secondaryButtonStyle}>
                取消
              </button>
              <button onClick={handleRetry} className="h-10 px-5 border-none rounded text-body font-medium cursor-default"
                style={primaryButtonStyle}>
                重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
