import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },    // Ramp up to 50 users over 1m
    { duration: '2m', target: 100 },   // Ramp up to 100 users over 2m
    { duration: '1m', target: 100 },   // Stay at 100 users for 1m
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],    // Error rate should be less than 5%
    errors: ['rate<0.05'],             // Custom error rate should be less than 5%
  },
};

// Base URL - can be overridden with K6_BASE_URL env var
const BASE_URL = __ENV.K6_BASE_URL || 'http://host.docker.internal:3000';

// Generate random email
function generateEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `user${timestamp}${random}@loadtest.com`;
}

// Generate random name
function generateName() {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Anna'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
  };
}

export default function () {
  // Generate test data
  const { firstName, lastName } = generateName();
  const email = generateEmail();
  
  const payload = JSON.stringify({
    email: email,
    first_name: firstName,
    last_name: lastName,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Make POST request to /signup
  const response = http.post(`${BASE_URL}/signup`, payload, params);

  // Check response
  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'response has user': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.email === email;
      } catch (e) {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Track errors
  errorRate.add(!success);

  // Optional: Log failed requests
  if (!success) {
    console.log(`Failed request: ${response.status} - ${response.body}`);
  }

  // Simulate user think time
  sleep(1);
}

// Setup function (runs once before the test)
export function setup() {
  console.log('Starting load test...');
  console.log(`Target URL: ${BASE_URL}/signup`);
  
  // Test connection
  const testResponse = http.get(`${BASE_URL}/`);
  if (testResponse.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }
  
  console.log('Server is reachable. Starting test...');
}

// Teardown function (runs once after the test)
export function teardown(data) {
  console.log('Load test completed!');
}
