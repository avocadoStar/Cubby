package service

import "cubby/internal/lexorank"

func createWithSortKeyRetry[T any](
	initialSortKey string,
	finalErr error,
	create func(sortKey string) (*T, error),
) (*T, error) {
	sortKey := initialSortKey
	for i := 0; i < 3; i++ {
		created, err := create(sortKey)
		if err == nil {
			return created, nil
		}
		sortKey = lexorank.After(sortKey)
	}
	return nil, finalErr
}
