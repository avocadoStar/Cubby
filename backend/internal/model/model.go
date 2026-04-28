package model

import "time"

type Folder struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ParentID  *string   `json:"parent_id"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Bookmark struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	URL             string    `json:"url"`
	Description     string    `json:"description"`
	FaviconURL      string    `json:"favicon_url"`
	ThumbnailURL    string    `json:"thumbnail_url"`
	FolderID        *string   `json:"folder_id"`
	IsFavorite      bool      `json:"is_favorite"`
	SortOrder       int       `json:"sort_order"`
	MetadataFetched bool      `json:"metadata_fetched"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type Setting struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}
