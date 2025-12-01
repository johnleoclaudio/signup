# Grafana Dashboard Import Instructions

## Dashboard File
**Location:** `monitoring/grafana/signup-dashboard.json`

## Quick Import Guide

### Step 1: Access Grafana
1. Open: http://localhost:3001
2. Login: `admin` / `admin`

### Step 2: Import Dashboard
1. Click **☰ menu** (hamburger) → **Dashboards**
2. Click **New** button (top-right) → **Import**
3. **Upload JSON file**:
   - Click **Upload JSON file** button
   - Select: `monitoring/grafana/signup-dashboard.json`
   - OR drag and drop the file
4. **Click Import** (no need to select datasource - it's already configured!)

### Step 3: View Dashboard
Your dashboard should load immediately with 12 panels showing real-time metrics!

---

## Dashboard Contents

### Row 1: Key Metrics
- **Total API Requests** - Cumulative counter
- **Successful Signups** - Status 201 count
- **Success Rate** - Percentage gauge with thresholds
- **Error Rate** - Percentage with color coding

### Row 2: Traffic Trends
- **API Requests/Second** - Time series by method/endpoint/status
- **Requests by Status Code** - Stacked area chart

### Row 3: Historical Stats
- **Signups (Last Hour)**
- **Signups (Last 24 Hours)**
- **Validation Errors (Total)**
- **Duplicate Email Errors (Total)**

### Row 4: Analysis
- **Requests by Status Code** - Pie chart distribution
- **API Requests Breakdown** - Detailed table

---

## Troubleshooting

### Issue: "No data" in panels

**Check 1: Is Prometheus scraping?**
```bash
# Check if signup-server target is UP
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="signup-server") | .health'
# Should return: "up"
```

**Check 2: Does Prometheus have data?**
```bash
# Query Prometheus directly
curl -s 'http://localhost:9090/api/v1/query?query=api_requests_total' | jq '.data.result'
# Should return array with data
```

**Check 3: Generate test traffic**
```bash
# Create some requests
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","first_name":"John","last_name":"Doe"}'

# Wait 15 seconds (Prometheus scrape interval)
sleep 15

# Check dashboard again
```

**Fix: Restart Prometheus**
```bash
# If signup-server target is not showing
cd /home/leo/Work/signup
docker compose restart prometheus

# Wait 30 seconds for scraping to start
```

---

### Issue: "Datasource not found"

This has been fixed! The dashboard now uses your specific Prometheus datasource UID: `PBFA97CFB590B2093`

If you still see this error:
1. Check datasource exists: http://localhost:3001/connections/datasources
2. Look for "Prometheus" in the list
3. If missing, add it:
   - Click **Add data source**
   - Select **Prometheus**
   - URL: `http://prometheus:9090`
   - Click **Save & test**

---

## Features

- **Auto-refresh:** 5 seconds
- **Time range:** Last 15 minutes (adjustable)
- **Timezone:** Browser local time
- **Color-coded:** Green (success), Yellow (client errors), Red (server errors)
- **Interactive:** Click legends to show/hide series

---

## Test the Dashboard

Generate varied traffic to see all panels populate:

```bash
# Successful signups (green)
for i in {1..10}; do
  curl -X POST http://localhost:3000/signup \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$RANDOM@example.com\",\"first_name\":\"User\",\"last_name\":\"$i\"}"
  sleep 0.5
done

# Validation errors (yellow)
for i in {1..3}; do
  curl -X POST http://localhost:3000/signup \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid","first_name":"Test","last_name":"User"}'
  sleep 0.5
done

# Duplicate emails (orange)
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dup@test.com","first_name":"A","last_name":"B"}'
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dup@test.com","first_name":"A","last_name":"B"}'

# Wrong method (purple)
curl -X GET http://localhost:3000/signup

# Watch your dashboard come to life! 🚀
```

---

## Customization

### Change Refresh Rate
Top-right corner → Click refresh icon → Select: 5s, 10s, 30s, 1m, 5m

### Change Time Range
Top-right corner → Time picker → Select: Last 5m, 15m, 1h, 6h, 24h

### Edit Panels
Click panel title → **Edit** → Modify query/visualization → **Apply**

### Add Alerts
Edit panel → **Alert** tab → **Create alert rule**

---

## Dashboard URL
Once imported, access at:
```
http://localhost:3001/d/signup-overview/signup-service-overview
```

---

## Export Dashboard
To backup or share:
1. Open dashboard
2. Click **⚙️** (settings) icon (top-right)
3. **JSON Model** → Copy
4. Save to file

---

**Created:** 2025-12-01  
**Version:** 1.0  
**Datasource:** Prometheus (PBFA97CFB590B2093)
