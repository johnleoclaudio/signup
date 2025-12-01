# Signup Service Metrics Guide

## Table of Contents
- [Overview](#overview)
- [Golden Signals](#golden-signals)
  - [1. Latency](#1-latency)
  - [2. Traffic](#2-traffic)
  - [3. Errors](#3-errors)
  - [4. Saturation](#4-saturation)
- [Additional Recommended Metrics](#additional-recommended-metrics)
- [Metrics Summary Table](#metrics-summary-table)
- [Implementation Locations](#implementation-locations)
- [Prometheus Queries](#prometheus-queries)
- [Grafana Dashboards](#grafana-dashboards)
- [Alerting Rules](#alerting-rules)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

This guide defines the essential metrics for monitoring the signup service's health, performance, and user experience. Based on Google's SRE Golden Signals framework.

**Memory overhead:** ~7 KB (fixed, does not grow with traffic)
**Implementation time:** ~30-45 minutes

---

## Golden Signals

### 1. Latency ⏱️

**How fast are we responding to signup requests?**

#### Metric: `signup_request_duration_seconds`
- **Type:** Histogram
- **Dimensions:** `status_code` (201, 400, 409, 500, 405)
- **Purpose:** Track response time distribution
- **Memory:** ~150 bytes per status code = ~750 bytes total

#### What It Tracks
```
signup_request_duration_seconds{status_code="201"}
signup_request_duration_seconds{status_code="400"}
signup_request_duration_seconds{status_code="409"}
signup_request_duration_seconds{status_code="500"}
signup_request_duration_seconds{status_code="405"}
```

#### Buckets (in seconds)
`.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10`

This means we can measure:
- 5ms to 10 seconds response times
- Percentiles (p50, p95, p99)

#### Key Queries
```promql
# p95 latency for successful signups
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket{status_code="201"}[5m]))

# p99 latency (catch outliers)
histogram_quantile(0.99, rate(signup_request_duration_seconds_bucket[5m]))

# Average latency
rate(signup_request_duration_seconds_sum[5m]) / rate(signup_request_duration_seconds_count[5m])

# Compare success vs error latency
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket{status_code="201"}[5m]))
vs
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket{status_code="500"}[5m]))
```

#### Alert Thresholds
- **Warning:** p95 > 500ms for 10 minutes
- **Critical:** p95 > 1s for 5 minutes

#### What It Tells You
- Slow database queries
- Network issues
- Resource contention
- Performance degradation over time

---

### 2. Traffic 📊

**How many signup requests are we handling?**

#### Metric: `signup_requests_total`
- **Type:** Counter
- **Dimensions:** `status_code` (201, 400, 409, 500, 405)
- **Purpose:** Track request volume and outcomes
- **Memory:** ~50 bytes per status code = ~250 bytes total

#### What It Tracks
```
signup_requests_total{status_code="201"}  // successful signups
signup_requests_total{status_code="400"}  // validation errors
signup_requests_total{status_code="409"}  // duplicate emails
signup_requests_total{status_code="500"}  // server errors
signup_requests_total{status_code="405"}  // wrong HTTP method
```

#### Key Queries
```promql
# Successful signups per second
rate(signup_requests_total{status_code="201"}[1m])

# Total requests per second (all statuses)
rate(signup_requests_total[1m])

# Total signups in last hour
increase(signup_requests_total{status_code="201"}[1h])

# Total signups in last 24 hours
increase(signup_requests_total{status_code="201"}[24h])

# Requests by status code (breakdown)
sum by (status_code) (rate(signup_requests_total[5m]))
```

#### Alert Thresholds
- **Warning:** Sudden drop > 50% in 5 minutes (possible outage)
- **Info:** Traffic spike > 200% baseline (possible bot attack or marketing campaign)

#### What It Tells You
- Normal traffic patterns
- Traffic spikes (marketing campaigns, bot attacks)
- Traffic drops (outages, DNS issues)
- Capacity planning (approaching 1000 signups goal)

---

### 3. Errors ❌

**How often and why are signups failing?**

#### Metric: `signup_errors_total`
- **Type:** Counter
- **Dimensions:** `error_type` (validation, duplicate_email, database, invalid_json, invalid_method)
- **Purpose:** Understand failure modes
- **Memory:** ~50 bytes per error type = ~250 bytes total

#### What It Tracks
```
signup_errors_total{error_type="validation"}       // email format, missing fields
signup_errors_total{error_type="duplicate_email"}  // user already exists
signup_errors_total{error_type="database"}         // DB connection/query issues
signup_errors_total{error_type="invalid_json"}     // malformed request body
signup_errors_total{error_type="invalid_method"}   // GET instead of POST
```

#### Key Queries
```promql
# Overall error rate percentage
rate(signup_errors_total[5m]) / rate(signup_requests_total[5m]) * 100

# Top 3 error types
topk(3, rate(signup_errors_total[5m]))

# Duplicate email rate (bot detection)
rate(signup_errors_total{error_type="duplicate_email"}[1m])

# Database error rate (infrastructure health)
rate(signup_errors_total{error_type="database"}[5m])

# Validation error rate (UX issue indicator)
rate(signup_errors_total{error_type="validation"}[5m])
```

#### Alert Thresholds
- **Critical:** Error rate > 5% for 5 minutes
- **Warning:** Database errors > 0 for 2 minutes
- **Info:** Validation errors > 10% (possible UX issue)

#### What It Tells You
- **High validation errors:** Frontend validation broken or UX confusing
- **High duplicate emails:** Bots or users retrying
- **Database errors:** Infrastructure issues
- **Invalid JSON:** API clients misconfigured

---

### 4. Saturation 💾

**How close are we to capacity limits?**

#### Metric: `database_connections`
- **Type:** Gauge
- **Dimensions:** `state` (in_use, idle, open)
- **Purpose:** Track database connection pool usage
- **Memory:** ~100 bytes total

#### What It Tracks
```
database_connections{state="in_use"}  // currently executing queries
database_connections{state="idle"}    // available for reuse
database_connections{state="open"}    // total open connections
```

#### Current Pool Configuration
```go
DB.SetMaxOpenConns(25)  // Maximum connections
DB.SetMaxIdleConns(5)   // Idle connection pool
```

#### Key Queries
```promql
# Connection pool utilization percentage
database_connections{state="in_use"} / 25 * 100

# Available connections
database_connections{state="idle"}

# Connection churn (opening new connections frequently)
rate(database_connections{state="open"}[5m])
```

#### Alert Thresholds
- **Critical:** In-use connections > 20 (80% capacity) for 5 minutes
- **Warning:** In-use connections > 18 (72% capacity) for 10 minutes

#### What It Tells You
- Connection pool exhaustion (need to increase MaxOpenConns)
- Connection leaks (connections not being returned)
- Traffic patterns (spikes causing connection pressure)

#### Additional Saturation Metrics (Already Available via cAdvisor)
- CPU usage: `container_cpu_usage_seconds_total{name="signup-server"}`
- Memory usage: `container_memory_usage_bytes{name="signup-server"}`
- Network I/O: `container_network_receive_bytes_total`

---

## Additional Recommended Metrics

### 5. Database Query Performance 🗄️

**Is the database the bottleneck?**

#### Metric: `database_query_duration_seconds`
- **Type:** Histogram
- **Dimensions:** `operation` (insert_user)
- **Purpose:** Isolate database performance
- **Memory:** ~150 bytes per operation

#### What It Tracks
```
database_query_duration_seconds{operation="insert_user"}
```

#### Key Queries
```promql
# p95 database insert time
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket{operation="insert_user"}[5m]))

# Average database query time
rate(database_query_duration_seconds_sum[5m]) / rate(database_query_duration_seconds_count[5m])

# Compare endpoint latency vs DB latency to find overhead
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))
-
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
```

#### Alert Thresholds
- **Warning:** p95 DB query time > 100ms
- **Critical:** p95 DB query time > 500ms

#### What It Tells You
- Database index effectiveness
- Query optimization needs
- Database server health
- Network latency to database

---

### 6. Validation Failure Breakdown 🔍

**Which fields are users struggling with?**

#### Metric: `signup_validation_errors_total`
- **Type:** Counter
- **Dimensions:** `field` (email, first_name, last_name)
- **Purpose:** UX insights and product decisions
- **Memory:** ~150 bytes total

#### What It Tracks
```
signup_validation_errors_total{field="email"}        // invalid format or missing
signup_validation_errors_total{field="first_name"}   // missing or too long
signup_validation_errors_total{field="last_name"}    // missing or too long
```

#### Key Queries
```promql
# Which field causes most errors?
topk(3, rate(signup_validation_errors_total[1h]))

# Email validation error rate
rate(signup_validation_errors_total{field="email"}[5m]) / rate(signup_requests_total[5m]) * 100

# Field error distribution (pie chart)
sum by (field) (increase(signup_validation_errors_total[24h]))
```

#### What It Tells You
- **High email errors:** Email validation too strict or UX unclear
- **High first_name errors:** Required field not obvious in UI
- **High last_name errors:** Character limit UX issue

---

## Metrics Summary Table

### Priority 1: MUST HAVE (Golden Signals)
| Metric | Type | Dimensions | Cardinality | Memory | Purpose |
|--------|------|------------|-------------|--------|---------|
| `signup_request_duration_seconds` | Histogram | `status_code` | 5 | ~750 B | Response time tracking |
| `signup_requests_total` | Counter | `status_code` | 5 | ~250 B | Traffic volume |
| `signup_errors_total` | Counter | `error_type` | 5 | ~250 B | Error classification |
| `database_connections` | Gauge | `state` | 3 | ~100 B | Connection pool health |

**Total:** ~1.4 KB

### Priority 2: HIGHLY RECOMMENDED
| Metric | Type | Dimensions | Cardinality | Memory | Purpose |
|--------|------|------------|-------------|--------|---------|
| `database_query_duration_seconds` | Histogram | `operation` | 1 | ~150 B | DB performance isolation |
| `signup_validation_errors_total` | Counter | `field` | 3 | ~150 B | UX insights |

**Total:** ~300 B

### Priority 3: NICE TO HAVE
| Metric | Type | Dimensions | Cardinality | Memory | Purpose |
|--------|------|------------|-------------|--------|---------|
| `signup_duplicate_email_attempts_total` | Counter | none | 1 | ~50 B | Bot detection |
| `signup_requests_in_flight` | Gauge | none | 1 | ~50 B | Concurrent requests |

**Total:** ~100 B

**Grand Total Memory:** ~1.8 KB (fixed, does not grow with traffic)

---

## Implementation Locations

### File: `internal/metrics/metrics.go` (NEW)

Create this file to define all metrics:

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // Golden Signal: Latency
    SignupRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "signup_request_duration_seconds",
            Help:    "Duration of signup requests in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"status_code"},
    )

    // Golden Signal: Traffic
    SignupRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "signup_requests_total",
            Help: "Total number of signup requests",
        },
        []string{"status_code"},
    )

    // Golden Signal: Errors
    SignupErrorsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "signup_errors_total",
            Help: "Total number of signup errors by type",
        },
        []string{"error_type"},
    )

    // Golden Signal: Saturation
    DatabaseConnections = promauto.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "database_connections",
            Help: "Number of database connections by state",
        },
        []string{"state"},
    )

    // Additional: Database Performance
    DatabaseQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "database_query_duration_seconds",
            Help:    "Duration of database queries in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"operation"},
    )

    // Additional: Validation Insights
    SignupValidationErrorsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "signup_validation_errors_total",
            Help: "Total validation errors by field",
        },
        []string{"field"},
    )
)
```

---

### File: `internal/handlers/signup.go` (MODIFY)

Add metrics tracking to the signup handler:

```go
func SignupHandler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    var statusCode int
    var errorType string
    
    defer func() {
        // Record metrics at the end
        duration := time.Since(start).Seconds()
        statusCodeStr := fmt.Sprintf("%d", statusCode)
        
        metrics.SignupRequestDuration.WithLabelValues(statusCodeStr).Observe(duration)
        metrics.SignupRequestsTotal.WithLabelValues(statusCodeStr).Inc()
        
        if errorType != "" {
            metrics.SignupErrorsTotal.WithLabelValues(errorType).Inc()
        }
    }()
    
    // 1. Check HTTP method
    if r.Method != http.MethodPost {
        statusCode = http.StatusMethodNotAllowed
        errorType = "invalid_method"
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(statusCode)
        json.NewEncoder(w).Encode(ErrorResponse{Error: "method not allowed"})
        return
    }

    // 2. Decode JSON
    var req models.SignupRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        statusCode = http.StatusBadRequest
        errorType = "invalid_json"
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(statusCode)
        json.NewEncoder(w).Encode(ErrorResponse{Error: "invalid request body"})
        return
    }

    // 3. Validate input
    if err := validateSignupRequest(&req); err != nil {
        statusCode = http.StatusBadRequest
        errorType = "validation"
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(statusCode)
        json.NewEncoder(w).Encode(ErrorResponse{Error: err.Error()})
        return
    }

    // 4. Insert user into database
    var user models.User
    query := `
        INSERT INTO users (email, first_name, last_name)
        VALUES ($1, $2, $3)
        RETURNING id, email, first_name, last_name, created_at, updated_at
    `

    dbStart := time.Now()
    err := database.DB.QueryRow(query, req.Email, req.FirstName, req.LastName).Scan(
        &user.ID,
        &user.Email,
        &user.FirstName,
        &user.LastName,
        &user.CreatedAt,
        &user.UpdatedAt,
    )
    dbDuration := time.Since(dbStart).Seconds()
    metrics.DatabaseQueryDuration.WithLabelValues("insert_user").Observe(dbDuration)

    if err != nil {
        // Check for duplicate email
        if strings.Contains(err.Error(), "duplicate key") {
            statusCode = http.StatusConflict
            errorType = "duplicate_email"
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(statusCode)
            json.NewEncoder(w).Encode(ErrorResponse{Error: "email already exists"})
            return
        }

        statusCode = http.StatusInternalServerError
        errorType = "database"
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(statusCode)
        json.NewEncoder(w).Encode(ErrorResponse{Error: "failed to create user"})
        return
    }

    // 5. Success
    statusCode = http.StatusCreated
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(SuccessResponse{
        Message: "user created successfully",
        User:    &user,
    })
}

