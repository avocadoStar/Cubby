import { useState, useRef } from 'react'
import ModalBase from '../ModalBase'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { api, ConflictError } from '../../services/api'
import CreateFolderModal from '../CreateFolderModal'
import ImportModal from '../ImportModal'
import MobileActionMenu from './MobileActionMenu'

export default function MobileNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { selectedId } = useFolderStore()
  const { load } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [duplicateUrlError, setDuplicateUrlError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const closeAddBookmark = () => {
    clearTimeout(urlTimer.current)
    setShowAddBookmark(false)
    setTitle(''); setUrl(''); setIcon('')
    setDuplicateUrlError(''); setFetchingTitle(false)
  }

  const handleUrlChange = (value: string) => {
    setIcon(''); setDuplicateUrlError(''); setUrl(value)
    if (value && !/^https?:\/\//i.test(value) && value.includes('.')) {
      setUrl('https://' + value)
    }
  }

  // Auto-fetch title
  const prevUrlRef = useRef('')
  if (url !== prevUrlRef.current) {
    prevUrlRef.current = url
    if (url.trim() && /^https?:\/\//i.test(url.trim())) {
      clearTimeout(urlTimer.current)
      const currentUrl = url
      urlTimer.current = setTimeout(async () => {
        setFetchingTitle(true)
        try {
          const meta = await api.fetchMetadata(currentUrl.trim())
          setTitle(prev => prev ? prev : meta.title)
          setIcon(meta.icon ?? '')
        } catch { /* ignore */ }
        setFetchingTitle(false)
      }, 600)
    }
  }

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
    closeAddBookmark()
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
          onAddBookmark={() => setShowAddBookmark(true)}
          onCreateFolder={() => setShowCreateFolder(true)}
          onImport={() => setShowImport(true)}
          onExport={handleExport}
          onSettings={onOpenSettings}
          onLogout={logout}
        />
      </div>

      {showAddBookmark && (
        <ModalBase title="添加收藏夹" onClose={closeAddBookmark} width="340px" closeOnEscape>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={fetchingTitle ? '正在获取标题…' : '名称'}
            style={{
              width: '100%', height: 36, padding: '0 12px', borderRadius: 8,
              border: 'var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--app-text)', fontSize: 14, outline: 'none', marginBottom: 12,
            }} />
          <input value={url} onChange={e => handleUrlChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBookmark()}
            placeholder="URL"
            style={{
              width: '100%', height: 36, padding: '0 12px', borderRadius: 8,
              border: 'var(--input-border)', background: 'var(--input-bg)',
              color: 'var(--app-text)', fontSize: 14, outline: 'none',
              marginBottom: duplicateUrlError ? 6 : 16,
            }} />
          {duplicateUrlError && (
            <div style={{ fontSize: 13, color: 'var(--app-danger)', marginBottom: 12 }}>{duplicateUrlError}</div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAddBookmark} style={{
              height: 32, padding: '0 16px', borderRadius: 8, fontSize: 13,
              border: 'var(--input-border)', background: 'var(--app-card)',
              color: 'var(--app-text)', cursor: 'pointer',
            }}>取消</button>
            <button onClick={handleAddBookmark} disabled={!title.trim() || !url.trim()} style={{
              height: 32, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              border: 'none', background: 'var(--app-accent)', color: '#fff',
              cursor: 'pointer', opacity: (!title.trim() || !url.trim()) ? 0.5 : 1,
            }}>添加</button>
          </div>
          <div style={{ marginTop: 12, borderTop: '1px solid var(--divider-color)', paddingTop: 12 }}>
            <button onClick={() => { closeAddBookmark(); setShowCreateFolder(true) }} style={{
              width: '100%', height: 36, borderRadius: 8, fontSize: 13,
              border: '1px solid var(--app-border)', background: 'var(--app-card)',
              color: 'var(--app-text)', cursor: 'pointer',
            }}>+ 新建文件夹</button>
          </div>
        </ModalBase>
      )}

      {showCreateFolder && (
        <CreateFolderModal parentId={selectedId} onClose={() => setShowCreateFolder(false)} />
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}
