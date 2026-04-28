package repository

import (
	"database/sql"
	"fmt"
	_ "modernc.org/sqlite"
)

func Init(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	db.Exec("PRAGMA journal_mode=WAL")
	db.Exec("PRAGMA foreign_keys=ON")
	if err := migrate(db); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS folders (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		parent_id TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL,
		UNIQUE(parent_id, name)
	);
	CREATE TABLE IF NOT EXISTS bookmarks (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		url TEXT NOT NULL UNIQUE,
		description TEXT DEFAULT '',
		favicon_url TEXT DEFAULT '',
		thumbnail_url TEXT DEFAULT '',
		folder_id TEXT,
		is_favorite INTEGER NOT NULL DEFAULT 0,
		sort_order INTEGER NOT NULL DEFAULT 0,
		metadata_fetched INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
	);
	CREATE TABLE IF NOT EXISTS settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_favorite ON bookmarks(is_favorite);
	CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
	`
	if _, err := db.Exec(schema); err != nil {
		return err
	}

	// Fix existing DB that has CASCADE on folders.parent_id
	var cascade int
	db.QueryRow(`SELECT COUNT(*) FROM pragma_foreign_key_list('folders') WHERE on_delete = 'CASCADE'`).Scan(&cascade)
	if cascade > 0 {
		db.Exec("PRAGMA foreign_keys=OFF")
		db.Exec(`ALTER TABLE folders RENAME TO folders_old`)
		db.Exec(`CREATE TABLE folders (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			parent_id TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL,
			UNIQUE(parent_id, name)
		)`)
		db.Exec(`INSERT INTO folders SELECT * FROM folders_old`)
		db.Exec(`DROP TABLE folders_old`)
		db.Exec("PRAGMA foreign_keys=ON")
	}

	return nil
}
