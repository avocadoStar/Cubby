package lexorank

import "testing"

func TestBetween(t *testing.T) {
	b := Between("a", "c")
	if b <= "a" || b >= "c" {
		t.Errorf("Between('a','c') = %s, want between 'a' and 'c'", b)
	}
}

func TestBetweenAdjacent(t *testing.T) {
	b := Between("a", "b")
	if b <= "a" || b >= "b" {
		t.Errorf("Between('a','b') = %s, want between 'a' and 'b'", b)
	}
}

func TestAfter(t *testing.T) {
	a := After("n")
	if a <= "n" {
		t.Errorf("After('n') = %s, want > 'n'", a)
	}
}

func TestAfterEmpty(t *testing.T) {
	a := After("")
	if a == "" {
		t.Error("After('') should not be empty")
	}
}

func TestBefore(t *testing.T) {
	b := Before("n")
	if b >= "n" {
		t.Errorf("Before('n') = %s, want < 'n'", b)
	}
}

func TestBeforeEmpty(t *testing.T) {
	b := Before("")
	if b == "" {
		t.Error("Before('') should not be empty")
	}
}

func TestNeedsRebalance(t *testing.T) {
	if NeedsRebalance("a", "d") {
		t.Error("gap 3 should not trigger rebalance")
	}
	if NeedsRebalance("a", "b") {
		t.Error("adjacent chars with a generated midpoint should not trigger rebalance")
	}
	if !NeedsRebalance("b", "a") {
		t.Error("reversed keys should trigger rebalance")
	}
}

func TestNeedsRebalanceEmpty(t *testing.T) {
	if NeedsRebalance("", "a") {
		t.Error("empty prev should not trigger rebalance")
	}
}

func TestRebalanceKeys(t *testing.T) {
	keys := RebalanceKeys(3)
	if len(keys) != 3 {
		t.Errorf("RebalanceKeys(3) = %d keys, want 3", len(keys))
	}
	for i := 1; i < len(keys); i++ {
		if keys[i] <= keys[i-1] {
			t.Errorf("keys not in order: keys[%d]=%q <= keys[%d]=%q", i, keys[i], i-1, keys[i-1])
		}
	}
}

func TestRebalanceKeysZero(t *testing.T) {
	keys := RebalanceKeys(0)
	if keys != nil {
		t.Error("RebalanceKeys(0) should return nil")
	}
}
