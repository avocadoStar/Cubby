package service

import (
	"fmt"

	"cubby/internal/repository"
)

type SortKeyService struct {
	bookmarkRepo repository.BookmarkRepo
	folderRepo   repository.FolderRepo
}

func NewSortKeyService(br repository.BookmarkRepo, fr repository.FolderRepo) *SortKeyService {
	return &SortKeyService{bookmarkRepo: br, folderRepo: fr}
}

// ResolveSortKey looks up the sort key for any item, trying bookmark first then folder.
func (s *SortKeyService) ResolveSortKey(id string) (string, *string, error) {
	b, err := s.bookmarkRepo.GetByID(id)
	if err == nil {
		return b.SortKey, b.FolderID, nil
	}
	f, err := s.folderRepo.Get(id)
	if err == nil {
		return f.SortKey, f.ParentID, nil
	}
	return "", nil, fmt.Errorf("sort key not found for id: %s", id)
}

// ComputeBookmarkSortKey computes a sort key for moving a bookmark.
func (s *SortKeyService) ComputeBookmarkSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	return s.computeSortKey(parentID, prevID, nextID, excludeID, func() ([]string, error) {
		children, err := s.bookmarkRepo.List(parentID)
		if err != nil {
			return nil, err
		}
		keys := make([]string, 0, len(children))
		for _, c := range children {
			if c.ID != excludeID {
				keys = append(keys, c.SortKey)
			}
		}
		return keys, nil
	}, func() error {
		return s.rebalanceBookmarks(parentID, excludeID)
	})
}

// ComputeFolderSortKey computes a sort key for moving a folder.
func (s *SortKeyService) ComputeFolderSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	return s.computeSortKey(parentID, prevID, nextID, excludeID, func() ([]string, error) {
		children, err := s.folderRepo.List(parentID)
		if err != nil {
			return nil, err
		}
		keys := make([]string, 0, len(children))
		for _, c := range children {
			if c.ID != excludeID {
				keys = append(keys, c.SortKey)
			}
		}
		return keys, nil
	}, func() error {
		return s.rebalanceFolders(parentID, excludeID)
	})
}

func (s *SortKeyService) computeSortKey(
	parentID, prevID, nextID *string,
	excludeID string,
	listSiblingKeys func() ([]string, error),
	rebalance func() error,
) (string, error) {
	switch {
	case prevID == nil && nextID == nil:
		return s.computeTailKey(listSiblingKeys, rebalance)

	case prevID == nil:
		return s.computeHeadKey(nextID, rebalance)

	case nextID == nil:
		return s.computeTailAfterKey(prevID, rebalance)

	default:
		return s.computeBetweenKey(prevID, nextID, rebalance)
	}
}

func (s *SortKeyService) computeTailKey(listSiblingKeys func() ([]string, error), rebalance func() error) (string, error) {
	siblingKeys, err := listSiblingKeys()
	if err != nil {
		return "", err
	}
	if len(siblingKeys) == 0 {
		return after(""), nil
	}
	sortKey := after(siblingKeys[len(siblingKeys)-1])
	if sortKey != "" {
		return sortKey, nil
	}
	if err := rebalance(); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	siblingKeys, err = listSiblingKeys()
	if err != nil {
		return "", err
	}
	if len(siblingKeys) == 0 {
		return after(""), nil
	}
	sortKey = after(siblingKeys[len(siblingKeys)-1])
	if sortKey == "" {
		return "", fmt.Errorf("could not generate tail sort key after rebalance")
	}
	return sortKey, nil
}

func (s *SortKeyService) computeHeadKey(nextID *string, rebalance func() error) (string, error) {
	nextKey := s.mustResolve(nextID)
	sortKey := before(nextKey)
	if sortKey != "" && sortKey < nextKey {
		return sortKey, nil
	}
	if err := rebalance(); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	nextKey = s.mustResolve(nextID)
	sortKey = before(nextKey)
	if sortKey == "" || sortKey >= nextKey {
		return "", fmt.Errorf("could not generate head sort key after rebalance")
	}
	return sortKey, nil
}

func (s *SortKeyService) computeTailAfterKey(prevID *string, rebalance func() error) (string, error) {
	prevKey := s.mustResolve(prevID)
	sortKey := after(prevKey)
	if sortKey != "" && sortKey > prevKey {
		return sortKey, nil
	}
	if err := rebalance(); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	prevKey = s.mustResolve(prevID)
	sortKey = after(prevKey)
	if sortKey == "" || sortKey <= prevKey {
		return "", fmt.Errorf("could not generate tail sort key after rebalance")
	}
	return sortKey, nil
}

func (s *SortKeyService) computeBetweenKey(prevID, nextID *string, rebalance func() error) (string, error) {
	prevKey := s.mustResolve(prevID)
	nextKey := s.mustResolve(nextID)

	if needsRebalance(prevKey, nextKey) {
		if err := rebalance(); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		prevKey = s.mustResolve(prevID)
		nextKey = s.mustResolve(nextID)
	}
	sortKey := between(prevKey, nextKey)
	if sortKey == "" || sortKey <= prevKey || sortKey >= nextKey {
		return "", fmt.Errorf("could not generate between key for %q and %q", prevKey, nextKey)
	}
	return sortKey, nil
}

func (s *SortKeyService) mustResolve(id *string) string {
	if id == nil {
		return ""
	}
	key, _, err := s.ResolveSortKey(*id)
	if err != nil {
		return ""
	}
	return key
}

func (s *SortKeyService) rebalanceBookmarks(parentID *string, excludeID string) error {
	children, err := s.bookmarkRepo.List(parentID)
	if err != nil {
		return err
	}
	filtered := make([]repository.SortKeyUpdate, 0, len(children))
	for _, c := range children {
		if c.ID != excludeID {
			filtered = append(filtered, repository.SortKeyUpdate{ID: c.ID, SortKey: ""})
		}
	}
	if len(filtered) == 0 {
		return nil
	}
	keys := rebalanceKeys(len(filtered))
	for i := range filtered {
		filtered[i].SortKey = keys[i]
	}
	return s.bookmarkRepo.Rebalance(filtered)
}

func (s *SortKeyService) rebalanceFolders(parentID *string, excludeID string) error {
	children, err := s.folderRepo.List(parentID)
	if err != nil {
		return err
	}
	filtered := make([]repository.SortKeyUpdate, 0, len(children))
	for _, c := range children {
		if c.ID != excludeID {
			filtered = append(filtered, repository.SortKeyUpdate{ID: c.ID, SortKey: ""})
		}
	}
	if len(filtered) == 0 {
		return nil
	}
	keys := rebalanceKeys(len(filtered))
	for i := range filtered {
		filtered[i].SortKey = keys[i]
	}
	return s.folderRepo.Rebalance(filtered)
}
