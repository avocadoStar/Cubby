package repository

import (
	"cubby/internal/model"
	"database/sql"

	"github.com/google/uuid"
)

type folderRepo struct{ DB *sql.DB }

func NewFolderRepo(db *sql.DB) FolderRepo {
	return &folderRepo{DB: db}
}

func (r *folderRepo) List(parentID *string) ([]model.Folder, error) {
	var rows *sql.Rows
	var err error
	if parentID == nil {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,
			EXISTS(SELECT 1 FROM folder c WHERE c.parent_id=folder.id AND c.deleted_at IS NULL) as has_children,
			created_at,updated_at
			FROM folder WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY sort_key`)
	} else {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,
			EXISTS(SELECT 1 FROM folder c WHERE c.parent_id=folder.id AND c.deleted_at IS NULL) as has_children,
			created_at,updated_at
			FROM folder WHERE parent_id=? AND deleted_at IS NULL ORDER BY sort_key`, *parentID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var folders []model.Folder
	for rows.Next() {
		var f model.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.HasChildren, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return folders, nil
}

func (r *folderRepo) Get(id string) (*model.Folder, error) {
	var f model.Folder
	err := r.DB.QueryRow(`SELECT id,name,parent_id,sort_key,version,
		EXISTS(SELECT 1 FROM folder c WHERE c.parent_id=folder.id AND c.deleted_at IS NULL) as has_children,
		created_at,updated_at
		FROM folder WHERE id=? AND deleted_at IS NULL`, id).
		Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.HasChildren, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *folderRepo) Create(name string, parentID *string, sortKey string) (*model.Folder, error) {
	id := uuid.New().String()
	_, err := r.DB.Exec(`INSERT INTO folder (id,name,parent_id,sort_key) VALUES (?,?,?,?)`,
		id, name, parentID, sortKey)
	if err != nil {
		return nil, err
	}
	return r.Get(id)
}

func (r *folderRepo) Update(id, name string, version int) (*model.Folder, error) {
	res, err := r.DB.Exec(`UPDATE folder SET name=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL`,
		name, id, version)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, sql.ErrNoRows
	}
	return r.Get(id)
}

func (r *folderRepo) SoftDelete(id string) error {
	res, err := r.DB.Exec(`UPDATE folder SET deleted_at=datetime('now') WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *folderRepo) Restore(id string) (*model.Folder, error) {
	res, err := r.DB.Exec(`UPDATE folder SET deleted_at=NULL WHERE id=?`, id)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, sql.ErrNoRows
	}
	return r.Get(id)
}

func (r *folderRepo) RestoreTree(id string) (*model.Folder, error) {
	tx, err := r.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`
		WITH RECURSIVE tree(id) AS (
			SELECT id FROM folder WHERE id=?
			UNION ALL
			SELECT f.id FROM folder f JOIN tree t ON f.parent_id=t.id
		)
		UPDATE folder
		SET deleted_at=NULL, version=version+1, updated_at=datetime('now')
		WHERE id IN (SELECT id FROM tree)`, id)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, sql.ErrNoRows
	}

	if _, err := tx.Exec(`
		WITH RECURSIVE tree(id) AS (
			SELECT id FROM folder WHERE id=?
			UNION ALL
			SELECT f.id FROM folder f JOIN tree t ON f.parent_id=t.id
		)
		UPDATE bookmark
		SET deleted_at=NULL, version=version+1, updated_at=datetime('now')
		WHERE folder_id IN (SELECT id FROM tree)`, id); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.Get(id)
}

func (r *folderRepo) Rebalance(updates []SortKeyUpdate) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, u := range updates {
		_, err := tx.Exec(`UPDATE folder SET sort_key=?, version=version+1, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`,
			u.SortKey, u.ID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *folderRepo) Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error) {
	res, err := r.DB.Exec(`UPDATE folder SET parent_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
		WHERE id=? AND version=? AND deleted_at IS NULL`,
		parentID, sortKey, id, version)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, sql.ErrNoRows
	}
	return r.Get(id)
}

// BatchDeleteTree soft-deletes all specified folders and bookmarks in a single transaction.
func (r *folderRepo) BatchDeleteTree(folderIDs, bookmarkIDs []string) error {
	tx, err := r.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, id := range folderIDs {
		if _, err := tx.Exec(`UPDATE folder SET deleted_at=datetime('now'), version=version+1, updated_at=datetime('now') WHERE id=?`, id); err != nil {
			return err
		}
	}
	for _, id := range bookmarkIDs {
		if _, err := tx.Exec(`UPDATE bookmark SET deleted_at=datetime('now'), version=version+1, updated_at=datetime('now') WHERE id=?`, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}
