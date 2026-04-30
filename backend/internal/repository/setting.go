package repository

import "database/sql"

type SettingRepo struct{ DB *sql.DB }

func (r *SettingRepo) Get(key string) (string, error) {
	var v string
	err := r.DB.QueryRow(`SELECT value FROM setting WHERE key=?`, key).Scan(&v)
	if err != nil {
		return "", err
	}
	return v, nil
}

func (r *SettingRepo) Set(key, value string) error {
	_, err := r.DB.Exec(`INSERT OR REPLACE INTO setting (key,value) VALUES (?,?)`, key, value)
	return err
}
