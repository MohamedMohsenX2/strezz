import { BaseBackend } from './base.js';

/**
 * k6 backend adapter
 * Generates ES module k6 test scripts
 */
export class K6Backend extends BaseBackend {
  constructor() {
    super();
  }

  getName() {
    return 'k6';
  }

  getSupportedFeatures() {
    return {
      executors: ['constant-vus', 'ramping-vus', 'constant-arrival-rate', 'ramping-arrival-rate'],
      auth: ['sanctum', 'jwt', 'csrf', 'session', 'none'],
      frameworks: ['laravel', 'yii', 'generic'],
      metrics: ['http_req_duration', 'http_req_failed', 'custom'],
      tags: true,
      checks: true,
      thresholds: true,
    };
  }

  validateConfig(_config) {
    // k6 supports all features
    return true;
  }

  getFileExtension() {
    return '.js';
  }

  getDefaultFilename() {
    return 'k6-test.js';
  }

  generate(config) {
    config.validate();
    
    const scenario = config.getDefaultScenario();
    const executor = scenario.toK6Executor();
    const thresholds = config.thresholds.toK6Thresholds();
    
    return this.generateK6Script(config, executor, thresholds);
  }

  /**
   * Generate k6 test script
   */
  generateK6Script(config, executor, thresholds) {
    const { target, auth, requests, tags } = config;
    
    const script = `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginDuration = new Trend('login_duration');
const requestDuration = new Trend('request_duration');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  ${this.generateExecutorOptions(executor)}
  thresholds: ${JSON.stringify(thresholds, null, 2)},
};

// Shared variables
let authToken = null;
let csrfToken = null;
let sessionId = null;

// Setup function for authentication
export function setup() {
  ${this.generateSetupFunction(auth, target)}
}

// Main test function
export default function (data) {
  ${this.generateMainFunction(requests, auth, tags)}
  
  // Think time between requests
  sleep(1);
}

// Teardown function
export function teardown(data) {
  ${this.generateTeardownFunction(auth)}
}`;

    return script;
  }

  /**
   * Generate executor options
   */
  generateExecutorOptions(executor) {
    if (executor.executor === 'constant-vus') {
      return `  executor: 'constant-vus',
  vus: ${executor.vus},
  duration: '${executor.duration}',`;
    } else if (executor.executor === 'ramping-vus') {
      return `  executor: 'ramping-vus',
  stages: ${JSON.stringify(executor.stages, null, 4)},`;
    } else if (executor.executor === 'constant-arrival-rate') {
      return `  scenarios: {
    constant_arrival_rate: {
      executor: 'constant-arrival-rate',
      rate: ${executor.rate},
      timeUnit: '${executor.timeUnit}',
      duration: '${executor.duration}',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },`;
    } else if (executor.executor === 'ramping-arrival-rate') {
      return `  scenarios: {
    ramping_arrival_rate: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '${executor.timeUnit}',
      stages: ${JSON.stringify(executor.stages, null, 4)},
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },`;
    }
    
    return `  executor: 'constant-vus',
  vus: ${executor.vus || 10},
  duration: '${executor.duration || '30s'}'`;
  }

  /**
   * Generate setup function for authentication
   */
  generateSetupFunction(auth, target) {
    if (auth.type === 'none') {
      return '// No authentication required';
    }
    
    let setup = '';
    
    if (auth.type === 'sanctum' || auth.type === 'jwt') {
      setup += `
  const loginPayload = JSON.stringify({
    email: __ENV.AUTH_USERNAME || 'test@example.com',
    password: __ENV.AUTH_PASSWORD || 'password'
  });
  
  const loginResponse = http.post('${target.baseURL}/api/auth/login', loginPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  if (loginResponse.status === 200) {
    const responseData = JSON.parse(loginResponse.body);
    authToken = responseData.token || responseData.access_token;
  }`;
    } else if (auth.type === 'csrf') {
      setup += `
  const csrfResponse = http.get('${target.baseURL}/site/csrf');
  if (csrfResponse.status === 200) {
    const html = csrfResponse.body;
    const csrfMatch = html.match(/name="_csrf" value="([^"]+)"/);
    if (csrfMatch) {
      csrfToken = csrfMatch[1];
    }
  }`;
    } else if (auth.type === 'session') {
      setup += `
  const loginPayload = JSON.stringify({
    email: __ENV.AUTH_USERNAME || 'test@example.com',
    password: __ENV.AUTH_PASSWORD || 'password'
  });
  
  const loginResponse = http.post('${target.baseURL}/login', loginPayload, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  if (loginResponse.status === 200) {
    const cookies = loginResponse.headers['Set-Cookie'];
    if (cookies) {
      sessionId = cookies.split(';')[0];
    }
  }`;
    }
    
    return setup || '// Authentication setup';
  }

  /**
   * Generate main test function
   */
  generateMainFunction(requests, auth, tags) {
    if (!requests || requests.length === 0) {
      return `
  // Example request
  const response = http.get('${tags.baseURL || 'http://localhost'}/');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  requestDuration.add(response.timings.duration);
  errorRate.add(response.status !== 200);`;
    }
    
    return requests.map((request, index) => {
      const method = request.method.toLowerCase();
      const path = request.path;
      const headers = this.generateHeaders(request.headers, auth);
      const body = request.body ? `, ${JSON.stringify(request.body, null, 2)}` : '';
      const checks = this.generateChecks(request.checks || []);
      
      return `
  // Request ${index + 1}: ${method.toUpperCase()} ${path}
  const response${index} = http.${method}('${path}'${body}, {
    headers: ${JSON.stringify(headers, null, 4)}
  });
  
  check(response${index}, {
    'status is 200': (r) => r.status === 200,
    ${checks}
  });
  
  requestDuration.add(response${index}.timings.duration);
  errorRate.add(response${index}.status !== 200);`;
    }).join('');
  }

  /**
   * Generate headers with authentication
   */
  generateHeaders(headers, auth) {
    const allHeaders = { ...headers };
    
    if (auth.type === 'sanctum' || auth.type === 'jwt') {
      allHeaders['Authorization'] = 'Bearer ${authToken}';
    }
    
    if (auth.type === 'csrf') {
      allHeaders['X-CSRF-Token'] = '${csrfToken}';
    }
    
    return allHeaders;
  }

  /**
   * Generate checks
   */
  generateChecks(checks) {
    if (!checks || checks.length === 0) {
      return "'response time < 500ms': (r) => r.timings.duration < 500";
    }
    
    return checks.map(check => {
      if (typeof check === 'string') {
        return `'${check}': (r) => true`;
      }
      return `'${check.name}': (r) => ${check.condition}`;
    }).join(',\n    ');
  }

  /**
   * Generate teardown function
   */
  generateTeardownFunction(auth) {
    if (auth.type === 'none') {
      return '// No cleanup required';
    }
    
    return `
  // Cleanup authentication
  if (authToken) {
    http.post('/api/auth/logout', null, {
      headers: {
        'Authorization': \`Bearer \${authToken}\`
      }
    });
  }`;
  }
}

export default K6Backend;
