# Agent Guidelines for Signup Project

## Build & Test Commands
- **Build**: `go build ./...`
- **Test all**: `go test ./...`
- **Test single package**: `go test ./path/to/package`
- **Test single test**: `go test -run TestName ./path/to/package`
- **Lint**: `golangci-lint run` (if configured)
- **Format**: `go fmt ./...` or `gofmt -s -w .`

## Code Style
- **Imports**: Group stdlib, external, and internal packages with blank lines. Use `goimports` for automatic formatting.
- **Formatting**: Use `gofmt` standard formatting (tabs, not spaces).
- **Naming**: Idiomatic Go names (camelCase for unexported, PascalCase for exported). Avoid stuttering (e.g., `user.User` not `user.UserStruct`).
- **Error handling**: Always check errors explicitly. Return errors up the call stack. Use `fmt.Errorf` with `%w` for wrapping.
- **Types**: Prefer explicit types. Use interfaces for behavior, structs for data. Keep interfaces small.
- **Comments**: Use godoc format. Comment all exported functions, types, and packages.
- **Testing**: Table-driven tests preferred. Use `t.Helper()` for test helpers. Name tests `TestFunctionName_Scenario`.

## Architecture Notes
- Stack: Go + PostgreSQL + Docker
- Phase 1: Monolithic architecture targeting 1000 signups
- Keep database queries explicit and testable
- Use context.Context for request-scoped operations
