package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"signup/internal/database"
	"signup/internal/handlers"
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
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Initialize database connection
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run database migrations
	if err := database.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Setup routes
	http.HandleFunc("/", welcomeHandler)
	http.HandleFunc("/signup", handlers.SignupHandler)
	http.Handle("/metrics", promhttp.Handler())

	addr := fmt.Sprintf(":%s", port)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}
