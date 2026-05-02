package service

import (
	"errors"
	"fmt"

	"cubby/internal/model"
	"cubby/internal/repository"
)

var ErrConflict = errors.New("conflict")

type FolderService struct {
	repo         *repository.FolderRepo
	bookmarkRepo *repository.BookmarkRepo
}

func NewFolderService(repo *repository.FolderRepo) *FolderService {
	return &FolderService{repo: repo}
}

func (s *FolderService) SetBookmarkRepo(br *repository.BookmarkRepo) {
	s.bookmarkRepo = br
}

func (s *FolderService) List(parentID *string) ([]model.Folder, error) {
	return s.repo.List(parentID)
}

func (s *FolderService) Create(name string, parentID *string) (*model.Folder, error) {
	children, _ := s.repo.List(parentID)
	sortKey := after("")
	if len(children) > 0 {
		lastKey := children[len(children)-1].SortKey
		sortKey = after(lastKey)
		if sortKey == "" {
			if err := s.rebalanceChildren(parentID, ""); err != nil {
				return nil, fmt.Errorf("rebalance failed during create: %w", err)
			}
			children, _ = s.repo.List(parentID)
			if len(children) == 0 {
				sortKey = after("")
			} else {
				sortKey = after(children[len(children)-1].SortKey)
			}
		}
	}
	if sortKey == "" {
		return nil, ErrConflict
	}
	for i := 0; i < 3; i++ {
		f, err := s.repo.Create(name, parentID, sortKey)
		if err == nil {
			return f, nil
		}
		sortKey = after(sortKey)
	}
	return nil, fmt.Errorf("failed to create folder after retries")
}

func (s *FolderService) Update(id, name string, version int) (*model.Folder, error) {
	return s.repo.Update(id, name, version)
}

func (s *FolderService) Delete(id string) error {
	return s.repo.SoftDelete(id)
}

func (s *FolderService) Move(id string, parentID *string, prevID, nextID *string, sortKeyOverride *string, version int) (*model.Folder, error) {
	if sortKeyOverride != nil && *sortKeyOverride != "" {
		return s.repo.Move(id, parentID, *sortKeyOverride, version)
	}
	sortKey, err := s.computeSortKey(parentID, prevID, nextID, id)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, parentID, sortKey, version)
}

func (s *FolderService) getSortKeyForID(id string) (string, *string, error) {
	folder, err := s.repo.Get(id)
	if err == nil {
		return folder.SortKey, folder.ParentID, nil
	}
	if s.bookmarkRepo != nil {
		bookmark, bookmarkErr := s.bookmarkRepo.GetByID(id)
		if bookmarkErr == nil {
			return bookmark.SortKey, bookmark.FolderID, nil
		}
	}
	return "", nil, fmt.Errorf("sort key not found for id: %s", id)
}

