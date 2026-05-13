import { useState } from 'react'
import { api } from '../services/api'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import ModalBase from './ModalBase'

type Status = 'idle' | 'importing' | 'done' | 'error'

interface ImportResult {
  bookmarks: number
  folders: number
}

interface ImportModalProps {
  onClose: () => void
  width?: string
  compact?: boolean
}

export default function ImportModal({ onClose, width = '440px', compact = false }: ImportModalProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isImporting = status === 'importing'
  const dropzoneClassName = [
    'flex flex-col items-center justify-center gap-3 border-2 border-dashed border-app-border rounded-lg cursor-pointer transition-colors duration-200 bg-input-bg shadow-app-base hover:border-app-accent hover:bg-accent-light text-app-text2',
    compact ? 'p-5 min-h-[180px]' : 'p-8 min-h-[240px]',
  ].join(' ')
  const statusClassName = [
    'flex flex-col items-center justify-center',
    compact ? 'min-h-[180px]' : 'min-h-[240px]',
  ].join(' ')

  const handleFile = async (file: File) => {
    setStatus('importing')
    setError(null)
    try {
      const data = await api.importBookmarks(file)
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

  const handleClose = () => {
    if (status === 'done') return handleDone()
    onClose()
  }

  return (
    <ModalBase
      title="导入收藏夹"
      onClose={handleClose}
      width={width}
      closeOnEscape={!isImporting}
      closeOnOverlayClick={!isImporting}
    >
      {status === 'idle' && (
        <label className={dropzoneClassName}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="1.6">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span className="text-body font-medium text-app-text">选择浏览器导出的 HTML 文件</span>
          <span className="text-caption text-app-text3">支持 Chrome / Edge / Firefox 导出格式</span>
          <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }} />
        </label>
      )}

      {status === 'importing' && (
        <div className={`${statusClassName} gap-4 py-8`}>
          <div className="w-10 h-10 border-2 border-t-transparent border-app-accent rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
          <p className="text-body text-app-text2">正在导入…</p>
        </div>
      )}

      {status === 'done' && (
        <div className={`${statusClassName} text-center py-6`}>
          <div className="w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center bg-[var(--success-bg)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--app-accent)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-body font-medium mb-2 text-app-accent">导入完成!</p>
          <p className="text-body text-app-text2">
            共导入 {result?.bookmarks ?? 0} 条书签
            {(result?.folders ?? 0) > 0 && `, ${result!.folders} 个文件夹`}
          </p>
          <button onClick={handleDone} className="mt-5 h-10 px-6 rounded text-body font-medium cursor-default border border-app-accent text-app-accent shadow-app-base hover:bg-accent-light transition-colors duration-150">
            完成
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className={`${statusClassName} text-center py-6`}>
          <div className="w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center bg-[var(--danger-bg)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--app-danger)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-body font-medium mb-2 text-app-danger">导入失败</p>
          <p className="text-caption mb-5 max-h-16 overflow-auto text-app-text2">{error}</p>
          <div className="flex justify-center gap-2">
            <button onClick={handleClose} className="h-10 px-5 rounded text-body cursor-default bg-app-card border border-input-border text-app-text shadow-app-base">
              取消
            </button>
            <button onClick={handleRetry} className="h-10 px-5 border-none rounded text-body font-medium cursor-default bg-app-accent text-text-on-accent shadow-app-base">
              重试
            </button>
          </div>
        </div>
      )}
    </ModalBase>
  )
}

