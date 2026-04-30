import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import BookmarkRow from './BookmarkRow'
import BatchActionBar from './BatchActionBar'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useFolderStore } from '../stores/folderStore'
import { useEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'

export default function MainLayout() {
  const { bookmarks, load } = useBookmarkStore()
  const { selectedId } = useFolderStore()

  useEffect(() => { load(null) }, [])

  useEffect(() => { load(selectedId) }, [selectedId])

  return (
    <div className="flex h-screen bg-white relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar />
        <BatchActionBar />
        <div className="flex-1">
          <Virtuoso
            totalCount={bookmarks.length}
            itemContent={(i) => <BookmarkRow bookmark={bookmarks[i]} />}
          />
        </div>
      </div>
    </div>
  )
}
