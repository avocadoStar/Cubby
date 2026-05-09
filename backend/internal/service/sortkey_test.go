package service

import (
	"cubby/internal/model"
	"cubby/internal/repository"
	"database/sql"
	"testing"
)

// stubBookmarkRepo implements repository.BookmarkRepo for testing
type stubBookmarkRepo struct {
	items map[string]model.Bookmark
}

func newStubBookmarkRepo() *stubBookmarkRepo {
	return &stubBookmarkRepo{items: make(map[string]model.Bookmark)}
}

func (r *stubBookmarkRepo) List(folderID *string) ([]model.Bookmark, error) {
	var result []model.Bookmark
	for _, b := range r.items {
		if folderID == nil && b.FolderID == nil || folderID != nil && b.FolderID != nil && *b.FolderID == *folderID {
			result = append(result, b)
		}
	}
	for i := 1; i < len(result); i++ {
		for j := i; j > 0 && result[j].SortKey < result[j-1].SortKey; j-- {
			result[j], result[j-1] = result[j-1], result[j]
		}
	}
	return result, nil
}

func (r *stubBookmarkRepo) GetByID(id string) (*model.Bookmark, error) {
	b, ok := r.items[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	return &b, nil
}

func (r *stubBookmarkRepo) ExistsActiveURL(url string) (bool, error) {
	for _, b := range r.items {
		if b.URL == url && b.DeletedAt == nil {
			return true, nil
		}
	}
	return false, nil
}

func (r *stubBookmarkRepo) Create(title, url string, folderID *string, sortKey string, icon ...string) (*model.Bookmark, error) {
	iconValue := ""
	if len(icon) > 0 {
		iconValue = icon[0]
	}
	b := model.Bookmark{ID: "new-" + sortKey, Title: title, URL: url, Icon: iconValue, FolderID: folderID, SortKey: sortKey}
	r.items[b.ID] = b
	return &b, nil
}

func (r *stubBookmarkRepo) Update(id, title, url string, version int) (*model.Bookmark, error) {
	return nil, nil
}
func (r *stubBookmarkRepo) SoftDelete(id string) error                 { return nil }
func (r *stubBookmarkRepo) Restore(id string) (*model.Bookmark, error) { return nil, nil }
func (r *stubBookmarkRepo) BatchSoftDelete(ids []string) error         { return nil }
func (r *stubBookmarkRepo) Move(id string, folderID *string, sortKey string, version int) (*model.Bookmark, error) {
	return nil, nil
}
func (r *stubBookmarkRepo) SearchBoth(query string) ([]model.SearchResult, error) { return nil, nil }
func (r *stubBookmarkRepo) UpdateNotes(id, notes string) error                    { return nil }
func (r *stubBookmarkRepo) Rebalance(updates []repository.SortKeyUpdate) error {
	for _, u := range updates {
		b := r.items[u.ID]
		b.SortKey = u.SortKey
		r.items[u.ID] = b
	}
	return nil
}

// stubFolderRepo implements repository.FolderRepo for testing
type stubFolderRepo struct {
	items map[string]model.Folder
}

func newStubFolderRepo() *stubFolderRepo {
	return &stubFolderRepo{items: make(map[string]model.Folder)}
}

func (r *stubFolderRepo) List(parentID *string) ([]model.Folder, error) {
	var result []model.Folder
	for _, f := range r.items {
		if parentID == nil && f.ParentID == nil || parentID != nil && f.ParentID != nil && *f.ParentID == *parentID {
			result = append(result, f)
		}
	}
	for i := 1; i < len(result); i++ {
		for j := i; j > 0 && result[j].SortKey < result[j-1].SortKey; j-- {
			result[j], result[j-1] = result[j-1], result[j]
		}
	}
	return result, nil
}

func (r *stubFolderRepo) Get(id string) (*model.Folder, error) {
	f, ok := r.items[id]
	if !ok {
		return nil, sql.ErrNoRows
	}
	return &f, nil
}

func (r *stubFolderRepo) Create(name string, parentID *string, sortKey string) (*model.Folder, error) {
	f := model.Folder{ID: "f-" + sortKey, Name: name, ParentID: parentID, SortKey: sortKey}
	r.items[f.ID] = f
	return &f, nil
}

func (r *stubFolderRepo) Update(id, name string, version int) (*model.Folder, error) { return nil, nil }
func (r *stubFolderRepo) SoftDelete(id string) error                                 { return nil }
func (r *stubFolderRepo) Restore(id string) (*model.Folder, error)                   { return nil, nil }
func (r *stubFolderRepo) RestoreTree(id string) (*model.Folder, error)               { return nil, nil }
func (r *stubFolderRepo) Rebalance(updates []repository.SortKeyUpdate) error {
	for _, u := range updates {
		f := r.items[u.ID]
		f.SortKey = u.SortKey
		r.items[u.ID] = f
	}
	return nil
}
func (r *stubFolderRepo) Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error) {
	return nil, nil
}
func (r *stubFolderRepo) BatchDeleteTree(folderIDs []string, bookmarkIDs []string) error { return nil }

