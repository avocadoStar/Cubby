package repository

import (
	"cubby/internal/model"
	"database/sql"

	"github.com/google/uuid"
)

type FolderRepo struct{ DB *sql.DB }

func (r *FolderRepo) List(parentID *string) ([]model.Folder, error) {
	var rows *sql.Rows
	var err error
	if parentID == nil {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
			FROM folder WHERE parent_id IS NULL AND deleted_at IS NULL ORDER BY sort_key`)
	} else {
		rows, err = r.DB.Query(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
			FROM folder WHERE parent_id=? AND deleted_at IS NULL ORDER BY sort_key`, *parentID)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var folders []model.Folder
	for rows.Next() {
		var f model.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		folders = append(folders, f)
	}
	return folders, nil
}

func (r *FolderRepo) Get(id string) (*model.Folder, error) {
	var f model.Folder
	err := r.DB.QueryRow(`SELECT id,name,parent_id,sort_key,version,created_at,updated_at
		FROM folder WHERE id=? AND deleted_at IS NULL`, id).
		Scan(&f.ID, &f.Name, &f.ParentID, &f.SortKey, &f.Version, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *FolderRepo) Create(name string, parentID *string, sortKey string) (*model.Folder, error) {
	id := uuid.New().String()
	_, err := r.DB.Exec(`INSERT INTO folder (id,name,parent_id,sort_key) VALUES (?,?,?,?)`,
		id, name, parentID, sortKey)
	if err != nil {
		return nil, err
	}
	return r.Get(id)
}

func (r *FolderRepo) Update(id, name string, version int) (*model.Folder, error) {
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

func (r *FolderRepo) SoftDelete(id string) error {
	_, err := r.DB.Exec(`UPDATE folder SET deleted_at=datetime('now') WHERE id=?`, id)
	return err
}

func (r *FolderRepo) Move(id string, parentID *string, sortKey string, version int) (*model.Folder, error) {
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
