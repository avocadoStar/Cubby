import { useEffect, useState } from 'react'
import MobileNav from './MobileNav'
import MobileSearch from './MobileSearch'
import MobileBookmarkList from './MobileBookmarkList'
import MobileFilterDrawer from './MobileFilterDrawer'
import MobileSettings from './MobileSettings'
import MobileBottomSheet from './MobileBottomSheet'
import ToastContainer from '../Toast'
import ContextMenu from '../ContextMenu'
import { useBookmarkStore } from '../../stores/bookmarkStore'
import { useFolderStore } from '../../stores/folderStore'

export default function MobileLayout() {
  const [showFilters, setShowFilters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [notesBookmarkId, setNotesBookmarkId] = useState<string | null>(null)
  const { bookmarks } = useBookmarkStore()
  const { loadChildren } = useFolderStore()

  useEffect(() => { loadChildren(null) }, [loadChildren])

  const notesBookmark = notesBookmarkId
    ? bookmarks.find(b => b.id === notesBookmarkId) ?? null
    : null

  return (
    <div className="relative w-full h-dvh overflow-hidden flex flex-col bg-app-bg">
      <ContextMenu />
      <MobileNav onOpenSettings={() => setShowSettings(true)} />
      <MobileSearch onOpenFilters={() => setShowFilters(true)} />
      <MobileBookmarkList onOpenNotes={(id) => setNotesBookmarkId(prev => prev === id ? null : id)} />

      <MobileFilterDrawer open={showFilters} onClose={() => setShowFilters(false)} />
      <MobileSettings open={showSettings} onClose={() => setShowSettings(false)} />
      <MobileBottomSheet bookmark={notesBookmark} onClose={() => setNotesBookmarkId(null)} />
      <ToastContainer />
    </div>
  )
}
