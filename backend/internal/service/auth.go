package service

import (
	"cubby/internal/config"
	"cubby/internal/repository"
	"database/sql"
	"errors"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const passwordHashKey = "password_hash"

type AuthService struct {
	cfg     *config.Config
	setting repository.SettingRepo
}

func NewAuthService(cfg *config.Config, setting repository.SettingRepo) *AuthService {
	return &AuthService{cfg: cfg, setting: setting}
}

// SyncConfiguredPassword syncs the plaintext password from config.yaml
// into the database as a bcrypt hash. Called once at startup.
func (s *AuthService) SyncConfiguredPassword() error {
	hash, err := s.setting.Get(passwordHashKey)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	// Hash already matches — nothing to do
	if err == nil {
		if bcrypt.CompareHashAndPassword([]byte(hash), []byte(s.cfg.Password)) == nil {
			return nil
		}
	}

	log.Println("config: updating password hash")
	newHash, err := bcrypt.GenerateFromPassword([]byte(s.cfg.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.setting.Set(passwordHashKey, string(newHash))
}

func (s *AuthService) VerifyPassword(password string) bool {
	hash, err := s.setting.Get(passwordHashKey)
	if err != nil {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) GenerateToken() (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) ValidateToken(tokenStr string) (*jwt.Token, error) {
	return jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})
}
