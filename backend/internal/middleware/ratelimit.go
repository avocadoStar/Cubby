package middleware

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// rateLimitEntry tracks the timestamps of requests for a single key.
type rateLimitEntry struct {
	timestamps []time.Time
}

// rateLimiter implements a sliding-window rate limiter keyed by string.
type rateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
	max     int
	window  time.Duration
}

func newRateLimiter(max int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		entries: make(map[string]*rateLimitEntry),
		max:     max,
		window:  window,
	}
	// Periodically clean up expired entries to prevent unbounded memory growth.
	go func() {
		ticker := time.NewTicker(window)
		defer ticker.Stop()
		for range ticker.C {
			rl.cleanup()
		}
	}()
	return rl
}

// allow reports whether the request for the given key is within the rate limit.
// It returns true if allowed, and the number of seconds until the next slot is available.
func (rl *rateLimiter) allow(key string) (bool, int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	entry, exists := rl.entries[key]
	if !exists {
		rl.entries[key] = &rateLimitEntry{timestamps: []time.Time{now}}
		return true, 0
	}

	// Filter out timestamps outside the window.
	valid := entry.timestamps[:0]
	for _, ts := range entry.timestamps {
		if ts.After(cutoff) {
			valid = append(valid, ts)
		}
	}
	entry.timestamps = valid

	if len(entry.timestamps) >= rl.max {
		oldest := entry.timestamps[0]
		retryAfter := int(math.Ceil(oldest.Add(rl.window).Sub(now).Seconds()))
		if retryAfter < 1 {
			retryAfter = 1
		}
		return false, retryAfter
	}

	entry.timestamps = append(entry.timestamps, now)
	return true, 0
}

func (rl *rateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)
	for key, entry := range rl.entries {
		valid := entry.timestamps[:0]
		for _, ts := range entry.timestamps {
			if ts.After(cutoff) {
				valid = append(valid, ts)
			}
		}
		if len(valid) == 0 {
			delete(rl.entries, key)
		} else {
			entry.timestamps = valid
		}
	}
}

// globalRateLimiters holds named rate limiters for reuse.
var (
	globalLimitersMu sync.Mutex
	globalLimiters   = map[string]*rateLimiter{}
)

func getRateLimiter(name string, max int, window time.Duration) *rateLimiter {
	globalLimitersMu.Lock()
	defer globalLimitersMu.Unlock()

	if rl, ok := globalLimiters[name]; ok {
		return rl
	}
	rl := newRateLimiter(max, window)
	globalLimiters[name] = rl
	return rl
}

// RateLimit returns a Gin middleware that limits requests per client IP
// using a sliding window. Exceeding the limit returns 429 with a Retry-After header.
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	rl := getRateLimiter(fmt.Sprintf("%d:%s", max, window), max, window)

	return func(c *gin.Context) {
		key := c.ClientIP()
		allowed, retryAfter := rl.allow(key)
		if !allowed {
			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
