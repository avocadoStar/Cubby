import { useState } from 'react'
import { highlightMatches } from '../lib/highlight'
import { useSearchStore } from '../stores/searchStore'
import { useFolderStore } from '../stores/folderStore'
import type { SearchResultItem } from '../types'
import Spinner from './Spinner'

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
      <div className="px-4 py-2 text-body border-b flex items-center gap-2 text-app-text2 border-divider">
        {loading && (
          <Spinner size="sm" />
        )}
        找到了与"<span className="font-medium text-app-text">{query}</span>"相符的 {results.length} 结果
      </div>
      <div className="flex-1 overflow-auto">
        <div className="pt-1">
          {results.map((r, idx) => (
            <div
              key={`${r.kind}-${r.id}`}
              className="flex items-center mx-1 px-2 rounded select-none cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--app-accent)] h-8 rounded-card transition-[background,box-shadow] duration-[120ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              style={{
                background: hoveredIdx === idx ? 'var(--app-hover)' : 'transparent',
                boxShadow: hoveredIdx === idx ? 'var(--tree-hover-shadow)' : 'none',
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
                <div className="flex-shrink-0 mr-2 flex items-center justify-center text-small w-4 h-4 bg-[var(--row-icon-bg)] shadow-[var(--row-icon-shadow)] rounded-[var(--row-icon-radius)] text-app-text2">
                  {r.title.charAt(0)}
                </div>
              )}
              <span className="flex-1 truncate text-body text-app-text">
                {highlightMatches(r.title, query).map((seg, i) => (
                  <span key={i} style={seg.highlight ? { background: 'var(--search-highlight)', borderRadius: 2, padding: '0 1px' } : undefined}>
                    {seg.text}
                  </span>
                ))}
              </span>
              {r.kind === 'bookmark' && r.url && (
                <span className="shrink truncate text-xs ml-4 max-w-[200px] text-app-text2">
                  {highlightMatches(r.url, query).map((seg, i) => (
                    <span key={i} style={seg.highlight ? { background: 'var(--search-highlight)', borderRadius: 2, padding: '0 1px' } : undefined}>
                      {seg.text}
                    </span>
                  ))}
                </span>
              )}
              {r.kind === 'folder' && (
                <span className="flex-shrink-0 text-xs ml-4 text-app-text2">文件夹</span>
              )}
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="text-center text-body py-12 text-[var(--app-text3)]">没有找到相关结果</div>
          )}
        </div>
      </div>
    </>
  )
}
