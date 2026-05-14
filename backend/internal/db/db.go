package db

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const schemaDDL = `
	CREATE TABLE IF NOT EXISTS folder (
		id         TEXT PRIMARY KEY,
		name       TEXT NOT NULL,
		parent_id  TEXT REFERENCES folder(id) ON DELETE CASCADE,
		sort_key   TEXT NOT NULL,
		version    INTEGER NOT NULL DEFAULT 1,
		deleted_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS idx_folder_parent_sort ON folder(parent_id, sort_key);

	CREATE TABLE IF NOT EXISTS bookmark (
		id         TEXT PRIMARY KEY,
		title      TEXT NOT NULL,
		url        TEXT NOT NULL,
		icon       TEXT NOT NULL DEFAULT '',
		folder_id  TEXT REFERENCES folder(id) ON DELETE SET NULL,
		sort_key   TEXT NOT NULL,
		version    INTEGER NOT NULL DEFAULT 1,
		notes      TEXT NOT NULL DEFAULT '',
		deleted_at TEXT,
		created_at TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at TEXT NOT NULL DEFAULT (datetime('now'))
	);
	CREATE INDEX IF NOT EXISTS idx_bookmark_folder_sort ON bookmark(folder_id, sort_key);

	CREATE TABLE IF NOT EXISTS setting (
		key   TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
`

func MustOpen(path string) *sql.DB {
	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		panic(err)
	}
	db.SetMaxOpenConns(2)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(30 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)
	migrate(db)
	return db
}

func migrate(db *sql.DB) {
	mustExec(db, schemaDDL)
	addBookmarkCompatibilityColumns(db)
	rebuildSortKeyUniqueIndexes(db)
}

func addBookmarkCompatibilityColumns(db *sql.DB) {
	if _, err := db.Exec(`ALTER TABLE bookmark ADD COLUMN notes TEXT NOT NULL DEFAULT ''`); err != nil {
		if !isDuplicateColumnError(err) {
			panic(err)
		}
	}
	if _, err := db.Exec(`ALTER TABLE bookmark ADD COLUMN icon TEXT NOT NULL DEFAULT ''`); err != nil {
		if !isDuplicateColumnError(err) {
			panic(err)
		}
	}
}

func rebuildSortKeyUniqueIndexes(db *sql.DB) {
	mustExec(db, `DROP INDEX IF EXISTS idx_folder_parent_sort_unique`)
	mustExec(db, `DROP INDEX IF EXISTS idx_bookmark_folder_sort_unique`)
	if err := repairDuplicateSortKeys(db, "folder", "parent_id"); err != nil {
		panic(err)
	}
	if err := repairDuplicateSortKeys(db, "bookmark", "folder_id"); err != nil {
		panic(err)
	}
	mustExec(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_parent_sort_unique
		ON folder(COALESCE(parent_id, '__root__'), sort_key) WHERE deleted_at IS NULL`)
	mustExec(db, `CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_folder_sort_unique
		ON bookmark(COALESCE(folder_id, '__root__'), sort_key) WHERE deleted_at IS NULL`)
}

func mustExec(db *sql.DB, query string) {
	if _, err := db.Exec(query); err != nil {
		panic(err)
	}
}

func isDuplicateColumnError(err error) bool {
	return strings.Contains(err.Error(), "duplicate column name")
}

func repairDuplicateSortKeys(db *sql.DB, table, parentColumn string) error {
	parentRows, err := db.Query(fmt.Sprintf(`
		SELECT parent_key FROM (
			SELECT COALESCE(%[1]s, '__root__') AS parent_key, sort_key, COUNT(*) AS c
			FROM %[2]s
			WHERE deleted_at IS NULL
			GROUP BY parent_key, sort_key
			HAVING c > 1
		)
		GROUP BY parent_key`, parentColumn, table))
	if err != nil {
		return err
	}
	defer parentRows.Close()

	var parentKeys []string
	for parentRows.Next() {
		var parentKey string
		if err := parentRows.Scan(&parentKey); err != nil {
			return err
		}
		parentKeys = append(parentKeys, parentKey)
	}
	if err := parentRows.Err(); err != nil {
		return err
	}

	for _, parentKey := range parentKeys {
		if err := rebalanceSiblingGroup(db, table, parentColumn, parentKey); err != nil {
			return err
		}
	}
	return nil
}

func rebalanceSiblingGroup(db *sql.DB, table, parentColumn, parentKey string) error {
	var rows *sql.Rows
	var err error
	query := fmt.Sprintf(`SELECT id FROM %s WHERE %s IS NULL AND deleted_at IS NULL ORDER BY sort_key, created_at, id`, table, parentColumn)
	if parentKey == "__root__" {
		rows, err = db.Query(query)
	} else {
		query = fmt.Sprintf(`SELECT id FROM %s WHERE %s=? AND deleted_at IS NULL ORDER BY sort_key, created_at, id`, table, parentColumn)
		rows, err = db.Query(query, parentKey)
	}
	if err != nil {
		return err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	prefix := fmt.Sprintf("%016x", time.Now().UnixNano())
	for i, id := range ids {
		sortKey := fmt.Sprintf("%s%016x", prefix, i+1)
		if _, err := db.Exec(fmt.Sprintf(`UPDATE %s SET sort_key=?, updated_at=datetime('now') WHERE id=?`, table), sortKey, id); err != nil {
			return err
		}
	}
	return nil
}
