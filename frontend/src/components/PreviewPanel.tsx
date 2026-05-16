import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ExternalLink, Maximize2, Minimize2, Monitor, Smartphone } from 'lucide-react'
import type { Bookmark } from '../types'
import { api } from '../services/api'
import SidePanelFrame from './SidePanelFrame'
import { calculatePreviewPanelWidth, clampPreviewPanelWidth, compatibleMobilePreviewSandbox, previewPanelWidthBounds } from './previewPanelResize'

export interface PreviewPanelProps {
  bookmark: Bookmark | null
  onClose: () => void
}

type PreviewMode = 'mobile' | 'desktop'

const previewPanelWidthKey = 'cubby.previewPanel.width'
const previewLoadTimeoutMs = 8000

function openExternalURL(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

function readStoredPanelWidth() {
  if (typeof window === 'undefined') return previewPanelWidthBounds.min
  const value = Number(window.localStorage.getItem(previewPanelWidthKey))
  return Number.isFinite(value) ? clampPreviewPanelWidth(value) : previewPanelWidthBounds.min
}

export default function PreviewPanel({ bookmark, onClose }: PreviewPanelProps) {
  const open = bookmark !== null
  const [mode, setMode] = useState<PreviewMode>('mobile')
  const [panelWidth, setPanelWidth] = useState(readStoredPanelWidth)
  const [maximized, setMaximized] = useState(false)
  const [sessionSrc, setSessionSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishResizeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setMode('mobile')
    setSessionSrc(null)
    setLoading(false)
    setFailed(false)
  }, [bookmark?.id])

  useEffect(() => {
    if (!bookmark || mode !== 'mobile') return

    let cancelled = false
    setSessionSrc(null)
    setLoading(true)
    setFailed(false)

    api.createPreviewSession(bookmark.url, 'mobile')
      .then((session) => {
        if (cancelled) return
        setSessionSrc(session.src)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
        setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [bookmark, mode])

  const frameSrc = bookmark ? (mode === 'desktop' ? bookmark.url : sessionSrc) : null

  useEffect(() => {
    if (!open || !frameSrc) return
    setLoading(true)
    setFailed(false)
    if (loadTimer.current) window.clearTimeout(loadTimer.current)
    loadTimer.current = window.setTimeout(() => {
      setLoading(false)
      setFailed(true)
    }, previewLoadTimeoutMs)

    return () => {
      if (loadTimer.current) {
        window.clearTimeout(loadTimer.current)
        loadTimer.current = null
      }
    }
  }, [frameSrc, open])

  function handleFrameLoad() {
    if (loadTimer.current) {
      window.clearTimeout(loadTimer.current)
      loadTimer.current = null
    }
    setLoading(false)
  }

  function handleFrameError() {
    if (loadTimer.current) {
      window.clearTimeout(loadTimer.current)
      loadTimer.current = null
    }
    setLoading(false)
    setFailed(true)
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (maximized) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = panelWidth
    const handle = event.currentTarget
    const pointerId = event.pointerId
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    let finalWidth = startWidth
    let finished = false

    handle.setPointerCapture(pointerId)
    setIsResizing(true)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const nextWidth = calculatePreviewPanelWidth({ startWidth, startX, currentX: moveEvent.clientX })
      finalWidth = nextWidth
      setPanelWidth(nextWidth)
    }

    const finishResize = (currentX?: number) => {
      if (finished) return
      finished = true
      if (typeof currentX === 'number') {
        finalWidth = calculatePreviewPanelWidth({ startWidth, startX, currentX })
        setPanelWidth(finalWidth)
      }
      handle.removeEventListener('lostpointercapture', handleLostCapture)
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId)
      }
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.localStorage.setItem(previewPanelWidthKey, String(finalWidth))
      setIsResizing(false)
      finishResizeRef.current = null
    }

    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return
      finishResize(upEvent.clientX)
    }
    const handleCancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return
      finishResize()
    }
    const handleLostCapture = (lostEvent: PointerEvent) => {
      if (lostEvent.pointerId !== pointerId) return
      finishResize()
    }

    finishResizeRef.current = () => finishResize()
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    handle.addEventListener('lostpointercapture', handleLostCapture)
  }

  useEffect(() => {
    return () => finishResizeRef.current?.()
  }, [])

  const width = maximized ? previewPanelWidthBounds.max : panelWidth

  const openButton = bookmark ? (
    <button
      type="button"
      aria-label="Open preview in new tab"
      title="Open preview in new tab"
      onClick={() => openExternalURL(bookmark.url)}
      className="w-8 h-8 inline-flex items-center justify-center rounded-button cursor-pointer text-app-text2 bg-app-card border border-input-border shadow-app-sm hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]"
    >
      <ExternalLink size={15} aria-hidden="true" />
    </button>
  ) : null

  const modeButtons = bookmark ? (
    <div className="inline-flex h-8 rounded-button border border-input-border overflow-hidden bg-app-card shadow-app-sm">
      <button
        type="button"
        aria-label="Mobile view"
        title="Mobile view"
        aria-pressed={mode === 'mobile'}
        onClick={() => setMode('mobile')}
        className={`w-8 inline-flex items-center justify-center cursor-pointer hover:bg-app-hover ${mode === 'mobile' ? 'text-app-text bg-app-hover' : 'text-app-text2'}`}
      >
        <Smartphone size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Desktop view"
        title="Desktop view"
        aria-pressed={mode === 'desktop'}
        onClick={() => setMode('desktop')}
        className={`w-8 inline-flex items-center justify-center cursor-pointer border-l border-input-border hover:bg-app-hover ${mode === 'desktop' ? 'text-app-text bg-app-hover' : 'text-app-text2'}`}
      >
        <Monitor size={14} aria-hidden="true" />
      </button>
    </div>
  ) : null

  const maximizeButton = bookmark ? (
    <button
      type="button"
      aria-label={maximized ? 'Restore preview width' : 'Maximize preview width'}
      title={maximized ? 'Restore preview width' : 'Maximize preview width'}
      onClick={() => setMaximized((value) => !value)}
      className="w-8 h-8 inline-flex items-center justify-center rounded-button cursor-pointer text-app-text2 bg-app-card border border-input-border shadow-app-sm hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]"
    >
      {maximized ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
    </button>
  ) : null

  return (
    <SidePanelFrame
      open={open}
      width={width}
      resizing={isResizing}
      title={bookmark?.title}
      subtitle={bookmark?.url}
      actions={(
        <>
          {modeButtons}
          {maximizeButton}
          {openButton}
        </>
      )}
      onClose={onClose}
    >
      {bookmark && (
        <div className="relative h-full bg-app-bg">
          {!maximized && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize preview panel"
              onPointerDown={startResize}
              className="absolute left-0 top-0 z-20 h-full w-2 -translate-x-1 cursor-ew-resize"
            />
          )}
          {frameSrc && !failed && (
            <iframe
              key={`${bookmark.id}-${mode}-${frameSrc}`}
              src={frameSrc}
              title={`Preview: ${bookmark.title}`}
              referrerPolicy="no-referrer"
              sandbox={mode === 'mobile' ? compatibleMobilePreviewSandbox : undefined}
              onLoad={handleFrameLoad}
              onError={handleFrameError}
              style={{ pointerEvents: isResizing ? 'none' : undefined }}
              className="block w-full h-full border-0 bg-white"
            />
          )}
          {(loading || (!frameSrc && mode === 'mobile')) && !failed && (
            <div className="absolute inset-0 grid place-items-center bg-app-bg text-[var(--fs--1)] text-app-text2">
              Loading preview...
            </div>
          )}
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-app-bg">
              <div className="w-full max-w-sm rounded-card border border-app-border bg-app-card p-4 shadow-app-sm">
                <div className="text-[var(--fs-0)] font-semibold text-app-text truncate">{bookmark.title}</div>
                <div className="mt-1 text-[var(--fs--1)] text-app-text2 break-all">{bookmark.url}</div>
                <button
                  type="button"
                  onClick={() => openExternalURL(bookmark.url)}
                  className="mt-4 h-9 px-3 inline-flex items-center gap-2 rounded-button cursor-pointer text-app-text bg-app-card border border-input-border shadow-app-sm hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Open in new tab
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SidePanelFrame>
  )
}
