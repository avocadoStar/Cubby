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

func TestMigrateAddsBookmarkCompatibilityColumns(t *testing.T) {
	database := MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	tests := []struct {
		name  string
		query string
	}{
		{name: "notes", query: `SELECT notes FROM bookmark LIMIT 1`},
		{name: "icon", query: `SELECT icon FROM bookmark LIMIT 1`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := database.QueryRow(tt.query).Scan(new(string)); err != nil && !errors.Is(err, sql.ErrNoRows) {
				t.Fatalf("%s column should exist after migration: %v", tt.name, err)
			}
		})
	}
}

func TestMigrateEnforcesUniqueSortKeysPerParent(t *testing.T) {
	database := MustOpen(filepath.Join(t.TempDir(), "cubby.db"))
	defer database.Close()

	if _, err := database.Exec(`INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('p1', 'parent one', NULL, 'p1')`); err != nil {
		t.Fatalf("insert parent one: %v", err)
	}
	if _, err := database.Exec(`INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('p2', 'parent two', NULL, 'p2')`); err != nil {
		t.Fatalf("insert parent two: %v", err)
	}

	tests := []struct {
		name          string
		firstInsert   string
		secondInsert  string
		expectFailure bool
	}{
		{
			name:          "folder same parent",
			firstInsert:   `INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f1', 'one', 'p1', 'n')`,
			secondInsert:  `INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f2', 'two', 'p1', 'n')`,
			expectFailure: true,
		},
		{
			name:          "folder different parent",
			firstInsert:   `INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f3', 'three', 'p1', 'm')`,
			secondInsert:  `INSERT INTO folder (id, name, parent_id, sort_key) VALUES ('f4', 'four', 'p2', 'm')`,
			expectFailure: false,
		},
		{
			name:          "bookmark same folder",
			firstInsert:   `INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b1', 'one', 'https://example.com/1', 'p1', 'n')`,
			secondInsert:  `INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b2', 'two', 'https://example.com/2', 'p1', 'n')`,
			expectFailure: true,
		},
		{
			name:          "bookmark different folder",
			firstInsert:   `INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b3', 'three', 'https://example.com/3', 'p1', 'm')`,
			secondInsert:  `INSERT INTO bookmark (id, title, url, folder_id, sort_key) VALUES ('b4', 'four', 'https://example.com/4', 'p2', 'm')`,
			expectFailure: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := database.Exec(tt.firstInsert); err != nil {
				t.Fatalf("first insert: %v", err)
			}
			_, err := database.Exec(tt.secondInsert)
			if tt.expectFailure && err == nil {
				t.Fatal("expected duplicate sort_key to fail")
			}
			if !tt.expectFailure && err != nil {
				t.Fatalf("expected duplicate sort_key under a different parent to pass: %v", err)
			}
		})
	}
}
