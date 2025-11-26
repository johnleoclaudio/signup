#!/bin/bash
echo "Testing POST /signup endpoint..."
echo ""
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "'"$(date +%s)@example.com"'", "first_name": "Test", "last_name": "User"}' \
  -w "\nHTTP Status: %{http_code}\n"
