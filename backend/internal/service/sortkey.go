package service

import (
	"fmt"
	"sort"

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
	item, err := s.ResolveSortItem(id)
	if err != nil {
		return "", nil, err
	}
	return item.SortKey, item.ParentID, nil
}

func (s *SortKeyService) ResolveSortItem(id string) (repository.SortableSibling, error) {
	b, err := s.bookmarkRepo.GetByID(id)
	if err == nil {
		return repository.SortableSibling{Kind: "bookmark", ID: b.ID, ParentID: b.FolderID, SortKey: b.SortKey}, nil
	}
	f, err := s.folderRepo.Get(id)
	if err == nil {
		return repository.SortableSibling{Kind: "folder", ID: f.ID, ParentID: f.ParentID, SortKey: f.SortKey}, nil
	}
	return repository.SortableSibling{}, fmt.Errorf("sort key not found for id: %s", id)
}

// ComputeBookmarkSortKey computes a sort key for moving a bookmark.
func (s *SortKeyService) ComputeBookmarkSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	return s.computeSortKey(parentID, prevID, nextID, excludeID, nil)
}

// ComputeFolderSortKey computes a sort key for moving a folder.
func (s *SortKeyService) ComputeFolderSortKey(parentID, prevID, nextID *string, excludeID string) (string, error) {
	return s.computeSortKey(parentID, prevID, nextID, excludeID, nil)
}

func (s *SortKeyService) ComputeBatchSortKey(parentID, prevID, nextID *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	return s.computeSortKey(parentID, prevID, nextID, excludeID, pending)
}

func (s *SortKeyService) computeSortKey(
	parentID, prevID, nextID *string,
	excludeID string,
	pending []repository.SortableSibling,
) (string, error) {
	switch {
	case prevID == nil && nextID == nil:
		return s.computeTailKey(parentID, excludeID, pending)

	case prevID == nil:
		return s.computeHeadKey(parentID, nextID, excludeID, pending)

	case nextID == nil:
		return s.computeTailAfterKey(parentID, prevID, excludeID, pending)

	default:
		return s.computeBetweenKey(parentID, prevID, nextID, excludeID, pending)
	}
}

func (s *SortKeyService) computeTailKey(parentID *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	siblingKeys, err := s.siblingKeys(parentID, excludeID, pending)
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
	if err := s.rebalanceSiblings(parentID, excludeID); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	siblingKeys, err = s.siblingKeys(parentID, excludeID, pending)
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

func (s *SortKeyService) computeHeadKey(parentID, nextID *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	nextKey, err := s.resolveNeighborKey(parentID, nextID, excludeID, pending)
	if err != nil {
		return "", err
	}
	sortKey := before(nextKey)
	if sortKey != "" && sortKey < nextKey {
		return sortKey, nil
	}
	if err := s.rebalanceSiblings(parentID, excludeID); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	nextKey, err = s.resolveNeighborKey(parentID, nextID, excludeID, pending)
	if err != nil {
		return "", err
	}
	sortKey = before(nextKey)
	if sortKey == "" || sortKey >= nextKey {
		return "", fmt.Errorf("could not generate head sort key after rebalance")
	}
	return sortKey, nil
}

func (s *SortKeyService) computeTailAfterKey(parentID, prevID *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	prevKey, err := s.resolveNeighborKey(parentID, prevID, excludeID, pending)
	if err != nil {
		return "", err
	}
	sortKey := after(prevKey)
	if sortKey != "" && sortKey > prevKey {
		return sortKey, nil
	}
	if err := s.rebalanceSiblings(parentID, excludeID); err != nil {
		return "", fmt.Errorf("rebalance failed: %w", err)
	}
	prevKey, err = s.resolveNeighborKey(parentID, prevID, excludeID, pending)
	if err != nil {
		return "", err
	}
	sortKey = after(prevKey)
	if sortKey == "" || sortKey <= prevKey {
		return "", fmt.Errorf("could not generate tail sort key after rebalance")
	}
	return sortKey, nil
}

func (s *SortKeyService) computeBetweenKey(parentID, prevID, nextID *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	prevKey, err := s.resolveNeighborKey(parentID, prevID, excludeID, pending)
	if err != nil {
		return "", err
	}
	nextKey, err := s.resolveNeighborKey(parentID, nextID, excludeID, pending)
	if err != nil {
		return "", err
	}

	if needsRebalance(prevKey, nextKey) {
		if err := s.rebalanceSiblings(parentID, excludeID); err != nil {
			return "", fmt.Errorf("rebalance failed: %w", err)
		}
		prevKey, err = s.resolveNeighborKey(parentID, prevID, excludeID, pending)
		if err != nil {
			return "", err
		}
		nextKey, err = s.resolveNeighborKey(parentID, nextID, excludeID, pending)
		if err != nil {
			return "", err
		}
	}
	sortKey := between(prevKey, nextKey)
	if sortKey == "" || sortKey <= prevKey || sortKey >= nextKey {
		return "", fmt.Errorf("could not generate between key for %q and %q", prevKey, nextKey)
	}
	return sortKey, nil
}

func (s *SortKeyService) resolveNeighborKey(parentID, id *string, excludeID string, pending []repository.SortableSibling) (string, error) {
	if id == nil {
		return "", fmt.Errorf("neighbor id required")
	}
	if *id == excludeID {
		return "", fmt.Errorf("neighbor cannot be the moving item")
	}
	for i := len(pending) - 1; i >= 0; i-- {
		item := pending[i]
		if item.ID != *id {
			continue
		}
		if !repository.SameParent(item.ParentID, parentID) {
			return "", fmt.Errorf("neighbor %s is not in destination parent", *id)
		}
		if item.SortKey == "" {
			return "", fmt.Errorf("neighbor %s has empty sort key", *id)
		}
		return item.SortKey, nil
	}
	item, err := s.ResolveSortItem(*id)
	if err != nil {
		return "", err
	}
	if !repository.SameParent(item.ParentID, parentID) {
		return "", fmt.Errorf("neighbor %s is not in destination parent", *id)
	}
	if item.SortKey == "" {
		return "", fmt.Errorf("neighbor %s has empty sort key", *id)
	}
	return item.SortKey, nil
}

func (s *SortKeyService) siblingKeys(parentID *string, excludeID string, pending []repository.SortableSibling) ([]string, error) {
	siblings, err := s.siblings(parentID, excludeID, pending)
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0, len(siblings))
	for _, sibling := range siblings {
		keys = append(keys, sibling.SortKey)
	}
	return keys, nil
}

