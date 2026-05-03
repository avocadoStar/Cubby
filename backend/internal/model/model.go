package model

type Folder struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	ParentID  *string `json:"parent_id"`
	SortKey   string  `json:"sort_key"`
	Version   int     `json:"version"`
	DeletedAt *string `json:"-"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

type Bookmark struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	URL       string  `json:"url"`
	FolderID  *string `json:"folder_id"`
	SortKey   string  `json:"sort_key"`
	Version   int     `json:"version"`
	DeletedAt *string `json:"-"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

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
