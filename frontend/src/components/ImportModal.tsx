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
      const res = await api.importBookmarks(file)
      if (!res.ok) {
        throw new Error(await res.text())
      }
      const data: ImportResult = await res.json()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">导入收藏夹</h3>

        {status === 'idle' && (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[#d1d1d1] rounded-lg cursor-pointer hover:border-[#0078D4] transition-colors duration-200">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span className="text-sm text-[#666]">选择浏览器导出的 HTML 文件</span>
            <span className="text-xs text-[#999]">支持 Chrome / Edge / Firefox 导出格式</span>
            <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }} />
          </label>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#666]">正在导入…</p>
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
            <p className="text-sm text-[#666]">
              共导入 {result?.bookmarks ?? 0} 条书签
              {(result?.folders ?? 0) > 0 && `, ${result!.folders} 个文件夹`}
            </p>
            <button onClick={handleDone} className="mt-4 h-8 px-6 border-none rounded bg-[#0078D4] text-white text-body font-medium cursor-default hover:bg-[#0066b3]">
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
            <p className="text-xs text-[#888] mb-4 max-h-16 overflow-auto">{error}</p>
            <div className="flex justify-center gap-2">
              <button onClick={onClose} className="h-8 px-4 border border-[#d1d1d1] rounded bg-white text-body cursor-default">取消</button>
              <button onClick={handleRetry} className="h-8 px-4 border-none rounded bg-[#0078D4] text-white text-body font-medium cursor-default">重试</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
