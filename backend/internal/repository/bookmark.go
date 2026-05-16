package repository

import (
	"cubby/internal/model"
	"database/sql"

	"github.com/google/uuid"
)

type bookmarkRepo struct{ DB *sql.DB }

func NewBookmarkRepo(db *sql.DB) BookmarkRepo {
	return &bookmarkRepo{DB: db}
}

func (r *bookmarkRepo) List(folderID *string) ([]model.Bookmark, error) {
	var rows *sql.Rows
	var err error
	if folderID == nil {
		rows, err = r.DB.Query(`SELECT id,title,url,icon,folder_id,sort_key,version,notes,created_at,updated_at
			FROM bookmark WHERE folder_id IS NULL AND deleted_at IS NULL ORDER BY sort_key`)
	} else {
		rows, err = r.DB.Query(`SELECT id,title,url,icon,folder_id,sort_key,version,notes,created_at,updated_at
			FROM bookmark WHERE folder_id=? AND deleted_at IS NULL ORDER BY sort_key`, *folderID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var bookmarks []model.Bookmark
	for rows.Next() {
		b, err := scanBookmark(rows)
		if err != nil {
			return nil, err
		}
		bookmarks = append(bookmarks, *b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return bookmarks, nil
}

func (r *bookmarkRepo) GetByID(id string) (*model.Bookmark, error) {
	row := r.DB.QueryRow(`SELECT id,title,url,icon,folder_id,sort_key,version,notes,created_at,updated_at
		FROM bookmark WHERE id=? AND deleted_at IS NULL`, id)
	return scanBookmark(row)
}

func (r *bookmarkRepo) ExistsActiveURL(url string) (bool, error) {
	var exists bool
	err := r.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM bookmark WHERE url=? AND deleted_at IS NULL)`, url).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (r *bookmarkRepo) Create(title, url string, folderID *string, sortKey, icon, notes string) (*model.Bookmark, error) {
	id := uuid.New().String()
	_, err := r.DB.Exec(`INSERT INTO bookmark (id,title,url,icon,folder_id,sort_key,notes) VALUES (?,?,?,?,?,?,?)`,
		id, title, url, icon, folderID, sortKey, notes)
	if err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *bookmarkRepo) Update(id, title, url string, version int) (*model.Bookmark, error) {
	res, err := r.DB.Exec(`UPDATE bookmark SET title=?, url=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL`,
		title, url, id, version)
	if err != nil {
		return nil, err
	}
	if err := checkRowsAffected(res); err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *bookmarkRepo) SoftDelete(id string) error {
	res, err := r.DB.Exec(`UPDATE bookmark SET deleted_at=datetime('now') WHERE id=?`, id)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *bookmarkRepo) Restore(id string) (*model.Bookmark, error) {
	res, err := r.DB.Exec(`UPDATE bookmark SET deleted_at=NULL WHERE id=?`, id)
	if err != nil {
		return nil, err
	}
	if err := checkRowsAffected(res); err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *bookmarkRepo) BatchSoftDelete(ids []string) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, id := range ids {
		if _, err := tx.Exec(`UPDATE bookmark SET deleted_at=datetime('now') WHERE id=?`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *bookmarkRepo) Move(id string, folderID *string, sortKey string, version int) (*model.Bookmark, error) {
	res, err := r.DB.Exec(`UPDATE bookmark SET folder_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL`,
		folderID, sortKey, id, version)
	if err != nil {
		return nil, err
	}
	if err := checkRowsAffected(res); err != nil {
		return nil, err
	}
	return r.GetByID(id)
}

func (r *bookmarkRepo) UpdateNotes(id, notes string) error {
	res, err := r.DB.Exec(`UPDATE bookmark SET notes=?, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`, notes, id)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *bookmarkRepo) Rebalance(updates []SortKeyUpdate) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, u := range updates {
		_, err := tx.Exec(`UPDATE bookmark SET sort_key=?, version=version+1, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`,
			u.SortKey, u.ID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *bookmarkRepo) SearchBoth(query string) ([]model.SearchResult, error) {
	q := "%" + query + "%"
	rows, err := r.DB.Query(`
			SELECT 'bookmark', id, title, url, folder_id, NULL FROM bookmark
			WHERE (title LIKE ? OR url LIKE ?) AND deleted_at IS NULL
			UNION ALL
			SELECT 'folder', id, name, NULL, NULL, parent_id FROM folder
			WHERE name LIKE ? AND deleted_at IS NULL
			ORDER BY title
		`, q, q, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var results []model.SearchResult
	for rows.Next() {
		var sr model.SearchResult
		if err := rows.Scan(&sr.Kind, &sr.ID, &sr.Title, &sr.URL, &sr.FolderID, &sr.ParentID); err != nil {
			return nil, err
		}
		results = append(results, sr)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}
