package service

import (
	"cubby/internal/config"
	"cubby/internal/repository"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	cfg     *config.Config
	setting repository.SettingRepo
}

func NewAuthService(cfg *config.Config, setting repository.SettingRepo) *AuthService {
	return &AuthService{cfg: cfg, setting: setting}
}

func (s *AuthService) SetupPassword(password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.setting.Set("password_hash", string(hash))
}

func (s *AuthService) VerifyPassword(password string) bool {
	hash, err := s.setting.Get("password_hash")
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