func (s *FolderService) computeSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	loadSiblings := func() ([]model.Folder, error) {
		children, err := s.repo.List(parentID)
		if err != nil {
			return nil, err
		}
		filtered := make([]model.Folder, 0, len(children))
		for _, child := range children {
			if child.ID != excludeID {
				filtered = append(filtered, child)
			}
		}
		return filtered, nil
	}

	children, err := loadSiblings()
	if err != nil {
		return "", err
	}

	if prevID == nil && nextID == nil {
		if len(children) == 0 {
			return after(""), nil
		}
		sortKey := after(children[len(children)-1].SortKey)
		if sortKey != "" {
			return sortKey, nil
		}
		if err := s.rebalanceChildren(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		children, err = loadSiblings()
		if err != nil {
			return "", err
		}
		if len(children) == 0 {
			return after(""), nil
		}
		sortKey = after(children[len(children)-1].SortKey)
		if sortKey == "" {
			return "", fmt.Errorf("could not generate tail sort key after rebalance")
		}
		return sortKey, nil
	}

	if prevID == nil && nextID != nil {
		nextSortKey, _, err := s.getSortKeyForID(*nextID)
		if err != nil {
			return "", fmt.Errorf("next node not found: %w", err)
		}
		sortKey := before(nextSortKey)
		if sortKey != "" && sortKey < nextSortKey {
			return sortKey, nil
		}
		if err := s.rebalanceChildren(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		nextSortKey, _, err = s.getSortKeyForID(*nextID)
		if err != nil {
			return "", fmt.Errorf("next node not found after rebalance: %w", err)
		}
		sortKey = before(nextSortKey)
		if sortKey == "" || sortKey >= nextSortKey {
			return "", fmt.Errorf("could not generate head sort key after rebalance")
		}
		return sortKey, nil
	}

	if prevID != nil && nextID == nil {
		prevSortKey, _, err := s.getSortKeyForID(*prevID)
		if err != nil {
			return "", fmt.Errorf("prev node not found: %w", err)
		}
		sortKey := after(prevSortKey)
		if sortKey != "" && sortKey > prevSortKey {
			return sortKey, nil
		}
		if err := s.rebalanceChildren(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		prevSortKey, _, err = s.getSortKeyForID(*prevID)
		if err != nil {
			return "", fmt.Errorf("prev node not found after rebalance: %w", err)
		}
		sortKey = after(prevSortKey)
		if sortKey == "" || sortKey <= prevSortKey {
			return "", fmt.Errorf("could not generate tail sort key after rebalance")
		}
		return sortKey, nil
	}

	// Insert between
	prevSortKey, prevParentID, err := s.getSortKeyForID(*prevID)
	if err != nil {
		return "", fmt.Errorf("prev node not found: %w", err)
	}
	nextSortKey, nextParentID, err2 := s.getSortKeyForID(*nextID)
	if err2 != nil {
		return "", fmt.Errorf("next node not found: %w", err2)
	}

	// Validate same parent
	prevParent := "<nil>"
	if prevParentID != nil {
		prevParent = *prevParentID
	}
	nextParent := "<nil>"
	if nextParentID != nil {
		nextParent = *nextParentID
	}
	if prevParent != nextParent {
		return "", fmt.Errorf("prev and next not in same parent: %s vs %s", prevParent, nextParent)
	}

	if needsRebalance(prevSortKey, nextSortKey) {
		// Auto-rebalance: redistribute all children's sort keys, then recompute
		if err := s.rebalanceChildren(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		children, err = loadSiblings()
		if err != nil {
			return "", err
		}
		if len(children) == 0 {
			return "", fmt.Errorf("rebalance removed all siblings unexpectedly")
		}
		prevSortKey, prevParentID, err = s.getSortKeyForID(*prevID)
		if err != nil {
			return "", fmt.Errorf("prev node not found after rebalance: %w", err)
		}
		nextSortKey, nextParentID, err2 = s.getSortKeyForID(*nextID)
		if err2 != nil {
			return "", fmt.Errorf("next node not found after rebalance: %w", err2)
		}
		prevParent = "<nil>"
		if prevParentID != nil {
			prevParent = *prevParentID
		}
		nextParent = "<nil>"
		if nextParentID != nil {
			nextParent = *nextParentID
		}
		if prevParent != nextParent {
			return "", fmt.Errorf("prev and next not in same parent after rebalance: %s vs %s", prevParent, nextParent)
		}
	}

	sortKey := between(prevSortKey, nextSortKey)
	if sortKey == "" || sortKey <= prevSortKey || sortKey >= nextSortKey {
		return "", fmt.Errorf("could not generate sort key between %q and %q", prevSortKey, nextSortKey)
	}
	return sortKey, nil
}

func (s *FolderService) rebalanceChildren(parentID *string, excludeID string) error {
	children, err := s.repo.List(parentID)
	if err != nil {
		return err
	}
	if len(children) == 0 {
		return nil
	}

	// Filter out the excluded item (the folder being moved — its sort_key is set by Move)
	filtered := children[:0]
	for _, child := range children {
		if child.ID != excludeID {
			filtered = append(filtered, child)
		}
	}
	if len(filtered) == 0 {
		return nil
	}

	keys := rebalanceKeys(len(filtered))
	updates := make([]struct{ ID, SortKey string }, len(filtered))
	for i, child := range filtered {
		updates[i] = struct{ ID, SortKey string }{child.ID, keys[i]}
	}
	return s.repo.Rebalance(updates)
}

// BatchDelete recursively soft-deletes folders and all their contents.
func (s *FolderService) BatchDelete(ids []string) error {
	for _, id := range ids {
		if err := s.deleteRecursive(id); err != nil {
			return err
		}
	}
	return nil
}

func (s *FolderService) deleteRecursive(folderID string) error {
	// Soft-delete all bookmarks in this folder
	children, _ := s.repo.List(&folderID)
	for _, child := range children {
		if err := s.deleteRecursive(child.ID); err != nil {
			return err
		}
	}
	// Soft-delete bookmarks in this folder
	if s.bookmarkRepo != nil {
		bookmarks, _ := s.bookmarkRepo.List(&folderID)
		for _, b := range bookmarks {
			s.bookmarkRepo.SoftDelete(b.ID)
		}
	}
	// Soft-delete bookmarks directly in this folder (null parent is handled differently)
	// Actually, bookmarks with folder_id = this folder
	// The List method above already filters by folder_id, so the bookmarks
	// list call above gets bookmarks directly in this folder
	return s.repo.SoftDelete(folderID)
}
