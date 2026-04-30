package service

import (
	"errors"
	"fmt"

	"cubby/internal/model"
	"cubby/internal/repository"
)

var ErrConflict = errors.New("conflict")

type FolderService struct {
	repo *repository.FolderRepo
}

func NewFolderService(repo *repository.FolderRepo) *FolderService {
	return &FolderService{repo: repo}
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
	sortKey, err := s.computeSortKey(parentID, prevID, nextID)
	if err != nil {
		return nil, err
	}
	return s.repo.Move(id, parentID, sortKey, version)
}

func (s *FolderService) computeSortKey(parentID, prevID, nextID *string) (string, error) {
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
		return "", fmt.Errorf("rebalance needed")
	}

	return between(prev.SortKey, next.SortKey), nil
}
