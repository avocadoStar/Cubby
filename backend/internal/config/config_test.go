package config

import (
	"flag"
	"os"
	"path/filepath"
	"testing"
)

func loadConfigFromTempDir(t *testing.T, content string) *Config {
	t.Helper()

	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "config.yaml"), []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	originalWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("get working directory: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("change working directory: %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(originalWd); err != nil {
			t.Fatalf("restore working directory: %v", err)
		}
	})

	originalFlags := flag.CommandLine
	flag.CommandLine = flag.NewFlagSet("config-test", flag.ContinueOnError)
	t.Cleanup(func() {
		flag.CommandLine = originalFlags
	})

	cfg, err := Load()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	return cfg
}

func TestLoadUsesBackendPort(t *testing.T) {
	cfg := loadConfigFromTempDir(t, `
backend_port: "9090"
db_path: "test.db"
jwt_secret: "0123456789abcdef0123456789abcdef"
password: "testpassword"
`)

	if cfg.BackendPort != "9090" {
		t.Fatalf("expected backend port 9090, got %q", cfg.BackendPort)
	}
}

func TestLoadFallsBackToLegacyPort(t *testing.T) {
	cfg := loadConfigFromTempDir(t, `
port: "7070"
db_path: "test.db"
jwt_secret: "0123456789abcdef0123456789abcdef"
password: "testpassword"
`)

	if cfg.BackendPort != "7070" {
		t.Fatalf("expected legacy port fallback 7070, got %q", cfg.BackendPort)
	}
}
