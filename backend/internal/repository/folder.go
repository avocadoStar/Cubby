package repository

import (
	"cubby/internal/model"
	"database/sql"
)

type FolderRepo struct {
	db *sql.DB
}

func NewFolderRepo(db *sql.DB) *FolderRepo { return &FolderRepo{db: db} }

type FolderTree struct {
	model.Folder
	Children []FolderTree `json:"children"`
}

type FolderPosition struct {
	ID        string  `json:"id"`
	ParentID  *string `json:"parent_id"`
	SortOrder int     `json:"sort_order"`
}

func (r *FolderRepo) GetTree() ([]FolderTree, error) {
	flat, err := r.listAll()
	if err != nil {
		return nil, err
	}
	return buildTree(flat), nil
}

func buildTree(flat []model.Folder) []FolderTree {
	childrenByParent := make(map[string][]model.Folder, len(flat))
	var roots []model.Folder

	for _, folder := range flat {
		if folder.ParentID == nil {
			roots = append(roots, folder)
			continue
		}
		childrenByParent[*folder.ParentID] = append(childrenByParent[*folder.ParentID], folder)
	}

	var buildBranch func(folder model.Folder) FolderTree
	buildBranch = func(folder model.Folder) FolderTree {
		node := FolderTree{Folder: folder}
		for _, child := range childrenByParent[folder.ID] {
			node.Children = append(node.Children, buildBranch(child))
		}
		return node
	}

	tree := make([]FolderTree, 0, len(roots))
	for _, root := range roots {
		tree = append(tree, buildBranch(root))
	}
	return tree
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
	folderIDs, err := r.GetDescendantIDs(id)
	if err != nil {
		return err
	}
	if len(folderIDs) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	placeholders := make([]string, len(folderIDs))
	args := make([]any, len(folderIDs))
	for i, folderID := range folderIDs {
		placeholders[i] = "?"
		args[i] = folderID
	}

	updateQuery := `UPDATE bookmarks SET folder_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE folder_id IN (` + joinComma(placeholders) + `)`
	if _, err := tx.Exec(updateQuery, args...); err != nil {
		return err
	}

	deleteQuery := `DELETE FROM folders WHERE id IN (` + joinComma(placeholders) + `)`
	if _, err := tx.Exec(deleteQuery, args...); err != nil {
		return err
	}

	return tx.Commit()
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

func (r *FolderRepo) Move(id string, parentID *string, sortOrder int) error {
	_, err := r.db.Exec(
		`UPDATE folders SET parent_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		parentID, sortOrder, id,
	)
	return err
}

func (r *FolderRepo) GetDescendantIDs(folderID string) ([]string, error) {
	flat, err := r.listAll()
	if err != nil {
		return nil, err
	}

	childrenByParent := make(map[string][]string, len(flat))
	exists := false
	for _, folder := range flat {
		if folder.ID == folderID {
			exists = true
		}
		if folder.ParentID != nil {
			childrenByParent[*folder.ParentID] = append(childrenByParent[*folder.ParentID], folder.ID)
		}
	}
	if !exists {
		return nil, nil
	}

	ids := []string{folderID}
	stack := append([]string(nil), childrenByParent[folderID]...)
	for len(stack) > 0 {
		last := len(stack) - 1
		current := stack[last]
		stack = stack[:last]
		ids = append(ids, current)
		stack = append(stack, childrenByParent[current]...)
	}

	return ids, nil
}

func (r *FolderRepo) listAll() ([]model.Folder, error) {
	rows, err := r.db.Query(
		`SELECT id, name, parent_id, sort_order, created_at, updated_at
		 FROM folders ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flat []model.Folder
	for rows.Next() {
		var folder model.Folder
		if err := rows.Scan(&folder.ID, &folder.Name, &folder.ParentID, &folder.SortOrder, &folder.CreatedAt, &folder.UpdatedAt); err != nil {
			return nil, err
		}
		flat = append(flat, folder)
	}
	return flat, nil
}

func joinComma(items []string) string {
	if len(items) == 0 {
		return ""
	}

	result := items[0]
	for i := 1; i < len(items); i++ {
		result += "," + items[i]
	}
	return result
}
