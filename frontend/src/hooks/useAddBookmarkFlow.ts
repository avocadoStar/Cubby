import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import {
  DUPLICATE_URL_MESSAGE,
  hasFetchedBookmarkTitle,
  isDuplicateURLConflict,
  mergeFetchedBookmarkTitle,
  normalizeBookmarkUrlForSubmit,
  normalizeBookmarkUrlInput,
} from '../lib/addBookmark'
import { shouldFetchMetadata } from '../lib/metadata'

interface SubmitCallbacks {
  onMissingTitle?: () => void
  onMissingUrl?: () => void
}

interface UseAddBookmarkFlowOptions {
  selectedId: string | null
  upsertOne: (bookmark: Bookmark) => void
  mergeFetchedTitle?: (currentTitle: string, fetchedTitle: string | null | undefined) => string
  clearTitleErrorOnFetchedTitle?: boolean
}

export function useAddBookmarkFlow({
  selectedId,
  upsertOne,
  mergeFetchedTitle = mergeFetchedBookmarkTitle,
  clearTitleErrorOnFetchedTitle = false,
}: UseAddBookmarkFlowOptions) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [titleError, setTitleError] = useState('')
  const [urlError, setUrlError] = useState('')
  const [duplicateUrlError, setDuplicateUrlError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const [saving, setSaving] = useState(false)
  const urlTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const clearTransient = () => {
    clearTimeout(urlTimer.current)
    setTitleError('')
    setUrlError('')
    setDuplicateUrlError('')
    setFetchingTitle(false)
  }

  const reset = (force = false) => {
    if (saving && !force) return false
    clearTimeout(urlTimer.current)
    setTitle('')
    setUrl('')
    setIcon('')
    setTitleError('')
    setUrlError('')
    setDuplicateUrlError('')
    setFetchingTitle(false)
    setSaving(false)
    return true
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
        setTitle((prev) => mergeFetchedTitle(prev, meta.title))
        if (clearTitleErrorOnFetchedTitle && hasFetchedBookmarkTitle(meta.title)) {
          setTitleError('')
        }
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
  }, [url, mergeFetchedTitle, clearTitleErrorOnFetchedTitle])

  const handleUrlChange = (value: string) => {
    setIcon('')
    setUrlError('')
    setDuplicateUrlError('')
    setUrl(normalizeBookmarkUrlInput(value))
  }

  const handleTitleChange = (value: string) => {
    setTitleError('')
    setTitle(value)
  }

  const submit = async (
    event?: FormEvent<HTMLFormElement>,
    callbacks: SubmitCallbacks = {},
  ): Promise<Bookmark | null> => {
    event?.preventDefault()
    if (saving) return null

    const hasTitle = Boolean(title.trim())
    const hasUrl = Boolean(url.trim())
    setTitleError(hasTitle ? '' : '请输入收藏夹名称')
    setUrlError(hasUrl ? '' : '请输入收藏夹 URL')
    if (!hasTitle || !hasUrl) {
      if (!hasTitle) callbacks.onMissingTitle?.()
      else callbacks.onMissingUrl?.()
      return null
    }

    const normalizedUrl = normalizeBookmarkUrlForSubmit(url)
    setSaving(true)
    try {
      const bookmark = await api.createBookmark(title.trim(), normalizedUrl, selectedId, icon)
      upsertOne(bookmark)
      return bookmark
    } catch (e) {
      setSaving(false)
      if (isDuplicateURLConflict(e)) {
        setDuplicateUrlError(DUPLICATE_URL_MESSAGE)
        return null
      }
      throw e
    }
  }

  return {
    title,
    url,
    titleError,
    urlError,
    duplicateUrlError,
    fetchingTitle,
    saving,
    setTitle,
    handleTitleChange,
    handleUrlChange,
    clearTransient,
    reset,
    submit,
  }
}