// Enhanced validation with field-level metrics
func validateSignupRequest(req *models.SignupRequest) error {
    req.Email = strings.TrimSpace(req.Email)
    req.FirstName = strings.TrimSpace(req.FirstName)
    req.LastName = strings.TrimSpace(req.LastName)

    if req.Email == "" {
        metrics.SignupValidationErrorsTotal.WithLabelValues("email").Inc()
        return fmt.Errorf("email is required")
    }
    if !emailRegex.MatchString(req.Email) {
        metrics.SignupValidationErrorsTotal.WithLabelValues("email").Inc()
        return fmt.Errorf("invalid email format")
    }

    if req.FirstName == "" {
        metrics.SignupValidationErrorsTotal.WithLabelValues("first_name").Inc()
        return fmt.Errorf("first name is required")
    }
    if len(req.FirstName) > 100 {
        metrics.SignupValidationErrorsTotal.WithLabelValues("first_name").Inc()
        return fmt.Errorf("first name must be less than 100 characters")
    }

    if req.LastName == "" {
        metrics.SignupValidationErrorsTotal.WithLabelValues("last_name").Inc()
        return fmt.Errorf("last name is required")
    }
    if len(req.LastName) > 100 {
        metrics.SignupValidationErrorsTotal.WithLabelValues("last_name").Inc()
        return fmt.Errorf("last name must be less than 100 characters")
    }

    return nil
}
```

---

### File: `internal/database/database.go` (MODIFY)

Add connection pool metrics:

```go
import (
    "signup/internal/metrics"
    "time"
)

