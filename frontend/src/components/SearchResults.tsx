import { useState } from 'react'
import { highlightMatches } from '../lib/highlight'
import { useSearchStore } from '../stores/searchStore'
import { useFolderStore } from '../stores/folderStore'
import type { SearchResultItem } from '../types'

function openExternalURL(url: string) {
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}

interface SearchResultsProps {
  query: string
  results: SearchResultItem[]
}

export default function SearchResults({ query, results }: SearchResultsProps) {
  const loading = useSearchStore(s => s.loading)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <>
      <div className="px-4 py-2 text-body border-b flex items-center gap-2" style={{ color: 'var(--app-text2)', borderColor: 'var(--divider-color)' }}>
        {loading && (
          <span
            className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--app-accent)', borderTopColor: 'transparent' }}
          />
        )}
        找到了与"<span className="font-medium" style={{ color: 'var(--app-text)' }}>{query}</span>"相符的 {results.length} 结果
      </div>
      <div className="flex-1" style={{ overflow: 'auto' }}>
        <div style={{ paddingTop: 4 }}>
          {results.map((r, idx) => (
            <div
              key={`${r.kind}-${r.id}`}
              className="flex items-center mx-1 px-2 rounded select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--app-accent)]"
              style={{
                height: 32,
                borderRadius: 'var(--card-radius)',
                background: hoveredIdx === idx ? 'var(--app-hover)' : 'transparent',
                boxShadow: hoveredIdx === idx ? 'var(--tree-hover-shadow)' : 'none',
                transition: 'background 0.12s ease, box-shadow 0.12s ease',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              tabIndex={0}
              onClick={() => {
                if (r.kind === 'folder') {
                  useSearchStore.getState().clearSearch()
                  useFolderStore.getState().select(r.id)
                } else {
                  openExternalURL(r.url!)
                }
              }}
            >
              {r.kind === 'folder' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--folder-icon-fill)" stroke="var(--folder-icon-stroke)" strokeWidth="0.6" className="flex-shrink-0 mr-2">
                  <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                </svg>
              ) : (
                <div className="flex-shrink-0 mr-2 flex items-center justify-center text-small" style={{ width: 16, height: 16, background: 'var(--row-icon-bg)', boxShadow: 'var(--row-icon-shadow)', borderRadius: 'var(--row-icon-radius)', color: 'var(--app-text2)' }}>
                  {r.title.charAt(0)}
                </div>
              )}
              <span className="flex-1 truncate text-body" style={{ color: 'var(--app-text)' }}>
                {highlightMatches(r.title, query).map((seg, i) => (
                  <span key={i} style={seg.highlight ? { background: 'var(--search-highlight)', borderRadius: 2, padding: '0 1px' } : undefined}>
                    {seg.text}
                  </span>
                ))}
              </span>
              {r.kind === 'bookmark' && r.url && (
                <span className="shrink truncate text-xs ml-4" style={{ maxWidth: 200, color: 'var(--app-text2)' }}>
                  {highlightMatches(r.url, query).map((seg, i) => (
                    <span key={i} style={seg.highlight ? { background: 'var(--search-highlight)', borderRadius: 2, padding: '0 1px' } : undefined}>
                      {seg.text}
                    </span>
                  ))}
                </span>
              )}
              {r.kind === 'folder' && (
                <span className="flex-shrink-0 text-xs ml-4" style={{ color: 'var(--app-text2)' }}>文件夹</span>
              )}
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="text-center text-body py-12" style={{ color: 'var(--app-text3)' }}>没有找到相关结果</div>
          )}
        </div>
      </div>
    </>
  )
}