func (s *SortKeyService) siblings(parentID *string, excludeID string, pending []repository.SortableSibling) ([]repository.SortableSibling, error) {
	folders, err := s.folderRepo.List(parentID)
	if err != nil {
		return nil, err
	}
	bookmarks, err := s.bookmarkRepo.List(parentID)
	if err != nil {
		return nil, err
	}
	items := repository.MergeSortableSiblings(folders, bookmarks)
	overridden := map[string]bool{}
	for _, item := range pending {
		overridden[item.ID] = true
	}
	filtered := make([]repository.SortableSibling, 0, len(items)+len(pending))
	for _, item := range items {
		if item.ID == excludeID || overridden[item.ID] {
			continue
		}
		filtered = append(filtered, item)
	}
	for _, item := range pending {
		if item.ID == excludeID || !repository.SameParent(item.ParentID, parentID) {
			continue
		}
		filtered = append(filtered, item)
	}
	sort.SliceStable(filtered, func(i, j int) bool {
		if filtered[i].SortKey != filtered[j].SortKey {
			return filtered[i].SortKey < filtered[j].SortKey
		}
		if filtered[i].Kind != filtered[j].Kind {
			return filtered[i].Kind < filtered[j].Kind
		}
		return filtered[i].ID < filtered[j].ID
	})
	return filtered, nil
}

func (s *SortKeyService) rebalanceSiblings(parentID *string, excludeID string) error {
	siblings, err := s.siblings(parentID, excludeID, nil)
	if err != nil {
		return err
	}
	if len(siblings) == 0 {
		return nil
	}
	keys := rebalanceKeys(len(siblings))
	folderUpdates := make([]repository.SortKeyUpdate, 0)
	bookmarkUpdates := make([]repository.SortKeyUpdate, 0)
	for i, sibling := range siblings {
		update := repository.SortKeyUpdate{ID: sibling.ID, SortKey: keys[i]}
		if sibling.Kind == "folder" {
			folderUpdates = append(folderUpdates, update)
		} else {
			bookmarkUpdates = append(bookmarkUpdates, update)
		}
	}
	if len(folderUpdates) > 0 {
		if err := s.folderRepo.Rebalance(folderUpdates); err != nil {
			return err
		}
	}
	if len(bookmarkUpdates) > 0 {
		if err := s.bookmarkRepo.Rebalance(bookmarkUpdates); err != nil {
			return err
		}
	}
	return nil
}
