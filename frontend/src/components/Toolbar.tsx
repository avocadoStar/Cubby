import { useState, useEffect, useRef, type FormEvent } from 'react'
import Breadcrumb from './Breadcrumb'
import MoreMenu from './MoreMenu'
import Button from './Button'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { themes } from '../lib/themes'
import CreateFolderModal from './CreateFolderModal'
import FontSizePopover from './FontSizePopover'
import ModalBase from './ModalBase'
import { mergeFetchedBookmarkTitle } from '../lib/addBookmark'
import { useAddBookmarkFlow } from '../hooks/useAddBookmarkFlow'

interface ThemeMenuProps {
  themeId: string
  onSelectTheme: (id: string, currentTarget: HTMLElement, clientX: number, clientY: number) => void
}

export function ThemeMenu({ themeId, onSelectTheme }: ThemeMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-2 z-50 p-3 bg-app-card border border-app-border rounded-card shadow-app-lg w-[200px]">
      <div className="text-body font-medium mb-2 text-app-text">涓婚</div>
      {themes.map(t => {
        const selected = themeId === t.id

        return (
          <Button
            key={t.id}
            variant="ghost"
            className="w-full justify-start"
            aria-current={selected ? 'true' : undefined}
            onClick={(e) => onSelectTheme(t.id, e.currentTarget as HTMLElement, e.clientX, e.clientY)}
            style={{
              background: selected ? 'var(--accent-light)' : 'transparent',
              color: selected ? 'var(--app-accent)' : 'var(--app-text)',
              fontWeight: selected ? 600 : 500,
            }}
          >
            <span
              className="flex-shrink-0 rounded-full"
              style={{
                width: 14, height: 14,
                background: t.vars['--bg'],
                boxShadow: t.id === 'neumorphism'
                  ? t.vars['--shadow']
                  : `0 0 0 1px ${t.vars['--border']}`,
              }}
            />
            <span className="flex-1 text-left text-body">{t.name}</span>
            <span
              aria-hidden="true"
              data-theme-marker-slot="true"
              data-theme-selected-marker={selected ? 'true' : undefined}
              className="inline-flex w-4 flex-shrink-0 items-center justify-center text-sm"
              style={{
                color: 'var(--app-accent)',
                fontWeight: 700,
                opacity: selected ? 1 : 0,
              }}
            />
          </Button>
        )
      })}
    </div>
  )
}

