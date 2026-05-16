import { useState } from 'react'
import ModalBase from '../ModalBase'
import Input from '../Input'
import { useFolderStore } from '../../stores/folderStore'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useAuthStore } from '../../stores/authStore'
import ImportModal from '../ImportModal'
import MobileActionMenu from './MobileActionMenu'
import { useAddBookmarkFlow } from '../../hooks/useAddBookmarkFlow'
import { useCreateFolder } from '../../hooks/useCreateFolder'
import { exportBookmarks } from '../../hooks/useExportFlow'

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
          className="flex gap-1 p-[3px] rounded-input bg-app-hover mb-4"
        >
          <button
            type="button"
            aria-pressed={isBookmark}
            disabled={saving}
            onClick={() => onModeChange('bookmark')}
            className="flex-1 h-[34px] rounded-button bg-transparent text-app-text2 text-sm font-normal cursor-pointer"
            style={{
              background: isBookmark ? 'var(--app-card)' : 'transparent',
              color: isBookmark ? 'var(--app-text)' : 'var(--app-text2)',
              fontWeight: isBookmark ? 600 : 400,
              cursor: saving ? 'default' : 'pointer',
              boxShadow: isBookmark ? 'var(--shadow-sm)' : 'none',
              transition: `background var(--motion-duration-fast) var(--motion-easing-standard), color var(--motion-duration-fast) var(--motion-easing-standard), box-shadow var(--motion-duration-fast) var(--motion-easing-standard)`,
            }}
          >
            书签
          </button>
          <button
            type="button"
            aria-pressed={!isBookmark}
            disabled={saving}
            onClick={() => onModeChange('folder')}
            className="flex-1 h-[34px] rounded-button bg-transparent text-app-text2 text-sm font-normal cursor-pointer"
            style={{
              background: !isBookmark ? 'var(--app-card)' : 'transparent',
              color: !isBookmark ? 'var(--app-text)' : 'var(--app-text2)',
              fontWeight: !isBookmark ? 600 : 400,
              cursor: saving ? 'default' : 'pointer',
              boxShadow: !isBookmark ? 'var(--shadow-sm)' : 'none',
              transition: `background var(--motion-duration-fast) var(--motion-easing-standard), color var(--motion-duration-fast) var(--motion-easing-standard), box-shadow var(--motion-duration-fast) var(--motion-easing-standard)`,
            }}
          >
            文件夹
          </button>
        </div>

        {isBookmark ? (
          <>
            <Input
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              disabled={saving}
              placeholder={fetchingTitle ? '正在获取标题…' : '名称'}
              aria-label="名称"
              className="h-[38px] mb-3"
            />
            <Input
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              disabled={saving}
              placeholder="URL"
              aria-label="URL"
              className="h-[38px] mb-1.5"
            />
            <div className="text-[13px] text-app-danger min-h-[18px] mb-3">
              {duplicateUrlError || ' '}
            </div>
          </>
        ) : (
          <Input
            value={folderName}
            onChange={e => onFolderNameChange(e.target.value)}
            disabled={saving}
            placeholder="文件夹名称"
            aria-label="文件夹名称"
            className="h-[38px]"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose()}
            disabled={saving}
            className="h-8 min-w-[72px] px-4 rounded-button text-[13px] border-input-border bg-app-card text-app-text"
            style={{ cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.5 : 1 }}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-8 min-w-[88px] px-4 rounded-button text-[13px] font-medium border-none bg-app-accent text-text-on-accent inline-flex items-center justify-center gap-1.5"
            style={{ cursor: saving ? 'default' : 'pointer', opacity: canSubmit ? 1 : 0.5 }}
          >
            {saving && (
              <span className="w-3 h-3 rounded-[var(--radius-pill)] border-2 border-current border-t-transparent animate-[spin_1s_linear_infinite]" />
            )}
            <span>{isBookmark ? '添加' : '创建'}</span>
          </button>
        </div>
      </form>
    </ModalBase>
  )
}

export default function MobileNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { selectedId } = useFolderStore()
  const { upsertOne } = useBookmarkStore()
  const logout = useAuthStore(s => s.logout)
  const [showMenu, setShowMenu] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [addMode, setAddMode] = useState<MobileAddMode>('bookmark')
  const addBookmark = useAddBookmarkFlow({
    selectedId,
    upsertOne,
    mergeFetchedTitle: mergeMobileFetchedTitle,
  })
  const addFolder = useCreateFolder(selectedId, () => closeAddModal(true))
  const savingAdd = addMode === 'bookmark' ? addBookmark.saving : addFolder.saving

  const closeAddModal = (force = false) => {
    if (savingAdd && !force) return
    addBookmark.reset(true)
    setShowAddBookmark(false)
    setAddMode('bookmark')
    addFolder.reset()
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

  const handleExport = exportBookmarks

  return (
    <>
      <div className="flex items-center justify-between px-3 pt-7 pb-2 bg-app-card border-b border-divider shrink-0 relative">
        <span className="text-base font-bold text-app-accent tracking-[1px]">
          CUBBY
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setShowAddBookmark(true)}
            className="w-9 h-9 rounded-button border-none flex items-center justify-center cursor-pointer bg-app-accent text-text-on-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={() => setShowMenu(prev => !prev)}
            className="w-9 h-9 rounded-button border border-app-border flex items-center justify-center cursor-pointer bg-app-card text-app-text2"
          >
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
          folderName={addFolder.folderName}
          fetchingTitle={addBookmark.fetchingTitle}
          saving={savingAdd}
          duplicateUrlError={addBookmark.duplicateUrlError}
          onModeChange={handleAddModeChange}
          onTitleChange={addBookmark.setTitle}
          onUrlChange={handleUrlChange}
          onFolderNameChange={addFolder.setFolderName}
          onClose={closeAddModal}
          onSubmitBookmark={handleAddBookmark}
          onSubmitFolder={addFolder.createFolder}
        />
      )}

      {showImport && <ImportModal width="320px" compact onClose={() => setShowImport(false)} />}
    </>
  )
}
