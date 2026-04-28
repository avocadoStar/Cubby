package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("Cubby server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Cubby OK"))
	})))
}
