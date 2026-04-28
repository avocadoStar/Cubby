package repository

import (
	"database/sql"
	"cubby/internal/model"
	"fmt"
	"strings"
)

type BookmarkRepo struct {
	db *sql.DB
}

func NewBookmarkRepo(db *sql.DB) *BookmarkRepo { return &BookmarkRepo{db: db} }

type BookmarkQuery struct {
	FolderID string
	Q        string
	Favorite bool
	Unsorted bool
	Recent   bool
	Page     int
	PageSize int
}

type BookmarkListResult struct {
	Items    []model.Bookmark `json:"items"`
	Total    int              `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
}

func (r *BookmarkRepo) List(q BookmarkQuery) (*BookmarkListResult, error) {
	var conditions []string
	var args []any

	if q.FolderID != "" && q.FolderID != "all" {
		conditions = append(conditions, "folder_id = ?")
		args = append(args, q.FolderID)
	}
	if q.Favorite {
		conditions = append(conditions, "is_favorite = 1")
	}
	if q.Unsorted {
		conditions = append(conditions, "folder_id IS NULL")
	}
	if q.Q != "" {
		conditions = append(conditions, "(title LIKE ? OR url LIKE ? OR description LIKE ?)")
		s := "%" + q.Q + "%"
		args = append(args, s, s, s)
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 {
		q.PageSize = 50
	}
	if q.PageSize > 200 {
		q.PageSize = 200
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int
	if err := r.db.QueryRow("SELECT COUNT(*) FROM bookmarks "+where, args...).Scan(&total); err != nil {
		return nil, err
	}

	orderBy := "sort_order ASC, created_at DESC"
	if q.Recent {
		orderBy = "created_at DESC"
	}

	offset := (q.Page - 1) * q.PageSize
	query := fmt.Sprintf(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks %s ORDER BY %s LIMIT ? OFFSET ?`,
		where, orderBy)

	queryArgs := append(args, q.PageSize, offset)
	rows, err := r.db.Query(query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		if err := rows.Scan(&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
			&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
			&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}

	return &BookmarkListResult{Items: items, Total: total, Page: q.Page, PageSize: q.PageSize}, nil
}

func (r *BookmarkRepo) GetByID(id string) (*model.Bookmark, error) {
	b := &model.Bookmark{}
	err := r.db.QueryRow(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks WHERE id=?`, id).Scan(
		&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
		&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
		&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (r *BookmarkRepo) Create(b *model.Bookmark) error {
	_, err := r.db.Exec(
		`INSERT INTO bookmarks (id, title, url, description, favicon_url, thumbnail_url,
		                        folder_id, is_favorite, sort_order, metadata_fetched,
		                        created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		b.ID, b.Title, b.URL, b.Description, b.FaviconURL, b.ThumbnailURL,
		b.FolderID, b.IsFavorite, b.SortOrder, b.MetadataFetched)
	return err
}

func (r *BookmarkRepo) Update(b *model.Bookmark) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=?, url=?, description=?, favicon_url=?, thumbnail_url=?,
		                        folder_id=?, is_favorite=?, sort_order=?,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		b.Title, b.URL, b.Description, b.FaviconURL, b.ThumbnailURL,
		b.FolderID, b.IsFavorite, b.SortOrder, b.ID)
	return err
}

func (r *BookmarkRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM bookmarks WHERE id=?`, id)
	return err
}

func (r *BookmarkRepo) ToggleFavorite(id string) (bool, error) {
	var fav int
	err := r.db.QueryRow(
		`UPDATE bookmarks SET is_favorite = CASE WHEN is_favorite=1 THEN 0 ELSE 1 END,
		                         updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING is_favorite`, id).Scan(&fav)
	return fav == 1, err
}

func (r *BookmarkRepo) UpdateMetadata(id, title, description, faviconURL, thumbnailURL string) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=COALESCE(NULLIF(?, ''), title),
		                        description=COALESCE(NULLIF(?, ''), description),
		                        favicon_url=COALESCE(NULLIF(?, ''), favicon_url),
		                        thumbnail_url=COALESCE(NULLIF(?, ''), thumbnail_url),
		                        metadata_fetched=1,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`, title, description, faviconURL, thumbnailURL, id)
	return err
}

func (r *BookmarkRepo) MoveToFolder(bookmarkID string, folderID *string) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET folder_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		folderID, bookmarkID)
	return err
}

func (r *BookmarkRepo) Reorder(ids []string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for i, id := range ids {
		if _, err := tx.Exec(`UPDATE bookmarks SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, i, id); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *BookmarkRepo) ListByFolderIDs(folderIDs []string) ([]model.Bookmark, error) {
	if len(folderIDs) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(folderIDs))
	args := make([]any, len(folderIDs))
	for i, id := range folderIDs {
		placeholders[i] = "?"
		args[i] = id
	}
	rows, err := r.db.Query(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks WHERE folder_id IN (`+strings.Join(placeholders, ",")+`) ORDER BY sort_order, created_at DESC`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.Bookmark
	for rows.Next() {
		var b model.Bookmark
		if err := rows.Scan(&b.ID, &b.Title, &b.URL, &b.Description, &b.FaviconURL,
			&b.ThumbnailURL, &b.FolderID, &b.IsFavorite, &b.SortOrder,
			&b.MetadataFetched, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, b)
	}
	return items, nil
}

func (r *BookmarkRepo) ExistsByURL(url string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM bookmarks WHERE url=?`, url).Scan(&count)
	return count > 0, err
}

func (r *BookmarkRepo) BulkCreate(bookmarks []model.Bookmark) (created int, skipped int, err error) {
	for _, b := range bookmarks {
		exists, err := r.ExistsByURL(b.URL)
		if err != nil {
			return created, skipped, err
		}
		if exists {
			skipped++
			continue
		}
		if err := r.Create(&b); err != nil {
			return created, skipped, err
		}
		created++
	}
	return created, skipped, nil
}