// Add this function to update connection metrics
func UpdateConnectionMetrics() {
    if DB == nil {
        return
    }
    
    stats := DB.Stats()
    metrics.DatabaseConnections.WithLabelValues("in_use").Set(float64(stats.InUse))
    metrics.DatabaseConnections.WithLabelValues("idle").Set(float64(stats.Idle))
    metrics.DatabaseConnections.WithLabelValues("open").Set(float64(stats.OpenConnections))
}

// Call this periodically (in main.go or as a goroutine)
func StartConnectionMetricsUpdater() {
    ticker := time.NewTicker(15 * time.Second)
    go func() {
        for range ticker.C {
            UpdateConnectionMetrics()
        }
    }()
}
```

---

### File: `main.go` (MODIFY)

Add the `/metrics` endpoint:

```go
import (
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "signup/internal/database"
)

func main() {
    // ... existing code ...

    // Initialize database connection
    if err := database.Connect(); err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer database.Close()

    // Start connection metrics updater
    database.StartConnectionMetricsUpdater()

    // Run database migrations
    if err := database.RunMigrations(); err != nil {
        log.Fatalf("Failed to run migrations: %v", err)
    }

    // Setup routes
    http.HandleFunc("/", welcomeHandler)
    http.HandleFunc("/signup", handlers.SignupHandler)
    http.Handle("/metrics", promhttp.Handler())  // ← ADD THIS

    // ... existing code ...
}
```

---

### File: `monitoring/prometheus/prometheus.yml` (MODIFY)

Add your Go server as a scrape target:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Scrape cAdvisor for container metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  # Scrape signup server for application metrics
  - job_name: 'signup-server'
    static_configs:
      - targets: ['server:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

---

### File: `go.mod` (MODIFY)

Add Prometheus dependencies:

```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promauto
go get github.com/prometheus/client_golang/prometheus/promhttp
```

---

## Prometheus Queries

### Traffic Analysis

```promql
# Current signup rate (per second)
rate(signup_requests_total{status_code="201"}[1m])

