package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
)

type SearchService struct {
	repo repository.BookmarkRepo
}

func NewSearchService(repo repository.BookmarkRepo) *SearchService {
	return &SearchService{repo: repo}
}

func (s *SearchService) Search(query string) ([]model.Bookmark, error) {
	return s.repo.Search(query)
}
