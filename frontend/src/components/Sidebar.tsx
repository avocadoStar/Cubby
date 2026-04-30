import { useEffect } from 'react'
import { useFolderStore } from '../stores/folderStore'
import { Virtuoso } from 'react-virtuoso'
import FolderNode from './FolderNode'
import { Star, Search } from 'lucide-react'

export default function Sidebar() {
  const { visibleNodes, selectedId, select, loadChildren } = useFolderStore()

  useEffect(() => { loadChildren(null) }, [])

  return (
    <div className="w-[280px] min-w-[280px] border-r border-[#e8e8e8] flex flex-col bg-white h-full">
      <div className="pt-5 px-5 pb-3 text-lg font-semibold text-[#1a1a1a]">收藏夹</div>
      <div className="px-4 pb-2">
        <div className="flex items-center h-8 border border-[#d1d1d1] rounded px-2 gap-1.5">
          <Search size={14} stroke="#888" />
          <input
            className="flex-1 border-none outline-none text-[13px] bg-transparent"
            placeholder="搜索收藏夹"
          />
        </div>
      </div>
      <div
        className="flex items-center h-8 mx-1 px-2 rounded cursor-default select-none"
        style={{ background: selectedId === null ? '#E5F0FF' : 'transparent', margin: '0 4px' }}
        onClick={() => select(null)}
      >
        <Star size={16} stroke={selectedId === null ? '#0078D4' : '#1a1a1a'} strokeWidth={1.6} />
        <span className="ml-2.5 text-[13px] text-[#1a1a1a]">所有书签</span>
      </div>
      <div className="flex-1">
        <Virtuoso
          totalCount={visibleNodes.length}
          itemContent={(i) => (
            <FolderNode node={visibleNodes[i].node} depth={visibleNodes[i].depth} />
          )}
        />
      </div>
    </div>
  )
}