# Total signups today
increase(signup_requests_total{status_code="201"}[24h])

# Total signups this hour
increase(signup_requests_total{status_code="201"}[1h])

# Request breakdown by status code
sum by (status_code) (rate(signup_requests_total[5m]))

# Traffic trend (compare now vs 1 hour ago)
rate(signup_requests_total[5m]) / rate(signup_requests_total[5m] offset 1h)
```

### Latency Analysis

```promql
# p50 (median) latency
histogram_quantile(0.50, rate(signup_request_duration_seconds_bucket[5m]))

# p95 latency
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))

# p99 latency
histogram_quantile(0.99, rate(signup_request_duration_seconds_bucket[5m]))

# Average latency
rate(signup_request_duration_seconds_sum[5m]) / rate(signup_request_duration_seconds_count[5m])

# Latency by status code
histogram_quantile(0.95, sum by (status_code, le) (rate(signup_request_duration_seconds_bucket[5m])))
```

### Error Analysis

```promql
# Overall error rate (percentage)
rate(signup_errors_total[5m]) / rate(signup_requests_total[5m]) * 100

# Error breakdown (which type is most common?)
topk(5, rate(signup_errors_total[5m]))

# Validation error rate
rate(signup_errors_total{error_type="validation"}[5m])

# Database error rate
rate(signup_errors_total{error_type="database"}[5m])