func TestResolveSortKey_Bookmark(t *testing.T) {
	br := newStubBookmarkRepo()
	br.items["bm1"] = model.Bookmark{ID: "bm1", SortKey: "abc"}
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, _, err := svc.ResolveSortKey("bm1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key != "abc" {
		t.Errorf("expected 'abc', got %q", key)
	}
}

func TestResolveSortKey_Folder(t *testing.T) {
	br := newStubBookmarkRepo()
	fr := newStubFolderRepo()
	fr.items["f1"] = model.Folder{ID: "f1", SortKey: "xyz"}
	svc := NewSortKeyService(br, fr)

	key, _, err := svc.ResolveSortKey("f1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key != "xyz" {
		t.Errorf("expected 'xyz', got %q", key)
	}
}

func TestResolveSortKey_NotFound(t *testing.T) {
	br := newStubBookmarkRepo()
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	_, _, err := svc.ResolveSortKey("nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent id")
	}
}

func TestComputeBookmarkSortKey_EmptySiblings(t *testing.T) {
	br := newStubBookmarkRepo()
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, err := svc.ComputeBookmarkSortKey(nil, nil, nil, "bm1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key == "" {
		t.Error("expected non-empty sort key for new bookmark")
	}
}

func TestComputeBookmarkSortKey_HeadInsertion(t *testing.T) {
	br := newStubBookmarkRepo()
	br.items["bm-before"] = model.Bookmark{ID: "bm-before", SortKey: "n"}
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, err := svc.ComputeBookmarkSortKey(nil, nil, ptr("bm-before"), "new-bm")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key == "" || key >= "n" {
		t.Errorf("expected sort key before 'n', got %q", key)
	}
}

func TestComputeBookmarkSortKey_TailInsertion(t *testing.T) {
	br := newStubBookmarkRepo()
	br.items["bm-after"] = model.Bookmark{ID: "bm-after", SortKey: "n"}
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, err := svc.ComputeBookmarkSortKey(nil, ptr("bm-after"), nil, "new-bm")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key == "" || key <= "n" {
		t.Errorf("expected sort key after 'n', got %q", key)
	}
}

func TestComputeBookmarkSortKey_BetweenInsertion(t *testing.T) {
	br := newStubBookmarkRepo()
	br.items["bm1"] = model.Bookmark{ID: "bm1", SortKey: "a"}
	br.items["bm2"] = model.Bookmark{ID: "bm2", SortKey: "c"}
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, err := svc.ComputeBookmarkSortKey(nil, ptr("bm1"), ptr("bm2"), "new-bm")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key <= "a" || key >= "c" {
		t.Errorf("expected sort key between 'a' and 'c', got %q", key)
	}
}

func TestComputeBookmarkSortKey_NeedsRebalance(t *testing.T) {
	br := newStubBookmarkRepo()
	br.items["bm1"] = model.Bookmark{ID: "bm1", SortKey: "a"}
	br.items["bm2"] = model.Bookmark{ID: "bm2", SortKey: "b"}
	br.items["bm3"] = model.Bookmark{ID: "bm3", SortKey: "c"}
	fr := newStubFolderRepo()
	svc := NewSortKeyService(br, fr)

	key, err := svc.ComputeBookmarkSortKey(nil, ptr("bm1"), ptr("bm2"), "new-bm")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if key == "" {
		t.Error("expected non-empty sort key even with adjacent keys")
	}
	// Verify bm1 and bm2 were rebalanced and now have valid gap between them
	bm1, _ := br.GetByID("bm1")
	bm2, _ := br.GetByID("bm2")
	if bm1.SortKey >= bm2.SortKey {
		t.Error("after rebalance, bm1 key should be < bm2 key")
	}
}

func ptr(s string) *string { return &s }
