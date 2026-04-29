package config

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	envKeyPort        = "PORT"
	envKeyAppPassword = "APP_PASSWORD"
)

var (
	ErrConfigCreated    = errors.New("config file created; update it and restart")
	ErrInvalidPort      = errors.New("invalid port")
	ErrPasswordRequired = errors.New("password is required")
)

type Config struct {
	PasswordHash string
	Port         int
}

type envLine struct {
	key      string
	kind     envLineKind
	original string
}

type envLineKind int

const (
	envLineBlank envLineKind = iota
	envLineComment
	envLinePair
)

type envFile struct {
	lines  []envLine
	values map[string]string
}

func (c Config) Address() string {
	return fmt.Sprintf(":%d", c.Port)
}

func Load(path string) (Config, error) {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		if writeErr := writeTemplate(path); writeErr != nil {
			return Config{}, writeErr
		}
		return Config{}, ErrConfigCreated
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}

	parsed, err := parseEnv(data)
	if err != nil {
		return Config{}, fmt.Errorf("decode env: %w", err)
	}

	port := 8080
	if rawPort := strings.TrimSpace(parsed.values[envKeyPort]); rawPort != "" {
		parsedPort, parseErr := strconv.Atoi(rawPort)
		if parseErr != nil {
			return Config{}, ErrInvalidPort
		}
		port = parsedPort
	}
	if port < 1 || port > 65535 {
		return Config{}, ErrInvalidPort
	}

	password := strings.TrimSpace(parsed.values[envKeyAppPassword])
	if password == "" {
		return Config{}, ErrPasswordRequired
	}

	if _, err := bcrypt.Cost([]byte(password)); err == nil {
		return Config{Port: port, PasswordHash: password}, nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return Config{}, fmt.Errorf("hash password: %w", err)
	}

	parsed.values[envKeyPort] = strconv.Itoa(port)
	parsed.values[envKeyAppPassword] = string(hash)
	if err := writeEnv(path, parsed); err != nil {
		return Config{}, err
	}

	return Config{Port: port, PasswordHash: string(hash)}, nil
}

func parseEnv(data []byte) (envFile, error) {
	raw := strings.ReplaceAll(string(data), "\r\n", "\n")
	lines := strings.Split(raw, "\n")

	parsed := envFile{
		lines:  make([]envLine, 0, len(lines)),
		values: make(map[string]string),
	}

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		switch {
		case trimmed == "":
			parsed.lines = append(parsed.lines, envLine{kind: envLineBlank, original: line})
		case strings.HasPrefix(trimmed, "#"):
			parsed.lines = append(parsed.lines, envLine{kind: envLineComment, original: line})
		default:
			index := strings.Index(line, "=")
			if index <= 0 {
				return envFile{}, fmt.Errorf("invalid env line %q", line)
			}
			key := strings.TrimSpace(line[:index])
			if key == "" {
				return envFile{}, fmt.Errorf("invalid env line %q", line)
			}
			value := strings.TrimSpace(line[index+1:])
			parsed.lines = append(parsed.lines, envLine{kind: envLinePair, key: key, original: line})
			parsed.values[key] = value
		}
	}

	return parsed, nil
}

func writeTemplate(path string) error {
	return writeBytes(path, []byte("PORT=8080\nAPP_PASSWORD=\n"))
}

func writeEnv(path string, parsed envFile) error {
	var buffer bytes.Buffer
	wrotePassword := false

	for index, line := range parsed.lines {
		switch line.kind {
		case envLinePair:
			if line.key == envKeyAppPassword {
				buffer.WriteString(envKeyAppPassword)
				buffer.WriteString("=")
				buffer.WriteString(parsed.values[envKeyAppPassword])
				wrotePassword = true
			} else {
				buffer.WriteString(line.original)
			}
		default:
			buffer.WriteString(line.original)
		}

		if index < len(parsed.lines)-1 {
			buffer.WriteByte('\n')
		}
	}

	if !wrotePassword {
		if buffer.Len() > 0 && !strings.HasSuffix(buffer.String(), "\n") {
			buffer.WriteByte('\n')
		}
		buffer.WriteString(envKeyAppPassword)
		buffer.WriteString("=")
		buffer.WriteString(parsed.values[envKeyAppPassword])
		buffer.WriteByte('\n')
	} else if buffer.Len() == 0 || !strings.HasSuffix(buffer.String(), "\n") {
		buffer.WriteByte('\n')
	}

	return writeBytes(path, buffer.Bytes())
}

func writeBytes(path string, data []byte) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	tempFile, err := os.CreateTemp(filepath.Dir(path), "env-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp config: %w", err)
	}
	tempPath := tempFile.Name()
	cleanup := true
	defer func() {
		_ = tempFile.Close()
		if cleanup {
			_ = os.Remove(tempPath)
		}
	}()

	if _, err := tempFile.Write(data); err != nil {
		return fmt.Errorf("write temp config: %w", err)
	}
	if err := tempFile.Chmod(0o600); err != nil {
		return fmt.Errorf("chmod temp config: %w", err)
	}
	if err := tempFile.Close(); err != nil {
		return fmt.Errorf("close temp config: %w", err)
	}

	if err := os.Rename(tempPath, path); err != nil {
		if runtime.GOOS != "windows" {
			return fmt.Errorf("replace config: %w", err)
		}
		if removeErr := os.Remove(path); removeErr != nil && !errors.Is(removeErr, os.ErrNotExist) {
			return fmt.Errorf("remove old config: %w", removeErr)
		}
		if renameErr := os.Rename(tempPath, path); renameErr != nil {
			return fmt.Errorf("replace config: %w", renameErr)
		}
	}

	cleanup = false
	return nil
}
