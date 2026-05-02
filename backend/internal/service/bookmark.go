package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"fmt"
)

type BookmarkService struct {
	repo       *repository.BookmarkRepo
	folderRepo *repository.FolderRepo
}

func NewBookmarkService(repo *repository.BookmarkRepo) *BookmarkService {
	return &BookmarkService{repo: repo}
}

func (s *BookmarkService) SetFolderRepo(fr *repository.FolderRepo) {
	s.folderRepo = fr
}

func (s *BookmarkService) GetSortKey(id string) (string, error) {
	b, err := s.repo.GetByID(id)
	if err == nil {
		return b.SortKey, nil
	}
	if s.folderRepo != nil {
		f, err2 := s.folderRepo.Get(id)
		if err2 == nil {
			return f.SortKey, nil
		}
	}
	return "", fmt.Errorf("sort key not found for id: %s", id)
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
	current, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// If client provides a sort key, use it directly (for cross-type drag)
	if sortKeyOverride != nil && *sortKeyOverride != "" {
		return s.repo.Move(id, folderID, *sortKeyOverride, version)
	}

	loadSiblings := func() ([]model.Bookmark, error) {
		children, err := s.repo.List(folderID)
		if err != nil {
			return nil, err
		}
		filtered := make([]model.Bookmark, 0, len(children))
		for _, child := range children {
			if child.ID != current.ID {
				filtered = append(filtered, child)
			}
		}
		return filtered, nil
	}

	var prevKey, nextKey string
	loadBoundaryKeys := func() error {
		if prevID != nil {
			prevKey, err = s.GetSortKey(*prevID)
			if err != nil {
				return fmt.Errorf("prev node not found: %w", err)
			}
		} else {
			prevKey = ""
		}
		if nextID != nil {
			nextKey, err = s.GetSortKey(*nextID)
			if err != nil {
				return fmt.Errorf("next node not found: %w", err)
			}
		} else {
			nextKey = ""
		}
		return nil
	}
	if err := loadBoundaryKeys(); err != nil {
		return nil, err
	}

	var sortKey string
	switch {
	case prevID == nil && nextID == nil:
		siblings, err := loadSiblings()
		if err != nil {
			return nil, err
		}
		if len(siblings) == 0 {
			sortKey = after("")
		} else {
			sortKey = after(siblings[len(siblings)-1].SortKey)
		}
		if sortKey == "" {
			if err := s.rebalanceChildren(folderID, current.ID); err != nil {
				return nil, err
			}
			siblings, err = loadSiblings()
			if err != nil {
				return nil, err
			}
			if len(siblings) == 0 {
				sortKey = after("")
			} else {
				sortKey = after(siblings[len(siblings)-1].SortKey)
			}
		}
	case prevID == nil:
		sortKey = before(nextKey)
		if sortKey == "" || sortKey >= nextKey {
			if err := s.rebalanceChildren(folderID, current.ID); err != nil {
				return nil, err
			}
			if err := loadBoundaryKeys(); err != nil {
				return nil, err
			}
			sortKey = before(nextKey)
		}
	case nextID == nil:
		sortKey = after(prevKey)
		if sortKey == "" || sortKey <= prevKey {
			if err := s.rebalanceChildren(folderID, current.ID); err != nil {
				return nil, err
			}
			if err := loadBoundaryKeys(); err != nil {
				return nil, err
			}
			sortKey = after(prevKey)
		}
	default:
		if needsRebalance(prevKey, nextKey) {
			if err := s.rebalanceChildren(folderID, current.ID); err != nil {
				return nil, err
			}
			if err := loadBoundaryKeys(); err != nil {
				return nil, err
			}
		}
		sortKey = between(prevKey, nextKey)
		if sortKey == "" || sortKey <= prevKey || sortKey >= nextKey {
			return nil, fmt.Errorf("between(%q,%q) produced invalid key %q", prevKey, nextKey, sortKey)
		}
	}
	if sortKey == "" {
		return nil, fmt.Errorf("empty sortKey with prev=%q next=%q", prevKey, nextKey)
	}

	return s.repo.Move(id, folderID, sortKey, version)
}

func (s *BookmarkService) rebalanceChildren(folderID *string, excludeID string) error {
	children, err := s.repo.List(folderID)
	if err != nil {
		return err
	}
	if len(children) == 0 {
		return nil
	}

	filtered := make([]model.Bookmark, 0, len(children))
	for _, child := range children {
		if child.ID != excludeID {
			filtered = append(filtered, child)
		}
	}
	if len(filtered) == 0 {
		return nil
	}

	keys := rebalanceKeys(len(filtered))
	tx, err := s.repo.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for i, child := range filtered {
		_, err := tx.Exec(`UPDATE bookmark SET sort_key=?, version=version+1, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`,
			keys[i], child.ID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
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
