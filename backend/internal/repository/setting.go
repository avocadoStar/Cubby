package repository

import (
	"database/sql"
	"cubby/internal/model"
)

type SettingRepo struct {
	db *sql.DB
}

func NewSettingRepo(db *sql.DB) *SettingRepo { return &SettingRepo{db: db} }

func (r *SettingRepo) Get(key string) (*model.Setting, error) {
	s := &model.Setting{}
	err := r.db.QueryRow(`SELECT key, value, updated_at FROM settings WHERE key=?`, key).Scan(&s.Key, &s.Value, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *SettingRepo) GetAll() (map[string]string, error) {
	rows, err := r.db.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		result[k] = v
	}
	return result, nil
}

func (r *SettingRepo) Set(key, value string) error {
	_, err := r.db.Exec(
		`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
		key, value)
	return err
}
