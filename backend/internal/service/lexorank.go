package service

// between generates a sort key between prev and next using string midpoint.
func between(prev, next string) string {
	if prev >= next {
		// Should never happen; fall back to appending
		return prev + "n"
	}

	minLen := len(prev)
	if len(next) < minLen {
		minLen = len(next)
	}

	i := 0
	for i < minLen && prev[i] == next[i] {
		i++
	}

	if i == minLen {
		// prev is a prefix of next. Use prev + "a" so the result sorts
		// strictly before next (e.g. between("n","nn") → "na").
		return prev + "a"
	}

	pc := int(prev[i])
	nc := int(next[i])
	if nc-pc > 1 {
		return prev[:i] + string(rune(pc+(nc-pc)/2))
	}

	return prev[:i] + string(rune(pc)) + "n"
}

// after returns a sort key after the given key.
func after(key string) string {
	if key == "" {
		return "n"
	}
	return key + "n"
}

// before returns a sort key before the given key.
func before(key string) string {
	if key == "" {
		return "a"
	}
	lastChar := key[len(key)-1]
	if lastChar > 'a' {
		return key[:len(key)-1] + string(lastChar-1) + "n"
	}
	return key + "a"
}

// needsRebalance checks if the gap between prev and next is too small.
func needsRebalance(prev, next string) bool {
	if prev == "" || next == "" {
		return false
	}
	// If they differ by only 1 in the first differing position, gap is too small
	minLen := len(prev)
	if len(next) < minLen {
		minLen = len(next)
	}
	for i := 0; i < minLen; i++ {
		diff := int(next[i]) - int(prev[i])
		if diff > 1 {
			return false // gap exists
		}
		if diff < 0 {
			return false // shouldn't happen
		}
	}
	return true
}

// rebalanceKeys generates evenly-spaced sort keys for n children.
func rebalanceKeys(n int) []string {
	if n == 0 {
		return nil
	}
	keys := make([]string, n)
	step := 256 / (n + 1)
	for i := 0; i < n; i++ {
		keys[i] = string(rune((i + 1) * step))
	}
	return keys
}
