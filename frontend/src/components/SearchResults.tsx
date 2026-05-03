import { highlightMatches } from '../lib/highlight'
import { useSearchStore } from '../stores/searchStore'
import { useFolderStore } from '../stores/folderStore'
import type { SearchResultItem } from '../types'

interface SearchResultsProps {
  query: string
  results: SearchResultItem[]
}

export default function SearchResults({ query, results }: SearchResultsProps) {
  return (
    <>
      <div className="px-4 py-2 text-body text-[#666] border-b border-[#e8e8e8]">
        找到了与"<span className="text-[#1a1a1a] font-medium">{query}</span>"相符的 {results.length} 结果
      </div>
      <div className="flex-1" style={{ overflow: 'auto' }}>
        <div style={{ paddingTop: 4 }}>
          {results.map((r) => (
            <div
              key={`${r.kind}-${r.id}`}
              className="flex items-center mx-1 px-2 rounded select-none cursor-default"
              style={{ height: 32 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              onClick={() => {
                if (r.kind === 'folder') {
                  useSearchStore.getState().clearSearch()
                  useFolderStore.getState().select(r.id)
                } else {
                  window.open(r.url!, '_blank')
                }
              }}
            >
              {r.kind === 'folder' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#F0C54F" stroke="#D4A830" strokeWidth="0.6" className="flex-shrink-0 mr-2">
                  <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                </svg>
              ) : (
                <div className="flex-shrink-0 mr-2 rounded-sm flex items-center justify-center text-small text-[#666]" style={{ width: 16, height: 16, background: '#e8e8e8' }}>
                  {r.title.charAt(0)}
                </div>
              )}
              <span className="flex-1 truncate text-body text-[#1a1a1a]">
                {highlightMatches(r.title, query).map((seg, i) => (
                  <span key={i} style={seg.highlight ? { background: '#FFF2A8', borderRadius: 2, padding: '0 1px' } : undefined}>
                    {seg.text}
                  </span>
                ))}
              </span>
              {r.kind === 'bookmark' && r.url && (
                <span className="flex-shrink-0 truncate text-xs text-[#888] ml-4" style={{ maxWidth: 320 }}>
                  {highlightMatches(r.url, query).map((seg, i) => (
                    <span key={i} style={seg.highlight ? { background: '#FFF2A8', borderRadius: 2, padding: '0 1px' } : undefined}>
                      {seg.text}
                    </span>
                  ))}
                </span>
              )}
              {r.kind === 'folder' && (
                <span className="flex-shrink-0 text-xs text-[#888] ml-4">文件夹</span>
              )}
            </div>
          ))}
          {results.length === 0 && query && (
            <div className="text-center text-body text-[#999] py-12">没有找到相关结果</div>
          )}
        </div>
      </div>
    </>
  )
}
