package repository

import (
	"cubby/internal/model"
	"database/sql"
	"fmt"
	"strings"
)

type BookmarkRepo struct {
	db *sql.DB
}

func NewBookmarkRepo(db *sql.DB) *BookmarkRepo { return &BookmarkRepo{db: db} }

type BookmarkFavoriteToggleResult struct {
	IsFavorite bool `json:"is_favorite"`
}

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

type MetadataUpdateOptions struct {
	ForceDescription bool
	ForceTitle       bool
}

type BookmarkAssignment struct {
	ID        string
	FolderID  *string
	SortOrder int
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
		                        folder_id=?, is_favorite=?, sort_order=?, metadata_fetched=?,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		b.Title, b.URL, b.Description, b.FaviconURL, b.ThumbnailURL,
		b.FolderID, b.IsFavorite, b.SortOrder, b.MetadataFetched, b.ID)
	return err
}

func (r *BookmarkRepo) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM bookmarks WHERE id=?`, id)
	return err
}

func (r *BookmarkRepo) BatchDelete(ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, id := range ids {
		if _, err := tx.Exec(`DELETE FROM bookmarks WHERE id=?`, id); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *BookmarkRepo) ToggleFavorite(id string) (bool, error) {
	var fav int
	err := r.db.QueryRow(
		`UPDATE bookmarks SET is_favorite = CASE WHEN is_favorite=1 THEN 0 ELSE 1 END,
		                         updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING is_favorite`, id).Scan(&fav)
	return fav == 1, err
}

func (r *BookmarkRepo) UpdateMetadata(id, title, description, faviconURL, thumbnailURL string, options MetadataUpdateOptions) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=CASE
		                            WHEN ? <> '' AND (? = 1 OR title = '' OR title = url) THEN ?
		                            ELSE title
		                        END,
		                        description=CASE
		                            WHEN ? <> '' AND (? = 1 OR description = '') THEN ?
		                            ELSE description
		                        END,
		                        favicon_url=COALESCE(NULLIF(?, ''), favicon_url),
		                        thumbnail_url=COALESCE(NULLIF(?, ''), thumbnail_url),
		                        metadata_fetched=1,
		                        updated_at=CURRENT_TIMESTAMP
		 WHERE id=?`,
		title, boolToInt(options.ForceTitle), title,
		description, boolToInt(options.ForceDescription), description,
		faviconURL, thumbnailURL, id)
	return err
}

func (r *BookmarkRepo) MoveToFolder(bookmarkID string, folderID *string) error {
	sortOrder, err := r.nextSortOrder(folderID)
	if err != nil {
		return err
	}

	_, err = r.db.Exec(
		`UPDATE bookmarks SET folder_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		folderID, sortOrder, bookmarkID)
	return err
}

func (r *BookmarkRepo) BatchMove(ids []string, folderID *string) error {
	if len(ids) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sortOrder, err := r.nextSortOrderTx(tx, folderID)
	if err != nil {
		return err
	}

	for index, id := range ids {
		if _, err := tx.Exec(
			`UPDATE bookmarks SET folder_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
			folderID, sortOrder+index, id,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
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

func (r *BookmarkRepo) BatchSetFavorite(ids []string, isFavorite bool) error {
	if len(ids) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	favoriteValue := 0
	if isFavorite {
		favoriteValue = 1
	}

	for _, id := range ids {
		if _, err := tx.Exec(
			`UPDATE bookmarks SET is_favorite=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
			favoriteValue, id,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *BookmarkRepo) ClearFolderAssignments(folderIDs []string) error {
	if len(folderIDs) == 0 {
		return nil
	}

	placeholders := make([]string, len(folderIDs))
	args := make([]any, len(folderIDs))
	for i, id := range folderIDs {
		placeholders[i] = "?"
		args[i] = id
	}

	query := `UPDATE bookmarks SET folder_id=NULL, updated_at=CURRENT_TIMESTAMP WHERE folder_id IN (` + strings.Join(placeholders, ",") + `)`
	_, err := r.db.Exec(query, args...)
	return err
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

func (r *BookmarkRepo) ListAll() ([]model.Bookmark, error) {
	rows, err := r.db.Query(
		`SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks ORDER BY sort_order, created_at DESC`)
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

func (r *BookmarkRepo) ListByExactFolder(folderID *string) ([]model.Bookmark, error) {
	query := `SELECT id, title, url, description, favicon_url, thumbnail_url,
		        folder_id, is_favorite, sort_order, metadata_fetched,
		        created_at, updated_at
		 FROM bookmarks WHERE `
	var rows *sql.Rows
	var err error
	if folderID == nil {
		rows, err = r.db.Query(query+`folder_id IS NULL ORDER BY sort_order, created_at DESC`)
	} else {
		rows, err = r.db.Query(query+`folder_id = ? ORDER BY sort_order, created_at DESC`, *folderID)
	}
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

func (r *BookmarkRepo) UpdateTitle(id, title string) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		title, id,
	)
	return err
}

func (r *BookmarkRepo) RestoreAssignments(assignments []BookmarkAssignment) error {
	if len(assignments) == 0 {
		return nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, assignment := range assignments {
		if _, err := tx.Exec(
			`UPDATE bookmarks SET folder_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
			assignment.FolderID, assignment.SortOrder, assignment.ID,
		); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *BookmarkRepo) AssignBookmark(id string, folderID *string, sortOrder int) error {
	_, err := r.db.Exec(
		`UPDATE bookmarks SET folder_id=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		folderID, sortOrder, id,
	)
	return err
}

func (r *BookmarkRepo) ExistsByURL(url string) (bool, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM bookmarks WHERE url=?`, url).Scan(&count)
	return count > 0, err
}

func (r *BookmarkRepo) CreateIfNotExists(bookmark *model.Bookmark) (bool, error) {
	exists, err := r.ExistsByURL(bookmark.URL)
	if err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}
	if err := r.Create(bookmark); err != nil {
		return false, err
	}
	return true, nil
}

func (r *BookmarkRepo) BulkCreate(bookmarks []model.Bookmark) (created int, skipped int, err error) {
	for _, b := range bookmarks {
		inserted, err := r.CreateIfNotExists(&b)
		if err != nil {
			return created, skipped, err
		}
		if !inserted {
			skipped++
			continue
		}
		created++
	}
	return created, skipped, nil
}

func (r *BookmarkRepo) nextSortOrder(folderID *string) (int, error) {
	return r.nextSortOrderTx(r.db, folderID)
}

type queryRower interface {
	QueryRow(query string, args ...any) *sql.Row
}

func (r *BookmarkRepo) nextSortOrderTx(rower queryRower, folderID *string) (int, error) {
	var next sql.NullInt64
	var err error
	if folderID == nil {
		err = rower.QueryRow(`SELECT COALESCE(MAX(sort_order), -1) + 1 FROM bookmarks WHERE folder_id IS NULL`).Scan(&next)
	} else {
		err = rower.QueryRow(`SELECT COALESCE(MAX(sort_order), -1) + 1 FROM bookmarks WHERE folder_id = ?`, *folderID).Scan(&next)
	}
	if err != nil {
		return 0, err
	}
	return int(next.Int64), nil
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
