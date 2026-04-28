package repository

import (
	"database/sql"
	"cubby/internal/model"
)

type FolderRepo struct {
	db *sql.DB
}

func NewFolderRepo(db *sql.DB) *FolderRepo { return &FolderRepo{db: db} }

type FolderTree struct {
	model.Folder
	Children []FolderTree `json:"children"`
}

func (r *FolderRepo) GetTree() ([]FolderTree, error) {
	rows, err := r.db.Query(
		`SELECT id, name, parent_id, sort_order, created_at, updated_at
		 FROM folders ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flat []model.Folder
	for rows.Next() {
		var f model.Folder
		if err := rows.Scan(&f.ID, &f.Name, &f.ParentID, &f.SortOrder, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		flat = append(flat, f)
	}
	return buildTree(flat), nil
}

func buildTree(flat []model.Folder) []FolderTree {
	m := make(map[string]*FolderTree, len(flat))
	for i := range flat {
		m[flat[i].ID] = &FolderTree{Folder: flat[i]}
	}
	var roots []FolderTree
	for i := range flat {
		ft := m[flat[i].ID]
		if flat[i].ParentID != nil {
			if parent, ok := m[*flat[i].ParentID]; ok {
				parent.Children = append(parent.Children, *ft)
				continue
			}
		}
		roots = append(roots, *ft)
	}
	return roots
}

func (r *FolderRepo) Create(f *model.Folder) error {
	_, err := r.db.Exec(
		`INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at)
		 VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		f.ID, f.Name, f.ParentID, f.SortOrder)
	return err
}

func (r *FolderRepo) Update(id, name string, parentID *string, sortOrder int) error {
	_, err := r.db.Exec(
		`UPDATE folders SET name=?, parent_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		name, parentID, sortOrder, id)
	return err
}

func (r *FolderRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM folders WHERE id=?`, id)
	return err
}

func (r *FolderRepo) Exists(id string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM folders WHERE id=?`, id).Scan(&count)
	return count > 0, err
}

func (r *FolderRepo) Reorder(ids []string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE folders SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, i, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *FolderRepo) GetDescendantIDs(folderID string) ([]string, error) {
	ids := []string{folderID}
	rows, err := r.db.Query(`SELECT id FROM folders WHERE parent_id=?`, folderID)
	if err != nil {
		return nil, err
	}
	var childIDs []string
	for rows.Next() {
		var cid string
		if err := rows.Scan(&cid); err != nil {
			rows.Close()
			return nil, err
		}
		childIDs = append(childIDs, cid)
		ids = append(ids, cid)
	}
	rows.Close()

	for _, cid := range childIDs {
		rows, err := r.db.Query(`SELECT id FROM folders WHERE parent_id=?`, cid)
		if err != nil {
			return nil, err
		}
		for rows.Next() {
			var gcid string
			if err := rows.Scan(&gcid); err != nil {
				rows.Close()
				return nil, err
			}
			ids = append(ids, gcid)
		}
		rows.Close()
	}
	return ids, nil
}
