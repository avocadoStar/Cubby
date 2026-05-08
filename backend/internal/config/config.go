package config

import (
	"flag"
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

const (
	defaultPort        = "8080"
	defaultDBPath      = "cubby.db"
	defaultConfigPath  = "config.yaml"
	fallbackConfigPath = "../config.yaml"
)

type Config struct {
	Port           string   `yaml:"port"`
	DBPath         string   `yaml:"db_path"`
	JWTSecret      string   `yaml:"jwt_secret"`
	Password       string   `yaml:"password"`
	AllowedOrigins []string `yaml:"allowed_origins"`
	TrustedProxies []string `yaml:"trusted_proxies"`
}

func Load() (*Config, error) {
	configPath := resolveDefaultConfigPath()
	flag.StringVar(&configPath, "config", configPath, "path to config yaml")
	flag.Parse()

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("read config %s: %w", configPath, err)
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if cfg.Port == "" {
		cfg.Port = defaultPort
	}
	if cfg.DBPath == "" {
		cfg.DBPath = defaultDBPath
	}
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("config: jwt_secret is required")
	}
	if cfg.Password == "" {
		return nil, fmt.Errorf("config: password is required")
	}

	// Credential strength validation.
	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("config: jwt_secret must be at least 32 characters (generate a secure secret: openssl rand -hex 32)")
	}
	placeholders := []string{"change-me", "change-me-in-production", "secret", "jwt-secret"}
	for _, p := range placeholders {
		if cfg.JWTSecret == p {
			return nil, fmt.Errorf("config: jwt_secret uses a known placeholder value (generate a secure secret: openssl rand -hex 32)")
		}
	}
	if len(cfg.Password) < 8 {
		return nil, fmt.Errorf("config: password must be at least 8 characters")
	}

	return cfg, nil
}

func resolveDefaultConfigPath() string {
	for _, path := range []string{defaultConfigPath, fallbackConfigPath} {
		if _, err := os.Stat(path); err == nil {
			return path
		}
	}

	return defaultConfigPath
}
