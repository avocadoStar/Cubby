package service

import (
	"regexp"
	"strings"
)

const maxBookmarkIconLength = 128 * 1024

var bookmarkIconRe = regexp.MustCompile(`^data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$`)

func sanitizeBookmarkIcon(icon string) string {
	icon = strings.TrimSpace(icon)
	if icon == "" || len(icon) > maxBookmarkIconLength || !bookmarkIconRe.MatchString(icon) {
		return ""
	}
	return icon
}
