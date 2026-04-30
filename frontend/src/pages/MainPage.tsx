import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AIModal } from '../components/bookmarks/AIModal'
import { BookmarkGrid } from '../components/bookmarks/BookmarkGrid'
import { BookmarkList } from '../components/bookmarks/BookmarkList'
import { CreateBookmarkModal } from '../components/bookmarks/CreateBookmarkModal'
import { EditBookmarkModal } from '../components/bookmarks/EditBookmarkModal'
import { ImportModal } from '../components/bookmarks/ImportModal'
import type { BookmarkDraft } from '../components/bookmarks/types'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Icon } from '../components/ui/Icon'
import { NoticeBanner, NoticeToast } from '../components/ui/NoticeBanner'
import type { Notice } from '../components/ui/NoticeBanner'
import { StatePanel } from '../components/ui/StatePanel'
import { Surface } from '../components/ui/Surface'
import { Tooltip } from '../components/ui/Tooltip'
import { useBookmarkMutations, useBookmarksQuery } from '../hooks/useBookmarkQueries'
import { folderQueryKey, useFoldersQuery } from '../hooks/useFolderQueries'
import * as api from '../services/api'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import type { AIPlan, AITitleCleanupChange, Bookmark, BookmarkMutation, ImportTaskSnapshot } from '../types'
import { findFolderName, getActionableFolderId, isPseudoFolderId } from '../utils/bookmarkFilters'
import { getErrorMessage } from '../utils/errors'
import { normalizeBookmarkUrl } from '../utils/url'

const emptyDraft: BookmarkDraft = {
  title: '',
  url: '',
  description: '',
  folderId: '',
  isFavorite: false,
}

const pseudoLabels: Record<string, { description: string; title: string }> = {
  recent: { title: '最近添加', description: '按加入时间查看最近收进来的书签。' },
  favorites: { title: '收藏', description: '集中查看你标记过收藏的内容。' },
  unsorted: { title: '未分类', description: '这里是还没有归档的书签。' },
}

type TitleFetchState = 'failed' | 'fetching' | 'idle' | 'success'

const defaultTitleFetchStatus: { message?: string; state: TitleFetchState } = { state: 'idle' }
const createTitleStatusMinMs = 700
const createMetadataPreviewDebounceMs = 450

