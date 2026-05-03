import { useFolderStore } from '../stores/folderStore'

export default function Breadcrumb() {
  const { selectedId, folderMap } = useFolderStore()

  const path: { id: string | null; name: string }[] = [{ id: null, name: '收藏夹' }]
  let current = selectedId
  while (current) {
    const f = folderMap.get(current)
    if (!f) break
    path.unshift({ id: f.id, name: f.name })
    current = f.parent_id
  }

  return (
    <div className="flex items-center text-body">
      {path.map((p, i) => (
        <span key={p.id ?? 'root'} className="flex items-center">
          {i > 0 && <span className="text-[#999] mx-0.5">/</span>}
          <span
            className="px-1 rounded-sm cursor-default"
            style={{ color: i === path.length - 1 ? '#1a1a1a' : '#0078D4' }}
            onClick={() => useFolderStore.getState().select(p.id)}
          >
            {p.name}
          </span>
        </span>
      ))}
    </div>
  )
}
