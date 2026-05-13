import { useEffect, useRef, useState } from 'react'
import ModalBase from '../ModalBase'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { api, ConflictError } from '../../services/api'
import ImportModal from '../ImportModal'
import MobileActionMenu from './MobileActionMenu'
import { shouldFetchMetadata } from '../../lib/metadata'

export type MobileAddMode = 'bookmark' | 'folder'

interface MobileAddModalProps {
  mode: MobileAddMode
  title: string
  url: string
  folderName: string
  fetchingTitle: boolean
  duplicateUrlError: string
  onModeChange: (mode: MobileAddMode) => void
  onTitleChange: (value: string) => void
  onUrlChange: (value: string) => void
  onFolderNameChange: (value: string) => void
  onClose: () => void
  onSubmitBookmark: () => void
  onSubmitFolder: () => void
}

export function MobileAddModal({
  mode,
  title,
  url,
  folderName,
  fetchingTitle,
  duplicateUrlError,
  onModeChange,
  onTitleChange,
  onUrlChange,
  onFolderNameChange,
  onClose,
  onSubmitBookmark,
  onSubmitFolder,
}: MobileAddModalProps) {
  const isBookmark = mode === 'bookmark'
  const canSubmit = isBookmark ? Boolean(title.trim() && url.trim()) : Boolean(folderName.trim())
  const fieldStyle = {
    width: '100%',
    height: 38,
    padding: '0 12px',
    borderRadius: 8,
    border: 'var(--input-border)',
    background: 'var(--input-bg)',
    color: 'var(--app-text)',
    fontSize: 14,
    outline: 'none',
  }

  const tabStyle = (active: boolean) => ({
    flex: 1,
    height: 34,
    borderRadius: 7,
    border: 'none',
    background: active ? 'var(--app-card)' : 'transparent',
    color: active ? 'var(--app-text)' : 'var(--app-text2)',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    if (isBookmark) onSubmitBookmark()
    else onSubmitFolder()
  }

  return (
    <ModalBase title="添加" onClose={onClose} width="340px" closeOnEscape>
      <form onSubmit={handleSubmit}>
        <div
          role="group"
          aria-label="添加类型"
          style={{
            display: 'flex',
            gap: 4,
            padding: 3,
            borderRadius: 10,
            background: 'var(--app-hover)',
            marginBottom: 16,
          }}
        >
          <button type="button" aria-pressed={isBookmark} onClick={() => onModeChange('bookmark')} style={tabStyle(isBookmark)}>
            书签
          </button>
          <button type="button" aria-pressed={!isBookmark} onClick={() => onModeChange('folder')} style={tabStyle(!isBookmark)}>
            文件夹
          </button>
        </div>

        {isBookmark ? (
          <>
            <input
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder={fetchingTitle ? '正在获取标题…' : '名称'}
              aria-label="名称"
              style={{ ...fieldStyle, marginBottom: 12 }}
            />
            <input
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="URL"
              aria-label="URL"
              style={{ ...fieldStyle, marginBottom: duplicateUrlError ? 6 : 16 }}
            />
            {duplicateUrlError && (
              <div style={{ fontSize: 13, color: 'var(--app-danger)', marginBottom: 12 }}>{duplicateUrlError}</div>
            )}
          </>
        ) : (
          <input
            value={folderName}
            onChange={e => onFolderNameChange(e.target.value)}
            placeholder="文件夹名称"
            aria-label="文件夹名称"
            style={{ ...fieldStyle, marginBottom: 16 }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{
            height: 32, padding: '0 16px', borderRadius: 8, fontSize: 13,
            border: 'var(--input-border)', background: 'var(--app-card)',
            color: 'var(--app-text)', cursor: 'pointer',
          }}>取消</button>
          <button type="submit" disabled={!canSubmit} style={{
            height: 32, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: 'none', background: 'var(--app-accent)', color: '#fff',
            cursor: 'pointer', opacity: canSubmit ? 1 : 0.5,
          }}>添加</button>
        </div>
      </form>
    </ModalBase>
  )
}

export default function MobileNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { selectedId, create } = useFolderStore()
  const { load } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addMode, setAddMode] = useState<MobileAddMode>('bookmark')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [folderName, setFolderName] = useState('')
  const [duplicateUrlError, setDuplicateUrlError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const closeAddModal = () => {
    clearTimeout(urlTimer.current)
    setShowAddBookmark(false)
    setAddMode('bookmark')
    setTitle(''); setUrl(''); setIcon('')
    setFolderName('')
    setDuplicateUrlError(''); setFetchingTitle(false)
  }

  const handleAddModeChange = (mode: MobileAddMode) => {
    if (mode === 'folder') {
      clearTimeout(urlTimer.current)
      setFetchingTitle(false)
      setDuplicateUrlError('')
    }
    setAddMode(mode)
  }

  const handleUrlChange = (value: string) => {
    setIcon('')
    setDuplicateUrlError('')
    const normalized = value && !/^https?:\/\//i.test(value) && value.includes('.')
      ? 'https://' + value
      : value
    setUrl(normalized)
  }

  useEffect(() => {
    const trimmedUrl = url.trim()
    clearTimeout(urlTimer.current)
    if (!shouldFetchMetadata(trimmedUrl)) {
      setFetchingTitle(false)
      return
    }

    let cancelled = false
    urlTimer.current = setTimeout(async () => {
      setFetchingTitle(true)
      try {
        const meta = await api.fetchMetadata(trimmedUrl)
        if (cancelled) return
        setTitle(prev => prev ? prev : meta.title)
        setIcon(meta.icon ?? '')
      } catch {
        // Metadata is optional; users can still add the bookmark manually.
      } finally {
        if (!cancelled) setFetchingTitle(false)
      }
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(urlTimer.current)
    }
  }, [url])

  const handleAddBookmark = async () => {
    if (!title.trim() || !url.trim()) return
    let normalizedUrl = url.trim()
    if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl
    try {
      await api.createBookmark(title.trim(), normalizedUrl, selectedId, icon)
    } catch (e) {
      if (e instanceof ConflictError && e.message === '已存在') {
        setDuplicateUrlError('已存在'); return
      }
      throw e
    }
    await load(selectedId)
    closeAddModal()
  }

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return
    await create(folderName.trim(), selectedId)
    closeAddModal()
  }

  const handleExport = async () => {
    try {
      const blob = await api.exportBookmarks()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl; a.download = 'bookmarks.html'; a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      useToastStore.getState().show({
        message: e instanceof Error && e.message ? e.message : '导出失败',
      })
    }
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', paddingTop: 28,
        background: 'var(--app-card)',
        borderBottom: '1px solid var(--divider-color)',
        flexShrink: 0,
        position: 'relative',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--app-accent)', letterSpacing: 1 }}>
          CUBBY
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowAddBookmark(true)} style={{
            width: 36, height: 36, borderRadius: 8,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--app-accent)', color: '#fff',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button onClick={() => setShowMenu(prev => !prev)} style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid var(--app-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            background: 'var(--app-card)', color: 'var(--app-text2)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        <MobileActionMenu
          open={showMenu}
          onClose={() => setShowMenu(false)}
          onImport={() => setShowImport(true)}
          onExport={handleExport}
          onSettings={onOpenSettings}
          onLogout={logout}
        />
      </div>

      {showAddBookmark && (
        <MobileAddModal
          mode={addMode}
          title={title}
          url={url}
          folderName={folderName}
          fetchingTitle={fetchingTitle}
          duplicateUrlError={duplicateUrlError}
          onModeChange={handleAddModeChange}
          onTitleChange={setTitle}
          onUrlChange={handleUrlChange}
          onFolderNameChange={setFolderName}
          onClose={closeAddModal}
          onSubmitBookmark={handleAddBookmark}
          onSubmitFolder={handleCreateFolder}
        />
      )}

      {showImport && <ImportModal width="320px" compact onClose={() => setShowImport(false)} />}
    </>
  )
}
