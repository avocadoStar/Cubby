package repository

import "cubby/internal/model"

type SortKeyUpdate struct {
	ID, SortKey string
}

type BatchMoveItem struct {
	Kind     string
	ID       string
	ParentID *string
	SortKey  string
	Version  int
}

type BatchMoveResult struct {
	Folders   []model.Folder   `json:"folders"`
	Bookmarks []model.Bookmark `json:"bookmarks"`
}

type BookmarkRepo interface {
	List(folderID *string) ([]model.Bookmark, error)
	GetByID(id string) (*model.Bookmark, error)
	ExistsActiveURL(url string) (bool, error)
	Create(title, url string, folderID *string, sortKey string, icon ...string) (*model.Bookmark, error)
	Update(id, title, url string, version int) (*model.Bookmark, error)
	SoftDelete(id string) error
	Restore(id string) (*model.Bookmark, error)
	BatchSoftDelete(ids []string) error
	Move(id string, folderID *string, sortKey string, version int) (*model.Bookmark, error)
	SearchBoth(query string) ([]model.SearchResult, error)
	UpdateNotes(id, notes string) error
	Rebalance(updates []SortKeyUpdate) error
}

type FolderRepo interface {
	List(parentID *string) ([]model.Folder, error)
	Get(id string) (*model.Folder, error)
	Create(name string, parentID *string, sortKey string) (*model.Folder, error)
	Update(id, name string, version int) (*model.Folder, error)
	SoftDelete(id string) error
	Restore(id string) (*model.Folder, error)
	RestoreTree(id string) (*model.Folder, error)
	Rebalance(updates []SortKeyUpdate) error
	Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error)
	BatchDeleteTree(folderIDs []string, bookmarkIDs []string) error
}

type MoveRepo interface {
	BatchMove(items []BatchMoveItem) (*BatchMoveResult, error)
}

type SettingRepo interface {
	Get(key string) (string, error)
	Set(key, value string) error
}
