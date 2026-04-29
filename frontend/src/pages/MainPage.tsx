import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AIModal } from '../components/bookmarks/AIModal'
import { BatchActionBar } from '../components/bookmarks/BatchActionBar'
import { BookmarkGrid } from '../components/bookmarks/BookmarkGrid'
import { BookmarkList } from '../components/bookmarks/BookmarkList'
import { CreateBookmarkModal } from '../components/bookmarks/CreateBookmarkModal'
import { EditBookmarkModal } from '../components/bookmarks/EditBookmarkModal'
import { ImportModal } from '../components/bookmarks/ImportModal'
import type { BookmarkDraft } from '../components/bookmarks/types'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { NoticeBanner } from '../components/ui/NoticeBanner'
import type { Notice } from '../components/ui/NoticeBanner'
import { StatePanel } from '../components/ui/StatePanel'
import * as api from '../services/api'
import { useBookmarkMutations, useInfiniteBookmarks } from '../hooks/useBookmarkQueries'
import { folderQueryKey, useFoldersQuery } from '../hooks/useFolderQueries'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import type { AISuggestion, Bookmark, BookmarkMutation, ImportTaskSnapshot } from '../types'
import { getErrorMessage } from '../utils/errors'
import { findFolderName, flattenFolders, getActionableFolderId } from '../utils/bookmarkFilters'

const emptyDraft: BookmarkDraft = {
  title: '',
  url: '',
  description: '',
  folderId: '',
  isFavorite: false,
}

const pseudoLabels: Record<string, { description: string; title: string }> = {
  recent: { title: '最近添加', description: '按最近加入时间查看，适合快速回看新内容。' },
  favorites: { title: '我的收藏', description: '集中查看你最常打开、最值得保留的链接。' },
  unsorted: { title: '未分类', description: '这里是还没有归档的内容，适合继续整理。' },
}

