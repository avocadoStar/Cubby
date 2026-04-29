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

export interface AITitleCleanupChange {
  bookmark_id: string
  old_title: string
  new_title: string
}

export interface AIPlanItem {
  bookmark_id: string
  title: string
  confidence: number
}

export interface AIPlanFolder {
  name: string
  items: AIPlanItem[]
}

export interface AIPlan {
  id: string
  name: string
  description: string
  confidence_summary: string
  folders: AIPlanFolder[]
}

export interface AIPlanResponse {
  cleaned_titles?: AITitleCleanupChange[]
  plans?: AIPlan[]
  session_id?: string
  undo_token?: string
}

export interface AuthStatusResponse {
  authenticated: boolean
}

export interface ImportResult {
  created: number
  skipped: number
  folders_created: string[]
}

export type ImportTaskStatus = 'queued' | 'running' | 'completed' | 'failed'

export type ImportTaskStage =
  | 'queued'
  | 'file_received'
  | 'parsing'
  | 'creating_folders'
  | 'importing_bookmarks'
  | 'completed'
  | 'failed'

export interface ImportTaskSnapshot {
  error?: string
  message?: string
  progress: number
  result?: ImportResult
  stage: ImportTaskStage
  status: ImportTaskStatus
  task_id: string
}

export interface SettingsResponse {
  settings: Record<string, string>
}
