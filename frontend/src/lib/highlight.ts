export interface HighlightSegment {
  text: string
  highlight: boolean
}

export function highlightMatches(text: string, query: string): HighlightSegment[] {
  if (!query || !text) return [{ text, highlight: false }]

  const segments: HighlightSegment[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let cursor = 0

  while (cursor < lowerText.length) {
    const idx = lowerText.indexOf(lowerQuery, cursor)
    if (idx === -1) {
      segments.push({ text: text.slice(cursor), highlight: false })
      break
    }
    if (idx > cursor) {
      segments.push({ text: text.slice(cursor, idx), highlight: false })
    }
    segments.push({ text: text.slice(idx, idx + lowerQuery.length), highlight: true })
    cursor = idx + lowerQuery.length
  }

  return segments
}