export function MainPage() {
  const queryClient = useQueryClient()
  const { selectedFolderId } = useFolderStore()
  const { viewMode, setViewMode } = useBookmarkStore()
  const { data: folders = [] } = useFoldersQuery()

  const [searchInputValue, setSearchInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [reorderToast, setReorderToast] = useState<Notice | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState<BookmarkDraft>(emptyDraft)
  const [editDraft, setEditDraft] = useState<BookmarkDraft>(emptyDraft)
  const [titleFetchStatus, setTitleFetchStatus] = useState<{ message?: string; state: TitleFetchState }>(
    defaultTitleFetchStatus,
  )
  const [aiPlans, setAiPlans] = useState<AIPlan[]>([])
  const [aiCleanedTitles, setAiCleanedTitles] = useState<AITitleCleanupChange[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLoadingMessage, setAiLoadingMessage] = useState('正在清理标题...')
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null)
  const [aiSessionId, setAiSessionId] = useState<string | null>(null)
  const [aiUndoToken, setAiUndoToken] = useState<string | null>(null)
  const [selectionState, setSelectionState] = useState<{ ids: string[]; scopeKey: string }>({
    ids: [],
    scopeKey: 'all::',
  })
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const [importConnectionError, setImportConnectionError] = useState<string | null>(null)
  const [importTask, setImportTask] = useState<ImportTaskSnapshot | null>(null)

  const actionableFolderId = getActionableFolderId(selectedFolderId)
  const aiFolderId = selectedFolderId === null ? undefined : actionableFolderId ?? undefined
  const aiEnabled = selectedFolderId === null || actionableFolderId !== null
  const aiDisabledReason = '请先进入具体文件夹或全部书签，再使用 AI 整理。'

  const selectionScopeKey = useMemo(
    () => `${selectedFolderId ?? 'all'}::${searchQuery.trim()}::${viewMode}`,
    [searchQuery, selectedFolderId, viewMode],
  )
  const queryInput = useMemo(
    () => ({ query: searchQuery.trim(), selection: selectedFolderId }),
    [searchQuery, selectedFolderId],
  )
  const mutations = useBookmarkMutations(queryInput)
  const { data, error, isLoading } = useBookmarksQuery(queryInput)
  const bookmarks = useMemo(() => data?.items ?? [], [data])
  const bookmarkIdSet = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.id)), [bookmarks])
  const selectedIds = useMemo(() => {
    if (selectionState.scopeKey !== selectionScopeKey) {
      return []
    }
    return selectionState.ids.filter((id) => bookmarkIdSet.has(id))
  }, [bookmarkIdSet, selectionScopeKey, selectionState.ids, selectionState.scopeKey])

  const total = data?.total ?? 0
  const hasSelection = selectedIds.length > 0
  const currentLabel = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.title ?? findFolderName(folders, selectedFolderId) ?? '当前视图'
    : '全部书签'
  const currentDescription = selectedFolderId
    ? pseudoLabels[selectedFolderId]?.description ?? '当前文件夹中的书签列表。'
    : '整理、搜索和管理你的常用链接。'
  const canReorder = !searchQuery.trim() && (selectedFolderId === null || !isPseudoFolderId(selectedFolderId))
  const isGridView = viewMode === 'grid'
  const reorderHint = canReorder
    ? '当前已加载内容可拖拽排序，也可拖到左侧文件夹中移动。'
    : '当前视图不支持排序。'

  const contentSectionClassName = isGridView
    ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4'
    : 'min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4'
  const topSectionClassName = isGridView
    ? 'relative z-20 mb-4 shrink-0 bg-[var(--color-bg)] pb-1'
    : 'relative z-20 mb-4 shrink-0 bg-[var(--color-bg)] pb-1'

  const gridScrollContainerRef = useRef<HTMLElement | null>(null)
  const createDraftRef = useRef(createDraft)
  const createModalOpenRef = useRef(createOpen)
  const createTitleRequestRef = useRef<{ promise: Promise<string>; url: string } | null>(null)
  const createDescriptionModifiedRef = useRef(false)
  const createPreviewAbortRef = useRef<AbortController | null>(null)
  const createPreviewRequestIdRef = useRef(0)
  const createPreviewTimerRef = useRef<number | null>(null)
  const createTitleModifiedRef = useRef(false)
  const createPreviewUrlRef = useRef('')
  const importEventSourceRef = useRef<EventSource | null>(null)
  const completedImportTaskRef = useRef<string | null>(null)
  const aiStageTimerRef = useRef<number | null>(null)
  const aiRequestTokenRef = useRef(0)
  const aiSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    createDraftRef.current = createDraft
  }, [createDraft])

  useEffect(() => {
    createModalOpenRef.current = createOpen
  }, [createOpen])

  useEffect(() => {
    aiSessionIdRef.current = aiSessionId
  }, [aiSessionId])

  useEffect(() => {
    if (!notice || notice.tone !== 'success' || notice.actionLabel || notice.onAction) {
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
    if (!reorderToast) {
      return
    }

    const timer = window.setTimeout(() => {
      setReorderToast(null)
    }, 4000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [reorderToast])

  const closeImportEventSource = () => {
    importEventSourceRef.current?.close()
    importEventSourceRef.current = null
  }

  const cancelCreateMetadataPreview = () => {
    if (createPreviewTimerRef.current) {
      window.clearTimeout(createPreviewTimerRef.current)
      createPreviewTimerRef.current = null
    }

    createPreviewAbortRef.current?.abort()
    createPreviewAbortRef.current = null
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
          setNotice({ tone: 'error', message: snapshot.error || '导入书签失败。' })
        }

        if (snapshot.status === 'completed' || snapshot.status === 'failed') {
          source.close()
          importEventSourceRef.current = null
        }
      },
      onError: () => {
        setImportConnectionError('导入进度连接已中断，重新打开窗口后会继续同步最新状态。')
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

  useEffect(
    () => () => {
      cancelCreateMetadataPreview()
      closeImportEventSource()
      if (aiStageTimerRef.current) {
        window.clearTimeout(aiStageTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!createOpen) {
      cancelCreateMetadataPreview()
      createPreviewUrlRef.current = ''
      return
    }

    const rawUrl = createDraft.url.trim()
    if (!rawUrl) {
      cancelCreateMetadataPreview()
      createPreviewUrlRef.current = ''
      return
    }

    const normalized = normalizeBookmarkUrl(rawUrl)
    if ('error' in normalized) {
      cancelCreateMetadataPreview()
      createPreviewUrlRef.current = ''
      createPreviewTimerRef.current = window.setTimeout(() => {
        if (createModalOpenRef.current && createDraftRef.current.url.trim() === rawUrl) {
          setTitleFetchStatus({ state: 'failed', message: normalized.error })
        }
      }, createMetadataPreviewDebounceMs)
      return
    }

    const normalizedUrl = normalized.normalizedUrl
    if (createPreviewUrlRef.current === normalizedUrl) {
      return
    }

    cancelCreateMetadataPreview()
    setTitleFetchStatus({ state: 'fetching', message: 'Fetching website metadata...' })

    createPreviewTimerRef.current = window.setTimeout(() => {
      const controller = new AbortController()
      const requestId = createPreviewRequestIdRef.current + 1
      createPreviewAbortRef.current = controller
      createPreviewRequestIdRef.current = requestId

      const startedAt = Date.now()

      void api
        .fetchMetadataPreview(normalizedUrl, controller.signal)
        .then(async (response) => {
          const remain = createTitleStatusMinMs - (Date.now() - startedAt)
          if (remain > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, remain))
          }

          if (
            controller.signal.aborted ||
            createPreviewRequestIdRef.current !== requestId ||
            !createModalOpenRef.current
          ) {
            return
          }

          const currentUrl = normalizeBookmarkUrl(createDraftRef.current.url)
          if ('error' in currentUrl || currentUrl.normalizedUrl !== normalizedUrl) {
            return
          }

          createPreviewUrlRef.current = normalizedUrl

          setCreateDraft((current) => {
            const patch: Partial<BookmarkDraft> = {}
            if (response.url && response.url !== current.url.trim()) {
              patch.url = response.url
            }
            if (!createTitleModifiedRef.current) {
              patch.title = response.title?.trim() ?? ''
            }
            if (!createDescriptionModifiedRef.current) {
              patch.description = response.description?.trim() ?? ''
            }

            return Object.keys(patch).length > 0 ? { ...current, ...patch } : current
          })

          const hasMetadata = Boolean(response.title?.trim() || response.description?.trim())
          setTitleFetchStatus(
            hasMetadata
              ? { state: 'success', message: 'Website metadata filled in automatically.' }
              : { state: 'failed', message: 'No title or description was found. You can still save it.' },
          )
        })
        .catch(async (error: unknown) => {
          const remain = createTitleStatusMinMs - (Date.now() - startedAt)
          if (remain > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, remain))
          }

          if (
            controller.signal.aborted ||
            createPreviewRequestIdRef.current !== requestId ||
            !createModalOpenRef.current
          ) {
            return
          }

          createPreviewUrlRef.current = ''
          setTitleFetchStatus({
            state: 'failed',
            message: getErrorMessage(error, 'Fetching website metadata failed. You can still save it.'),
          })
        })
        .finally(() => {
          if (createPreviewAbortRef.current === controller) {
            createPreviewAbortRef.current = null
          }
        })
    }, createMetadataPreviewDebounceMs)

    return () => {
      if (createPreviewTimerRef.current) {
        window.clearTimeout(createPreviewTimerRef.current)
        createPreviewTimerRef.current = null
      }
    }
  }, [createDraft.url, createOpen])

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

  const handleCreateDraftChange = (patch: Partial<BookmarkDraft>) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'url') && patch.url !== createDraftRef.current.url) {
      createPreviewUrlRef.current = ''
      setTitleFetchStatus(defaultTitleFetchStatus)
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'title') && patch.title !== createDraftRef.current.title) {
      createTitleModifiedRef.current = true
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'description') && patch.description !== createDraftRef.current.description) {
      createDescriptionModifiedRef.current = true
    }

    setCreateDraft((current) => ({ ...current, ...patch }))
  }

  const openCreateModal = () => {
    setNotice(null)
    cancelCreateMetadataPreview()
    createDescriptionModifiedRef.current = false
    createPreviewUrlRef.current = ''
    createTitleModifiedRef.current = false
    setTitleFetchStatus(defaultTitleFetchStatus)
    setCreateDraft({ ...emptyDraft, folderId: actionableFolderId || '' })
    setCreateOpen(true)
  }

  const closeCreateModal = () => {
    cancelCreateMetadataPreview()
    createPreviewUrlRef.current = ''
    setCreateOpen(false)
    setTitleFetchStatus(defaultTitleFetchStatus)
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
      setTitleFetchStatus(defaultTitleFetchStatus)
      return Promise.resolve('')
    }

    if (createTitleRequestRef.current?.url === normalizedUrl) {
      return createTitleRequestRef.current.promise
    }

    const startedAt = Date.now()
    setTitleFetchStatus({ state: 'fetching', message: '正在抓取标题...' })

    const promise = api
      .fetchTitle(normalizedUrl)
      .then(async (response) => {
        const fetchedTitle = response.title?.trim() ?? ''
        const remain = createTitleStatusMinMs - (Date.now() - startedAt)
        if (remain > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remain))
        }

        const currentUrl = normalizeBookmarkUrl(createDraftRef.current.url)
        const shouldUpdateStatus =
          createModalOpenRef.current && !('error' in currentUrl) && currentUrl.normalizedUrl === normalizedUrl

        if (shouldUpdateStatus) {
          setTitleFetchStatus(
            fetchedTitle
              ? { state: 'success', message: '已抓到标题，已自动回填。' }
              : { state: 'failed', message: '没有抓到标题，你可以继续保存，之后再补。' },
          )
        }

        return fetchedTitle
      })
      .catch(async (error: unknown) => {
        const remain = createTitleStatusMinMs - (Date.now() - startedAt)
        if (remain > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remain))
        }

        const currentUrl = normalizeBookmarkUrl(createDraftRef.current.url)
        if (createModalOpenRef.current && !('error' in currentUrl) && currentUrl.normalizedUrl === normalizedUrl) {
          setTitleFetchStatus({
            state: 'failed',
            message: getErrorMessage(error, '标题抓取失败，你可以继续保存。'),
          })
        }

        return ''
      })
      .finally(() => {
        if (createTitleRequestRef.current?.url === normalizedUrl) {
          createTitleRequestRef.current = null
        }
      })

    createTitleRequestRef.current = { url: normalizedUrl, promise }
    return promise
  }

  const handleCreateUrlBlur = async () => {
    const rawUrl = createDraftRef.current.url
    if (!rawUrl.trim()) {
      setTitleFetchStatus(defaultTitleFetchStatus)
      return
    }

    const normalized = normalizeBookmarkUrl(rawUrl)
    if ('error' in normalized) {
      setTitleFetchStatus({ state: 'failed', message: normalized.error })
      return
    }

    const normalizedUrl = normalized.normalizedUrl
    if (normalizedUrl !== rawUrl.trim()) {
      setCreateDraft((current) => (current.url.trim() === rawUrl.trim() ? { ...current, url: normalizedUrl } : current))
    }

    if (createDraftRef.current.title.trim()) {
      return
    }

    const fetchedTitle = await requestCreateTitle(normalizedUrl)
    if (!fetchedTitle) {
      return
    }

    setCreateDraft((current) => {
      const currentUrl = normalizeBookmarkUrl(current.url)
      if (current.title.trim() || ('error' in currentUrl ? current.url.trim() : currentUrl.normalizedUrl) !== normalizedUrl) {
        return current
      }
      return { ...current, title: fetchedTitle, url: normalizedUrl }
    })
  }
  void handleCreateUrlBlur

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const rawUrl = createDraftRef.current.url.trim()
    if (!rawUrl) {
      setNotice({ tone: 'error', message: '请先填写有效的网址。' })
      return
    }

    const normalized = normalizeBookmarkUrl(rawUrl)
    if ('error' in normalized) {
      setTitleFetchStatus({ state: 'failed', message: normalized.error })
      setNotice({ tone: 'error', message: normalized.error })
      return
    }

    const normalizedUrl = normalized.normalizedUrl
    if (normalizedUrl !== rawUrl) {
      setCreateDraft((current) => (current.url.trim() === rawUrl ? { ...current, url: normalizedUrl } : current))
    }

    const payload: BookmarkMutation = {
      title: createDraftRef.current.title.trim(),
      url: normalizedUrl,
      description: createDraftRef.current.description.trim(),
      folder_id: createDraftRef.current.folderId || null,
      is_favorite: createDraftRef.current.isFavorite,
    }

    try {
      await mutations.createBookmark.mutateAsync(payload)
      closeCreateModal()
      setCreateDraft(emptyDraft)
      setNotice({ tone: 'success', message: '书签已添加。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '添加书签失败。') })
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
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新书签失败。') })
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
      setNotice({ tone: 'error', message: getErrorMessage(error, '导入书签失败。') })
    } finally {
      event.target.value = ''
    }
  }

  const clearAIStageTimer = () => {
    if (aiStageTimerRef.current) {
      window.clearTimeout(aiStageTimerRef.current)
      aiStageTimerRef.current = null
    }
  }

  const closeAISession = async () => {
    const sessionId = aiSessionIdRef.current
    aiSessionIdRef.current = null
    setAiSessionId(null)
    if (!sessionId) {
      return
    }

    try {
      await api.aiCloseSession(sessionId)
    } catch {
      // Closing the modal should not be blocked by a session cleanup failure.
    }
  }

  const handleAIModalClose = () => {
    aiRequestTokenRef.current += 1
    clearAIStageTimer()
    setAiOpen(false)
    setAiLoading(false)
    setAiLoadingMessage('正在清理标题...')
    setAiErrorMessage(null)
    setAiPlans([])
    setAiCleanedTitles([])
    void closeAISession()
  }

  const requestAIPlans = async () => {
    if (!aiEnabled) {
      return
    }

    const sessionId = aiSessionIdRef.current ?? window.crypto.randomUUID()
    if (!aiSessionIdRef.current) {
      aiSessionIdRef.current = sessionId
      setAiSessionId(sessionId)
    }

    const requestToken = ++aiRequestTokenRef.current
    clearAIStageTimer()
    setAiOpen(true)
    setAiLoading(true)
    setAiErrorMessage(null)
    setAiPlans([])
    setAiCleanedTitles([])
    setAiLoadingMessage('正在清理标题...')
    setNotice(null)

    aiStageTimerRef.current = window.setTimeout(() => {
      setAiLoadingMessage('正在生成整理方案...')
    }, 900)

    try {
      const response = await api.aiPlanOrganize(aiFolderId, sessionId)
      if (requestToken !== aiRequestTokenRef.current) {
        return
      }

      clearAIStageTimer()
      setAiSessionId(response.session_id ?? sessionId)
      setAiCleanedTitles(response.cleaned_titles ?? [])
      setAiPlans(response.plans ?? [])
      setAiErrorMessage(null)
    } catch (error: unknown) {
      if (requestToken !== aiRequestTokenRef.current) {
        return
      }

      clearAIStageTimer()
      setAiPlans([])
      setAiCleanedTitles([])
      setAiErrorMessage(getErrorMessage(error, 'AI 整理暂时失败，请稍后再试。'))
    } finally {
      if (requestToken === aiRequestTokenRef.current) {
        setAiLoading(false)
        setAiLoadingMessage('正在清理标题...')
      }
    }
  }

  const handleAIReview = async () => {
    await requestAIPlans()
  }

  const handleAIApply = async (plan: AIPlan) => {
    setAiLoading(true)
    setAiLoadingMessage('正在应用整理方案...')
    setAiErrorMessage(null)

    try {
      const response = await api.aiApplyPlan(plan, aiFolderId, aiSessionIdRef.current ?? undefined)
      setAiUndoToken(response.undo_token ?? null)
      await closeAISession()
      setAiOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      await queryClient.invalidateQueries({ queryKey: folderQueryKey })
      setNotice({
        tone: 'success',
        message: 'AI 整理方案已应用。',
        actionLabel: response.undo_token ? '撤销' : undefined,
        onAction: response.undo_token ? () => void handleAIUndo(response.undo_token) : undefined,
      })
    } catch (error: unknown) {
      setAiErrorMessage(getErrorMessage(error, '应用 AI 整理方案失败。'))
    } finally {
      setAiLoading(false)
      setAiLoadingMessage('正在清理标题...')
    }
  }

  const handleAIUndo = async (token = aiUndoToken ?? '') => {
    if (!token) {
      return
    }

    try {
      await api.aiUndoPlan(token, aiSessionIdRef.current ?? undefined)
      setAiUndoToken(null)
      await queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      await queryClient.invalidateQueries({ queryKey: folderQueryKey })
      setNotice({ tone: 'success', message: '已恢复到整理前的文件夹结构。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '撤销 AI 整理失败。') })
    }
  }

  const handleFavoriteToggle = async (bookmarkId: string) => {
    try {
      await mutations.toggleFavorite.mutateAsync(bookmarkId)
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新收藏状态失败。') })
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
      }

      setPendingDeleteIds([])
      clearSelection()
      setNotice({
        tone: 'success',
        message: ids.length === 1 ? '书签已删除。' : `已删除 ${ids.length} 条书签。`,
      })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '删除书签失败。') })
    }
  }

  const handleReorder = async (orderedIds: string[]) => {
    if (orderedIds.length !== bookmarks.length) {
      return
    }

    const currentIds = bookmarks.map((bookmark) => bookmark.id)
    if (currentIds.some((id) => !orderedIds.includes(id))) {
      return
    }

    const hasChanged = currentIds.some((id, index) => id !== orderedIds[index])
    if (!hasChanged) {
      return
    }

    try {
      await mutations.reorderBookmarks.mutateAsync(orderedIds)
      setReorderToast({ tone: 'success', message: '书签顺序已更新。' })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '更新顺序失败。') })
    }
  }

  const toggleSelection = (bookmarkId: string) => {
    updateSelectionIds((current) =>
      current.includes(bookmarkId) ? current.filter((id) => id !== bookmarkId) : [...current, bookmarkId],
    )
  }

  useEffect(() => {
    const handleSelectAll = (event: globalThis.KeyboardEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 'a') {
        return
      }

      if (createOpen || editOpen || aiOpen || importOpen) {
        return
      }

      if (isTextSelectionTarget(event.target)) {
        return
      }

      if (bookmarks.length === 0) {
        return
      }

      event.preventDefault()
      setSelectionState({
        ids: bookmarks.map((bookmark) => bookmark.id),
        scopeKey: selectionScopeKey,
      })
    }

    window.addEventListener('keydown', handleSelectAll)
    return () => window.removeEventListener('keydown', handleSelectAll)
  }, [aiOpen, bookmarks, createOpen, editOpen, importOpen, selectionScopeKey])

  const clearSelection = () => {
    setSelectionState({ ids: [], scopeKey: selectionScopeKey })
  }

  const handleMoveBookmarksToFolder = async (bookmarkIds: string[], folderId: string | null) => {
    if (bookmarkIds.length === 0) {
      return
    }

    try {
      if (bookmarkIds.length === 1) {
        await mutations.moveBookmark.mutateAsync({ id: bookmarkIds[0], folderId })
      } else {
        await mutations.batchMoveBookmarks.mutateAsync({ ids: bookmarkIds, folderId })
      }

      clearSelection()
      setNotice({
        tone: 'success',
        message:
          bookmarkIds.length === 1
            ? folderId
              ? '书签已移动到目标文件夹。'
              : '书签已移动到未分类。'
            : `已移动 ${bookmarkIds.length} 条书签。`,
      })
    } catch (error: unknown) {
      setNotice({ tone: 'error', message: getErrorMessage(error, '移动书签失败。') })
    }
  }

  const contentError = error instanceof Error ? error.message : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {reorderToast ? <NoticeToast notice={reorderToast} onClose={() => setReorderToast(null)} /> : null}

      <section className={topSectionClassName}>
        <div className="page-section relative z-10 bg-[var(--color-surface)] p-3 shadow-[var(--shadow-subtle)]">
          <div className="space-y-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[18px] font-semibold leading-6 text-[var(--color-text)]">{currentLabel}</h1>
                <span className="text-[12px] leading-4 text-[var(--color-text-secondary)]">{total} 条结果</span>
              </div>
              <p className="max-w-[720px] text-[13px] leading-5 text-[var(--color-text-secondary)]">{currentDescription}</p>
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
                <Button
                  leading={<Icon className="text-[14px]" name="upload" />}
                  onClick={() => setImportOpen(true)}
                  size="sm"
                  variant="secondary"
                >
                  导入
                </Button>
                {aiEnabled ? (
                  <Button
                    leading={<Icon className="text-[14px]" name="sparkles" />}
                    onClick={() => void handleAIReview()}
                    size="sm"
                    variant="secondary"
                  >
                    AI 整理
                  </Button>
                ) : (
                  <Tooltip label={aiDisabledReason}>
                    <span className="inline-flex">
                      <Button disabled leading={<Icon className="text-[14px]" name="sparkles" />} size="sm" variant="secondary">
                        AI 整理
                      </Button>
                    </span>
                  </Tooltip>
                )}
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

            <div className="min-h-[56px] rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
              <div className="flex h-full flex-wrap items-center gap-x-3 gap-y-2 text-[12px] leading-4 text-[var(--color-text-secondary)]">
                <span>{bookmarks.length} 条已加载</span>
                <span>{viewMode === 'list' ? '列表视图' : '卡片视图'}</span>
                <span>{reorderHint}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {hasSelection ? (
        <div className="pointer-events-none fixed right-4 top-24 z-30 sm:right-6">
          <Surface className="pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-[var(--shadow-elevated)]" tone="elevated">
            <div className="min-w-0">
              <p className="text-[13px] font-medium leading-5 text-[var(--color-text)]">已选择 {selectedIds.length} 项</p>
            </div>
            <Button onClick={() => setPendingDeleteIds(selectedIds)} size="sm" variant="danger">
              删除
            </Button>
            <Button onClick={clearSelection} size="sm" variant="ghost">
              取消
            </Button>
          </Surface>
        </div>
      ) : null}

      {notice ? <div className="mb-4 shrink-0"><NoticeBanner notice={notice} onClose={() => setNotice(null)} /></div> : null}

      <section className={contentSectionClassName} ref={isGridView ? gridScrollContainerRef : undefined}>
        {contentError ? (
          <StatePanel
            action={
              <Button onClick={() => window.location.reload()} size="sm" variant="primary">
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
            onDelete={(bookmarkId) => setPendingDeleteIds([bookmarkId])}
            onEdit={openEditModal}
            onFavorite={(bookmarkId) => void handleFavoriteToggle(bookmarkId)}
            onMoveToFolder={(bookmarkIds, folderId) => void handleMoveBookmarksToFolder(bookmarkIds, folderId)}
            onReorder={(orderedIds) => void handleReorder(orderedIds)}
            onToggleSelect={toggleSelection}
            searchQuery={searchQuery}
            selectedIds={new Set(selectedIds)}
          />
        ) : (
          <div className="relative z-0 space-y-3">
            <BookmarkGrid
              bookmarks={bookmarks}
              getFolderName={(folderId) => findFolderName(folders, folderId)}
              onDelete={(bookmarkId) => setPendingDeleteIds([bookmarkId])}
              onEdit={openEditModal}
              onFavorite={(bookmarkId) => void handleFavoriteToggle(bookmarkId)}
              searchQuery={searchQuery}
              selectedIds={new Set(selectedIds)}
            />
          </div>
        )}
      </section>

      <CreateBookmarkModal
        draft={createDraft}
        folders={folders}
        onChange={handleCreateDraftChange}
        onClose={closeCreateModal}
        onSubmit={handleCreate}
        open={createOpen}
        submitting={mutations.createBookmark.isPending}
        titleFetchMessage={titleFetchStatus.message}
        titleFetchState={titleFetchStatus.state}
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
        cleanedTitles={aiCleanedTitles}
        errorMessage={aiErrorMessage}
        key={`ai:${aiOpen ? 'open' : 'closed'}:${aiLoading ? 'loading' : 'idle'}:${aiPlans.map((plan) => plan.id).join('|')}:${aiErrorMessage ?? ''}`}
        loading={aiLoading}
        loadingMessage={aiLoadingMessage}
        onApply={(plan) => void handleAIApply(plan)}
        onClose={handleAIModalClose}
        onRetry={() => void requestAIPlans()}
        open={aiOpen}
        plans={aiPlans}
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
            className={`animate-pulse flex items-center gap-3 px-4 py-3 ${
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
        <div className="page-section animate-pulse space-y-4 p-4" key={index}>
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

function isTextSelectionTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}
