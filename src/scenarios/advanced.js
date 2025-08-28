/**
 * Advanced Test Scenarios
 * 
 * This module provides advanced test scenario configurations for complex
 * performance testing scenarios including distributed testing, chaos engineering,
 * and advanced load patterns.
 */

import { TestConfig } from '../models/test-config.js';

/**
 * Chaos Engineering Scenarios
 */
export const chaosScenarios = {
  /**
   * Network latency injection
   */
  networkLatency: {
    name: 'Network Latency Chaos',
    description: 'Inject network latency to test application resilience',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 10 }, // Normal load
      { duration: '2m', target: 10 }, // Latency injection
      { duration: '2m', target: 10 }, // Recovery
      { duration: '1m', target: 0 }
    ],
    gracefulRampDown: '30s',
    chaos: {
      type: 'network-latency',
      latency: '100ms',
      jitter: '50ms',
      duration: '2m'
    }
  },

  /**
   * Service degradation simulation
   */
  serviceDegradation: {
    name: 'Service Degradation',
    description: 'Simulate service degradation and recovery',
    executor: 'constant-vus',
    vus: 20,
    duration: '10m',
    chaos: {
      type: 'service-degradation',
      target: 'database',
      degradation: 'slowdown',
      factor: 3,
      duration: '3m',
      recovery: '2m'
    }
  },

  /**
   * Memory pressure testing
   */
  memoryPressure: {
    name: 'Memory Pressure',
    description: 'Test application under memory pressure',
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 100,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 }, // Memory pressure
      { duration: '2m', target: 50 },  // Recovery
      { duration: '1m', target: 0 }
    ],
    chaos: {
      type: 'memory-pressure',
      target: 'application',
      pressure: 'high',
      duration: '3m'
    }
  }
};

/**
 * Distributed Testing Scenarios
 */
export const distributedScenarios = {
  /**
   * Multi-region load testing
   */
  multiRegion: {
    name: 'Multi-Region Load Test',
    description: 'Distribute load across multiple regions',
    executor: 'distributed',
    regions: [
      { name: 'us-east-1', weight: 40 },
      { name: 'eu-west-1', weight: 30 },
      { name: 'ap-southeast-1', weight: 30 }
    ],
    totalVUs: 100,
    duration: '15m',
    distribution: {
      type: 'weighted',
      strategy: 'round-robin'
    }
  },

  /**
   * Canary deployment testing
   */
  canaryDeployment: {
    name: 'Canary Deployment Test',
    description: 'Test new deployment with gradual traffic shift',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },   // 10% traffic to new version
      { duration: '3m', target: 25 },   // 25% traffic
      { duration: '3m', target: 50 },   // 50% traffic
      { duration: '3m', target: 75 },   // 75% traffic
      { duration: '2m', target: 100 },  // 100% traffic
      { duration: '2m', target: 0 }
    ],
    canary: {
      version: 'v2.0.0',
      trafficShift: 'gradual',
      healthCheck: true,
      rollbackThreshold: 0.05
    }
  },

  /**
   * Blue-green deployment testing
   */
  blueGreenDeployment: {
    name: 'Blue-Green Deployment',
    description: 'Test blue-green deployment strategy',
    executor: 'constant-vus',
    vus: 50,
    duration: '20m',
    deployment: {
      type: 'blue-green',
      blue: { url: 'https://blue.example.com', weight: 100 },
      green: { url: 'https://green.example.com', weight: 0 },
      switchover: '10m',
      healthCheck: true,
      rollback: true
    }
  }
};

/**
 * Advanced Load Patterns
 */
