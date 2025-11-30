# Monitoring Setup

This project includes Prometheus and Grafana for monitoring CPU and memory usage of your containers.

## Components

### 1. **cAdvisor** (Container Advisor)
- **Port**: 8080
- **Purpose**: Collects real-time CPU, memory, network, and disk metrics from all containers
- **Access**: http://localhost:8080

### 2. **Prometheus**
- **Port**: 9090
- **Purpose**: Time-series database that scrapes and stores metrics from cAdvisor
- **Access**: http://localhost:9090
- **Config**: `monitoring/prometheus/prometheus.yml`

### 3. **Grafana**
- **Port**: 3001
- **Purpose**: Visualization dashboard for metrics
- **Access**: http://localhost:3001
- **Default Login**: admin / admin (configurable via .env)

## Quick Start

```bash
# Start all services including monitoring
make compose-up

# View logs
make compose-logs

# Stop all services
make compose-down
```

## Accessing the Dashboards

### cAdvisor (http://localhost:8080)
- Real-time container metrics
- CPU, memory, network, disk usage
- Per-container breakdown

### Prometheus (http://localhost:9090)
- Query metrics using PromQL
- Example queries:
  ```
  # CPU usage per container
  rate(container_cpu_usage_seconds_total[5m])
  
  # Memory usage
  container_memory_usage_bytes
  
  # Memory limit
  container_spec_memory_limit_bytes
  ```

### Grafana (http://localhost:3001)
1. Login with admin/admin (or your configured credentials)
2. Navigate to Dashboards
3. Import a dashboard:
   - Click "+" → "Import"
   - Enter dashboard ID: **193** (Docker Prometheus Monitoring)
   - Select "Prometheus" as data source
   - Click "Import"

## Useful Metrics

### For signup-db (PostgreSQL):
```promql
# CPU usage
rate(container_cpu_usage_seconds_total{name="signup-db"}[5m])

# Memory usage (bytes)
container_memory_usage_bytes{name="signup-db"}

# Memory usage percentage
(container_memory_usage_bytes{name="signup-db"} / container_spec_memory_limit_bytes{name="signup-db"}) * 100
```

### For signup-server (Go):
```promql
# CPU usage
rate(container_cpu_usage_seconds_total{name="signup-server"}[5m])

# Memory usage (bytes)
container_memory_usage_bytes{name="signup-server"}

# Memory usage percentage
(container_memory_usage_bytes{name="signup-server"} / container_spec_memory_limit_bytes{name="signup-server"}) * 100
```

## Resource Limits

Current limits configured in `docker-compose.yml`:

| Service | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|---------|-----------|--------------|--------------|-----------------|
| signup-db | 1.0 core | 512MB | 0.5 core | 256MB |
| signup-server | 0.5 core | 256MB | 0.25 core | 128MB |

## Environment Variables

Add to `.env` file (copy from `.env.example`):

```env
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_secure_password
```

## Troubleshooting

### Prometheus not scraping:
```bash
# Check Prometheus targets
# Visit: http://localhost:9090/targets
# All targets should be "UP"
```

### Grafana can't connect to Prometheus:
```bash
# Check if services are on same network
docker network inspect signup_signup-network

# Verify datasource URL in Grafana settings
# Should be: http://prometheus:9090
```

### cAdvisor not showing metrics:
```bash
# Check cAdvisor logs
docker logs cadvisor

# cAdvisor needs privileged mode and access to Docker socket
```

## Architecture

```
┌─────────────┐
│  Containers │
│ (db, server)│
└──────┬──────┘
       │ metrics
       ▼
┌─────────────┐
│   cAdvisor  │ ← Collects container metrics
│  :8080      │
└──────┬──────┘
       │ scrapes
       ▼
┌─────────────┐
│ Prometheus  │ ← Stores time-series data
│  :9090      │
└──────┬──────┘
       │ queries
       ▼
┌─────────────┐
│   Grafana   │ ← Visualizes data
│  :3001      │
└─────────────┘
```
