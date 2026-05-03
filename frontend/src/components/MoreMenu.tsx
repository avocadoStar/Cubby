import { useState, useRef, useEffect } from 'react'
import ImportModal from './ImportModal'

export default function MoreMenu() {
  const [open, setOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <div ref={ref} className="relative">
        <button
          className="inline-flex items-center justify-center w-8 h-8 border-none rounded bg-transparent text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
          onClick={() => setOpen(!open)}
          title="更多选项"
        >
          <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <circle cx="10" cy="5.5" r="1.25"/><circle cx="10" cy="10" r="1.25"/><circle cx="10" cy="14.5" r="1.25"/>
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-9 w-[180px] bg-white border border-[#e0e0e0] rounded-lg shadow-lg p-1 z-50">
            <button
              className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
              onClick={() => { setShowImport(true); setOpen(false) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>导入收藏夹</span>
            </button>
            <button
              className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-body text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default border-none bg-transparent"
              onClick={async () => {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/export', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = 'bookmarks.html'; a.click()
                URL.revokeObjectURL(url); setOpen(false)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.6"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>导出收藏夹</span>
            </button>
          </div>
        )}
      </div>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}
