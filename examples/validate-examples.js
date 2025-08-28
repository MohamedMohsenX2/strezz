#!/usr/bin/env node

/**
 * Strezz Example Configuration Validator
 * Validates example configurations against the Strezz model
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TestConfig } from '../src/model/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text) {
  console.log(`\n${colorize('bright', '='.repeat(50))}`);
  console.log(colorize('cyan', text));
  console.log(`${colorize('bright', '='.repeat(50))}`);
}

function printSuccess(message) {
  console.log(`${colorize('green', '✅')} ${message}`);
}

function printWarning(message) {
  console.log(`${colorize('yellow', '⚠️')} ${message}`);
}

function printError(message) {
  console.log(`${colorize('red', '❌')} ${message}`);
}

function printInfo(message) {
  console.log(`${colorize('blue', 'ℹ️')} ${message}`);
}

// Example configurations to validate
const examples = [
  'laravel-ecommerce.json',
  'yii-cms.json',
  'generic-api.json'
];

// Validation functions
function validateTarget(target) {
  const issues = [];
  
  if (!target.url) {
    issues.push('Missing target URL');
  }
  
  if (!target.baseURL) {
    issues.push('Missing base URL');
  }
  
  if (!target.framework) {
    issues.push('Missing framework specification');
  }
  
  return issues;
}

function validateScenarios(scenarios) {
  const issues = [];
  
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    issues.push('No scenarios defined');
    return issues;
  }
  
  scenarios.forEach((scenario, index) => {
    if (!scenario.name) {
      issues.push(`Scenario ${index + 1}: Missing name`);
    }
    
    if (!scenario.executor) {
      issues.push(`Scenario ${index + 1}: Missing executor`);
    }
    
    if (scenario.executor === 'ramping-vus' && !scenario.stages) {
      issues.push(`Scenario ${index + 1}: Ramping VUs requires stages`);
    }
    
    if (scenario.executor === 'constant-vus' && (!scenario.vus || !scenario.duration)) {
      issues.push(`Scenario ${index + 1}: Constant VUs requires vus and duration`);
    }
  });
  
  return issues;
}

function validateAuth(auth) {
  const issues = [];
  
  if (!auth.type) {
    issues.push('Missing authentication type');
    return issues;
  }
  
  const validTypes = ['sanctum', 'jwt', 'csrf', 'session', 'none'];
  if (!validTypes.includes(auth.type)) {
    issues.push(`Invalid authentication type: ${auth.type}`);
  }
  
  if (auth.type !== 'none' && !auth.endpoints) {
    issues.push('Authentication endpoints required for authenticated requests');
  }
  
  return issues;
}

function validateRequests(requests) {
  const issues = [];
  
  if (!Array.isArray(requests)) {
    issues.push('Requests must be an array');
    return issues;
  }
  
  requests.forEach((request, index) => {
    if (!request.name) {
      issues.push(`Request ${index + 1}: Missing name`);
    }
    
    if (!request.method) {
      issues.push(`Request ${index + 1}: Missing HTTP method`);
    }
    
    if (!request.path) {
      issues.push(`Request ${index + 1}: Missing path`);
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (request.method && !validMethods.includes(request.method.toUpperCase())) {
      issues.push(`Request ${index + 1}: Invalid HTTP method: ${request.method}`);
    }
    
    if (request.body && request.method === 'GET') {
      issues.push(`Request ${index + 1}: GET requests should not have body`);
    }
  });
  
  return issues;
}

function validateThresholds(thresholds) {
  const issues = [];
  
  if (!thresholds) {
    return issues; // Thresholds are optional
  }
  
  if (thresholds.http_req_duration) {
    if (!Array.isArray(thresholds.http_req_duration)) {
      issues.push('HTTP request duration thresholds must be an array');
    }
  }
  
  if (thresholds.http_req_failed) {
    if (!Array.isArray(thresholds.http_req_failed)) {
      issues.push('HTTP request failed thresholds must be an array');
    }
  }
  
  return issues;
}

function validateConfiguration(config, filename) {
  console.log(`\n${colorize('bright', 'Validating:')} ${colorize('cyan', filename)}`);
  
  const issues = [];
  
  // Validate target
  if (config.target) {
    const targetIssues = validateTarget(config.target);
    issues.push(...targetIssues.map(issue => `Target: ${issue}`));
  } else {
    issues.push('Missing target configuration');
  }
  
  // Validate scenarios
  if (config.scenarios) {
    const scenarioIssues = validateScenarios(config.scenarios);
    issues.push(...scenarioIssues.map(issue => `Scenarios: ${issue}`));
  } else {
    issues.push('Missing scenarios configuration');
  }
  
  // Validate authentication
  if (config.auth) {
    const authIssues = validateAuth(config.auth);
    issues.push(...authIssues.map(issue => `Auth: ${issue}`));
  }
  
  // Validate requests
  if (config.requests) {
    const requestIssues = validateRequests(config.requests);
    issues.push(...requestIssues.map(issue => `Requests: ${issue}`));
  }
  
  // Validate thresholds
  if (config.thresholds) {
    const thresholdIssues = validateThresholds(config.thresholds);
    issues.push(...thresholdIssues.map(issue => `Thresholds: ${issue}`));
  }
  
  // Validate tags
  if (config.tags && typeof config.tags !== 'object') {
    issues.push('Tags must be an object');
  }
  
  // Validate output
  if (config.output && typeof config.output !== 'object') {
    issues.push('Output must be an object');
  }
  
  // Validate observability
  if (config.observability && typeof config.observability !== 'object') {
    issues.push('Observability must be an object');
  }
  
  // Report results
  if (issues.length === 0) {
    printSuccess('Configuration is valid');
    return true;
  } else {
    printError(`Configuration has ${issues.length} issue(s):`);
    issues.forEach(issue => {
      console.log(`  ${colorize('red', '•')} ${issue}`);
    });
    return false;
  }
}

function testModelCreation(config, filename) {
  try {
    const testConfig = new TestConfig(config);
    printSuccess('Successfully created TestConfig instance');
    
    // Test validation
    try {
      testConfig.validate();
      printSuccess('Configuration passes model validation');
      return true;
    } catch (error) {
      printError(`Model validation failed: ${error.message}`);
      return false;
    }
  } catch (error) {
    printError(`Failed to create TestConfig: ${error.message}`);
    return false;
  }
}

async function main() {
  printHeader('Strezz Example Configuration Validator');
  
  let totalValid = 0;
  let totalInvalid = 0;
  
  for (const example of examples) {
    const filepath = join(__dirname, example);
    
    try {
      // Read and parse configuration
      const fileContent = readFileSync(filepath, 'utf8');
      const config = JSON.parse(fileContent);
      
      // Validate basic structure
      const isValid = validateConfiguration(config, example);
      
      // Test model creation and validation
      const modelValid = testModelCreation(config, example);
      
      if (isValid && modelValid) {
        totalValid++;
      } else {
        totalInvalid++;
      }
      
      // Show configuration summary
      printInfo(`Configuration Summary:`);
      console.log(`  Target: ${config.target?.framework || 'Unknown'} (${config.target?.url || 'No URL'})`);
      console.log(`  Scenarios: ${config.scenarios?.length || 0}`);
      console.log(`  Requests: ${config.requests?.length || 0}`);
      console.log(`  Auth Type: ${config.auth?.type || 'None'}`);
      console.log(`  Thresholds: ${config.thresholds ? 'Configured' : 'Default'}`);
      
    } catch (error) {
      printError(`Failed to process ${example}: ${error.message}`);
      totalInvalid++;
    }
  }
  
  // Summary
  printHeader('Validation Summary');
  console.log(`${colorize('green', `Valid: ${totalValid}`)}`);
  console.log(`${colorize('red', `Invalid: ${totalInvalid}`)}`);
  console.log(`${colorize('cyan', `Total: ${examples.length}`)}`);
  
  if (totalInvalid === 0) {
    printSuccess('All example configurations are valid! 🎉');
  } else {
    printWarning('Some configurations have issues that need to be fixed.');
  }
  
  console.log('\nNext steps:');
  console.log('  1. Fix any validation issues');
  console.log('  2. Test configurations with real applications');
  console.log('  3. Customize for your specific use case');
}

// Run validation
main().catch(error => {
  printError(`Validation failed: ${error.message}`);
  process.exit(1);
});
