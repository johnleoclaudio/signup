import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Stress test - Push the system to its limits
export const options = {
  stages: [
    { duration: '1m', target: 300 },   // Ramp to 100 users
    { duration: '2m', target: 500 },   // Ramp to 200 users
    { duration: '3m', target: 1500 },   // Ramp to 500 users (stress)
    { duration: '2m', target: 3000 },  // Ramp to 1000 users (breaking point)
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s (more lenient)
    http_req_failed: ['rate<0.3'],     // Less than 30% errors
    errors: ['rate<0.3'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://host.docker.internal:3000';

function generateEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `stress${timestamp}${random}@test.com`;
}

function generateName() {
  const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
  const lastNames = ['Anderson', 'Baker', 'Clark', 'Davis', 'Evans', 'Ford', 'Gray', 'Hall', 'Irwin', 'James'];
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
  };
}

export default function () {
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
    timeout: '10s', // Longer timeout for stress test
  };

  const response = http.post(`${BASE_URL}/signup`, payload, params);

  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'has valid response': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user || body.message;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);

  // Shorter sleep for stress test
  sleep(0.5);
}

export function setup() {
  console.log('Starting STRESS test - pushing system to limits...');
  console.log(`Target URL: ${BASE_URL}/signup`);
  console.log('Target: Up to 1000 concurrent users');
  
  const testResponse = http.get(`${BASE_URL}/`);
  if (testResponse.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }
}

export function teardown(data) {
  console.log('Stress test completed!');
  console.log('Check metrics to see where the system started degrading.');
}
