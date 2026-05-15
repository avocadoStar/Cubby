import { useState } from 'react'
import ModalBase from '../ModalBase'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { api } from '../../services/api'
import ImportModal from '../ImportModal'
import MobileActionMenu from './MobileActionMenu'
import { useAddBookmarkFlow } from '../../hooks/useAddBookmarkFlow'

export type MobileAddMode = 'bookmark' | 'folder'

const mergeMobileFetchedTitle = (currentTitle: string, fetchedTitle: string | null | undefined) =>
  currentTitle ? currentTitle : fetchedTitle ?? ''

interface MobileAddModalProps {
  mode: MobileAddMode
  title: string
  url: string
  folderName: string
  fetchingTitle: boolean
  saving: boolean
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
  saving,
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
  const canSubmit = !saving && (isBookmark ? Boolean(title.trim() && url.trim()) : Boolean(folderName.trim()))
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
    cursor: saving ? 'default' : 'pointer',
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
    <ModalBase title="添加" onClose={onClose} width="340px" closeOnEscape={!saving}>
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
          <button type="button" aria-pressed={isBookmark} disabled={saving} onClick={() => onModeChange('bookmark')} style={tabStyle(isBookmark)}>
            书签
          </button>
          <button type="button" aria-pressed={!isBookmark} disabled={saving} onClick={() => onModeChange('folder')} style={tabStyle(!isBookmark)}>
            文件夹
          </button>
        </div>

        {isBookmark ? (
          <>
            <input
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              disabled={saving}
              placeholder={fetchingTitle ? '正在获取标题…' : '名称'}
              aria-label="名称"
              style={{ ...fieldStyle, marginBottom: 12 }}
            />
            <input
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              disabled={saving}
              placeholder="URL"
              aria-label="URL"
              style={{ ...fieldStyle, marginBottom: 6 }}
            />
            <div style={{ fontSize: 13, color: 'var(--app-danger)', minHeight: 18, marginBottom: 12 }}>
              {duplicateUrlError || '\u00a0'}
            </div>
          </>
        ) : (
          <input
            value={folderName}
            onChange={e => onFolderNameChange(e.target.value)}
            disabled={saving}
            placeholder="文件夹名称"
            aria-label="文件夹名称"
            style={{ ...fieldStyle, marginBottom: 16 }}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={() => onClose()} disabled={saving} style={{
            height: 32, minWidth: 72, padding: '0 16px', borderRadius: 8, fontSize: 13,
            border: 'var(--input-border)', background: 'var(--app-card)',
            color: 'var(--app-text)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1,
          }}>取消</button>
          <button type="submit" disabled={!canSubmit} style={{
            height: 32, minWidth: 88, padding: '0 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: 'none', background: 'var(--app-accent)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            cursor: saving ? 'default' : 'pointer', opacity: canSubmit ? 1 : 0.5,
          }}>
            {saving && (
              <span style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                animation: 'spin 1s linear infinite',
              }} />
            )}
            <span>{isBookmark ? '添加' : '创建'}</span>
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

export default function MobileNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { selectedId, create } = useFolderStore()
  const { upsertOne } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addMode, setAddMode] = useState<MobileAddMode>('bookmark')
  const [folderName, setFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)
  const addBookmark = useAddBookmarkFlow({
    selectedId,
    upsertOne,
    mergeFetchedTitle: mergeMobileFetchedTitle,
  })
  const savingAdd = addMode === 'bookmark' ? addBookmark.saving : savingFolder

  const closeAddModal = (force = false) => {
    if (savingAdd && !force) return
    addBookmark.reset(true)
    setShowAddBookmark(false)
    setAddMode('bookmark')
    setFolderName('')
    setSavingFolder(false)
  }

  const handleAddModeChange = (mode: MobileAddMode) => {
    if (savingAdd) return
    if (mode === 'folder') {
      addBookmark.clearTransient()
    }
    setAddMode(mode)
  }

  const handleUrlChange = (value: string) => {
    addBookmark.handleUrlChange(value)
  }

  const handleAddBookmark = async () => {
    const bookmark = await addBookmark.submit()
    if (bookmark) closeAddModal(true)
  }

  const handleCreateFolder = async () => {
    if (savingAdd) return
    if (!folderName.trim()) return
    setSavingFolder(true)
    try {
      await create(folderName.trim(), selectedId)
      closeAddModal(true)
    } catch (e) {
      setSavingFolder(false)
      throw e
    }
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
          title={addBookmark.title}
          url={addBookmark.url}
          folderName={folderName}
          fetchingTitle={addBookmark.fetchingTitle}
          saving={savingAdd}
          duplicateUrlError={addBookmark.duplicateUrlError}
          onModeChange={handleAddModeChange}
          onTitleChange={addBookmark.setTitle}
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
