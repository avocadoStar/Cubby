package repository

import (
	"cubby/internal/model"
	"database/sql"
	"fmt"
)

type moveRepo struct{ DB *sql.DB }

func NewMoveRepo(db *sql.DB) MoveRepo {
	return &moveRepo{DB: db}
}

func (r *moveRepo) BatchMove(items []BatchMoveItem) (*BatchMoveResult, error) {
	tx, err := r.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	for _, item := range items {
		var res sql.Result
		switch item.Kind {
		case "folder":
			res, err = tx.Exec(`UPDATE folder SET parent_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
				WHERE id=? AND version=? AND deleted_at IS NULL`,
				item.ParentID, item.SortKey, item.ID, item.Version)
		case "bookmark":
			res, err = tx.Exec(`UPDATE bookmark SET folder_id=?, sort_key=?, version=version+1, updated_at=datetime('now')
				WHERE id=? AND version=? AND deleted_at IS NULL`,
				item.ParentID, item.SortKey, item.ID, item.Version)
		default:
			return nil, fmt.Errorf("unsupported move kind %q", item.Kind)
		}
		if err != nil {
			return nil, err
		}
		if err := checkRowsAffected(res); err != nil {
			return nil, err
		}
	}

	result := &BatchMoveResult{
		Folders:   []model.Folder{},
		Bookmarks: []model.Bookmark{},
	}
	for _, item := range items {
		switch item.Kind {
		case "folder":
			folder, err := getFolderTx(tx, item.ID)
			if err != nil {
				return nil, err
			}
			result.Folders = append(result.Folders, *folder)
		case "bookmark":
			bookmark, err := getBookmarkTx(tx, item.ID)
			if err != nil {
				return nil, err
			}
			result.Bookmarks = append(result.Bookmarks, *bookmark)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return result, nil
}

func getFolderTx(tx *sql.Tx, id string) (*model.Folder, error) {
	row := tx.QueryRow(`SELECT id,name,parent_id,sort_key,version,
		EXISTS(SELECT 1 FROM folder c WHERE c.parent_id=folder.id AND c.deleted_at IS NULL) as has_children,
		created_at,updated_at
		FROM folder WHERE id=? AND deleted_at IS NULL`, id)
	return scanFolder(row)
}

func getBookmarkTx(tx *sql.Tx, id string) (*model.Bookmark, error) {
	row := tx.QueryRow(`SELECT id,title,url,icon,folder_id,sort_key,version,notes,created_at,updated_at
		FROM bookmark WHERE id=? AND deleted_at IS NULL`, id)
	return scanBookmark(row)
}