# Duplicate email rate (potential bot activity)
rate(signup_errors_total{error_type="duplicate_email"}[1m])

# 4xx vs 5xx error rate
rate(signup_requests_total{status_code=~"4.."}[5m])
vs
rate(signup_requests_total{status_code=~"5.."}[5m])
```

### Success Rate

```promql
# Success rate (percentage)
rate(signup_requests_total{status_code="201"}[5m]) / rate(signup_requests_total[5m]) * 100

# Success rate trend (compare to 1 hour ago)
(rate(signup_requests_total{status_code="201"}[5m]) / rate(signup_requests_total[5m]) * 100)
/
(rate(signup_requests_total{status_code="201"}[5m] offset 1h) / rate(signup_requests_total[5m] offset 1h) * 100)
```

### Database Performance

```promql
# Database query p95 latency
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))

# Application overhead (total latency - DB latency)
histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))
-
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))

# Connection pool utilization
database_connections{state="in_use"} / 25 * 100

# Available connections
database_connections{state="idle"}
```

### Validation Insights

```promql
# Which field has most validation errors?
topk(3, rate(signup_validation_errors_total[1h]))

# Email validation error rate
rate(signup_validation_errors_total{field="email"}[5m])

# Validation error distribution (last 24h)
sum by (field) (increase(signup_validation_errors_total[24h]))
```

---

## Grafana Dashboards

### Dashboard 1: Overview (Single Pane of Glass)

**Purpose:** Quick health check

**Panels:**

1. **Signups/sec** (Stat panel)
   ```promql
   rate(signup_requests_total{status_code="201"}[1m])
   ```

2. **Success Rate** (Stat panel with thresholds)
   ```promql
   rate(signup_requests_total{status_code="201"}[5m]) / rate(signup_requests_total[5m]) * 100
   ```
   - Green: > 95%
   - Yellow: 90-95%
   - Red: < 90%

3. **p95 Latency** (Stat panel)
   ```promql
   histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))
   ```

4. **Error Rate** (Stat panel)
   ```promql
   rate(signup_errors_total[5m]) / rate(signup_requests_total[5m]) * 100
   ```

5. **Total Signups Today** (Stat panel)
   ```promql
   increase(signup_requests_total{status_code="201"}[24h])
   ```

6. **Connection Pool Usage** (Gauge)
   ```promql
   database_connections{state="in_use"} / 25 * 100
   ```

---

### Dashboard 2: Traffic & Performance

**Purpose:** Deep dive into request patterns

**Panels:**

1. **Requests by Status Code** (Stacked area chart)
   ```promql
   sum by (status_code) (rate(signup_requests_total[1m]))
   ```

2. **Latency Percentiles** (Line chart)
   ```promql
   histogram_quantile(0.50, rate(signup_request_duration_seconds_bucket[5m]))
   histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))
   histogram_quantile(0.99, rate(signup_request_duration_seconds_bucket[5m]))
   ```

3. **Error Breakdown** (Pie chart)
   ```promql
   sum by (error_type) (increase(signup_errors_total[1h]))
   ```

4. **Database Query Time** (Line chart)
   ```promql
   histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
   ```

5. **Validation Errors by Field** (Bar chart)
   ```promql
   sum by (field) (rate(signup_validation_errors_total[1h]))
   ```

---

### Dashboard 3: Capacity & Saturation

**Purpose:** Resource utilization and capacity planning

**Panels:**

1. **CPU Usage** (Line chart)
   ```promql
   rate(container_cpu_usage_seconds_total{name="signup-server"}[5m]) * 100
   ```

2. **Memory Usage** (Line chart)
   ```promql
   container_memory_usage_bytes{name="signup-server"} / 1024 / 1024
   ```

3. **Database Connections** (Stacked area)
   ```promql
   database_connections{state="in_use"}
   database_connections{state="idle"}
   ```

4. **Requests/Minute Trend** (Line chart)
   ```promql
   rate(signup_requests_total[1m]) * 60
   ```

5. **Progress to 1000 Signup Goal** (Bar gauge)
   ```promql
   increase(signup_requests_total{status_code="201"}[24h]) / 1000 * 100
   ```

---

## Alerting Rules

### Critical Alerts

#### 1. High Error Rate
```yaml
alert: SignupHighErrorRate
expr: |
  (rate(signup_errors_total[5m]) / rate(signup_requests_total[5m]) * 100) > 5
