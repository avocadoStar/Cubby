package model

// Folder corresponds to frontend/src/types/index.ts Folder
type Folder struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	ParentID    *string `json:"parent_id"`
	SortKey     string  `json:"sort_key"`
	Version     int     `json:"version"`
	HasChildren bool    `json:"has_children"`
	DeletedAt   *string `json:"-"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
}

// Bookmark corresponds to frontend/src/types/index.ts Bookmark
type Bookmark struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	URL       string  `json:"url"`
	Icon      string  `json:"icon"`
	FolderID  *string `json:"folder_id"`
	SortKey   string  `json:"sort_key"`
	Version   int     `json:"version"`
	Notes     string  `json:"notes"`
	DeletedAt *string `json:"-"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

// SearchResult corresponds to frontend/src/types/index.ts SearchResultItem
type SearchResult struct {
	Kind     string  `json:"kind"` // "bookmark" or "folder"
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	URL      *string `json:"url,omitempty"`
	FolderID *string `json:"folder_id,omitempty"`
	ParentID *string `json:"parent_id,omitempty"`
}

type Setting struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}
