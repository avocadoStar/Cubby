package service

import (
	"fmt"

	"cubby/internal/repository"
)

type BatchMoveItem struct {
	Kind     string
	ID       string
	ParentID *string
	PrevID   *string
	NextID   *string
	Version  int
}

type MoveService struct {
	repo      repository.MoveRepo
	folderSvc *FolderService
	sortKey   *SortKeyService
}

func NewMoveService(repo repository.MoveRepo, folderSvc *FolderService, sortKey *SortKeyService) *MoveService {
	return &MoveService{repo: repo, folderSvc: folderSvc, sortKey: sortKey}
}

func (s *MoveService) BatchMove(items []BatchMoveItem) (*repository.BatchMoveResult, error) {
	if len(items) == 0 {
		return &repository.BatchMoveResult{}, nil
	}

	repoItems := make([]repository.BatchMoveItem, 0, len(items))
	for _, item := range items {
		if item.ID == "" {
			return nil, fmt.Errorf("move item id required")
		}

		var sortKey string
		var err error
		switch item.Kind {
		case "folder":
			if item.ParentID != nil {
				isDesc, err := s.folderSvc.isDescendant(item.ID, *item.ParentID)
				if err != nil {
					return nil, fmt.Errorf("check cycle: %w", err)
				}
				if isDesc {
					return nil, fmt.Errorf("cannot move folder into itself or its descendants")
				}
			}
			sortKey, err = s.computeFolderBatchSortKey(item, repoItems)
		case "bookmark":
			sortKey, err = s.computeBookmarkBatchSortKey(item, repoItems)
		default:
			return nil, fmt.Errorf("unsupported move kind %q", item.Kind)
		}
		if err != nil {
			return nil, err
		}
		if sortKey == "" {
			return nil, fmt.Errorf("move item sort_key generation failed")
		}

		repoItems = append(repoItems, repository.BatchMoveItem{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  sortKey,
			Version:  item.Version,
		})
	}

	return s.repo.BatchMove(repoItems)
}

func (s *MoveService) computeFolderBatchSortKey(item BatchMoveItem, pending []repository.BatchMoveItem) (string, error) {
	return s.computeBatchSortKey(item, pending, "folder", func(parentID *string) ([]string, error) {
		children, err := s.folderSvc.repo.List(parentID)
		if err != nil {
			return nil, err
		}
		keys := make([]string, 0, len(children))
		for _, child := range children {
			if child.ID != item.ID {
				keys = append(keys, child.SortKey)
			}
		}
		return keys, nil
	})
}

func (s *MoveService) computeBookmarkBatchSortKey(item BatchMoveItem, pending []repository.BatchMoveItem) (string, error) {
	return s.computeBatchSortKey(item, pending, "bookmark", func(parentID *string) ([]string, error) {
		children, err := s.sortKey.bookmarkRepo.List(parentID)
		if err != nil {
			return nil, err
		}
		keys := make([]string, 0, len(children))
		for _, child := range children {
			if child.ID != item.ID {
				keys = append(keys, child.SortKey)
			}
		}
		return keys, nil
	})
}

func (s *MoveService) computeBatchSortKey(
	item BatchMoveItem,
	pending []repository.BatchMoveItem,
	kind string,
	listSiblingKeys func(parentID *string) ([]string, error),
) (string, error) {
	resolve := func(id *string) string {
		if id == nil {
			return ""
		}
		for i := len(pending) - 1; i >= 0; i-- {
			if pending[i].ID == *id {
				return pending[i].SortKey
			}
		}
		key, _, err := s.sortKey.ResolveSortKey(*id)
		if err != nil {
			return ""
		}
		return key
	}

	switch {
	case item.PrevID == nil && item.NextID == nil:
		siblingKeys, err := listSiblingKeys(item.ParentID)
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
		return "", fmt.Errorf("could not generate tail sort key")

	case item.PrevID == nil:
		nextKey := resolve(item.NextID)
		sortKey := before(nextKey)
		if sortKey != "" && sortKey < nextKey {
			return sortKey, nil
		}
		return "", fmt.Errorf("could not generate head sort key")

	case item.NextID == nil:
		prevKey := resolve(item.PrevID)
		sortKey := after(prevKey)
		if sortKey != "" && sortKey > prevKey {
			return sortKey, nil
		}
		return "", fmt.Errorf("could not generate tail sort key")

	default:
		prevKey := resolve(item.PrevID)
		nextKey := resolve(item.NextID)
		sortKey := between(prevKey, nextKey)
		if sortKey == "" || sortKey <= prevKey || sortKey >= nextKey {
			return "", fmt.Errorf("could not generate between sort key")
		}
		return sortKey, nil
	}
}