export const advancedLoadPatterns = {
  /**
   * Burst traffic pattern
   */
  burstTraffic: {
    name: 'Burst Traffic Pattern',
    description: 'Simulate burst traffic scenarios',
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 100,
    maxVUs: 200,
    stages: [
      { duration: '1m', target: 10 },   // Normal load
      { duration: '30s', target: 200 }, // Burst
      { duration: '2m', target: 200 },  // Sustained burst
      { duration: '1m', target: 10 },   // Return to normal
      { duration: '30s', target: 0 }
    ]
  },

  /**
   * Spike testing
   */
  spikeTesting: {
    name: 'Spike Testing',
    description: 'Test application response to sudden traffic spikes',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 10 },   // Baseline
      { duration: '30s', target: 100 }, // Spike
      { duration: '1m', target: 100 },  // Hold spike
      { duration: '30s', target: 10 },  // Return to baseline
      { duration: '1m', target: 0 }
    ]
  },

  /**
   * Soak testing with gradual increase
   */
  soakGradual: {
    name: 'Soak Testing - Gradual',
    description: 'Long-term stability test with gradual load increase',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10m', target: 10 },  // Warm-up
      { duration: '30m', target: 25 },  // Low load
      { duration: '30m', target: 50 },  // Medium load
      { duration: '30m', target: 75 },  // High load
      { duration: '30m', target: 100 }, // Peak load
      { duration: '10m', target: 0 }    // Cool-down
    ],
    gracefulRampDown: '2m'
  },

  /**
   * Stress testing with recovery
   */
  stressWithRecovery: {
    name: 'Stress Testing with Recovery',
    description: 'Test breaking point and recovery',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 50 },   // Normal load
      { duration: '10m', target: 100 }, // Stress load
      { duration: '5m', target: 150 },  // High stress
      { duration: '5m', target: 200 },  // Breaking point
      { duration: '10m', target: 50 },  // Recovery
      { duration: '5m', target: 0 }     // Cool-down
    ]
  }
};

/**
 * Business Logic Scenarios
 */
export const businessLogicScenarios = {
  /**
   * User journey simulation
   */
  userJourney: {
    name: 'User Journey Simulation',
    description: 'Simulate complete user journeys',
    executor: 'per-vu-iterations',
    vus: 20,
    iterations: 10,
    maxDuration: '30m',
    userJourney: {
      type: 'e-commerce',
      steps: [
        'homepage',
        'product-browse',
        'product-detail',
        'add-to-cart',
        'checkout',
        'payment',
        'confirmation'
      ],
      thinkTime: {
        min: '2s',
        max: '10s'
      },
      dataVariation: true
    }
  },

  /**
   * API dependency testing
   */
  apiDependency: {
    name: 'API Dependency Testing',
    description: 'Test application with external API dependencies',
    executor: 'constant-vus',
    vus: 30,
    duration: '15m',
    dependencies: {
      external: [
        'payment-gateway',
        'email-service',
        'analytics-service'
      ],
      mock: [
        'third-party-api'
      ],
      circuitBreaker: true,
      fallback: true
    }
  },

  /**
   * Database performance testing
   */
  databasePerformance: {
    name: 'Database Performance',
    description: 'Test database performance under load',
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 20 },   // Light load
      { duration: '10m', target: 50 },  // Medium load
      { duration: '10m', target: 100 }, // Heavy load
      { duration: '5m', target: 0 }
    ],
    database: {
      type: 'postgresql',
      connectionPool: 50,
      slowQueryThreshold: '1s',
      monitoring: true
    }
  }
};

/**
 * Create advanced test configuration
 */
export function createAdvancedTestConfig(baseConfig, scenarioType, scenarioName) {
  const config = new TestConfig({
    ...baseConfig,
    scenarios: {
      [scenarioName]: {
        ...baseConfig.scenarios[scenarioName],
        ...getScenarioConfig(scenarioType, scenarioName)
      }
    }
  });

  return config;
}

/**
 * Get scenario configuration by type and name
 */
function getScenarioConfig(type, name) {
  switch (type) {
    case 'chaos':
      return chaosScenarios[name] || {};
    case 'distributed':
      return distributedScenarios[name] || {};
    case 'advanced-load':
      return advancedLoadPatterns[name] || {};
    case 'business-logic':
      return businessLogicScenarios[name] || {};
    default:
      return {};
  }
}

/**
 * Validate advanced scenario configuration
 */
export function validateAdvancedScenario(config) {
  const errors = [];

  // Check for required chaos configuration
  if (config.chaos) {
    if (!config.chaos.type) {
      errors.push('Chaos scenario must specify type');
    }
    if (!config.chaos.duration) {
      errors.push('Chaos scenario must specify duration');
    }
  }

  // Check for required distributed configuration
  if (config.regions) {
    if (!Array.isArray(config.regions) || config.regions.length === 0) {
      errors.push('Distributed scenario must specify regions');
    }
    if (!config.totalVUs) {
      errors.push('Distributed scenario must specify totalVUs');
    }
  }

  // Check for required business logic configuration
  if (config.userJourney) {
    if (!config.userJourney.steps || config.userJourney.steps.length === 0) {
      errors.push('User journey must specify steps');
    }
  }

  return errors;
}

export default {
  chaosScenarios,
  distributedScenarios,
  advancedLoadPatterns,
  businessLogicScenarios,
  createAdvancedTestConfig,
  validateAdvancedScenario
};
