import { useSearchStore } from '../../stores/searchStore'

export default function MobileSearch({ onOpenFilters }: { onOpenFilters: () => void }) {
  const { query, search } = useSearchStore()

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '8px 12px',
      background: 'var(--app-card)', borderBottom: '1px solid var(--divider-color)',
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <svg style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          width: 16, height: 16, color: 'var(--app-text3)',
        }} fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
        </svg>
        <input
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="搜索书签"
          style={{
            width: '100%', height: 38, border: '1px solid var(--app-border)', borderRadius: 8,
            padding: '0 12px 0 36px', fontSize: 14,
            background: 'var(--app-hover)', color: 'var(--app-text)', outline: 'none',
          }}
        />
      </div>
      <button onClick={onOpenFilters} style={{
        height: 38, padding: '0 14px', border: '1px solid var(--app-border)', borderRadius: 8,
        fontSize: 13, fontWeight: 500, background: 'var(--app-card)',
        color: 'var(--app-text2)', cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Filters
      </button>
    </div>
  )
}
