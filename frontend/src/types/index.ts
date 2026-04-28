export interface Folder {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
  children?: Folder[]
}

export interface Bookmark {
  id: string
  title: string
  url: string
  description: string
  favicon_url: string
  thumbnail_url: string
  folder_id: string | null
  is_favorite: boolean
  sort_order: number
  metadata_fetched: boolean
  created_at: string
  updated_at: string
}

export interface BookmarkMutation {
  title: string
  url: string
  description?: string
  folder_id?: string | null
  is_favorite?: boolean
}

export interface BookmarkListResult {
  items: Bookmark[]
  total: number
  page: number
  page_size: number
}

export interface AISuggestion {
  bookmark_id: string
  title: string
  suggested_folder: string
  new_folder_name?: string
  confidence: number
  reason: string
}

export interface ImportResult {
  created: number
  skipped: number
  folders_created: string[]
}

export interface SettingsResponse {
  settings: Record<string, string>
}
