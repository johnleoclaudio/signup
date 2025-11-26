package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// Response represents the JSON response structure
type Response struct {
	Message string `json:"message"`
}

func welcomeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(Response{Message: "welcome"})
}

func main() {
	http.HandleFunc("/", welcomeHandler)
	log.Println("Server starting on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatal(err)
	}
}
