package service

import (
	"errors"
	"fmt"

	"cubby/internal/model"
	"cubby/internal/repository"
)

var ErrConflict = errors.New("conflict")

type FolderService struct {
	repo     *repository.FolderRepo
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
	sortKey := "n"
	if len(children) > 0 {
		lastKey := children[len(children)-1].SortKey
		sortKey = after(lastKey)
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

func (s *FolderService) Move(id string, parentID *string, prevID, nextID *string, version int) (*model.Folder, error) {
	sortKey, err := s.computeSortKey(parentID, prevID, nextID, id)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, parentID, sortKey, version)
}

func (s *FolderService) computeSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	children, _ := s.repo.List(parentID)

	if prevID == nil && nextID == nil {
		// Only child in this parent
		if len(children) == 0 {
			return "n", nil
		}
		// Insert at end
		return after(children[len(children)-1].SortKey), nil
	}

	if prevID == nil && nextID != nil {
		// Insert at head
		next, err := s.repo.Get(*nextID)
		if err != nil {
			return "", fmt.Errorf("next folder not found: %w", err)
		}
		return before(next.SortKey), nil
	}

	if prevID != nil && nextID == nil {
		// Insert at tail
		prev, err := s.repo.Get(*prevID)
		if err != nil {
			return "", fmt.Errorf("prev folder not found: %w", err)
		}
		return after(prev.SortKey), nil
	}

	// Insert between
	prev, err := s.repo.Get(*prevID)
	if err != nil {
		return "", fmt.Errorf("prev folder not found: %w", err)
	}
	next, err2 := s.repo.Get(*nextID)
	if err2 != nil {
		return "", fmt.Errorf("next folder not found: %w", err2)
	}

	// Validate same parent
	prevParent := "<nil>"
	if prev.ParentID != nil {
		prevParent = *prev.ParentID
	}
	nextParent := "<nil>"
	if next.ParentID != nil {
		nextParent = *next.ParentID
	}
	if prevParent != nextParent {
		return "", fmt.Errorf("prev and next not in same parent: %s vs %s", prevParent, nextParent)
	}

	if needsRebalance(prev.SortKey, next.SortKey) {
		// Auto-rebalance: redistribute all children's sort keys, then recompute
		if err := s.rebalanceChildren(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		prev, err = s.repo.Get(*prevID)
		if err != nil {
			return "", fmt.Errorf("prev folder not found after rebalance: %w", err)
		}
		next, err2 = s.repo.Get(*nextID)
		if err2 != nil {
			return "", fmt.Errorf("next folder not found after rebalance: %w", err2)
		}
	}

	return between(prev.SortKey, next.SortKey), nil
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
