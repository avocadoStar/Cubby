package repository

import "cubby/internal/model"

type SortKeyUpdate struct {
	ID, SortKey string
}

type BookmarkRepo interface {
	List(folderID *string) ([]model.Bookmark, error)
	GetByID(id string) (*model.Bookmark, error)
	Create(title, url string, folderID *string, sortKey string) (*model.Bookmark, error)
	Update(id, title, url string, version int) (*model.Bookmark, error)
	SoftDelete(id string) error
	Restore(id string) (*model.Bookmark, error)
	BatchSoftDelete(ids []string) error
	Move(id string, folderID *string, sortKey string, version int) (*model.Bookmark, error)
	Search(query string) ([]model.Bookmark, error)
	SearchBoth(query string) ([]model.SearchResult, error)
	Rebalance(updates []SortKeyUpdate) error
}

type FolderRepo interface {
	List(parentID *string) ([]model.Folder, error)
	Get(id string) (*model.Folder, error)
	Create(name string, parentID *string, sortKey string) (*model.Folder, error)
	Update(id, name string, version int) (*model.Folder, error)
	SoftDelete(id string) error
	Restore(id string) (*model.Folder, error)
	Rebalance(updates []SortKeyUpdate) error
	Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error)
}

type SettingRepo interface {
	Get(key string) (string, error)
	Set(key, value string) error
}
