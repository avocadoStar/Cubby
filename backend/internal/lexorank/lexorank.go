package lexorank

import (
	"fmt"
	"math"
	"time"
)

const (
	MinSortByte = byte('!')
	MaxSortByte = byte('~')
)

func FormatRank(v uint64) string {
	return fmt.Sprintf("%016x", v)
}

func IsValidSortKey(key string) bool {
	for i := 0; i < len(key); i++ {
		if key[i] < MinSortByte || key[i] > MaxSortByte {
			return false
		}
	}
	return true
}

// Between generates a sort key strictly between prev and next.
// It returns an empty string when the keys are invalid or there is no gap.
func Between(prev, next string) string {
	if !IsValidSortKey(prev) || (next != "" && !IsValidSortKey(next)) {
		return ""
	}
	if next != "" && prev >= next {
		return ""
	}

	prefix := make([]byte, 0, max(len(prev), len(next))+1)
	for i := 0; ; i++ {
		prevByte := MinSortByte - 1
		if i < len(prev) {
			prevByte = prev[i]
		}

		nextByte := MaxSortByte + 1
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

// After returns a sort key strictly after the given key.
// It returns an empty string when the key is invalid or there is no gap.
func After(key string) string {
	if key == "" {
		return "n"
	}
	return Between(key, "")
}

// Before returns a sort key strictly before the given key.
// It returns an empty string when the key is invalid or there is no gap.
func Before(key string) string {
	if key == "" {
		return "a"
	}
	return Between("", key)
}

// NeedsRebalance checks if prev and next have no usable gap or are legacy keys.
func NeedsRebalance(prev, next string) bool {
	if prev == "" || next == "" {
		return false
	}
	if !IsValidSortKey(prev) || !IsValidSortKey(next) {
		return true
	}
	if prev >= next {
		return true
	}
	return Between(prev, next) == ""
}

// RebalanceKeys generates evenly-spaced, ASCII-safe sort keys for n children.
// Uses a nanosecond prefix so keys from different rebalance calls never collide.
func RebalanceKeys(n int) []string {
	if n == 0 {
		return nil
	}
	prefix := FormatRank(uint64(time.Now().UnixNano()))
	keys := make([]string, n)
	step := math.MaxUint64 / uint64(n+1)
	for i := 0; i < n; i++ {
		keys[i] = prefix + FormatRank(step*uint64(i+1))
	}
	return keys
}
