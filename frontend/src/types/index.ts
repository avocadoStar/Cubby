export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_key: string
  version: number
  created_at: string
  updated_at: string
}

export interface Bookmark {
  id: string
  title: string
  url: string
  folder_id: string | null
  sort_key: string
  version: number
  created_at: string
  updated_at: string
}

export interface MoveRequest {
  id: string
  parent_id?: string | null
  folder_id?: string | null
  prev_id?: string | null
  next_id?: string | null
  version: number
}

export interface BatchMoveRequest {
  ids: string[]
  target_folder_id: string
  anchor_id: string
  position: 'before' | 'after'
}
