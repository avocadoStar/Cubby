package service

import (
	"cubby/internal/model"
	"regexp"
	"strings"
)

var bookmarkIconRe = regexp.MustCompile(`^data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$`)

func sanitizeBookmarkIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" || len(icon) > model.MaxBookmarkIconSize || !bookmarkIconRe.MatchString(icon) {
		return ""
	}
	return icon
}
