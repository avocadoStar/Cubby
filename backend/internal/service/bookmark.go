package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

type BookmarkService struct {
	repo *repository.BookmarkRepo
}

func NewBookmarkService(repo *repository.BookmarkRepo) *BookmarkService {
	return &BookmarkService{repo: repo}
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

func (s *BookmarkService) Move(id string, folderID *string, prevID, nextID *string, version int) (*model.Bookmark, error) {
	var prevKey, nextKey string

	if prevID != nil {
		prev, err := s.repo.GetByID(*prevID)
		if err != nil {
			return nil, err
		}
		prevKey = prev.SortKey
	}
	if nextID != nil {
		next, err := s.repo.GetByID(*nextID)
		if err != nil {
			return nil, err
		}
		nextKey = next.SortKey
	}

	var sortKey string
	switch {
	case prevID == nil && nextID == nil:
		sortKey = "n"
	case prevID == nil:
		sortKey = before(nextKey)
	case nextID == nil:
		sortKey = after(prevKey)
	default:
		if needsRebalance(prevKey, nextKey) {
			return nil, ErrConflict
		}
		sortKey = between(prevKey, nextKey)
	}

	return s.repo.Move(id, folderID, sortKey, version)
}

func (s *BookmarkService) BatchMove(ids []string, targetFolderID, anchorID, position string) error {
	for _, id := range ids {
		sortKey := "n" + id[:8]
		s.repo.Move(id, &targetFolderID, sortKey, 0)
	}
	return nil
}

func (s *BookmarkService) BatchDelete(ids []string) error {
	return s.repo.BatchSoftDelete(ids)
}
