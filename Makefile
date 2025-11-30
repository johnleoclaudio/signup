.PHONY: build run test clean docker-build docker-run docker-rebuild fmt lint compose-up compose-down compose-logs compose-restart compose-build load-test-smoke load-test load-test-stress

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

# Run k6 smoke test (quick validation with 5 users for 30s)
load-test-smoke:
	docker run --rm -v $(PWD)/tests/load:/tests --network host -e K6_BASE_URL=http://localhost:3000 grafana/k6 run /tests/signup-smoke-test.js

# Run k6 load test (progressive load up to 100 users)
load-test:
	docker run --rm -v $(PWD)/tests/load:/tests --network host -e K6_BASE_URL=http://localhost:3000 grafana/k6 run /tests/signup-load-test.js

# Run k6 stress test (push system to limits with up to 1000 users)
load-test-stress:
	docker run --rm -v $(PWD)/tests/load:/tests --network host -e K6_BASE_URL=http://localhost:3000 grafana/k6 run /tests/signup-stress-test.js

# run ./scripts/test-signup.sh
signup:
	./scripts/test-signup.sh
