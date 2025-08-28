#!/usr/bin/env node

import dotenv from 'dotenv';
import backendManager from './backends/index.js';
import { TestConfig } from './model/index.js';

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
const main = async () => {
  try {
    const targetUrl = process.env.TARGET_URL || process.env.url;
    const backendType = process.env.BACKEND_TYPE || 'k6';
    const framework = process.env.TARGET_FRAMEWORK || 'generic';
    const authType = process.env.TARGET_AUTH || 'none';
    const scenarioType = process.env.SCENARIO_TYPE || 'smoke';
    
    if (!targetUrl) {
      console.error('Error: TARGET_URL or url environment variable is required');
      process.exit(1);
    }
    
    console.log(`Starting Strezz test generation for: ${targetUrl}`);
    console.log(`Backend: ${backendType}`);
    console.log(`Framework: ${framework}`);
    console.log(`Auth: ${authType}`);
    console.log(`Scenario: ${scenarioType}`);
    
    // Create test configuration using our new model system
    const testConfig = createTestConfig(targetUrl, framework, authType, scenarioType);
    
    // Generate test with specified backend
    const result = backendManager.generateTest(backendType, testConfig);
    
    console.log(`Generated ${result.backend} test script`);
    console.log(`Filename: ${result.filename}`);
    console.log(`Features: ${Object.keys(result.features).join(', ')}`);
    
    // Write file to disk
    const fs = await import('fs/promises');
    await fs.writeFile(result.filename, result.script, 'utf8');
    
    console.log(`${result.backend.toUpperCase()} test file generated successfully`);
    
    // Show run instructions
    if (result.backend === 'k6') {
      console.log(`Run with: k6 run ${result.filename}`);
    } else if (result.backend === 'locust') {
      console.log(`Run with: locust -f ${result.filename} --host=${targetUrl}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

/**
 * Create test configuration using our new model system
 */
const createTestConfig = (targetUrl, framework, authType, scenarioType) => {
  // Get scenario preset
  const scenarioPreset = getScenarioPreset(scenarioType);
  
  // Get auth endpoints
  const authEndpoints = getAuthEndpoints(authType);
  
  // Create test configuration
  const config = {
    target: {
      url: targetUrl,
      baseURL: targetUrl,
      framework
    },
    scenarios: [scenarioPreset],
    auth: {
      type: authType,
      endpoints: authEndpoints
    },
    requests: [
      {
        method: 'GET',
        path: '/',
        description: 'Homepage test',
        checks: [
          'status is 200',
          'response time < 1000ms'
        ]
      }
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<1%']
    },
    tags: {
      environment: 'test',
      service: 'demo'
    }
  };
  
  return new TestConfig(config);
};

/**
 * Get scenario preset based on type
 */
const getScenarioPreset = (scenarioType) => {
  const presets = {
    smoke: {
      name: 'smoke',
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      description: 'Basic functionality verification'
    },
    load: {
      name: 'load',
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 0 }
      ],
      description: 'Load testing with gradual ramp-up'
    },
    stress: {
      name: 'stress',
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 0 }
      ],
      description: 'Stress testing with higher concurrency'
    },
    spike: {
      name: 'spike',
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 }
      ],
      description: 'Spike testing for traffic bursts'
    },
    soak: {
      name: 'soak',
      executor: 'constant-vus',
      vus: 10,
      duration: '30m',
      description: 'Long-running soak test'
    }
  };
  
  return presets[scenarioType] || presets.smoke;
};

/**
 * Get authentication endpoints based on type
 */
const getAuthEndpoints = (authType) => {
  const endpoints = {
    sanctum: {
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    },
    jwt: {
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh'
    },
    csrf: {
      csrf: '/site/csrf',
      login: '/site/login',
      logout: '/site/logout'
    },
    session: {
      login: '/login',
      logout: '/logout'
    },
    none: {}
  };
  
  return endpoints[authType] || endpoints.none;
};

// Run main function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error running Strezz:', error.message);
    process.exit(1);
  });
}

export default main;
