import { useState } from 'react'
import { api } from '../services/api'

export default function ImportModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle' | 'importing' | 'done'>('idle')
  const [result, setResult] = useState<{ bookmarks: number } | null>(null)

  const handleFile = async (file: File) => {
    setStatus('importing')
    const res = await api.importBookmarks(file)
    const data = await res.json()
    setResult(data)
    setStatus('done')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div className="bg-white border border-[#e0e0e0] rounded-lg shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-4">导入收藏夹</h3>
        {status === 'idle' && (
          <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-[#d1d1d1] rounded-lg cursor-default hover:border-[#0078D4]">
            <span className="text-sm text-[#666]">选择浏览器导出的 HTML 文件</span>
            <input type="file" accept=".html,.htm" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }} />
          </label>
        )}
        {status === 'importing' && <p className="text-sm text-[#666] text-center py-8">导入中...</p>}
        {status === 'done' && (
          <div className="text-center py-4">
            <p className="text-sm text-green-600 mb-2">导入完成!</p>
            <p className="text-sm text-[#666]">共导入 {result?.bookmarks ?? 0} 条书签</p>
            <button onClick={onClose} className="mt-4 h-8 px-4 border-none rounded bg-[#0078D4] text-white text-[13px] font-medium cursor-default">完成</button>
          </div>
        )}
      </div>
    </div>
  )
}
