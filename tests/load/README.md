# Load Testing with k6

This directory contains k6 load tests for the signup API.

## Available Tests

### 1. Smoke Test (`signup-smoke-test.js`)
**Purpose**: Quick validation that the API works  
**Load**: 5 concurrent users for 30 seconds  
**Use when**: After deployments or code changes  

```bash
make load-test-smoke
```

**Expected Results**:
- ~150 signups
- Response time p(95) < 1000ms
- Error rate < 10%

---

### 2. Load Test (`signup-load-test.js`)
**Purpose**: Progressive load testing to validate Phase 1 target  
**Load**: Ramps from 10 → 50 → 100 users over 4.5 minutes  
**Use when**: Testing Phase 1 capacity (1000 signups target)  

```bash
make load-test
```

**Stages**:
1. Ramp to 10 users (30s)
2. Ramp to 50 users (1m)
3. Ramp to 100 users (2m)
4. Sustain 100 users (1m)
5. Ramp down (30s)

**Expected Results**:
- ~400-500 signups
- Response time p(95) < 500ms
- Error rate < 5%

---

### 3. Stress Test (`signup-stress-test.js`)
**Purpose**: Find the breaking point of the system  
**Load**: Ramps up to 1000 concurrent users  
**Use when**: Capacity planning for Phase 2  

```bash
make load-test-stress
```

**Stages**:
1. Ramp to 100 users (1m)
2. Ramp to 200 users (2m)
3. Ramp to 500 users (3m)
4. Ramp to 1000 users (2m)
5. Ramp down (2m)

**Expected Results**:
- Find system limits
- Response time p(95) < 2000ms (lenient)
- Error rate < 30%

---

## Understanding Results

### Key Metrics

**http_req_duration**: How long requests take
- `avg`: Average response time
- `p(95)`: 95% of requests are faster than this
- `p(90)`: 90% of requests are faster than this

**http_req_failed**: Failed requests percentage
- Target: < 5% for normal operation
- Target: < 30% for stress tests

**checks**: Custom validation checks
- `status is 201`: Successful signup
- `has user data`: Valid response body

### Example Output

```
✓ THRESHOLDS
  http_req_duration......: p(95)=9.71ms < 1000ms ✓
  http_req_failed........: rate=0.00% < 0.1% ✓

HTTP
  http_req_duration......: avg=7.51ms  p(95)=9.71ms
  http_reqs..............: 151 (4.99/s)
  
CHECKS
  status is 201..........: 100.00% ✓
  has user data..........: 100.00% ✓
```

---

## Monitoring During Tests

### Watch real-time metrics in Grafana:
```bash
# Open Grafana
http://localhost:3001

# Login: admin/admin
# Navigate to Docker dashboard
```

### Watch container stats:
```bash
docker stats signup-db signup-server
```

### Watch database connections:
```bash
docker exec signup-db psql -U postgres -d signup -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Troubleshooting

### Test fails immediately
```bash
# Check if server is running
curl http://localhost:3000/

# Check docker-compose status
docker-compose ps
```

### High error rates
```bash
# Check server logs
docker logs signup-server

# Check database logs
docker logs signup-db

# Check for resource limits
docker stats signup-db signup-server
```

### Slow response times
```bash
# Check CPU/Memory usage
docker stats

# Check database connections
docker exec signup-db psql -U postgres -d signup -c \
  "SELECT count(*) as connections FROM pg_stat_activity WHERE datname='signup';"
```

---

## Custom Test Runs

You can customize tests with environment variables:

```bash
# Run smoke test against different URL
docker run --rm -v $(pwd)/tests/load:/tests --network host \
  -e K6_BASE_URL=http://production.example.com \
  grafana/k6 run /tests/signup-smoke-test.js

# Run with custom duration
docker run --rm -v $(pwd)/tests/load:/tests --network host \
  -e K6_BASE_URL=http://localhost:3000 \
  grafana/k6 run -d 1m -u 10 /tests/signup-smoke-test.js
```

---

## Phase 1 Target Validation

To validate the **1000 signups** target for Phase 1:

```bash
# 1. Clear existing test data
docker exec signup-db psql -U postgres -d signup -c "DELETE FROM users WHERE email LIKE '%test.com';"

# 2. Run load test
make load-test

# 3. Check results
docker exec signup-db psql -U postgres -d signup -c "SELECT COUNT(*) FROM users;"

# 4. Monitor in Grafana
# Open http://localhost:3001
```

**Success Criteria**:
- ✓ 400+ successful signups
- ✓ Response time p(95) < 500ms
- ✓ Error rate < 5%
- ✓ CPU < 80% of limit
- ✓ Memory < 80% of limit

---

## k6 Documentation

For more advanced usage, see:
- https://k6.io/docs/
- https://k6.io/docs/using-k6/metrics/
- https://k6.io/docs/using-k6/thresholds/
