.PHONY: build run test clean docker-build docker-run docker-rebuild fmt lint compose-up compose-down compose-logs compose-restart compose-build

# Port for the server (default: 3000)
PORT ?= 3000

# Build the server binary to bin/server
build:
	go build -o bin/server main.go

# Run the server directly without building
run:
	go run main.go

# Run all tests in the project
test:
	go test ./...

# Remove all build artifacts
clean:
	rm -rf bin/

# Build the Docker image tagged as signup-server:latest
docker-build:
	docker build -t signup-server:latest .

# Run the Docker container and expose port (default: 3000)
docker-run:
	docker run -p $(PORT):$(PORT) -e PORT=$(PORT) signup-server:latest

# Clean, build Docker image, and run container
docker-rebuild: clean docker-build docker-run

# Format all Go files using gofmt
fmt:
	go fmt ./...

# Run the linter (requires golangci-lint installed)
lint:
	golangci-lint run

# Start all services with docker-compose (server + PostgreSQL)
compose-up:
	docker-compose up -d

# Stop all docker-compose services
compose-down:
	docker-compose down

# View logs from all docker-compose services
compose-logs:
	docker-compose logs -f

# Restart all docker-compose services
compose-restart:
	docker-compose restart

# Rebuild and start all docker-compose services
compose-build:
	docker-compose up -d --build