for: 5m
labels:
  severity: critical
  service: signup
annotations:
  summary: "Signup error rate is {{ $value | humanize }}%"
  description: "More than 5% of signup requests are failing"
```

#### 2. Database Connection Pool Exhaustion
```yaml
alert: SignupDatabaseConnectionsHigh
expr: database_connections{state="in_use"} > 20
for: 5m
labels:
  severity: critical
  service: signup
annotations:
  summary: "Database connection pool at {{ $value }}/25 (80%+)"
  description: "Risk of connection pool exhaustion"
```

#### 3. Service Down
```yaml
alert: SignupServiceDown
expr: up{job="signup-server"} == 0
for: 2m
labels:
  severity: critical
  service: signup
annotations:
  summary: "Signup service is down"
  description: "Prometheus cannot scrape metrics from signup-server"
```

#### 4. High 5xx Error Rate
```yaml
alert: SignupHighServerErrors
expr: |
  rate(signup_requests_total{status_code=~"5.."}[5m]) > 0.1
for: 3m
labels:
  severity: critical
  service: signup
annotations:
  summary: "High rate of 5xx errors: {{ $value | humanize }}/sec"
  description: "Server errors indicate application or infrastructure issues"
```

### Warning Alerts

#### 5. Slow Response Time
```yaml
alert: SignupSlowLatency
expr: |
  histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m])) > 0.5
for: 10m
labels:
  severity: warning
  service: signup
annotations:
  summary: "p95 latency is {{ $value | humanize }}s"
  description: "Signup requests are slower than expected (>500ms)"
```

#### 6. High Validation Error Rate
```yaml
alert: SignupHighValidationErrors
expr: |
  (rate(signup_errors_total{error_type="validation"}[5m]) / rate(signup_requests_total[5m]) * 100) > 10
for: 15m
labels:
  severity: warning
  service: signup
