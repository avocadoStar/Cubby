import type { MutableRefObject } from 'react'

interface DragOverlayContentProps {
  activeItem: { kind: string; title: string } | null
  multiDragRef: MutableRefObject<string[]>
}

export default function DragOverlayContent({ activeItem, multiDragRef }: DragOverlayContentProps) {
  if (!activeItem) return null

  return (
    <div
      className="flex items-center rounded select-none bg-app-card rounded-card shadow-app-lg"
      style={{
        height: 32,
        maxWidth: 200,
        paddingLeft: 8,
        paddingRight: 8,
        opacity: 0.85,
        transform: 'scale(1.02)',
      }}
    >
      {activeItem.kind === 'bookmark' ? (
        <div className="flex-shrink-0 rounded-sm flex items-center justify-center text-small bg-app-hover text-app-text2"
          style={{ width: 16, height: 16 }}>
          {(activeItem.title).charAt(0)}
        </div>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--folder-icon-fill)" stroke="var(--folder-icon-stroke)" strokeWidth="0.6">
          <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      )}
      <span className="ml-2 truncate text-body text-app-text">
        {activeItem.title}
      </span>
      {multiDragRef.current.length > 1 && (
        <span className="ml-2 flex-shrink-0 rounded-full text-caption px-1.5 py-0.5 leading-none bg-app-accent text-[var(--text-on-accent)]"
          style={{ minWidth: 18, textAlign: 'center' }}>
          {multiDragRef.current.length}
        </span>
      )}
    </div>
  )
}
