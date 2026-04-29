import { normalizeBookmarkUrl } from './url'

export function buildFallbackFaviconUrl(url: string) {
  const normalized = normalizeBookmarkUrl(url)
  if ('error' in normalized) {
    return ''
  }

  try {
    const hostname = new URL(normalized.normalizedUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return ''
  }
}
