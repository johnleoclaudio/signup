.PHONY: build run test clean docker-build docker-run fmt lint

build:
	go build -o bin/server main.go

run:
	go run main.go

test:
	go test ./...

clean:
	rm -rf bin/

docker-build:
	docker build -t signup-server:latest .

docker-run:
	docker run -p 3000:3000 signup-server:latest

fmt:
	go fmt ./...

lint:
	golangci-lint run