export function MainPage() {
  const queryClient = useQueryClient()
  const { selectedFolderId } = useFolderStore()
  const { viewMode, setViewMode } = useBookmarkStore()
  const { data: folders = [] } = useFoldersQuery()
  const [searchInputValue, setSearchInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<BookmarkDraft>(emptyDraft)
  const [editDraft, setEditDraft] = useState<BookmarkDraft>(emptyDraft)
  const [titleFetching, setTitleFetching] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [selectionState, setSelectionState] = useState<{ ids: string[]; scopeKey: string }>({
    ids: [],
    scopeKey: 'all::',
  })
  const [moveTarget, setMoveTarget] = useState('')
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [importConnectionError, setImportConnectionError] = useState<string | null>(null)
  const [importTask, setImportTask] = useState<ImportTaskSnapshot | null>(null)

  const selectionScopeKey = useMemo(
    () => `${selectedFolderId ?? 'all'}::${searchQuery.trim()}`,
    [searchQuery, selectedFolderId],
  )
  const queryInput = useMemo(
    () => ({ query: searchQuery.trim(), selection: selectedFolderId }),
    [searchQuery, selectedFolderId],
  )
  const actionableFolderId = getActionableFolderId(selectedFolderId)
  const folderOptions = useMemo(
    () =>
      flattenFolders(folders).map((folder) => ({
        label: `${'· '.repeat(folder.depth)}${folder.name}`,
        value: folder.id,
      })),
    [folders],
  )

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteBookmarks(queryInput)
  const mutations = useBookmarkMutations(queryInput)
  const bookmarks = useMemo(() => data?.pages.flatMap((page) => page.items ?? []) ?? [], [data])
  const bookmarkIdSet = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.id)), [bookmarks])
  const selectedIds = useMemo(() => {
    if (selectionState.scopeKey !== selectionScopeKey) {
      return []
    }

    return selectionState.ids.filter((id) => bookmarkIdSet.has(id))
  }, [bookmarkIdSet, selectionScopeKey, selectionState.ids, selectionState.scopeKey])

  const total = data?.pages[0]?.total ?? 0
  const hasSelection = selectedIds.length > 0
  const selectionLabel = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.title ?? findFolderName(folders, selectedFolderId) ?? '当前视图'
    : '全部书签'
  const selectionDescription = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.description ?? '当前文件夹中的书签列表。'
    : '整理、搜索和管理你的常用链接。'
  const headerTitle = selectedFolderId ? selectionLabel : '书签'
  const headerMeta = selectedFolderId ? `${total} 条结果` : `${total} 条结果 · 全部内容`
  const canReorder = selectedFolderId !== 'recent' && searchQuery.trim() === ''
  const gridSentinelRef = useRef<HTMLDivElement | null>(null)
  const createTitleRequestRef = useRef<{ promise: Promise<string>; url: string } | null>(null)
  const importEventSourceRef = useRef<EventSource | null>(null)
  const completedImportTaskRef = useRef<string | null>(null)

  useEffect(() => {
    if (!notice || notice.tone !== 'success') {
      return
    }

    const timer = window.setTimeout(() => {
      setNotice(null)
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [notice])

  useEffect(() => {
    if (viewMode !== 'grid' || !hasNextPage || isFetchingNextPage) {
      return
    }

    const node = gridSentinelRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, viewMode])

  const closeImportEventSource = () => {
    importEventSourceRef.current?.close()
    importEventSourceRef.current = null
  }

  useEffect(() => {
    const importTaskId = importTask?.task_id
    const importTaskStatus = importTask?.status

    if (!importOpen || !importTaskId || importTaskStatus === 'completed' || importTaskStatus === 'failed') {
      closeImportEventSource()
      return
    }

    closeImportEventSource()

    const source = api.subscribeImportProgress(importTaskId, {
      onMessage: (snapshot) => {
        setImportTask(snapshot)
        setImportConnectionError(null)

        if (snapshot.status === 'failed') {
          setNotice({ tone: 'error', message: snapshot.error || '导入书签失败' })
        }

        if (snapshot.status === 'completed' || snapshot.status === 'failed') {
          source.close()
          importEventSourceRef.current = null
        }
      },
      onError: () => {
        setImportConnectionError('导入进度连接已中断，重新打开弹窗后会继续同步最新状态。')
      },
    })

    importEventSourceRef.current = source

    return () => {
      source.close()
      if (importEventSourceRef.current === source) {
        importEventSourceRef.current = null
      }
    }
  }, [importOpen, importTask])

  useEffect(() => {
    if (importTask?.status !== 'completed' || !importTask.result) {
      return
    }
    if (completedImportTaskRef.current === importTask.task_id) {
      return
    }

    completedImportTaskRef.current = importTask.task_id
    void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    void queryClient.invalidateQueries({ queryKey: folderQueryKey })
    setNotice({ tone: 'success', message: '浏览器书签已导入。' })
  }, [importTask, queryClient])

  useEffect(() => () => closeImportEventSource(), [])

  const updateSelectionIds = (updater: (current: string[]) => string[]) => {
    setSelectionState((current) => {
      const baseIds =
        current.scopeKey === selectionScopeKey ? current.ids.filter((id) => bookmarkIdSet.has(id)) : []

      return {
        ids: Array.from(new Set(updater(baseIds))),
        scopeKey: selectionScopeKey,
      }
    })
  }

  const submitSearch = () => {
    setSearchQuery(searchInputValue.trim())
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    submitSearch()
  }

  const openCreateModal = () => {
    setNotice(null)
    setCreateDraft({ ...emptyDraft, folderId: actionableFolderId || '' })
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

  const requestCreateTitle = (rawUrl: string) => {
    const normalizedUrl = rawUrl.trim()
    if (!normalizedUrl) {
      return Promise.resolve('')
    }

    if (createTitleRequestRef.current?.url === normalizedUrl) {
      return createTitleRequestRef.current.promise
    }

    setTitleFetching(true)
    const promise = api
      .fetchTitle(normalizedUrl)
      .then((response) => response.title?.trim() ?? '')
      .catch(() => '')
      .finally(() => {
        if (createTitleRequestRef.current?.url === normalizedUrl) {
          createTitleRequestRef.current = null
        }
        setTitleFetching(false)
      })

    createTitleRequestRef.current = { url: normalizedUrl, promise }
    return promise
  }

  const handleCreateUrlBlur = async () => {
    const normalizedUrl = createDraft.url.trim()
    if (!normalizedUrl || createDraft.title.trim()) {
      return
    }

    const fetchedTitle = await requestCreateTitle(normalizedUrl)
    if (!fetchedTitle) {
      return
    }

    setCreateDraft((current) => {
      if (current.title.trim() || current.url.trim() !== normalizedUrl) {
        return current
      }
      return { ...current, title: fetchedTitle }
    })
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedUrl = createDraft.url.trim()
    if (!normalizedUrl) {
      setNotice({ tone: 'error', message: '请先填写有效的网址。' })
      return
    }

    let resolvedTitle = createDraft.title.trim()
    if (!resolvedTitle) {
      resolvedTitle = await requestCreateTitle(normalizedUrl)
      if (resolvedTitle) {
        setCreateDraft((current) => {
          if (current.title.trim() || current.url.trim() !== normalizedUrl) {
            return current
          }
          return { ...current, title: resolvedTitle }
        })
      }
    }

    const payload: BookmarkMutation = {
      title: resolvedTitle,
      url: normalizedUrl,
      description: createDraft.description.trim(),
      folder_id: createDraft.folderId || null,
      is_favorite: createDraft.isFavorite,
    }

    try {
      await mutations.createBookmark.mutateAsync(payload)
      setCreateOpen(false)
      setCreateDraft(emptyDraft)
      setNotice({ tone: 'success', message: '书签已添加。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '添加书签失败') })
    }
  }

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editDraft.id) {
      return
    }

    try {
      await mutations.updateBookmark.mutateAsync({
        id: editDraft.id,
        data: {
          title: editDraft.title.trim() || editDraft.url.trim(),
          url: editDraft.url.trim(),
          description: editDraft.description.trim(),
          folder_id: editDraft.folderId || null,
          is_favorite: editDraft.isFavorite,
        },
      })
      setEditOpen(false)
      setNotice({ tone: 'success', message: '书签已更新。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新书签失败') })
    }
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      closeImportEventSource()
      setImportConnectionError(null)
      completedImportTaskRef.current = null
      const task = await mutations.importBookmarks.mutateAsync(file)
      setImportTask(task)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '导入书签失败') })
    } finally {
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
      setNotice({ tone: 'error', message: getErrorMessage(error, '获取 AI 整理建议失败') })
    } finally {
      setAiLoading(false)
    }
  }

  const handleAIApply = async () => {
    try {
      await mutations.applyAISuggestions.mutateAsync(actionableFolderId ?? undefined)
      setAiOpen(false)
      setNotice({ tone: 'success', message: 'AI 建议已应用。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '应用 AI 建议失败') })
    }
  }

  const handleFavoriteToggle = async (bookmarkId: string) => {
    try {
      await mutations.toggleFavorite.mutateAsync(bookmarkId)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新收藏状态失败') })
    }
  }

  const handleDeleteConfirmed = async () => {
    const ids = pendingDeleteIds
    if (ids.length === 0) {
      return
    }

    try {
      if (ids.length === 1) {
        await mutations.deleteBookmark.mutateAsync(ids[0])
      } else {
        await mutations.batchDeleteBookmarks.mutateAsync(ids)
        updateSelectionIds((current) => current.filter((id) => !ids.includes(id)))
      }

      setPendingDeleteIds([])
      setNotice({
        tone: 'success',
        message: ids.length === 1 ? '书签已删除。' : `已删除 ${ids.length} 条书签。`,
      })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '删除书签失败') })
    }
  }

  const handleReorder = async (activeId: string, overId: string | null, position: 'before' | 'after' | 'end') => {
    const ids = bookmarks.map((bookmark) => bookmark.id)
    const fromIndex = ids.indexOf(activeId)
    if (fromIndex === -1) {
      return
    }

    ids.splice(fromIndex, 1)
    if (position === 'end' || overId === null) {
      ids.push(activeId)
    } else {
      const targetIndex = ids.indexOf(overId)
      if (targetIndex === -1) {
        return
      }
      ids.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, activeId)
    }

    try {
      await mutations.reorderBookmarks.mutateAsync(ids)
      setNotice({ tone: 'success', message: '书签顺序已更新。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新顺序失败') })
    }
  }

  const loadedAllSelected = bookmarks.length > 0 && bookmarks.every((bookmark) => selectedIds.includes(bookmark.id))

  const selectLoaded = () => {
    if (loadedAllSelected) {
      setSelectionState({ ids: [], scopeKey: selectionScopeKey })
      return
    }

    setSelectionState({
      ids: bookmarks.map((bookmark) => bookmark.id),
      scopeKey: selectionScopeKey,
    })
  }

  const toggleSelection = (bookmarkId: string) => {
    updateSelectionIds((current) =>
      current.includes(bookmarkId) ? current.filter((id) => id !== bookmarkId) : [...current, bookmarkId],
    )
  }

  const handleBatchMove = async () => {
    if (selectedIds.length === 0) {
      return
    }

    try {
      await mutations.batchMoveBookmarks.mutateAsync({ ids: selectedIds, folderId: moveTarget || null })
      setNotice({ tone: 'success', message: `已移动 ${selectedIds.length} 条书签。` })
      setSelectionState({ ids: [], scopeKey: selectionScopeKey })
      setMoveTarget('')
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '批量移动失败') })
    }
  }

  const handleBatchFavorite = async (isFavorite: boolean) => {
    if (selectedIds.length === 0) {
      return
    }

    try {
      await mutations.batchFavoriteBookmarks.mutateAsync({ ids: selectedIds, isFavorite })
      setNotice({
        tone: 'success',
        message: isFavorite ? '已加入收藏。' : '已取消收藏。',
      })
      setSelectionState({ ids: [], scopeKey: selectionScopeKey })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '批量更新收藏失败') })
    }
  }

  const contentError = error instanceof Error ? error.message : null

  return (
    <div className="space-y-4">
      <section className="page-section p-3">
        {hasSelection ? (
          <BatchActionBar
            folderOptions={folderOptions}
            moveTarget={moveTarget}
            onClear={() => setSelectionState({ ids: [], scopeKey: selectionScopeKey })}
            onDelete={() => setPendingDeleteIds(selectedIds)}
            onMoveTargetChange={setMoveTarget}
            onMoveToFolder={() => void handleBatchMove()}
            onSetFavorite={(value) => void handleBatchFavorite(value)}
            selectedCount={selectedIds.length}
          />
        ) : (
          <div className="space-y-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">{headerTitle}</h1>
                <span className="text-[12px] leading-4 text-[var(--color-text-secondary)]">{headerMeta}</span>
              </div>
              <p className="max-w-[720px] text-[13px] leading-5 text-[var(--color-text-secondary)]">
                {selectionDescription}
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="relative">
                  <input
                    aria-label="搜索书签"
                    className="input-flat h-9 pl-3 pr-11 text-[14px]"
                    onChange={(event) => setSearchInputValue(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="搜索标题、域名或备注"
                    value={searchInputValue}
                  />
                  <button
                    aria-label="执行搜索"
                    className="search-submit-button"
                    onClick={submitSearch}
                    type="button"
                  >
                    <Icon className="text-[14px]" name="search" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-1">
                  <Button
                    leading={<Icon className="text-[14px]" name="list" />}
                    onClick={() => setViewMode('list')}
                    size="sm"
                    variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  >
                    列表
                  </Button>
                  <Button
                    leading={<Icon className="text-[14px]" name="grid" />}
                    onClick={() => setViewMode('grid')}
                    size="sm"
                    variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  >
                    卡片
                  </Button>
                </div>
                <Button onClick={selectLoaded} size="sm" variant="ghost">
                  {loadedAllSelected ? '取消全选' : '全选已加载'}
                </Button>
                <Button
                  leading={<Icon className="text-[14px]" name="upload" />}
                  onClick={() => setImportOpen(true)}
                  size="sm"
                  variant="secondary"
                >
                  导入
                </Button>
                <Button
                  leading={<Icon className="text-[14px]" name="sparkles" />}
                  onClick={() => void handleAIReview()}
                  size="sm"
                  variant="secondary"
                >
                  AI 整理
                </Button>
                <Button
                  leading={<Icon className="text-[14px]" name="plus" />}
                  onClick={openCreateModal}
                  size="sm"
                  variant="primary"
                >
                  添加书签
                </Button>
              </div>
            </div>

            <div className="text-[12px] leading-4 text-[var(--color-text-secondary)]">
              {bookmarks.length} 条已加载 · {viewMode === 'list' ? '列表视图' : '卡片视图'}
              {!canReorder ? ' · 当前视图不支持排序' : null}
            </div>
          </div>
        )}
      </section>

      {notice ? <NoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}

      <section>
        {contentError ? (
          <StatePanel
            action={
              <Button
                leading={<Icon className="text-[14px]" name="sparkles" />}
                onClick={() => window.location.reload()}
                size="sm"
                variant="primary"
              >
                重新加载
              </Button>
            }
            description={contentError}
            title="书签列表暂时不可用"
          />
        ) : isLoading ? (
          <LoadingState viewMode={viewMode} />
        ) : bookmarks.length === 0 ? (
          <StatePanel
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button leading={<Icon className="text-[14px]" name="plus" />} onClick={openCreateModal} size="sm" variant="primary">
                  立即添加
                </Button>
                <Button leading={<Icon className="text-[14px]" name="upload" />} onClick={() => setImportOpen(true)} size="sm" variant="secondary">
                  导入书签
                </Button>
              </div>
            }
            description="当前视图下还没有内容。你可以手动添加，也可以从浏览器导入。"
            title="这里还没有书签"
          />
        ) : viewMode === 'list' ? (
          <BookmarkList
            bookmarks={bookmarks}
            canReorder={canReorder}
            getFolderName={(folderId) => findFolderName(folders, folderId)}
            hasNextPage={Boolean(hasNextPage)}
            isFetchingNextPage={isFetchingNextPage}
            onDelete={(bookmarkId) => setPendingDeleteIds([bookmarkId])}
            onEdit={openEditModal}
            onFavorite={(bookmarkId) => void handleFavoriteToggle(bookmarkId)}
            onFetchNextPage={() => void fetchNextPage()}
            onReorder={(activeId, overId, position) => void handleReorder(activeId, overId, position)}
            onToggleSelect={toggleSelection}
            searchQuery={searchQuery}
            selectedIds={new Set(selectedIds)}
          />
        ) : (
          <>
            <BookmarkGrid
              bookmarks={bookmarks}
              getFolderName={(folderId) => findFolderName(folders, folderId)}
              onDelete={(bookmarkId) => setPendingDeleteIds([bookmarkId])}
              onEdit={openEditModal}
              onFavorite={(bookmarkId) => void handleFavoriteToggle(bookmarkId)}
              searchQuery={searchQuery}
            />
            <div ref={gridSentinelRef} />
            {isFetchingNextPage ? (
              <div className="text-[12px] leading-4 text-[var(--color-text-secondary)]">正在加载更多书签…</div>
            ) : null}
          </>
        )}
      </section>

      <CreateBookmarkModal
        draft={createDraft}
        folders={folders}
        onChange={(patch) => setCreateDraft((current) => ({ ...current, ...patch }))}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        onUrlBlur={() => void handleCreateUrlBlur()}
        open={createOpen}
        submitting={mutations.createBookmark.isPending}
        titleFetching={titleFetching}
      />

      <EditBookmarkModal
        draft={editDraft}
        folders={folders}
        onChange={(patch) => setEditDraft((current) => ({ ...current, ...patch }))}
        onClose={() => setEditOpen(false)}
        onSubmit={handleSaveEdit}
        open={editOpen}
        submitting={mutations.updateBookmark.isPending}
      />

      <AIModal
        actionableFolderId={actionableFolderId}
        aiApplying={mutations.applyAISuggestions.isPending}
        aiLoading={aiLoading}
        onApply={() => void handleAIApply()}
        onClose={() => setAiOpen(false)}
        open={aiOpen}
        suggestions={aiSuggestions}
      />

      <ImportModal
        connectionError={importConnectionError}
        importTask={importTask}
        onClose={() => {
          closeImportEventSource()
          setImportOpen(false)
        }}
        onImport={(event) => void handleImport(event)}
        open={importOpen}
        starting={mutations.importBookmarks.isPending}
      />

      <ConfirmDialog
        confirmLabel={pendingDeleteIds.length > 1 ? `删除 ${pendingDeleteIds.length} 条` : '删除'}
        description={
          pendingDeleteIds.length > 1 ? '这会永久删除所选书签，无法恢复。' : '这会永久删除这条书签，无法恢复。'
        }
        onClose={() => setPendingDeleteIds([])}
        onConfirm={() => void handleDeleteConfirmed()}
        open={pendingDeleteIds.length > 0}
        title="确认删除"
      />
    </div>
  )
}

function LoadingState({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="page-section overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className={`flex items-center gap-3 px-4 py-3 animate-pulse ${
              index < 5 ? 'border-b border-[var(--color-border)]' : ''
            }`}
            key={index}
          >
            <div className="h-4 w-4 rounded bg-[var(--color-bg-muted)]" />
            <div className="h-8 w-8 rounded-[8px] bg-[var(--color-bg-muted)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-[var(--color-bg-muted)]" />
              <div className="h-3 w-3/5 rounded bg-[var(--color-bg-muted)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="page-section space-y-4 p-4 animate-pulse" key={index}>
          <div className="h-10 w-10 rounded-[8px] bg-[var(--color-bg-muted)]" />
          <div className="space-y-2">
            <div className="h-4 w-2/3 rounded bg-[var(--color-bg-muted)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--color-bg-muted)]" />
            <div className="h-3 w-full rounded bg-[var(--color-bg-muted)]" />
          </div>
        </div>
      ))}
    </div>
  )
}
