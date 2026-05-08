package service

import (
	"fmt"
	"math"
	"time"
)

const (
	minSortByte = byte('!')
	maxSortByte = byte('~')
)

func formatRank(v uint64) string {
	return fmt.Sprintf("%016x", v)
}

func isValidSortKey(key string) bool {
	for i := 0; i < len(key); i++ {
		if key[i] < minSortByte || key[i] > maxSortByte {
			return false
		}
	}
	return true
}

// between generates a sort key strictly between prev and next.
// It returns an empty string when the keys are invalid or there is no gap.
func between(prev, next string) string {
	if !isValidSortKey(prev) || (next != "" && !isValidSortKey(next)) {
		return ""
	}
	if next != "" && prev >= next {
		return ""
	}

	prefix := make([]byte, 0, max(len(prev), len(next))+1)
	for i := 0; ; i++ {
		prevByte := minSortByte - 1
		if i < len(prev) {
			prevByte = prev[i]
		}

		nextByte := maxSortByte + 1
		if next != "" && i < len(next) {
			nextByte = next[i]
		}

		if prevByte == nextByte {
			prefix = append(prefix, prevByte)
			continue
		}

		if nextByte-prevByte > 1 {
			mid := prevByte + (nextByte-prevByte)/2
			return string(append(prefix, mid))
		}

		if i < len(prev) {
			prefix = append(prefix, prevByte)
			prev = prev[i+1:]
			next = ""
			i = -1
			continue
		}

		if next != "" && i+1 < len(next) {
			return next[:i+1]
		}

		return ""
	}
}

// after returns a sort key strictly after the given key.
// It returns an empty string when the key is invalid or there is no gap.
func after(key string) string {
	if key == "" {
		return "n"
	}
	return between(key, "")
}

// before returns a sort key strictly before the given key.
// It returns an empty string when the key is invalid or there is no gap.
func before(key string) string {
	if key == "" {
		return "a"
	}
	return between("", key)
}

// needsRebalance checks if prev and next have no usable gap or are legacy keys.
func needsRebalance(prev, next string) bool {
	if prev == "" || next == "" {
		return false
	}
	if !isValidSortKey(prev) || !isValidSortKey(next) {
		return true
	}
	if prev >= next {
		return true
	}
	return between(prev, next) == ""
}

// rebalanceKeys generates evenly-spaced, ASCII-safe sort keys for n children.
// Uses a nanosecond prefix so keys from different rebalance calls never collide.
func rebalanceKeys(n int) []string {
	if n == 0 {
		return nil
	}
	prefix := formatRank(uint64(time.Now().UnixNano()))
	keys := make([]string, n)
	step := math.MaxUint64 / uint64(n+1)
	for i := 0; i < n; i++ {
		keys[i] = prefix + formatRank(step*uint64(i+1))
	}
	return keys
}
