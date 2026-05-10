package service

import (
	"testing"
)

func TestValidateURLRejectsMulticastIP(t *testing.T) {
	if err := validateURL("http://224.0.0.1"); err == nil {
		t.Fatal("expected multicast IPv4 address to be rejected")
	}
	if err := validateURL("http://[ff02::1]"); err == nil {
		t.Fatal("expected multicast IPv6 address to be rejected")
	}
}
