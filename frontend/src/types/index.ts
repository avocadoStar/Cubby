export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_key: string
  version: number
  has_children: boolean
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  icon: string
  folder_id: string | null
  sort_key: string
  version: number
  notes: string
  created_at: string
  updated_at: string
}

export interface SearchResultItem {
  kind: 'bookmark' | 'folder'
  id: string
  title: string
  url?: string | null
  folder_id?: string | null
  parent_id?: string | null
}

export interface MoveRequest {
  id: string
  parent_id?: string | null
  folder_id?: string | null
  prev_id?: string | null
  next_id?: string | null
  version: number
}

export interface BatchMoveItem {
  kind: 'bookmark' | 'folder'
  id: string
  parent_id: string | null
  prev_id?: string | null
  next_id?: string | null
  optimistic_sort_key?: string
  version: number
}

export interface BatchMoveResponse {
  folders: Folder[]
  bookmarks: Bookmark[]
}

