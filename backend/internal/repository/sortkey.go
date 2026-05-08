package repository

import (
	"cubby/internal/model"
	"sort"
)

type SortableSibling struct {
	Kind     string
	ID       string
	ParentID *string
	SortKey  string
}

func MergeSortableSiblings(folders []model.Folder, bookmarks []model.Bookmark) []SortableSibling {
	items := make([]SortableSibling, 0, len(folders)+len(bookmarks))
	for _, folder := range folders {
		items = append(items, SortableSibling{
			Kind:     "folder",
			ID:       folder.ID,
			ParentID: folder.ParentID,
			SortKey:  folder.SortKey,
		})
	}
	for _, bookmark := range bookmarks {
		items = append(items, SortableSibling{
			Kind:     "bookmark",
			ID:       bookmark.ID,
			ParentID: bookmark.FolderID,
			SortKey:  bookmark.SortKey,
		})
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].SortKey != items[j].SortKey {
			return items[i].SortKey < items[j].SortKey
		}
		if items[i].Kind != items[j].Kind {
			return items[i].Kind < items[j].Kind
		}
		return items[i].ID < items[j].ID
	})
	return items
}

func SameParent(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}
