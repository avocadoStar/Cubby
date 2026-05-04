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
	Port      string `yaml:"port"`
	DBPath    string `yaml:"db_path"`
	JWTSecret string `yaml:"jwt_secret"`
	Password  string `yaml:"password"`
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
