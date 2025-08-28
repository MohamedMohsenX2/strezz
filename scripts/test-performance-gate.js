#!/usr/bin/env node

/**
 * Test script for Performance Gate Utility
 * 
 * This script demonstrates how to use the performance gate utility
 * with sample k6 results data.
 */

import { writeFileSync } from 'fs';

// Sample k6 results data
const sampleResults = {
  "metrics": {
    "http_req_duration": {
      "values": {
        "p95": 1250,
        "avg": 800,
        "max": 3000
      }
    },
    "http_req_failed": {
      "values": {
        "rate": 0.02,
        "count": 4
      }
    },
    "http_reqs": {
      "values": {
        "rate": 45.5,
        "count": 200
      }
    }
  }
};

// Sample baseline results for regression detection
const baselineResults = {
  "metrics": {
    "http_req_duration": {
      "values": {
        "p95": 1000,
        "avg": 600,
        "max": 2500
      }
    },
    "http_req_failed": {
      "values": {
        "rate": 0.01,
        "count": 2
      }
    },
    "http_reqs": {
      "values": {
        "rate": 50.0,
        "count": 200
      }
    }
  }
};

// Create test files
console.log('🧪 Creating test files for Performance Gate Utility...');

try {
  // Write sample results
  writeFileSync('test-results.json', JSON.stringify(sampleResults, null, 2));
  console.log('✅ Created test-results.json');
  
  // Write baseline results
  writeFileSync('baseline-results.json', JSON.stringify(baselineResults, null, 2));
  console.log('✅ Created baseline-results.json');
  
  console.log('\n📋 Test files created successfully!');
  console.log('\n🚀 Now you can test the Performance Gate Utility:');
  console.log('\n# Basic validation:');
  console.log('node scripts/performance-gate.js \\');
  console.log('  --results test-results.json \\');
  console.log('  --config .github/performance-gates.yml \\');
  console.log('  --scenario load');
  
  console.log('\n# With regression detection:');
  console.log('node scripts/performance-gate.js \\');
  console.log('  --results test-results.json \\');
  console.log('  --config .github/performance-gates.yml \\');
  console.log('  --scenario load \\');
  console.log('  --baseline baseline-results.json');
  
  console.log('\n# JSON output format:');
  console.log('node scripts/performance-gate.js \\');
  console.log('  --results test-results.json \\');
  console.log('  --config .github/performance-gates.yml \\');
  console.log('  --scenario load \\');
  console.log('  --output json');
  
  console.log('\n# Markdown output format:');
  console.log('node scripts/performance-gate.js \\');
  console.log('  --results test-results.json \\');
  console.log('  --config .github/performance-gates.yml \\');
  console.log('  --scenario load \\');
  console.log('  --output markdown');
  
  console.log('\n🧹 Clean up test files when done:');
  console.log('rm test-results.json baseline-results.json');
  
} catch (error) {
  console.error('❌ Error creating test files:', error.message);
  process.exit(1);
}
