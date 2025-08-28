#!/usr/bin/env node

/**
 * Performance Gate Utility
 * 
 * This script validates performance test results against configured thresholds
 * and can be used in CI/CD pipelines to enforce performance gates.
 * 
 * Usage:
 *   node scripts/performance-gate.js --results results.json --config .github/performance-gates.yml --scenario smoke
 */

import { readFileSync } from 'fs';
import { Command } from 'commander';
import yaml from 'js-yaml';
import path from 'path';

const program = new Command();

program
  .name('performance-gate')
  .description('Validate performance test results against thresholds')
  .version('1.0.0')
  .requiredOption('-r, --results <file>', 'Path to k6 results JSON file')
  .requiredOption('-c, --config <file>', 'Path to performance gates configuration file')
  .requiredOption('-s, --scenario <type>', 'Test scenario type (smoke, load, stress, soak)')
  .option('-e, --environment <env>', 'Environment (development, staging, production)', 'staging')
  .option('-f, --framework <type>', 'Framework type (laravel, yii, generic)', 'generic')
  .option('--strict', 'Fail on any threshold violation', false)
  .option('--output <format>', 'Output format (json, text, markdown)', 'text')
  .option('--baseline <file>', 'Path to baseline results for regression detection')
  .parse();

const options = program.opts();

/**
 * Load and parse configuration file
 */
