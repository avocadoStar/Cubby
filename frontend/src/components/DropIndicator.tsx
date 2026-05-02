import { createPortal } from 'react-dom'
import { useDndStore } from '../stores/dndStore'

export default function DropIndicator() {
  const indicatorRect = useDndStore((s) => s.indicatorRect)
  if (!indicatorRect) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: indicatorRect.top,
        left: indicatorRect.left,
        width: indicatorRect.width,
        height: 3,
        backgroundColor: '#0078D4',
        borderRadius: 1.5,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />,
    document.body,
  )
}
