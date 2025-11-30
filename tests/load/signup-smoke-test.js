import http from 'k6/http';
import { check, sleep } from 'k6';

// Smoke test configuration - just verify the endpoint works
export const options = {
  vus: 5,                // 5 virtual users
  duration: '30s',       // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.1'],     // Less than 10% errors
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://host.docker.internal:3000';

function generateEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `smoke${timestamp}${random}@test.com`;
}

export default function () {
  const payload = JSON.stringify({
    email: generateEmail(),
    first_name: 'Smoke',
    last_name: 'Test',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}/signup`, payload, params);

  check(response, {
    'status is 201': (r) => r.status === 201,
    'has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.id;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}

export function setup() {
  console.log('Running smoke test...');
  const testResponse = http.get(`${BASE_URL}/`);
  if (testResponse.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL}`);
  }
}
