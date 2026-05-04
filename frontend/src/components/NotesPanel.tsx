import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'
import { useFolderStore } from '../stores/folderStore'
import type { Bookmark } from '../types'

interface NotesPanelProps {
  bookmark: Bookmark | null
  onClose: () => void
}

export default function NotesPanel({ bookmark, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const open = bookmark !== null

  useEffect(() => {
    if (bookmark) { setNotes(bookmark.notes || ''); setSaved(false) }
  }, [bookmark?.id])

  const save = useCallback((value: string) => {
    if (!bookmark) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try { await api.updateNotes(bookmark.id, value); setSaved(true); setTimeout(() => setSaved(false), 1500) } catch { /* ignore */ }
    }, 500)
  }, [bookmark])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const folderPath = bookmark ? (() => {
    const { folderMap } = useFolderStore.getState()
    const parts: string[] = []
    let current: string | null = bookmark.folder_id
    while (current) { const f = folderMap.get(current); if (!f) break; parts.unshift(f.name); current = f.parent_id }
    return parts
  })() : []

  return (
    <div style={{ width: open ? 300 : 0, overflow: 'hidden', background: 'var(--app-card)', borderLeft: open ? '1px solid var(--app-border)' : '1px solid transparent', transition: 'width 0.2s ease-out, border-color 0.2s', flexShrink: 0 }}>
      <div style={{ width: 300, padding: open ? '20px 20px 12px' : 0, opacity: open ? 1 : 0, transition: 'opacity 0.15s', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {bookmark && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word', paddingRight: 8, color: 'var(--app-text)' }}>{bookmark.title}</div>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--app-text2)', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--app-text2)', marginBottom: 12, wordBreak: 'break-all', userSelect: 'all' }}>{bookmark.url}</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--app-text3)', marginBottom: 4, fontWeight: 500 }}>所在文件夹</div>
              <div style={{ fontSize: 13, color: 'var(--app-text)' }}>
                {folderPath.length > 0 ? folderPath.join(' › ') : '根目录'}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--app-border)', margin: '0 0 16px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--app-text2)' }}>备注 Notes</div>
              <div style={{ fontSize: 10, color: notes.length > 900 ? '#E4A000' : 'var(--app-text3)' }}>{notes.length} / 1000</div>
            </div>
            <textarea value={notes} onChange={(e) => { setNotes(e.target.value); save(e.target.value) }} maxLength={1000}
              placeholder="输入备注..." style={{ width: '100%', flex: 1, minHeight: 120, padding: 12, borderRadius: 8, border: '1px solid var(--app-border)', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit', color: 'var(--app-text)', background: 'var(--app-note-bg)', resize: 'none', outline: 'none' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--app-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,120,212,.1)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--app-border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--app-text3)', opacity: saved ? 1 : 0, transition: 'opacity .3s' }}>已自动保存</span>
              <button onClick={() => { setNotes(''); save('') }} style={{ fontSize: 11, color: 'var(--app-text3)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>清空备注</button>
            </div>
            <svg style={{ position: 'absolute', bottom: -10, right: -10, width: 140, height: 200, opacity: 0.04, pointerEvents: 'none' }} viewBox="0 0 100 160">
              <path d="M50 10 C30 30 10 60 8 90 C6 120 15 145 25 150 C35 155 42 150 48 140 C38 130 28 110 30 90 C32 70 40 50 50 35 C55 28 58 22 56 15 Z" fill="var(--app-accent)"/>
              <path d="M50 10 L52 5 L48 6 Z" fill="var(--app-accent)"/>
            </svg>
          </>
        )}
      </div>
    </div>
  )
}
