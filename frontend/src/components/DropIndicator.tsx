import { createPortal } from 'react-dom'
import { useDndStore } from '../stores/dndStore'

export default function DropIndicator() {
  const indicatorRect = useDndStore((s) => s.indicatorRect)
  if (!indicatorRect) return null

  return createPortal(
    <div
      className="fixed h-[3px] rounded-sm z-[9999] pointer-events-none bg-app-accent"
      style={{
        top: indicatorRect.top,
        left: indicatorRect.left,
        width: indicatorRect.width,
      }}
    />,
    document.body,
  )
}