annotations:
  summary: "Validation error rate is {{ $value | humanize }}%"
  description: "More than 10% of requests have validation errors - possible UX issue"
```

#### 7. Slow Database Queries
```yaml
alert: SignupSlowDatabaseQueries
expr: |
  histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 0.1
for: 10m
labels:
  severity: warning
  service: signup
annotations:
  summary: "p95 DB query time is {{ $value | humanize }}s"
  description: "Database queries are slower than expected (>100ms)"
```

### Info Alerts

#### 8. Traffic Spike
```yaml
alert: SignupTrafficSpike
expr: |
  rate(signup_requests_total[5m]) / rate(signup_requests_total[5m] offset 1h) > 2
for: 5m
labels:
  severity: info
  service: signup
annotations:
  summary: "Traffic is {{ $value | humanize }}x higher than 1 hour ago"
  description: "Possible marketing campaign or bot attack"
```

#### 9. High Duplicate Email Attempts
```yaml
alert: SignupHighDuplicateEmails
expr: |
  rate(signup_errors_total{error_type="duplicate_email"}[5m]) > 1
for: 10m
labels:
  severity: info
  service: signup
annotations:
  summary: "{{ $value | humanize }} duplicate email attempts/sec"
  description: "Possible bot activity or users retrying"
```

---

## Troubleshooting Guide

### Scenario 1: High Latency

**Symptoms:**
- `signup_request_duration_seconds` p95 > 500ms
- Users complaining about slow signups

**Diagnosis:**

1. Check if database is slow:
   ```promql
   histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
   ```
   - If > 100ms: Database is the bottleneck
   - If < 100ms: Application overhead is the issue

2. Check CPU usage:
   ```promql
   rate(container_cpu_usage_seconds_total{name="signup-server"}[5m]) * 100
   ```
   - If > 80%: CPU bottleneck

3. Check connection pool:
   ```promql
   database_connections{state="in_use"}
   ```
   - If near 25: Connection pool exhausted

**Solutions:**
- Slow database: Add indexes, optimize queries
- High CPU: Optimize regex, JSON parsing
- Connection pool exhausted: Increase `MaxOpenConns`

---

### Scenario 2: High Error Rate

**Symptoms:**
- `signup_errors_total` rate increasing
- Success rate dropping below 95%

**Diagnosis:**

1. Check error types:
   ```promql
   topk(5, rate(signup_errors_total[5m]))
   ```

2. If `error_type="validation"` is high:
   - Check which field:
     ```promql
     topk(3, rate(signup_validation_errors_total[5m]))
     ```
   - Frontend validation may be broken

3. If `error_type="database"` is high:
   - Database may be down or overloaded
   - Check database logs

4. If `error_type="duplicate_email"` is spiking:
   - Possible bot attack
   - Check request patterns

**Solutions:**
- Validation errors: Fix frontend, improve UX
- Database errors: Scale database, check connectivity
- Duplicate emails: Implement rate limiting

---

### Scenario 3: Traffic Spike

**Symptoms:**
- `signup_requests_total` rate suddenly increases
- May or may not correlate with errors

**Diagnosis:**

1. Check if legitimate (marketing campaign):
   - Error rate should stay normal (<5%)
   - Success rate should stay high (>95%)

2. Check if bot attack:
   - High duplicate email rate:
     ```promql
     rate(signup_errors_total{error_type="duplicate_email"}[1m])
     ```
   - High validation errors

3. Check resource saturation:
   - CPU, memory, connections near limits

**Solutions:**
- Legitimate traffic: Scale up if needed
- Bot attack: Implement CAPTCHA, rate limiting
- Resource exhaustion: Increase limits

---

### Scenario 4: Connection Pool Exhaustion

**Symptoms:**
- `database_connections{state="in_use"}` near 25
- High latency
- Possible timeouts

**Diagnosis:**

1. Check if queries are slow:
   ```promql
   histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))
   ```

2. Check traffic volume:
   ```promql
   rate(signup_requests_total[1m])
   ```

3. Check for connection leaks (connections not being returned)

**Solutions:**
- Increase `MaxOpenConns` in database config
- Optimize slow queries
- Ensure proper connection cleanup (defer rows.Close())

---

### Scenario 5: Low Success Rate

**Symptoms:**
- Success rate < 95%
- Multiple error types increasing

**Diagnosis:**

1. Check overall error breakdown:
   ```promql
   sum by (error_type) (rate(signup_errors_total[5m]))
   ```

2. Check status code distribution:
   ```promql
   sum by (status_code) (rate(signup_requests_total[5m]))
   ```

3. Correlate with latency:
   - If latency is also high: Performance issue
   - If latency is normal: Logic/validation issue

**Solutions:**
- Multiple causes: Address highest error type first
- Performance-related: Scale resources
- Logic-related: Fix validation, improve error messages

---

## Quick Reference: Metric Types

### Counter
- **Always increases** (or resets on restart)
- Use for: Requests, errors, events
- Query with: `rate()`, `increase()`
- Example: `signup_requests_total`

### Gauge
- **Can go up or down**
- Use for: Current values, percentages
- Query directly or with `avg()`
- Example: `database_connections`

### Histogram
- **Tracks distribution** (buckets + sum + count)
- Use for: Latencies, sizes
- Query with: `histogram_quantile()`
- Example: `signup_request_duration_seconds`

### Summary
- Similar to histogram, pre-calculated quantiles
- Not used in this implementation

---

## Testing Your Metrics

### 1. Test Metrics Endpoint
```bash
# Check if /metrics endpoint is working
curl http://localhost:3000/metrics