export default function Toolbar() {
  const { selectedId } = useFolderStore()
  const { upsertOne } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const { themeId, setTheme } = useThemeStore()
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const addBookmark = useAddBookmarkFlow({
    selectedId,
    upsertOne,
    mergeFetchedTitle: mergeFetchedBookmarkTitle,
    clearTitleErrorOnFetchedTitle: true,
  })

  const closeAddBookmarkModal = (force = false) => {
    if (!addBookmark.reset(force)) return
    setShowAddBookmark(false)
  }

  // Close theme popover on outside click
  useEffect(() => {
    if (!showTheme) return
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setShowTheme(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showTheme])

  const handleUrlChange = (value: string) => {
    addBookmark.handleUrlChange(value)
  }

  const handleTitleChange = (value: string) => {
    addBookmark.handleTitleChange(value)
  }

  const handleAddBookmark = async (event?: FormEvent<HTMLFormElement>) => {
    const bookmark = await addBookmark.submit(event, {
      onMissingTitle: () => titleInputRef.current?.focus(),
      onMissingUrl: () => urlInputRef.current?.focus(),
    })
    if (bookmark) closeAddBookmarkModal(true)
  }

  const selectTheme = (id: string, currentTarget: HTMLElement, clientX: number, clientY: number) => {
    const rect = currentTarget.getBoundingClientRect()
    const x = clientX || rect.left + rect.width / 2
    const y = clientY || rect.top + rect.height / 2
    setTheme(id, { x, y })
    setShowTheme(false)
  }

  return (
    <>
      <div className="flex items-center gap-1 px-5 py-2 h-12 bg-app-card shadow-app-base z-10 relative">
        <Breadcrumb />
        <div className="flex-1" />
        <Button variant="ghost" onClick={() => setShowAddBookmark(true)}>
          <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M9.1 2.9a1 1 0 011.8 0l1.93 3.91 4.31.63a1 1 0 01.56 1.7l-.55.54a5.47 5.47 0 00-1-.43l.85-.82-4.32-.63a1 1 0 01-.75-.55L10 3.35l-1.93 3.9a1 1 0 01-.75.55L3 8.43l3.12 3.04a1 1 0 01.29.89l-.74 4.3 3.34-1.76c.03.36.09.7.18 1.04l-3.05 1.6a1 1 0 01-1.45-1.05l.73-4.3L2.3 9.14a1 1 0 01.56-1.7l4.31-.63L9.1 2.9z"/>
            <path d="M19 14.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z"/>
          </svg>
          <span>添加收藏夹</span>
        </Button>
        <Button variant="ghost" onClick={() => setShowCreateFolder(true)}>
          <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M4.5 3A2.5 2.5 0 002 5.5v9A2.5 2.5 0 004.5 17h5.1c-.16-.32-.3-.65-.4-1H4.5A1.5 1.5 0 013 14.5v-7h4.07c.41 0 .8-.17 1.09-.47L9.62 5.5h5.88c.83 0 1.5.67 1.5 1.5v2.6c.36.18.7.4 1 .66V7a2.5 2.5 0 00-2.5-2.5H9.67l-1.6-1.2a1.5 1.5 0 00-.9-.3H4.5zM3 5.5C3 4.67 3.67 4 4.5 4h2.67c.1 0 .21.04.3.1l1.22.92-1.26 1.32a.5.5 0 01-.36.16H3v-1zm16 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z" fillRule="nonzero"/>
          </svg>
          <span>添加文件夹</span>
        </Button>
        <div style={{ position: 'relative' }}>
          <Button variant="ghost" onClick={() => setShowFontSize(!showFontSize)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <text x="3" y="15" fontFamily="serif" fontSize="14" fontWeight="bold">A</text>
              <text x="11" y="13" fontFamily="serif" fontSize="9">A</text>
            </svg>
            <span>字号</span>
          </Button>
          {showFontSize && <FontSizePopover onClose={() => setShowFontSize(false)} />}
        </div>
        <div style={{ position: 'relative' }}>
          <Button variant="ghost" onClick={() => setShowTheme(!showTheme)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10" />
              <path d="M12 2a15.3 15.3 0 00-4 10 15.3 15.3 0 004 10" />
              <path d="M2 12h20" />
            </svg>
            <span>主题</span>
          </Button>
          {showTheme && (
            <div ref={themeRef}>
              <ThemeMenu themeId={themeId} onSelectTheme={selectTheme} />
            </div>
          )}
        </div>
        <Button variant="ghost" onClick={logout}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>退出</span>
        </Button>
        <MoreMenu />
      </div>

      {showAddBookmark && (
        <ModalBase title="添加收藏夹" onClose={closeAddBookmarkModal} width="360px" closeOnEscape={!addBookmark.saving} closeOnOverlayClick={false}>
          <form onSubmit={handleAddBookmark}>
            <input
              ref={titleInputRef}
              value={addBookmark.title}
              onChange={e => handleTitleChange(e.target.value)}
              disabled={addBookmark.saving}
              placeholder={addBookmark.fetchingTitle ? "正在获取标题…" : "名称"}
              aria-label="收藏夹名称"
              aria-invalid={Boolean(addBookmark.titleError)}
              className={`w-full h-9 px-3 rounded outline-none ${addBookmark.titleError ? 'mb-1' : 'mb-3'} bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]`}
              style={{ border: addBookmark.titleError ? '1px solid var(--app-danger)' : 'var(--input-border)' }}
            />
            {addBookmark.titleError && (
              <div className="text-sm mb-3 text-app-danger">
                {addBookmark.titleError}
              </div>
            )}
            <input
              ref={urlInputRef}
              value={addBookmark.url}
              onChange={e => handleUrlChange(e.target.value)}
              disabled={addBookmark.saving}
              placeholder="URL"
              aria-label="收藏夹 URL"
              aria-invalid={Boolean(addBookmark.urlError || addBookmark.duplicateUrlError)}
              className="w-full h-9 px-3 rounded outline-none mb-1 bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]"
              style={{ border: addBookmark.urlError || addBookmark.duplicateUrlError ? '1px solid var(--app-danger)' : 'var(--input-border)' }}
            />
            <div className="text-sm mb-3 min-h-5 text-app-danger">
              {addBookmark.urlError || addBookmark.duplicateUrlError || '\u00a0'}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => closeAddBookmarkModal()} disabled={addBookmark.saving}>取消</Button>
              <Button variant="primary" type="submit" loading={addBookmark.saving} disabled={addBookmark.saving || !addBookmark.title.trim() || !addBookmark.url.trim()}>添加</Button>
            </div>
          </form>
        </ModalBase>
      )}

      {showCreateFolder && <CreateFolderModal parentId={selectedId} onClose={() => setShowCreateFolder(false)} />}
    </>
  )
}

