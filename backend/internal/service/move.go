package service

import (
	"fmt"

	"cubby/internal/repository"
)

type BatchMoveItem struct {
	Kind     string
	ID       string
	ParentID *string
	SortKey  string
	Version  int
}

type MoveService struct {
	repo      repository.MoveRepo
	folderSvc *FolderService
}

func NewMoveService(repo repository.MoveRepo, folderSvc *FolderService) *MoveService {
	return &MoveService{repo: repo, folderSvc: folderSvc}
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
		if item.SortKey == "" {
			return nil, fmt.Errorf("move item sort_key required")
		}

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
		case "bookmark":
		default:
			return nil, fmt.Errorf("unsupported move kind %q", item.Kind)
		}

		repoItems = append(repoItems, repository.BatchMoveItem{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  item.SortKey,
			Version:  item.Version,
		})
	}

	return s.repo.BatchMove(repoItems)
}
