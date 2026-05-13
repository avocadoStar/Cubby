package service

import (
	"net/url"
	"strings"

	"cubby/internal/model"
)

func validateAndNormalizeURL(rawURL string) (string, error) {
	rawURL = strings.TrimSpace(rawURL)
	if len(rawURL) > model.MaxURLLength {
		return "", NewValidationError("url exceeds maximum length of 2048 characters")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil || !parsed.IsAbs() || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return "", NewValidationError("url must be a valid absolute URL with http or https scheme")
	}
	return parsed.String(), nil
}

func validateBookmarkTitle(title string) (string, error) {
	title = strings.TrimSpace(title)
	if len(title) > model.MaxTitleLength {
		return "", NewValidationError("title exceeds maximum length of 500 characters")
	}
	return title, nil
}

func validateFolderName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if len(name) > model.MaxNameLength {
		return "", NewValidationError("name exceeds maximum length of 200 characters")
	}
	return name, nil
}
