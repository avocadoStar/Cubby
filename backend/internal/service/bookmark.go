package service

import (
	"regexp"
	"strings"

	"cubby/internal/model"
	"cubby/internal/repository"
)

const maxBookmarkIconLength = 128 * 1024

var bookmarkIconRe = regexp.MustCompile(`^data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$`)

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

func (s *BookmarkService) Create(title, url string, folderID *string, icon ...string) (*model.Bookmark, error) {
	sortKey, err := s.sortKey.ComputeBookmarkSortKey(folderID, nil, nil, "")
	if err != nil {
		return nil, err
	}
	iconValue := ""
	if len(icon) > 0 {
		iconValue = sanitizeBookmarkIcon(icon[0])
	}
	for i := 0; i < 3; i++ {
		b, err := s.repo.Create(title, url, folderID, sortKey, iconValue)
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

func sanitizeBookmarkIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" || len(icon) > maxBookmarkIconLength || !bookmarkIconRe.MatchString(icon) {
		return ""
	}
	return icon
}
