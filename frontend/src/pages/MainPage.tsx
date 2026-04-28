import { motion } from 'framer-motion'
import { useDeferredValue, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import * as api from '../services/api'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Surface } from '../components/ui/Surface'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import type { AISuggestion, Bookmark, BookmarkMutation, ImportResult } from '../types'
import { findFolderName, flattenFolders, getActionableFolderId, buildBookmarkParams } from '../utils/bookmarkFilters'
import { getErrorMessage } from '../utils/errors'

type BookmarkDraft = {
  description: string
  folderId: string
  id?: string
  isFavorite: boolean
  title: string
  url: string
}

type Notice = {
  tone: 'error' | 'success'
  message: string
} | null

const pseudoLabels: Record<string, { title: string; description: string }> = {
  recent: { title: '最近添加', description: '按最近加入时间排序，方便快速回看。' },
  favorites: { title: '我的收藏', description: '集中查看最常用、最值得反复打开的链接。' },
  unsorted: { title: '未分类', description: '这里是还没归档的内容，适合继续整理。' },
}

const emptyDraft: BookmarkDraft = {
  title: '',
  url: '',
  description: '',
  folderId: '',
  isFavorite: false,
}

export function MainPage() {
  const {
    result,
    loading,
    error,
    viewMode,
    lastParams,
    fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    toggleFavorite,
    setViewMode,
  } = useBookmarkStore()
  const { folders, selectedFolderId } = useFolderStore()
  const [searchQuery, setSearchQuery] = useState(lastParams.q ?? '')
  const [notice, setNotice] = useState<Notice>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [titleFetching, setTitleFetching] = useState(false)
  const [createDraft, setCreateDraft] = useState<BookmarkDraft>(emptyDraft)
  const [editDraft, setEditDraft] = useState<BookmarkDraft>(emptyDraft)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiApplying, setAiApplying] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const deferredQuery = useDeferredValue(searchQuery)
  const actionableFolderId = getActionableFolderId(selectedFolderId)
  const folderOptions = flattenFolders(folders)
  const selectionLabel = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.title ?? findFolderName(folders, selectedFolderId) ?? '当前视图'
    : '全部收藏'
  const selectionDescription = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.description ?? '当前文件夹上下文中的书签列表。'
    : '你的全部书签、收藏与灵感入口都在这里。'

  useEffect(() => {
    void fetchBookmarks(buildBookmarkParams(selectedFolderId, deferredQuery))
  }, [deferredQuery, fetchBookmarks, selectedFolderId])

  const bookmarkCount = result.items.length

  const openCreateModal = () => {
    setNotice(null)
    setCreateDraft({
      ...emptyDraft,
      folderId: actionableFolderId || '',
    })
    setCreateOpen(true)
  }

  const openEditModal = (bookmark: Bookmark) => {
    setNotice(null)
    setEditDraft({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description ?? '',
      folderId: bookmark.folder_id ?? '',
      isFavorite: bookmark.is_favorite,
    })
    setEditOpen(true)
  }

  const populateTitle = async (url: string, currentTitle: string, setter: (title: string) => void) => {
    if (!url.trim() || currentTitle.trim()) {
      return
    }

    setTitleFetching(true)
    try {
      const response = await api.fetchTitle(url.trim())
      if (response.title) {
        setter(response.title)
      }
    } catch {
      // Title fetching is a progressive enhancement. The user can still type it manually.
    } finally {
      setTitleFetching(false)
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!createDraft.url.trim()) {
      setNotice({ tone: 'error', message: '请先填写有效的链接地址。' })
      return
    }

    const payload: BookmarkMutation = {
      title: createDraft.title.trim() || createDraft.url.trim(),
      url: createDraft.url.trim(),
      description: createDraft.description.trim(),
      folder_id: createDraft.folderId || null,
      is_favorite: createDraft.isFavorite,
    }

    setSubmitting(true)
    try {
      await createBookmark(payload)
      setCreateOpen(false)
      setNotice({ tone: 'success', message: '书签已加入当前工作区。' })
      setCreateDraft(emptyDraft)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '添加书签失败') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editDraft.id) {
      return
    }

    setSubmitting(true)
    try {
      await updateBookmark(editDraft.id, {
        title: editDraft.title.trim() || editDraft.url.trim(),
        url: editDraft.url.trim(),
        description: editDraft.description.trim(),
        folder_id: editDraft.folderId || null,
        is_favorite: editDraft.isFavorite,
      })
      setEditOpen(false)
      setNotice({ tone: 'success', message: '书签信息已更新。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新书签失败') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setNotice(null)
    setImporting(true)
    try {
      const response = await api.importBookmarks(file)
      setImportResult(response)
      setNotice({ tone: 'success', message: '浏览器书签已导入。' })
      await fetchBookmarks(buildBookmarkParams(selectedFolderId, deferredQuery))
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '导入书签失败') })
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const handleAIReview = async () => {
    setAiOpen(true)
    setAiLoading(true)
    setNotice(null)

    try {
      const response = await api.aiOrganize(actionableFolderId ?? undefined)
      setAiSuggestions(response.suggestions ?? [])
    } catch (error: unknown) {
      setAiSuggestions([])
      setNotice({ tone: 'error', message: getErrorMessage(error, 'AI 整理建议获取失败') })
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIApply = async () => {
    setAiApplying(true)
    try {
      await api.aiOrganize(actionableFolderId ?? undefined, 'apply')
      await fetchBookmarks(buildBookmarkParams(selectedFolderId, deferredQuery))
      setNotice({ tone: 'success', message: 'AI 建议已应用到当前数据。' })
      setAiOpen(false)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '应用 AI 建议失败') })
    } finally {
      setAiApplying(false)
    }
  }

  const handleDelete = async (bookmarkId: string) => {
    try {
      await deleteBookmark(bookmarkId)
      setNotice({ tone: 'success', message: '书签已删除。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '删除书签失败') })
    }
  }

  const handleFavoriteToggle = async (bookmarkId: string) => {
    try {
      await toggleFavorite(bookmarkId)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新收藏状态失败') })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="surface-divider flex flex-col gap-5 px-5 py-5 lg:px-7 lg:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="status-pill">{selectionLabel}</span>
              <span className="rounded-full bg-white/8 px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)]">
                {result.total} 条
              </span>
            </div>
            <h1 className="text-[28px] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">{selectionLabel}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-tertiary)]">{selectionDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Button className="justify-center" leading="↓" onClick={() => setImportOpen(true)} variant="secondary">
              导入
            </Button>
            <Button className="justify-center" leading="✦" onClick={() => void handleAIReview()} variant="primary">
              AI 整理
            </Button>
            <Button className="col-span-2 justify-center sm:col-span-1" leading="+" onClick={openCreateModal} variant="ghost">
              添加书签
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-xl">
            <Input
              helper="支持标题、URL 和描述搜索，切换视图时会保留当前关键词。"
              label="搜索"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索标题、域名或备注"
              value={searchQuery}
            />
          </div>

          <div className="flex items-center gap-2 self-start">
            <Button
              className="min-w-[96px] justify-center"
              onClick={() => setViewMode('grid')}
              size="sm"
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            >
              网格
            </Button>
            <Button
              className="min-w-[96px] justify-center"
              onClick={() => setViewMode('list')}
              size="sm"
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
            >
              列表
            </Button>
          </div>
        </div>

        {notice ? (
          <Surface className="flex items-center justify-between gap-3 px-4 py-3" tone="subtle">
            <p className={`text-[13px] ${notice.tone === 'error' ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {notice.message}
            </p>
            <button
              className="text-[12px] text-[var(--text-quaternary)] transition hover:text-[var(--text-primary)]"
              onClick={() => setNotice(null)}
              type="button"
            >
              关闭
            </button>
          </Surface>
        ) : null}
      </div>

      <div className="scroll-fade min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7 lg:py-6">
        {error ? (
          <StatePanel
            action={
              <Button onClick={() => void fetchBookmarks(buildBookmarkParams(selectedFolderId, deferredQuery))} variant="primary">
                重新加载
              </Button>
            }
            description={error}
            title="书签列表暂时不可用"
          />
        ) : loading ? (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'lg:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
            {Array.from({ length: viewMode === 'grid' ? 6 : 4 }).map((_, index) => (
              <Surface className="animate-pulse p-5" key={index} tone="subtle">
                <div className="h-4 w-24 rounded-full bg-white/12" />
                <div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" />
                <div className="mt-3 h-4 w-full rounded-full bg-white/8" />
                <div className="mt-2 h-4 w-2/3 rounded-full bg-white/8" />
              </Surface>
            ))}
          </div>
        ) : bookmarkCount === 0 ? (
          <StatePanel
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={openCreateModal} variant="primary">
                  立即添加
                </Button>
                <Button onClick={() => setImportOpen(true)} variant="secondary">
                  导入浏览器书签
                </Button>
              </div>
            }
            description="当前视图下还没有内容。你可以手动添加，也可以直接导入浏览器导出的书签文件。"
            title="这里还没有书签"
          />
        ) : (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1'}`}>
            {result.items.map((bookmark, index) => (
              <BookmarkCard
                bookmark={bookmark}
                folderName={bookmark.folder_id ? findFolderName(folders, bookmark.folder_id) : '未分类'}
                key={bookmark.id}
                onDelete={() => void handleDelete(bookmark.id)}
                onEdit={() => openEditModal(bookmark)}
                onFavorite={() => void handleFavoriteToggle(bookmark.id)}
                priorityIndex={index}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      <Modal onClose={() => setCreateOpen(false)} open={createOpen} title="添加书签" width="md">
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input
            label="链接地址"
            onBlur={() => void populateTitle(createDraft.url, createDraft.title, (title) => setCreateDraft((current) => ({ ...current, title })))}
            onChange={(event) => setCreateDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://example.com"
            value={createDraft.url}
          />
          <Input
            label="标题"
            onChange={(event) => setCreateDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="未填写时会尝试自动抓取"
            trailing={titleFetching ? <span className="text-[11px] text-[var(--accent)]">抓取中</span> : null}
            value={createDraft.title}
          />
          <Input
            label="备注"
            multiline
            onChange={(event) => setCreateDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="可选：补充用途、关键点或使用场景"
            value={createDraft.description}
          />
          <label className="block space-y-2">
            <span className="text-[12px] font-medium text-[var(--text-tertiary)]">归档位置</span>
            <select
              className="input-liquid h-12"
              onChange={(event) => setCreateDraft((current) => ({ ...current, folderId: event.target.value }))}
              value={createDraft.folderId}
            >
              <option value="">未分类</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {'　'.repeat(folder.depth)}
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-[18px] bg-white/6 px-4 py-3 text-[13px] text-[var(--text-secondary)]">
            <input
              checked={createDraft.isFavorite}
              className="h-4 w-4 accent-[var(--accent)]"
              onChange={(event) => setCreateDraft((current) => ({ ...current, isFavorite: event.target.checked }))}
              type="checkbox"
            />
            添加后立即标记为收藏
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setCreateOpen(false)} type="button" variant="secondary">
              取消
            </Button>
            <Button disabled={submitting} type="submit" variant="primary">
              {submitting ? '保存中…' : '保存书签'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal onClose={() => setEditOpen(false)} open={editOpen} title="编辑书签" width="md">
        <form className="space-y-4" onSubmit={handleSaveEdit}>
          <Input
            label="标题"
            onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
            value={editDraft.title}
          />
          <Input
            label="链接地址"
            onChange={(event) => setEditDraft((current) => ({ ...current, url: event.target.value }))}
            value={editDraft.url}
          />
          <Input
            label="备注"
            multiline
            onChange={(event) => setEditDraft((current) => ({ ...current, description: event.target.value }))}
            value={editDraft.description}
          />
          <label className="block space-y-2">
            <span className="text-[12px] font-medium text-[var(--text-tertiary)]">所在文件夹</span>
            <select
              className="input-liquid h-12"
              onChange={(event) => setEditDraft((current) => ({ ...current, folderId: event.target.value }))}
              value={editDraft.folderId}
            >
              <option value="">未分类</option>
              {folderOptions.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {'　'.repeat(folder.depth)}
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-[18px] bg-white/6 px-4 py-3 text-[13px] text-[var(--text-secondary)]">
            <input
              checked={editDraft.isFavorite}
              className="h-4 w-4 accent-[var(--accent)]"
              onChange={(event) => setEditDraft((current) => ({ ...current, isFavorite: event.target.checked }))}
              type="checkbox"
            />
            置顶到我的收藏
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setEditOpen(false)} type="button" variant="secondary">
              取消
            </Button>
            <Button disabled={submitting} type="submit" variant="primary">
              {submitting ? '保存中…' : '更新书签'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal onClose={() => setAiOpen(false)} open={aiOpen} title="AI 整理建议" width="lg">
        <div className="space-y-4">
          <p className="text-[13px] leading-6 text-[var(--text-tertiary)]">
            {actionableFolderId
              ? '这次会只针对当前文件夹给出建议，便于你在上下文里快速整理。'
              : '当前没有选中具体文件夹，AI 会基于全局书签给出整理建议。'}
          </p>

          <div className="scroll-fade max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {aiLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Surface className="animate-pulse p-4" key={index} tone="subtle">
                  <div className="h-4 w-2/5 rounded-full bg-white/12" />
                  <div className="mt-3 h-4 w-4/5 rounded-full bg-white/10" />
                  <div className="mt-2 h-4 w-full rounded-full bg-white/8" />
                </Surface>
              ))
            ) : aiSuggestions.length > 0 ? (
              aiSuggestions.map((suggestion) => (
                <Surface className="space-y-3 p-4" key={suggestion.bookmark_id} tone="subtle">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[15px] font-semibold text-[var(--text-primary)]">{suggestion.title}</div>
                      <div className="mt-1 text-[12px] text-[var(--accent)]">建议归档到 {suggestion.suggested_folder}</div>
                    </div>
                    <span className="rounded-full bg-[rgba(0,113,227,0.16)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-[13px] leading-6 text-[var(--text-tertiary)]">{suggestion.reason}</p>
                </Surface>
              ))
            ) : (
              <StatePanel
                description="AI 没有发现需要移动的项目，或者当前数据量还不足以形成建议。"
                title="这批书签已经很整齐了"
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={() => setAiOpen(false)} variant="secondary">
              关闭
            </Button>
            <Button disabled={aiLoading || aiApplying || aiSuggestions.length === 0} onClick={() => void handleAIApply()} variant="primary">
              {aiApplying ? '应用中…' : '全部应用'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        onClose={() => {
          setImportOpen(false)
          setImportResult(null)
        }}
        open={importOpen}
        title="导入浏览器书签"
        width="md"
      >
        <div className="space-y-4">
          <p className="text-[13px] leading-6 text-[var(--text-tertiary)]">
            支持 Chrome、Edge、Firefox 导出的 HTML 书签文件。重复 URL 会自动跳过，不会覆盖你现有的数据。
          </p>

          {importResult ? (
            <Surface className="space-y-3 p-5" tone="subtle">
              <div className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">导入完成</div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="新增书签" value={String(importResult.created)} />
                <MetricCard label="跳过重复" value={String(importResult.skipped)} />
              </div>
              <div className="text-[13px] leading-6 text-[var(--text-tertiary)]">
                {importResult.folders_created.length > 0
                  ? `创建的新文件夹：${importResult.folders_created.join('、')}`
                  : '没有额外创建新文件夹。'}
              </div>
            </Surface>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/12 bg-white/6 px-6 py-12 text-center transition hover:scale-[1.01] hover:bg-white/9">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--accent-soft)] text-[28px] text-[var(--accent)]">
                ↓
              </div>
              <div className="text-[16px] font-medium text-[var(--text-primary)]">{importing ? '正在导入…' : '选择 HTML 书签文件'}</div>
              <div className="max-w-sm text-[13px] leading-6 text-[var(--text-tertiary)]">点击后选择浏览器导出的书签文件，导入结果会在这里即时反馈。</div>
              <input accept=".html,.htm" className="hidden" onChange={(event) => void handleImport(event)} type="file" />
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={() => {
                setImportOpen(false)
                setImportResult(null)
              }}
              variant="secondary"
            >
              关闭
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function BookmarkCard({
  bookmark,
  folderName,
  onDelete,
  onEdit,
  onFavorite,
  priorityIndex,
  viewMode,
}: {
  bookmark: Bookmark
  folderName: string | null
  onDelete: () => void
  onEdit: () => void
  onFavorite: () => void
  priorityIndex: number
  viewMode: 'grid' | 'list'
}) {
  const hostname = formatHostname(bookmark.url)

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: Math.min(priorityIndex * 0.03, 0.24) }}
    >
      <Surface
        className="group relative h-full overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:[box-shadow:var(--shadow-float)]"
        tone="panel"
      >
        <div className={`flex gap-4 pr-[7.5rem] ${viewMode === 'list' ? 'items-start' : 'flex-col'}`}>
          <a
            className={`min-w-0 flex-1 ${viewMode === 'list' ? 'flex items-start gap-4' : 'block'}`}
            href={bookmark.url}
            rel="noreferrer"
            target="_blank"
          >
            <div
              className={`flex shrink-0 items-center justify-center rounded-[22px] ${
                viewMode === 'list' ? 'h-14 w-14' : 'mb-4 h-16 w-16'
              } bg-[linear-gradient(145deg,rgba(0,113,227,0.18),rgba(255,255,255,0.28))] text-[22px] text-[var(--accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]`}
            >
              {bookmark.favicon_url ? (
                <img alt="" className="h-8 w-8 rounded-[10px] object-cover" src={bookmark.favicon_url} />
              ) : (
                '↗'
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {bookmark.is_favorite ? <span className="status-pill">收藏</span> : null}
                {folderName ? <span className="status-pill">{folderName}</span> : null}
              </div>
              <div className="mt-3 text-[17px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{bookmark.title}</div>
              <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{hostname}</div>
              {bookmark.description ? (
                <p className="line-clamp-2 mt-3 text-[13px] leading-6 text-[var(--text-tertiary)]">{bookmark.description}</p>
              ) : (
                <p className="mt-3 text-[13px] leading-6 text-[var(--text-quaternary)]">暂无备注，点击卡片可以直接打开原始链接。</p>
              )}
            </div>
          </a>
        </div>

        <div className="absolute right-4 top-4 flex shrink-0 gap-2">
          <ActionButton label={bookmark.is_favorite ? '取消收藏' : '加入收藏'} onClick={onFavorite}>
            {bookmark.is_favorite ? '♥' : '♡'}
          </ActionButton>
          <ActionButton label="编辑书签" onClick={onEdit}>
            ✎
          </ActionButton>
          <ActionButton label="删除书签" onClick={onDelete}>
            ×
          </ActionButton>
        </div>
      </Surface>
    </motion.div>
  )
}

function ActionButton({ children, label, onClick }: { children: string; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="icon-button opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-4" tone="panel">
      <div className="text-[12px] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{value}</div>
    </Surface>
  )
}

function StatePanel({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <Surface className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-8 py-16 text-center" tone="subtle">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[28px] bg-[var(--accent-soft)] text-[30px] text-[var(--accent)]">
        ◎
      </div>
      <div className="text-[24px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{title}</div>
      <p className="max-w-xl text-[14px] leading-7 text-[var(--text-tertiary)]">{description}</p>
      {action}
    </Surface>
  )
}

function formatHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
