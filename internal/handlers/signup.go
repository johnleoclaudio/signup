package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"signup/internal/database"
	"signup/internal/metrics"
	"signup/internal/models"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Message string       `json:"message"`
	User    *models.User `json:"user,omitempty"`
}

// SignupHandler handles user signup requests
func SignupHandler(w http.ResponseWriter, r *http.Request) {
	var statusCode int

	// Defer recording metrics at the end
	defer func() {
		metrics.SignupRequestsTotal.WithLabelValues(fmt.Sprintf("%d", statusCode)).Inc()
		metrics.APIRequestsTotal.WithLabelValues(r.Method, "/signup", fmt.Sprintf("%d", statusCode)).Inc()
	}()

	if r.Method != http.MethodPost {
		statusCode = http.StatusMethodNotAllowed
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "method not allowed"})
		return
	}

	var req models.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		statusCode = http.StatusBadRequest
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
		return
	}

	// Validate input
	if err := validateSignupRequest(&req); err != nil {
		statusCode = http.StatusBadRequest
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
		return
	}

	// Insert user into database
	var user models.User
	query := `
		INSERT INTO users (email, first_name, last_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, first_name, last_name, created_at, updated_at
	`

	err := database.DB.QueryRow(query, req.Email, req.FirstName, req.LastName).Scan(
		&user.ID,
		&user.Email,
		&user.FirstName,
		&user.LastName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		// Check for duplicate email
		if strings.Contains(err.Error(), "duplicate key") {
			statusCode = http.StatusConflict
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(statusCode)
			json.NewEncoder(w).Encode(ErrorResponse{Error: "email already exists"})
			return
		}

		statusCode = http.StatusInternalServerError
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		json.NewEncoder(w).Encode(ErrorResponse{Error: "failed to create user"})
		return
	}

	// Return success response
	statusCode = http.StatusCreated
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(SuccessResponse{
		Message: "user created successfully",
		User:    &user,
	})
}

// validateSignupRequest validates the signup request data
func validateSignupRequest(req *models.SignupRequest) error {
	// Trim whitespace
	req.Email = strings.TrimSpace(req.Email)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	// Validate email
	if req.Email == "" {
		return fmt.Errorf("email is required")
	}
	if !emailRegex.MatchString(req.Email) {
		return fmt.Errorf("invalid email format")
	}

	// Validate first name
	if req.FirstName == "" {
		return fmt.Errorf("first name is required")
	}
	if len(req.FirstName) > 100 {
		return fmt.Errorf("first name must be less than 100 characters")
	}

	// Validate last name
	if req.LastName == "" {
		return fmt.Errorf("last name is required")
	}
	if len(req.LastName) > 100 {
		return fmt.Errorf("last name must be less than 100 characters")
	}

	return nil
}
