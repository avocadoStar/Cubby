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
	pending := make([]repository.SortableSibling, 0, len(items))
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
			sortKey, err = s.sortKey.ComputeBatchSortKey(item.ParentID, item.PrevID, item.NextID, item.ID, pending)
		case "bookmark":
			sortKey, err = s.sortKey.ComputeBatchSortKey(item.ParentID, item.PrevID, item.NextID, item.ID, pending)
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
		pending = append(pending, repository.SortableSibling{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  sortKey,
		})
	}

	return s.repo.BatchMove(repoItems)
}
