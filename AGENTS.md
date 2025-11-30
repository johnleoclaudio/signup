# Agent Guidelines for Signup Project

## Build & Test Commands
- **Build**: `make build` or `go build -o bin/server main.go`
- **Run locally**: `make run` (or `go run main.go`)
- **Test all**: `make test` or `go test ./...`
- **Test single package**: `go test ./internal/handlers`
- **Test single test**: `go test -run TestSignupHandler ./internal/handlers`
- **Lint**: `make lint` (requires golangci-lint)
- **Format**: `make fmt` or `go fmt ./...` or `gofmt -s -w .`
- **Docker**: `make compose-up` to start all services, `make compose-down` to stop
- **Load tests**: `make load-test-smoke`, `make load-test`, `make load-test-stress`

## Code Style
- **Imports**: Group stdlib, external, and internal packages with blank lines. Use `goimports` for automatic formatting.
  - Example: `encoding/json`, `net/http` (stdlib) → blank line → `github.com/lib/pq` (external) → blank line → `signup/internal/database` (internal)
- **Formatting**: Use `gofmt` standard formatting (tabs, not spaces).
- **Naming**: Idiomatic Go names (camelCase for unexported, PascalCase for exported). Avoid stuttering (e.g., `user.User` not `user.UserStruct`).
- **Error handling**: Always check errors explicitly. Return errors up the call stack. Use `fmt.Errorf` with `%w` for wrapping context.
- **Types**: Prefer explicit types. Use interfaces for behavior, structs for data. Keep interfaces small. Add JSON tags for API structs.
- **Comments**: Use godoc format. Comment all exported functions, types, and packages. Start with the entity name.
- **Testing**: Table-driven tests preferred. Use `t.Helper()` for test helpers. Name tests `TestFunctionName_Scenario`.
- **HTTP responses**: Set `Content-Type: application/json` header. Use consistent response structures (ErrorResponse, SuccessResponse).
- **Validation**: Trim whitespace on inputs. Return clear, actionable error messages. Validate before database operations.

## Architecture Notes
- Stack: Go + PostgreSQL + Docker + Prometheus + Grafana
- Phase 1: Monolithic architecture targeting 1000 signups
- Keep database queries explicit and testable (raw SQL preferred over ORM)
- Use `sql.DB` directly; connection pooling configured in database.Connect()
- No context.Context used yet (can be added when needed)
- Migrations run on startup via database.RunMigrations()
- Global `database.DB` variable for simplicity in Phase 1
