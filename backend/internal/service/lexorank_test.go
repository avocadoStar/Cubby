package service

import "testing"

func TestBetween(t *testing.T) {
	b := between("a", "c")
	if b <= "a" || b >= "c" {
		t.Errorf("between('a','c') = %s, want between 'a' and 'c'", b)
	}
}

func TestBetweenAdjacent(t *testing.T) {
	b := between("a", "b")
	if b <= "a" || b >= "b" {
		t.Errorf("between('a','b') = %s, want between 'a' and 'b'", b)
	}
}

func TestAfter(t *testing.T) {
	a := after("n")
	if a <= "n" {
		t.Errorf("after('n') = %s, want > 'n'", a)
	}
}

func TestAfterEmpty(t *testing.T) {
	a := after("")
	if a == "" {
		t.Error("after('') should not be empty")
	}
}

func TestBefore(t *testing.T) {
	b := before("n")
	if b >= "n" {
		t.Errorf("before('n') = %s, want < 'n'", b)
	}
}

func TestBeforeEmpty(t *testing.T) {
	b := before("")
	if b == "" {
		t.Error("before('') should not be empty")
	}
}

func TestNeedsRebalance(t *testing.T) {
	if needsRebalance("a", "d") {
		t.Error("gap 3 should not trigger rebalance")
	}
	if needsRebalance("a", "b") {
		t.Error("adjacent chars with a generated midpoint should not trigger rebalance")
	}
	if !needsRebalance("b", "a") {
		t.Error("reversed keys should trigger rebalance")
	}
}

func TestNeedsRebalanceEmpty(t *testing.T) {
	if needsRebalance("", "a") {
		t.Error("empty prev should not trigger rebalance")
	}
}

func TestRebalanceKeys(t *testing.T) {
	keys := rebalanceKeys(3)
	if len(keys) != 3 {
		t.Errorf("rebalanceKeys(3) = %d keys, want 3", len(keys))
	}
	// Keys should be in ascending order
	for i := 1; i < len(keys); i++ {
		if keys[i] <= keys[i-1] {
			t.Errorf("keys not in order: keys[%d]=%q <= keys[%d]=%q", i, keys[i], i-1, keys[i-1])
		}
	}
}

func TestRebalanceKeysZero(t *testing.T) {
	keys := rebalanceKeys(0)
	if keys != nil {
		t.Error("rebalanceKeys(0) should return nil")
	}
}
