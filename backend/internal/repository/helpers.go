package repository

import (
	"cubby/internal/model"
	"database/sql"
)

// checkRowsAffected returns sql.ErrNoRows if the statement affected zero rows.
// Extracted from repeated pattern in bookmark.go, folder.go, move.go.
func checkRowsAffected(res sql.Result) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// scanBookmark scans a single bookmark row from any scanner (sql.Row or sql.Rows).
// Column order: id, title, url, icon, folder_id, sort_key, version, notes, created_at, updated_at.
func scanBookmark(scanner interface {
	Scan(dest ...any) error
}) (*model.Bookmark, error) {
	var b model.Bookmark
	if err := scanner.Scan(&b.ID, &b.Title, &b.URL, &b.Icon, &b.FolderID, &b.SortKey, &b.Version, &b.Notes, &b.CreatedAt, &b.UpdatedAt); err != nil {
		return nil, err
	}
	return &b, nil
}

// scanFolder scans a single folder row from any scanner (sql.Row or sql.Rows).
// Column order: id, name, parent_id, sort_key, version, has_children, created_at, updated_at.
func scanFolder(scanner interface {
	Scan(dest ...any) error
}) (*model.Folder, error) {
	var f model.Folder
	if err := scanner.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.HasChildren, &f.CreatedAt, &f.UpdatedAt); err != nil {
		return nil, err
	}
	return &f, nil
}
