import { useState, useEffect, useRef } from 'react'
import Breadcrumb from './Breadcrumb'
import MoreMenu from './MoreMenu'
import { useFolderStore } from '../stores/folderStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { themes } from '../lib/themes'
import { api, ConflictError } from '../services/api'
import CreateFolderModal from './CreateFolderModal'
import FontSizePopover from './FontSizePopover'
import ModalBase from './ModalBase'

export default function Toolbar() {
  const { selectedId } = useFolderStore()
  const { load } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const { themeId, setTheme } = useThemeStore()
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showTheme, setShowTheme] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [duplicateUrlError, setDuplicateUrlError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const themeRef = useRef<HTMLDivElement>(null)

  const closeAddBookmarkModal = () => {
    clearTimeout(urlTimer.current)
    setShowAddBookmark(false)
    setTitle('')
    setUrl('')
    setIcon('')
    setDuplicateUrlError('')
    setFetchingTitle(false)
  }

  // Auto-fetch title when URL changes
  useEffect(() => {
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) return
    clearTimeout(urlTimer.current)
    urlTimer.current = setTimeout(async () => {
      setFetchingTitle(true)
      try {
        const meta = await api.fetchMetadata(url.trim())
        setTitle(prev => prev ? prev : meta.title)
        setIcon(meta.icon ?? '')
      } catch { /* ignore fetch errors */ }
      setFetchingTitle(false)
    }, 600)
    return () => clearTimeout(urlTimer.current)
  }, [url])

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
    setIcon('')
    setDuplicateUrlError('')
    setUrl(value)
    if (value && !/^https?:\/\//i.test(value) && value.includes('.')) {
      setUrl('https://' + value)
      return
    }
  }

  const handleAddBookmark = async () => {
    if (!title.trim() || !url.trim()) return
    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl
    }
    try {
      await api.createBookmark(title.trim(), normalizedUrl, selectedId, icon)
    } catch (e) {
      if (e instanceof ConflictError && e.message === '已存在') {
        setDuplicateUrlError('已存在')
        return
      }
      throw e
    }
    await load(selectedId)
    closeAddBookmarkModal()
  }

  return (
    <>
      <div className="flex items-center gap-1 px-5 py-2 h-12 bg-app-card shadow-app-base z-10 relative">
        <Breadcrumb />
        <div className="flex-1" />
        <button
          className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-body cursor-default text-app-text hover:bg-app-hover"
          onClick={() => setShowAddBookmark(true)}
        >
          <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M9.1 2.9a1 1 0 011.8 0l1.93 3.91 4.31.63a1 1 0 01.56 1.7l-.55.54a5.47 5.47 0 00-1-.43l.85-.82-4.32-.63a1 1 0 01-.75-.55L10 3.35l-1.93 3.9a1 1 0 01-.75.55L3 8.43l3.12 3.04a1 1 0 01.29.89l-.74 4.3 3.34-1.76c.03.36.09.7.18 1.04l-3.05 1.6a1 1 0 01-1.45-1.05l.73-4.3L2.3 9.14a1 1 0 01.56-1.7l4.31-.63L9.1 2.9z"/>
            <path d="M19 14.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z"/>
          </svg>
          <span>添加收藏夹</span>
        </button>
        <button
          className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-body cursor-default text-app-text hover:bg-app-hover"
          onClick={() => setShowCreateFolder(true)}
        >
          <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M4.5 3A2.5 2.5 0 002 5.5v9A2.5 2.5 0 004.5 17h5.1c-.16-.32-.3-.65-.4-1H4.5A1.5 1.5 0 013 14.5v-7h4.07c.41 0 .8-.17 1.09-.47L9.62 5.5h5.88c.83 0 1.5.67 1.5 1.5v2.6c.36.18.7.4 1 .66V7a2.5 2.5 0 00-2.5-2.5H9.67l-1.6-1.2a1.5 1.5 0 00-.9-.3H4.5zM3 5.5C3 4.67 3.67 4 4.5 4h2.67c.1 0 .21.04.3.1l1.22.92-1.26 1.32a.5.5 0 01-.36.16H3v-1zm16 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z" fillRule="nonzero"/>
          </svg>
          <span>添加文件夹</span>
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-body cursor-default text-app-text hover:bg-app-hover"
            onClick={() => setShowFontSize(!showFontSize)}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <text x="3" y="15" fontFamily="serif" fontSize="14" fontWeight="bold">A</text>
              <text x="11" y="13" fontFamily="serif" fontSize="9">A</text>
            </svg>
            <span>字号</span>
          </button>
          {showFontSize && <FontSizePopover onClose={() => setShowFontSize(false)} />}
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-body cursor-default text-app-text hover:bg-app-hover"
            onClick={() => setShowTheme(!showTheme)}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10" />
              <path d="M12 2a15.3 15.3 0 00-4 10 15.3 15.3 0 004 10" />
              <path d="M2 12h20" />
            </svg>
            <span>主题</span>
          </button>
          {showTheme && (
            <div
              ref={themeRef}
              className="absolute right-0 top-full mt-2 z-50 p-3 bg-app-card border border-app-border rounded-card shadow-app-lg w-[200px]"
            >
              <div className="text-body font-medium mb-2 text-app-text">主题</div>
              {themes.map(t => (
                <button
                  key={t.id}
                  className="flex items-center gap-2 w-full h-9 px-2.5 rounded text-body cursor-default border-none bg-transparent text-app-text hover:bg-app-hover"
                  onClick={() => { setTheme(t.id); setShowTheme(false) }}
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
                  {themeId === t.id && (
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-body cursor-default text-app-text hover:bg-app-hover"
          onClick={logout}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>退出</span>
        </button>
        <MoreMenu />
      </div>

      {showAddBookmark && (
        <ModalBase title="添加收藏夹" onClose={closeAddBookmarkModal} width="360px" closeOnEscape>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={fetchingTitle ? "正在获取标题…" : "名称"}
            aria-label="收藏夹名称"
            className="w-full h-9 px-3 rounded outline-none mb-3 bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]"
            style={{ border: 'var(--input-border)' }}
          />
          <input
            value={url}
            onChange={e => handleUrlChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBookmark()}
            placeholder="URL"
            aria-label="收藏夹 URL"
            className={`w-full h-9 px-3 rounded outline-none ${duplicateUrlError ? 'mb-2' : 'mb-4'} bg-input-bg text-app-text shadow-input-base transition-shadow text-sm focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-text2)]`}
            style={{ border: 'var(--input-border)' }}
          />
          {duplicateUrlError && (
            <div className="text-sm mb-4 text-app-danger">
              {duplicateUrlError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={closeAddBookmarkModal}
              className="h-8 px-4 rounded text-sm cursor-default bg-app-card text-app-text shadow-app-base"
              style={{ border: 'var(--input-border)' }}>
              取消
            </button>
            <button onClick={handleAddBookmark} disabled={!title.trim() || !url.trim()}
              className="h-8 px-4 border-none rounded text-sm font-medium cursor-default disabled:opacity-50 bg-app-accent text-text-on-accent shadow-app-base">
              添加
            </button>
          </div>
        </ModalBase>
      )}

      {showCreateFolder && <CreateFolderModal parentId={selectedId} onClose={() => setShowCreateFolder(false)} />}
    </>
  )
}

