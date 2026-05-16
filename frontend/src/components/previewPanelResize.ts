export const compatibleMobilePreviewSandbox = 'allow-scripts allow-same-origin allow-forms allow-popups'

const minPanelWidth = 480
const maxPanelWidth = 1100

export interface PreviewPanelResizeInput {
  startWidth: number
  startX: number
  currentX: number
}

export function clampPreviewPanelWidth(width: number) {
  return Math.min(maxPanelWidth, Math.max(minPanelWidth, width))
}

export function calculatePreviewPanelWidth({ startWidth, startX, currentX }: PreviewPanelResizeInput) {
  return clampPreviewPanelWidth(startWidth + startX - currentX)
}

export const previewPanelWidthBounds = {
  min: minPanelWidth,
  max: maxPanelWidth,
}
