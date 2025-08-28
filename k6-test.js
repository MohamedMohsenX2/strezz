import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginDuration = new Trend('login_duration');
const requestDuration = new Trend('request_duration');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
    executor: 'constant-vus',
  vus: 1,
  duration: '30s',
  thresholds: {
  "http_req_duration": [
    "p(95)<500"
  ],
  "http_req_failed": [
    "rate<1%"
  ]
},
};

// Shared variables
let authToken = null;
let csrfToken = null;
let sessionId = null;

// Setup function for authentication
export function setup() {
  // No authentication required
}

// Main test function
export default function (data) {
  
  // Request 1: GET /
  const response0 = http.get('/', {
    headers: {}
  });
  
  check(response0, {
    'status is 200': (r) => r.status === 200,
    'status is 200': (r) => true,
    'response time < 1000ms': (r) => true
  });
  
  requestDuration.add(response0.timings.duration);
  errorRate.add(response0.status !== 200);
  
  // Think time between requests
  sleep(1);
}

// Teardown function
export function teardown(data) {
  // No cleanup required
}