# Should see output like:
# signup_requests_total{status_code="201"} 42
# signup_request_duration_seconds_sum{status_code="201"} 1.23
# ...
```

### 2. Generate Test Traffic
```bash
# Successful signup
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","first_name":"John","last_name":"Doe"}'

# Validation error
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","first_name":"John","last_name":"Doe"}'

# Duplicate email (run twice)
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"duplicate@example.com","first_name":"Jane","last_name":"Doe"}'
```

### 3. Check Prometheus
```
Visit: http://localhost:9090
Go to: Status > Targets
Ensure: signup-server is "UP"

Try queries:
- signup_requests_total
- rate(signup_requests_total[1m])
- histogram_quantile(0.95, rate(signup_request_duration_seconds_bucket[5m]))
```

### 4. Load Testing
```bash
# Smoke test (quick validation)
make load-test-smoke

# Full load test (progressive load)
make load-test

# Stress test (push to limits)
make load-test-stress

# Watch metrics during test
watch -n 1 'curl -s http://localhost:3000/metrics | grep signup_requests_total'
```

---

## Next Steps

### Phase 1: Implementation (Day 1)
- [ ] Add Prometheus dependencies to `go.mod`
- [ ] Create `internal/metrics/metrics.go`
- [ ] Instrument `internal/handlers/signup.go`
- [ ] Add database connection metrics
- [ ] Update `main.go` with `/metrics` endpoint
- [ ] Update Prometheus config
- [ ] Rebuild: `make compose-build`
- [ ] Test: `curl http://localhost:3000/metrics`

### Phase 2: Visualization (Day 2)
- [ ] Create Grafana Overview dashboard
- [ ] Create Traffic & Performance dashboard
- [ ] Create Capacity & Saturation dashboard
- [ ] Import community dashboards (optional)

### Phase 3: Alerting (Day 3)
- [ ] Install Alertmanager (optional)
- [ ] Configure critical alerts
- [ ] Configure warning alerts
- [ ] Test alerting with simulated failures

### Phase 4: Optimization (Ongoing)
- [ ] Analyze metrics to find bottlenecks
- [ ] Optimize based on data
- [ ] Adjust alert thresholds based on baseline
- [ ] Plan for Phase 2 (100k signups)

---

## Resources

### Prometheus
- Docs: https://prometheus.io/docs/
- PromQL: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Best Practices: https://prometheus.io/docs/practices/naming/

### Grafana
- Docs: https://grafana.com/docs/
- Dashboards: https://grafana.com/grafana/dashboards/
- Community Dashboard for Docker: ID **193**

### Go Client
- GitHub: https://github.com/prometheus/client_golang
- Examples: https://github.com/prometheus/client_golang/tree/main/examples

### SRE & Monitoring
- Google SRE Book: https://sre.google/sre-book/monitoring-distributed-systems/
- Four Golden Signals: https://sre.google/sre-book/monitoring-distributed-systems/#xref_monitoring_golden-signals

---

**Last Updated:** 2025-11-30
**Version:** 1.0
**Author:** OpenCode AI Agent