function loadConfig(configPath) {
  try {
    const configContent = readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    
    console.log(`📁 Loaded configuration from: ${configPath}`);
    return config;
  } catch (error) {
    console.error(`❌ Error loading configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Load and parse k6 results file
 */
function loadResults(resultsPath) {
  try {
    const resultsContent = readFileSync(resultsPath, 'utf8');
    const results = JSON.parse(resultsContent);
    
    console.log(`📁 Loaded results from: ${resultsPath}`);
    return results;
  } catch (error) {
    console.error(`❌ Error loading results: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract metrics from k6 results
 */
function extractMetrics(results) {
  const metrics = results.metrics || {};
  
  return {
    p95ResponseTime: metrics.http_req_duration?.values?.p95 || null,
    errorRate: metrics.http_req_failed?.values?.rate || null,
    requestRate: metrics.http_reqs?.values?.rate || null,
    avgResponseTime: metrics.http_req_duration?.values?.avg || null,
    maxResponseTime: metrics.http_req_duration?.values?.max || null,
    totalRequests: metrics.http_reqs?.values?.count || null,
    failedRequests: metrics.http_req_failed?.values?.count || null
  };
}

/**
 * Get thresholds for the given scenario and framework
 */
function getThresholds(config, scenario, framework, environment) {
  const global = config.global || {};
  const frameworks = config.frameworks || {};
  const scenarios = config.scenarios || {};
  
  // Get framework-specific thresholds
  const frameworkThresholds = frameworks[framework] || {};
  
  // Get environment multiplier
  const envConfig = config.environments?.[environment] || {};
  const multiplier = envConfig.thresholds_multiplier || 1.0;
  
  // Base thresholds
  const baseThresholds = {
    responseTime: frameworkThresholds.response_time?.[scenario] || global.response_time?.[scenario] || 5000,
    errorRate: frameworkThresholds.error_rate?.[scenario] || global.error_rate?.[scenario] || 5.0,
    requestRate: frameworkThresholds.request_rate?.[scenario] || global.request_rate?.[scenario] || 10
  };
  
  // Apply environment multiplier
  return {
    responseTime: Math.round(baseThresholds.responseTime * multiplier),
    errorRate: baseThresholds.errorRate * multiplier,
    requestRate: Math.round(baseThresholds.requestRate * multiplier)
  };
}

/**
 * Check if metrics meet thresholds
 */
function checkThresholds(metrics, thresholds) {
  const violations = [];
  
  // Check P95 response time
  if (metrics.p95ResponseTime !== null && metrics.p95ResponseTime > thresholds.responseTime) {
    violations.push({
      metric: 'P95 Response Time',
      actual: `${metrics.p95ResponseTime}ms`,
      threshold: `${thresholds.responseTime}ms`,
      status: 'FAILED'
    });
  }
  
  // Check error rate
  if (metrics.errorRate !== null && metrics.errorRate > thresholds.errorRate) {
    violations.push({
      metric: 'Error Rate',
      actual: `${(metrics.errorRate * 100).toFixed(2)}%`,
      threshold: `${thresholds.errorRate}%`,
      status: 'FAILED'
    });
  }
  
  // Check request rate
  if (metrics.requestRate !== null && metrics.requestRate < thresholds.requestRate) {
    violations.push({
      metric: 'Request Rate',
      actual: `${metrics.requestRate.toFixed(2)} req/s`,
      threshold: `${thresholds.requestRate} req/s`,
      status: 'FAILED'
    });
  }
  
  return violations;
}

/**
 * Detect performance regression against baseline
 */
function detectRegression(currentMetrics, baselinePath) {
  if (!baselinePath) return null;
  
  try {
    const baselineContent = readFileSync(baselinePath, 'utf8');
    const baseline = JSON.parse(baselineContent);
    const baselineMetrics = extractMetrics(baseline);
    
    const regressions = [];
    
    // Check response time regression
    if (currentMetrics.p95ResponseTime && baselineMetrics.p95ResponseTime) {
      const increase = ((currentMetrics.p95ResponseTime - baselineMetrics.p95ResponseTime) / baselineMetrics.p95ResponseTime) * 100;
      if (increase > 20) { // 20% increase threshold
        regressions.push({
          metric: 'P95 Response Time',
          baseline: `${baselineMetrics.p95ResponseTime}ms`,
          current: `${currentMetrics.p95ResponseTime}ms`,
          increase: `${increase.toFixed(1)}%`,
          status: 'REGRESSION'
        });
      }
    }
    
    // Check error rate regression
    if (currentMetrics.errorRate && baselineMetrics.errorRate) {
      const increase = ((currentMetrics.errorRate - baselineMetrics.errorRate) / baselineMetrics.errorRate) * 100;
      if (increase > 50) { // 50% increase threshold
        regressions.push({
          metric: 'Error Rate',
          baseline: `${(baselineMetrics.errorRate * 100).toFixed(2)}%`,
          current: `${(currentMetrics.errorRate * 100).toFixed(2)}%`,
          increase: `${increase.toFixed(1)}%`,
          status: 'REGRESSION'
        });
      }
    }
    
    return regressions;
  } catch (error) {
    console.warn(`⚠️  Could not load baseline for regression detection: ${error.message}`);
    return null;
  }
}

/**
 * Generate output in specified format
 */
function generateOutput(metrics, thresholds, violations, regressions, format) {
  switch (format) {
    case 'json':
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        scenario: options.scenario,
        environment: options.environment,
        framework: options.framework,
        metrics,
        thresholds,
        violations,
        regressions,
        passed: violations.length === 0,
        hasRegressions: regressions && regressions.length > 0
      }, null, 2);
      
    case 'markdown':
      return `# Performance Gate Results

## Summary
- **Scenario**: ${options.scenario}
- **Environment**: ${options.environment}
- **Framework**: ${options.framework}
- **Status**: ${violations.length === 0 ? '✅ PASSED' : '❌ FAILED'}

## Metrics
- **P95 Response Time**: ${metrics.p95ResponseTime ? `${metrics.p95ResponseTime}ms` : 'N/A'}
- **Error Rate**: ${metrics.errorRate ? `${(metrics.errorRate * 100).toFixed(2)}%` : 'N/A'}
- **Request Rate**: ${metrics.requestRate ? `${metrics.requestRate.toFixed(2)} req/s` : 'N/A'}

## Thresholds
- **Response Time**: < ${thresholds.responseTime}ms
- **Error Rate**: < ${thresholds.errorRate}%
- **Request Rate**: > ${thresholds.requestRate} req/s

${violations.length > 0 ? `## Violations
${violations.map(v => `- ❌ ${v.metric}: ${v.actual} (threshold: ${v.threshold})`).join('\n')}` : '## Violations\n- ✅ All thresholds met'}

${regressions && regressions.length > 0 ? `## Regressions
${regressions.map(r => `- ⚠️ ${r.metric}: ${r.current} (baseline: ${r.baseline}, increase: ${r.increase})`).join('\n')}` : ''}`;
      
    default: // text
      let output = `Performance Gate Results\n`;
      output += `=====================\n\n`;
      output += `Scenario: ${options.scenario}\n`;
      output += `Environment: ${options.environment}\n`;
      output += `Framework: ${options.framework}\n`;
      output += `Status: ${violations.length === 0 ? 'PASSED' : 'FAILED'}\n\n`;
      
      output += `Metrics:\n`;
      output += `  P95 Response Time: ${metrics.p95ResponseTime ? `${metrics.p95ResponseTime}ms` : 'N/A'}\n`;
      output += `  Error Rate: ${metrics.errorRate ? `${(metrics.errorRate * 100).toFixed(2)}%` : 'N/A'}\n`;
      output += `  Request Rate: ${metrics.requestRate ? `${metrics.requestRate.toFixed(2)} req/s` : 'N/A'}\n\n`;
      
      output += `Thresholds:\n`;
      output += `  Response Time: < ${thresholds.responseTime}ms\n`;
      output += `  Error Rate: < ${thresholds.errorRate}%\n`;
      output += `  Request Rate: > ${thresholds.requestRate} req/s\n\n`;
      
      if (violations.length > 0) {
        output += `Violations:\n`;
        violations.forEach(v => {
          output += `  ❌ ${v.metric}: ${v.actual} (threshold: ${v.threshold})\n`;
        });
        output += `\n`;
      } else {
        output += `✅ All thresholds met\n\n`;
      }
      
      if (regressions && regressions.length > 0) {
        output += `Regressions:\n`;
        regressions.forEach(r => {
          output += `  ⚠️ ${r.metric}: ${r.current} (baseline: ${r.baseline}, increase: ${r.increase})\n`;
        });
        output += `\n`;
      }
      
      return output;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Performance Gate Validation');
  console.log('==============================\n');
  
  // Load configuration and results
  const config = loadConfig(options.config);
  const results = loadResults(options.results);
  
  // Extract metrics
  const metrics = extractMetrics(results);
  console.log('📊 Extracted metrics:');
  console.log(`  P95 Response Time: ${metrics.p95ResponseTime ? `${metrics.p95ResponseTime}ms` : 'N/A'}`);
  console.log(`  Error Rate: ${metrics.errorRate ? `${(metrics.errorRate * 100).toFixed(2)}%` : 'N/A'}`);
  console.log(`  Request Rate: ${metrics.requestRate ? `${metrics.requestRate.toFixed(2)} req/s` : 'N/A'}`);
  console.log('');
  
  // Get thresholds
  const thresholds = getThresholds(config, options.scenario, options.framework, options.environment);
  console.log('🎯 Thresholds:');
  console.log(`  Response Time: < ${thresholds.responseTime}ms`);
  console.log(`  Error Rate: < ${thresholds.errorRate}%`);
  console.log(`  Request Rate: > ${thresholds.requestRate} req/s`);
  console.log('');
  
  // Check thresholds
  const violations = checkThresholds(metrics, thresholds);
  
  // Detect regressions
  const regressions = detectRegression(metrics, options.baseline);
  
  // Generate output
  const output = generateOutput(metrics, thresholds, violations, regressions, options.output);
  console.log(output);
  
  // Exit with appropriate code
  if (violations.length > 0) {
    console.log('\n❌ Performance gate failed');
    process.exit(options.strict ? 1 : 0);
  } else {
    console.log('\n✅ Performance gate passed');
    process.exit(0);
  }
}

// Run main function
main().catch(error => {
  console.error(`❌ Performance gate failed: ${error.message}`);
  process.exit(1);
});
