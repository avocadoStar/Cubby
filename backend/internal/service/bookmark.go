package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

type BookmarkService struct {
	repo    repository.BookmarkRepo
	sortKey *SortKeyService
}

func NewBookmarkService(repo repository.BookmarkRepo, sortKey *SortKeyService) *BookmarkService {
	return &BookmarkService{repo: repo, sortKey: sortKey}
}

func (s *BookmarkService) List(folderID *string) ([]model.Bookmark, error) {
	return s.repo.List(folderID)
}

func (s *BookmarkService) Create(title, url string, folderID *string) (*model.Bookmark, error) {
	children, _ := s.repo.List(folderID)
	sortKey := "n"
	if len(children) > 0 {
		sortKey = after(children[len(children)-1].SortKey)
	}
	for i := 0; i < 3; i++ {
		b, err := s.repo.Create(title, url, folderID, sortKey)
		if err == nil {
			return b, nil
		}
		sortKey = after(sortKey)
	}
	return nil, ErrConflict
}

func (s *BookmarkService) Update(id, title, url string, version int) (*model.Bookmark, error) {
	return s.repo.Update(id, title, url, version)
}

func (s *BookmarkService) Delete(id string) error {
	return s.repo.SoftDelete(id)
}

func (s *BookmarkService) Move(id string, folderID *string, prevID, nextID, sortKeyOverride *string, version int) (*model.Bookmark, error) {
	if sortKeyOverride != nil && *sortKeyOverride != "" {
		return s.repo.Move(id, folderID, *sortKeyOverride, version)
	}
	sortKey, err := s.sortKey.ComputeBookmarkSortKey(folderID, prevID, nextID, id)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, folderID, sortKey, version)
}

func (s *BookmarkService) Restore(id string) (*model.Bookmark, error) {
	return s.repo.Restore(id)
}

func (s *BookmarkService) BatchDelete(ids []string) error {
	return s.repo.BatchSoftDelete(ids)
}
