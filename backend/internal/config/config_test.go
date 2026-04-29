package config

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

func TestLoadCreatesTemplateWhenEnvIsMissing(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), ".env")

	_, err := Load(configPath)
	if !errors.Is(err, ErrConfigCreated) {
		t.Fatalf("expected ErrConfigCreated, got %v", err)
	}

	content, readErr := os.ReadFile(configPath)
	if readErr != nil {
		t.Fatalf("read env: %v", readErr)
	}

	env := string(content)
	if !strings.Contains(env, "PORT=8080") {
		t.Fatalf("expected generated env to contain default port, got %q", env)
	}
	if !strings.Contains(env, "APP_PASSWORD=") {
		t.Fatalf("expected generated env to contain APP_PASSWORD placeholder, got %q", env)
	}
}

func TestLoadHashesPlaintextPasswordAndPersistsHash(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), ".env")
	content := strings.Join([]string{
		"# sample config",
		"PORT=9090",
		"APP_PASSWORD=plain-secret",
		"CUSTOM_KEY=keep-me",
		"",
	}, "\n")
	if writeErr := os.WriteFile(configPath, []byte(content), 0o600); writeErr != nil {
		t.Fatalf("write env: %v", writeErr)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("load env: %v", err)
	}

	if cfg.Port != 9090 {
		t.Fatalf("expected port 9090, got %#v", cfg)
	}
	if cfg.PasswordHash == "plain-secret" {
		t.Fatalf("expected password hash, got %#v", cfg)
	}
	if compareErr := bcrypt.CompareHashAndPassword([]byte(cfg.PasswordHash), []byte("plain-secret")); compareErr != nil {
		t.Fatalf("expected saved hash to match original password: %v", compareErr)
	}

	updatedContent, readErr := os.ReadFile(configPath)
	if readErr != nil {
		t.Fatalf("read env: %v", readErr)
	}
	updated := string(updatedContent)
	if strings.Contains(updated, "APP_PASSWORD=plain-secret") {
		t.Fatalf("expected plaintext password to be replaced, got %q", updated)
	}
	if !strings.Contains(updated, "# sample config") || !strings.Contains(updated, "CUSTOM_KEY=keep-me") {
		t.Fatalf("expected other lines to remain intact, got %q", updated)
	}
}

func TestLoadRejectsEmptyPassword(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), ".env")
	if writeErr := os.WriteFile(configPath, []byte("PORT=8080\nAPP_PASSWORD=\n"), 0o600); writeErr != nil {
		t.Fatalf("write env: %v", writeErr)
	}

	_, err := Load(configPath)
	if !errors.Is(err, ErrPasswordRequired) {
		t.Fatalf("expected ErrPasswordRequired, got %v", err)
	}
}

func TestLoadRejectsInvalidPort(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), ".env")
	if writeErr := os.WriteFile(configPath, []byte("PORT=70000\nAPP_PASSWORD=secret\n"), 0o600); writeErr != nil {
		t.Fatalf("write env: %v", writeErr)
	}

	_, err := Load(configPath)
	if !errors.Is(err, ErrInvalidPort) {
		t.Fatalf("expected ErrInvalidPort, got %v", err)
	}
}

func TestLoadKeepsExistingHashWithoutRewriting(t *testing.T) {
	configPath := filepath.Join(t.TempDir(), ".env")
	hash, err := bcrypt.GenerateFromPassword([]byte("secret"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	content := "# existing hash\nPORT=8080\nAPP_PASSWORD=" + string(hash) + "\n"
	if writeErr := os.WriteFile(configPath, []byte(content), 0o600); writeErr != nil {
		t.Fatalf("write env: %v", writeErr)
	}

	before, readErr := os.ReadFile(configPath)
	if readErr != nil {
		t.Fatalf("read env before load: %v", readErr)
	}

	cfg, loadErr := Load(configPath)
	if loadErr != nil {
		t.Fatalf("load env: %v", loadErr)
	}
	if cfg.PasswordHash != string(hash) {
		t.Fatalf("expected existing hash to be preserved, got %#v", cfg)
	}

	after, afterErr := os.ReadFile(configPath)
	if afterErr != nil {
		t.Fatalf("read env after load: %v", afterErr)
	}
	if string(before) != string(after) {
		t.Fatalf("expected hashed env to remain unchanged")
	}
}
