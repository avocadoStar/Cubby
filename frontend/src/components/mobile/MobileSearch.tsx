import { useSearchStore } from '../../stores/searchStore'

export default function MobileSearch({ onOpenFilters }: { onOpenFilters: () => void }) {
  const { query, search } = useSearchStore()

  return (
    <div className="flex gap-2 py-2 px-3 bg-app-card border-b border-divider shrink-0">
      <div className="flex-1 relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-text3)]" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
        </svg>
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="搜索书签"
          className="w-full h-[38px] border border-app-border rounded-input pl-9 pr-3 text-sm bg-app-hover text-app-text outline-none"
        />
      </div>
      <button onClick={onOpenFilters}
        className="h-[38px] px-3.5 border border-app-border rounded-button text-[13px] font-medium bg-app-card text-app-text2 cursor-pointer whitespace-nowrap">
        筛选
      </button>
    </div>
  )
}
