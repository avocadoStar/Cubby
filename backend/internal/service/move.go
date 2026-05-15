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
		repoItem, pendingItem, err := s.prepareBatchMoveItem(item, pending)
		if err != nil {
			return nil, err
		}
		repoItems = append(repoItems, repoItem)
		pending = append(pending, pendingItem)
	}

	return s.repo.BatchMove(repoItems)
}

func (s *MoveService) prepareBatchMoveItem(
	item BatchMoveItem,
	pending []repository.SortableSibling,
) (repository.BatchMoveItem, repository.SortableSibling, error) {
	if item.ID == "" {
		return repository.BatchMoveItem{}, repository.SortableSibling{}, fmt.Errorf("move item id required")
	}

	switch item.Kind {
	case "folder":
		if err := s.folderSvc.ensureCanMoveFolder(item.ID, item.ParentID); err != nil {
			return repository.BatchMoveItem{}, repository.SortableSibling{}, err
		}
	case "bookmark":
	default:
		return repository.BatchMoveItem{}, repository.SortableSibling{}, fmt.Errorf("unsupported move kind %q", item.Kind)
	}

	sortKey, err := s.sortKey.ComputeBatchSortKey(item.ParentID, item.PrevID, item.NextID, item.ID, pending)
	if err != nil {
		return repository.BatchMoveItem{}, repository.SortableSibling{}, err
	}
	if sortKey == "" {
		return repository.BatchMoveItem{}, repository.SortableSibling{}, fmt.Errorf("move item sort_key generation failed")
	}

	return repository.BatchMoveItem{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  sortKey,
			Version:  item.Version,
		}, repository.SortableSibling{
			Kind:     item.Kind,
			ID:       item.ID,
			ParentID: item.ParentID,
			SortKey:  sortKey,
		}, nil
}
