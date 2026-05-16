package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

var ErrBookmarkExists = NewConflictError("已存在", nil)

type BookmarkService struct {
	repo    repository.BookmarkRepo
	sortKey *SortKeyService
}

type BookmarkCreateOptions struct {
	Icon  string
	Notes string
}

func NewBookmarkService(repo repository.BookmarkRepo, sortKey *SortKeyService) *BookmarkService {
	return &BookmarkService{repo: repo, sortKey: sortKey}
}

func (s *BookmarkService) List(folderID *string) ([]model.Bookmark, error) {
	return s.repo.List(folderID)
}

func (s *BookmarkService) Create(title, rawURL string, folderID *string, options ...BookmarkCreateOptions) (*model.Bookmark, error) {
	title, err := validateBookmarkTitle(title)
	if err != nil {
		return nil, err
	}
	validatedURL, err := validateAndNormalizeURL(rawURL)
	if err != nil {
		return nil, err
	}

	exists, err := s.repo.ExistsActiveURL(validatedURL)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrBookmarkExists
	}

	sortKey, err := s.sortKey.ComputeBookmarkSortKey(folderID, nil, nil, "")
	if err != nil {
		return nil, err
	}
	createOptions := BookmarkCreateOptions{}
	if len(options) > 0 {
		createOptions = options[0]
	}
	iconValue := sanitizeBookmarkIcon(createOptions.Icon)
	return createWithSortKeyRetry(sortKey, ErrConflict, func(nextSortKey string) (*model.Bookmark, error) {
		return s.repo.Create(title, validatedURL, folderID, nextSortKey, iconValue, createOptions.Notes)
	})
}

func (s *BookmarkService) Update(id, rawTitle, rawURL string, version int) (*model.Bookmark, error) {
	title, err := validateBookmarkTitle(rawTitle)
	if err != nil {
		return nil, err
	}
	validatedURL, err := validateAndNormalizeURL(rawURL)
	if err != nil {
		return nil, err
	}
	return s.repo.Update(id, title, validatedURL, version)
}

func (s *BookmarkService) Delete(id string) error {
	return s.repo.SoftDelete(id)
}

func (s *BookmarkService) Move(id string, folderID *string, prevID, nextID, sortKeyOverride *string, version int) (*model.Bookmark, error) {
	sortKey, err := s.sortKey.ComputeBookmarkSortKey(folderID, prevID, nextID, id)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, folderID, sortKey, version)
}

func (s *BookmarkService) Restore(id string) (*model.Bookmark, error) {
	return s.repo.Restore(id)
}

func (s *BookmarkService) UpdateNotes(id, notes string) error {
	return s.repo.UpdateNotes(id, notes)
}

func (s *BookmarkService) BatchDelete(ids []string) error {
	return s.repo.BatchSoftDelete(ids)
}
