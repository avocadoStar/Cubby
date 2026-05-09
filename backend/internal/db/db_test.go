package db

import (
	"database/sql"
	"errors"
	"path/filepath"
	"testing"
)

func TestMigrateEnforcesUniqueRootSortKeys(t *testing.T) {
	database := MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	if _, err := database.Exec(`INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f1', 'one', NULL, 'n')`); err != nil {
		t.Fatalf("insert first root folder: %v", err)
	}
	if _, err := database.Exec(`INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f2', 'two', NULL, 'n')`); err == nil {
		t.Fatal("expected duplicate root folder sort_key to fail")
	}

	if _, err := database.Exec(`INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b1', 'one', 'https://example.com/1', NULL, 'n')`); err != nil {
		t.Fatalf("insert first root bookmark: %v", err)
	}
	if _, err := database.Exec(`INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b2', 'two', 'https://example.com/2', NULL, 'n')`); err == nil {
		t.Fatal("expected duplicate root bookmark sort_key to fail")
	}
}

func TestMigrateAllowsLegacyDatabasesWithNotesColumn(t *testing.T) {
	database := MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	if err := database.QueryRow(`SELECT notes FROM bookmark LIMIT 1`).Scan(new(string)); err != nil && !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("notes column should exist after migration: %v", err)
	}
}

func TestMigrateAddsBookmarkIconColumn(t *testing.T) {
	database := MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	if err := database.QueryRow(`SELECT icon FROM bookmark LIMIT 1`).Scan(new(string)); err != nil && !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("icon column should exist after migration: %v", err)
	}
}
