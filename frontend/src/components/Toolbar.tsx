import Breadcrumb from './Breadcrumb'
import MoreMenu from './MoreMenu'
import { useFolderStore } from '../stores/folderStore'
import { useState } from 'react'
import CreateFolderModal from './CreateFolderModal'

export default function Toolbar() {
  const { selectedId } = useFolderStore()
  const [showCreateFolder, setShowCreateFolder] = useState(false)

  return (
    <>
      <div className="flex items-center gap-1 px-5 py-2 border-b border-[#e8e8e8]" style={{ height: 48 }}>
        <Breadcrumb />
        <div className="flex-1" />
        <button className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default">
          <svg aria-hidden="true" fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M9.1 2.9a1 1 0 011.8 0l1.93 3.91 4.31.63a1 1 0 01.56 1.7l-.55.54a5.47 5.47 0 00-1-.43l.85-.82-4.32-.63a1 1 0 01-.75-.55L10 3.35l-1.93 3.9a1 1 0 01-.75.55L3 8.43l3.12 3.04a1 1 0 01.29.89l-.74 4.3 3.34-1.76c.03.36.09.7.18 1.04l-3.05 1.6a1 1 0 01-1.45-1.05l.73-4.3L2.3 9.14a1 1 0 01.56-1.7l4.31-.63L9.1 2.9z"/>
            <path d="M19 14.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z"/>
          </svg>
          <span>添加收藏夹</span>
        </button>
        <button
          className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded bg-transparent text-[13px] text-[#1a1a1a] hover:bg-[#f5f5f5] cursor-default"
          onClick={() => setShowCreateFolder(true)}
        >
          <svg fill="currentColor" width="20" height="20" viewBox="0 0 20 20">
            <path d="M4.5 3A2.5 2.5 0 002 5.5v9A2.5 2.5 0 004.5 17h5.1c-.16-.32-.3-.65-.4-1H4.5A1.5 1.5 0 013 14.5v-7h4.07c.41 0 .8-.17 1.09-.47L9.62 5.5h5.88c.83 0 1.5.67 1.5 1.5v2.6c.36.18.7.4 1 .66V7a2.5 2.5 0 00-2.5-2.5H9.67l-1.6-1.2a1.5 1.5 0 00-.9-.3H4.5zM3 5.5C3 4.67 3.67 4 4.5 4h2.67c.1 0 .21.04.3.1l1.22.92-1.26 1.32a.5.5 0 01-.36.16H3v-1zm16 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-4-2a.5.5 0 00-1 0V14h-1.5a.5.5 0 000 1H14v1.5a.5.5 0 001 0V15h1.5a.5.5 0 000-1H15v-1.5z" fillRule="nonzero"/>
          </svg>
          <span>添加文件夹</span>
        </button>
        <MoreMenu />
      </div>
      {showCreateFolder && <CreateFolderModal parentId={selectedId} onClose={() => setShowCreateFolder(false)} />}
    </>
  )
}
