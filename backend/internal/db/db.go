package db

import (
	"database/sql"
	_ "modernc.org/sqlite"
)

func MustOpen(path string) *sql.DB {
	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		panic(err)
	}
	db.SetMaxOpenConns(1)
	migrate(db)
	return db
}

func migrate(db *sql.DB) {
	ddl := `
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
		CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_parent_sort_unique
			ON folder(parent_id, sort_key) WHERE deleted_at IS NULL;

		CREATE TABLE IF NOT EXISTS bookmark (
			id         TEXT PRIMARY KEY,
			title      TEXT NOT NULL,
			url        TEXT NOT NULL,
			folder_id  TEXT REFERENCES folder(id) ON DELETE SET NULL,
			sort_key   TEXT NOT NULL,
			version    INTEGER NOT NULL DEFAULT 1,
			notes      TEXT NOT NULL DEFAULT '',
			deleted_at TEXT,
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
		CREATE INDEX IF NOT EXISTS idx_bookmark_folder_sort ON bookmark(folder_id, sort_key);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_folder_sort_unique
			ON bookmark(folder_id, sort_key) WHERE deleted_at IS NULL;

		CREATE TABLE IF NOT EXISTS setting (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`
	if _, err := db.Exec(ddl); err != nil {
		panic(err)
	}
	db.Exec(`ALTER TABLE bookmark ADD COLUMN notes TEXT NOT NULL DEFAULT ''`)
}
