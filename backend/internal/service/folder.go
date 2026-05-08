package service

import (
	"errors"
	"fmt"

	"cubby/internal/model"
	"cubby/internal/repository"
)

var ErrConflict = errors.New("conflict")

type FolderService struct {
	repo         repository.FolderRepo
	bookmarkRepo repository.BookmarkRepo
	sortKey      *SortKeyService
}

func NewFolderService(repo repository.FolderRepo, bookmarkRepo repository.BookmarkRepo, sortKey *SortKeyService) *FolderService {
	return &FolderService{repo: repo, bookmarkRepo: bookmarkRepo, sortKey: sortKey}
}

func (s *FolderService) List(parentID *string) ([]model.Folder, error) {
	return s.repo.List(parentID)
}

func (s *FolderService) Create(name string, parentID *string) (*model.Folder, error) {
	children, err := s.repo.List(parentID)
	if err != nil {
		return nil, fmt.Errorf("list siblings: %w", err)
	}
	sortKey := after("")
	if len(children) > 0 {
		lastKey := children[len(children)-1].SortKey
		sortKey = after(lastKey)
		if sortKey == "" {
			if err := s.rebalanceChildren(parentID, ""); err != nil {
				return nil, fmt.Errorf("rebalance failed during create: %w", err)
			}
			children, err = s.repo.List(parentID)
			if err != nil {
				return nil, fmt.Errorf("list siblings after rebalance: %w", err)
			}
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
	return s.BatchDelete([]string{id})
}

func (s *FolderService) Restore(id string) (*model.Folder, error) {
	return s.repo.RestoreTree(id)
}

func (s *FolderService) Move(id string, parentID *string, prevID, nextID *string, sortKeyOverride *string, version int) (*model.Folder, error) {
	if parentID != nil {
		isDesc, err := s.isDescendant(id, *parentID)
		if err != nil {
			return nil, fmt.Errorf("check cycle: %w", err)
		}
		if isDesc {
			return nil, fmt.Errorf("cannot move folder into itself or its descendants")
		}
	}
	if sortKeyOverride != nil && *sortKeyOverride != "" {
		return s.repo.Move(id, parentID, *sortKeyOverride, version)
	}
	sortKey, err := s.sortKey.ComputeFolderSortKey(parentID, prevID, nextID, id)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, parentID, sortKey, version)
}

// isDescendant checks whether folderID is an ancestor of targetParentID
// by walking up the ancestor chain from targetParentID.
func (s *FolderService) isDescendant(folderID, targetParentID string) (bool, error) {
	current := targetParentID
	for current != "" {
		if current == folderID {
			return true, nil
		}
		f, err := s.repo.Get(current)
		if err != nil {
			return false, fmt.Errorf("check ancestor %s: %w", current, err)
		}
		if f.ParentID == nil {
			return false, nil
		}
		current = *f.ParentID
	}
	return false, nil
}

func (s *FolderService) rebalanceChildren(parentID *string, excludeID string) error {
	children, err := s.repo.List(parentID)
	if err != nil {
		return err
	}
	if len(children) == 0 {
		return nil
	}

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
	updates := make([]repository.SortKeyUpdate, len(filtered))
	for i, child := range filtered {
		updates[i] = repository.SortKeyUpdate{ID: child.ID, SortKey: keys[i]}
	}
	return s.repo.Rebalance(updates)
}

// BatchDelete recursively soft-deletes folders and all their contents in a single transaction.
func (s *FolderService) BatchDelete(ids []string) error {
	var folderIDs, bookmarkIDs []string
	for _, id := range ids {
		if err := s.collectTree(id, &folderIDs, &bookmarkIDs); err != nil {
			return fmt.Errorf("collect tree for %s: %w", id, err)
		}
	}
	if len(folderIDs) == 0 && len(bookmarkIDs) == 0 {
		return nil
	}
	return s.repo.BatchDeleteTree(folderIDs, bookmarkIDs)
}

func (s *FolderService) collectTree(folderID string, folderIDs, bookmarkIDs *[]string) error {
	children, err := s.repo.List(&folderID)
	if err != nil {
		return fmt.Errorf("list children of %s: %w", folderID, err)
	}
	for _, child := range children {
		if err := s.collectTree(child.ID, folderIDs, bookmarkIDs); err != nil {
			return err
		}
	}
	bookmarks, err := s.bookmarkRepo.List(&folderID)
	if err != nil {
		return fmt.Errorf("list bookmarks of %s: %w", folderID, err)
	}
	for _, b := range bookmarks {
		*bookmarkIDs = append(*bookmarkIDs, b.ID)
	}
	*folderIDs = append(*folderIDs, folderID)
	return nil
}
