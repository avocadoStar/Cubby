import { useCallback, useEffect, useRef, useState } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import type { Bookmark } from '../types'
import SidePanelFrame from './SidePanelFrame'

interface NotesPanelProps {
  bookmark: Bookmark | null
  onClose: () => void
}

export default function NotesPanel({ bookmark, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingSaveRef = useRef<{ bookmarkId: string; value: string; originalNotes: string } | null>(null)
  const currentBookmarkIdRef = useRef<string | undefined>(undefined)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const open = bookmark !== null
  const bookmarkId = bookmark?.id
  const bookmarkNotes = bookmark?.notes || ''
  const updateNotes = useBookmarkStore(s => s.updateNotes)
  currentBookmarkIdRef.current = bookmarkId

  useEffect(() => {
    if (bookmarkId) {
      setNotes(bookmarkNotes)
      setSaved(false)
    }
  }, [bookmarkId, bookmarkNotes])

  const save = useCallback((value: string) => {
    if (!bookmarkId) return
    clearTimeout(timerRef.current)
    const pending = { bookmarkId, value, originalNotes: bookmarkNotes }
    pendingSaveRef.current = pending
    timerRef.current = setTimeout(async () => {
      timerRef.current = undefined
      try {
        await updateNotes(pending.bookmarkId, pending.value)
        if (currentBookmarkIdRef.current === pending.bookmarkId) {
          setSaved(true)
          clearTimeout(savedTimerRef.current)
          savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
        }
      } catch {
        // Notes are opportunistically saved; existing behavior ignores failures.
      }
      if (pendingSaveRef.current === pending) pendingSaveRef.current = null
    }, 500)
  }, [bookmarkId, bookmarkNotes, updateNotes])

  useEffect(() => () => {
    const timer = timerRef.current
    const pending = pendingSaveRef.current
    clearTimeout(savedTimerRef.current)
    if (timer && pending && pending.value !== pending.originalNotes) {
      clearTimeout(timer)
      timerRef.current = undefined
      pendingSaveRef.current = null
      updateNotes(pending.bookmarkId, pending.value).catch(() => {})
    }
  }, [bookmarkId, updateNotes])

  const folderPath = bookmark ? (() => {
    const { folderMap } = useFolderStore.getState()
    const parts: string[] = []
    let current: string | null = bookmark.folder_id
    while (current) {
      const folder = folderMap.get(current)
      if (!folder) break
      parts.unshift(folder.name)
      current = folder.parent_id
    }
    return parts
  })() : []

  return (
    <SidePanelFrame
      open={open}
      width={300}
      title={bookmark?.title}
      subtitle={bookmark?.url}
      onClose={onClose}
    >
      {bookmark && (
        <div className="relative flex flex-col h-full overflow-hidden p-5 pt-4">
          <div className="mb-4">
            <div className="text-[var(--fs--2)] uppercase tracking-wide text-[var(--app-text3)] mb-1 font-medium">所在文件夹</div>
            <div className="text-[var(--fs-body)] text-app-text">
              {folderPath.length > 0 ? folderPath.join(' / ') : '根目录'}
            </div>
          </div>
          <div className="border-t border-app-border mx-0 mb-4" />
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[var(--fs--1)] font-semibold uppercase tracking-wide text-app-text2">备注 Notes</div>
            <div className="text-[var(--fs--2)]" style={{ color: notes.length > 900 ? 'var(--app-danger)' : 'var(--app-text3)' }}>{notes.length} / 1000</div>
          </div>
          <textarea
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value)
              save(event.target.value)
            }}
            maxLength={1000}
            placeholder="输入备注..."
            className="w-full flex-1 min-h-[120px] p-3 rounded-input font-[inherit] text-app-text bg-input-bg resize-none outline-none"
            style={{
              border: 'var(--input-border)',
              boxShadow: 'var(--input-shadow)',
              fontSize: 'var(--fs-body)',
              lineHeight: 1.6,
            }}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = 'transparent'
              event.currentTarget.style.boxShadow = 'var(--input-shadow-focus)'
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = 'transparent'
              event.currentTarget.style.boxShadow = 'var(--input-shadow)'
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[var(--fs--1)] text-[var(--app-text3)]" style={{ opacity: saved ? 1 : 0, transition: 'opacity .3s' }}>已自动保存</span>
            <button
              type="button"
              onClick={() => {
                setNotes('')
                save('')
              }}
              className="text-[var(--fs--1)] text-[var(--app-text3)] cursor-pointer py-1 px-2 rounded-button"
              style={{ border: 'var(--input-border)', boxShadow: 'var(--shadow)', background: 'var(--app-card)' }}
            >
              清空备注
            </button>
          </div>
          <svg className="absolute -bottom-2.5 -right-2.5 w-[140px] h-[200px] opacity-[0.04] pointer-events-none" viewBox="0 0 100 160">
            <path d="M50 10 C30 30 10 60 8 90 C6 120 15 145 25 150 C35 155 42 150 48 140 C38 130 28 110 30 90 C32 70 40 50 50 35 C55 28 58 22 56 15 Z" fill="var(--app-accent)" />
            <path d="M50 10 L52 5 L48 6 Z" fill="var(--app-accent)" />
          </svg>
        </div>
      )}
    </SidePanelFrame>
  )
}
