import { ExternalLink } from 'lucide-react'
import type { Bookmark } from '../types'
import SidePanelFrame from './SidePanelFrame'

export interface PreviewPanelProps {
  bookmark: Bookmark | null
  onClose: () => void
}

function openExternalURL(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

export default function PreviewPanel({ bookmark, onClose }: PreviewPanelProps) {
  const open = bookmark !== null

  const openButton = bookmark ? (
    <button
      type="button"
      aria-label="Open preview in new tab"
      onClick={() => openExternalURL(bookmark.url)}
      className="w-8 h-8 inline-flex items-center justify-center rounded-button cursor-pointer text-app-text2 bg-app-card border border-input-border shadow-app-sm hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--app-accent)]"
    >
      <ExternalLink size={15} aria-hidden="true" />
    </button>
  ) : null

  return (
    <SidePanelFrame
      open={open}
      width={480}
      title={bookmark?.title}
      subtitle={bookmark?.url}
      actions={openButton}
      onClose={onClose}
    >
      {bookmark && (
        <div className="relative h-full bg-app-bg">
          <iframe
            key={bookmark.id}
            src={bookmark.url}
            title={`Preview: ${bookmark.title}`}
            referrerPolicy="no-referrer"
            className="block w-full h-full border-0 bg-white"
          />
        </div>
      )}
    </SidePanelFrame>
  )
}
