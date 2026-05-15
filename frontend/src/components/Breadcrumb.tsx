import { useFolderStore } from '../stores/folderStore'
import { buildBreadcrumbPath } from '../lib/breadcrumb'

export default function Breadcrumb() {
  const { selectedId, folderMap } = useFolderStore()
  const path = buildBreadcrumbPath(selectedId, folderMap)

  return (
    <div className="flex items-center text-body">
      {path.map((p, i) => (
        <span key={p.id ?? 'root'} className="flex items-center">
          {i > 0 && <span className="mx-0.5" style={{ color: 'var(--app-text3)' }}>/</span>}
          <span
            className="px-1 rounded-sm cursor-pointer"
            style={{ color: i === path.length - 1 ? 'var(--app-text)' : 'var(--app-accent)' }}
            onClick={() => useFolderStore.getState().select(p.id)}
          >
            {p.name}
          </span>
        </span>
      ))}
    </div>
  )
}
