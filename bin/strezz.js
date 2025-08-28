#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import main from '../src/index.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('strezz')
  .description('Generate performance test scripts for web applications')
  .version('0.1.1')
  .option('-t, --target <url>', 'Target URL to test', process.env.TARGET_URL)
  .option(
    '-f, --framework <type>',
    'Target framework (laravel|yii|generic)',
    process.env.TARGET_FRAMEWORK || 'generic'
  )
  .option(
    '-a, --auth <type>',
    'Authentication type (sanctum|jwt|session|csrf)',
    process.env.TARGET_AUTH || 'none'
  )
  .option('-s, --scenario <type>', 'Test scenario (smoke|load|stress|spike|soak)', 'smoke')
  .option('-b, --backend <type>', 'Backend type (k6|locust)', 'k6')
  .option('-o, --output <dir>', 'Output directory', process.env.OUTPUT_DIR || 'dist/')
  .option('-c, --config <file>', 'Configuration file', 'strezz.config.json')
  .option('--vus <number>', 'Number of virtual users', process.env.K6_VUS || '10')
  .option('--duration <time>', 'Test duration', process.env.K6_DURATION || '30s')
  .option('--debug', 'Enable debug mode', false)
  .option('--dry-run', 'Show what would be generated without writing files', false)
  .option('--list-backends', 'List available backends', false)
  .option('--compare-backends', 'Compare backend features', false);

program.parse();

const options = program.opts();

// Load configuration file if specified
let configData = null;
if (options.config && options.config !== 'strezz.config.json') {
  try {
    const configPath = join(process.cwd(), options.config);
    const configContent = readFileSync(configPath, 'utf8');
    configData = JSON.parse(configContent);
    console.log(`📁 Loaded configuration from: ${options.config}`);
  } catch (error) {
    console.error(`Error loading configuration file: ${error.message}`);
    process.exit(1);
  }
}

// Set environment variables from CLI options or config file
if (options.target) {
  process.env.TARGET_URL = options.target;
} else if (configData?.target?.url) {
  process.env.TARGET_URL = configData.target.url;
}

if (options.framework) {
  process.env.TARGET_FRAMEWORK = options.framework;
} else if (configData?.target?.framework) {
  process.env.TARGET_FRAMEWORK = configData.target.framework;
}

if (options.auth) {
  process.env.TARGET_AUTH = options.auth;
} else if (configData?.auth?.type) {
  process.env.TARGET_AUTH = configData.auth.type;
}

if (options.vus) {
  process.env.K6_VUS = options.vus;
}

if (options.duration) {
  process.env.K6_DURATION = options.duration;
}

// Enable debug mode
if (options.debug) {
  process.env.DEBUG = 'true';
  console.log('Debug mode enabled');
  console.log('Options:', options);
  if (configData) {
    console.log('Config data:', JSON.stringify(configData, null, 2));
  }
}

// Handle backend listing
if (options.listBackends) {
  try {
    const { default: backendManager } = await import('../src/backends/index.js');
    const backends = backendManager.getBackendNames();
    console.log('Available backends:');
    backends.forEach(name => {
      const info = backendManager.getBackendInfo(name);
      const status = info.deprecated ? '(DEPRECATED)' : info.recommended ? '(RECOMMENDED)' : '';
      console.log(`  ${name} ${status}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing backends:', error.message);
    process.exit(1);
  }
}

// Handle backend comparison
if (options.compareBackends) {
  try {
    const { default: backendManager } = await import('../src/backends/index.js');
    const comparison = backendManager.getBackendComparison();
    
    console.log('Backend Comparison:');
    console.log('==================');
    
    Object.entries(comparison).forEach(([name, info]) => {
      console.log(`\n${name.toUpperCase()} ${info.deprecated ? '(DEPRECATED)' : info.recommended ? '(RECOMMENDED)' : ''}`);
      console.log(`  File Extension: ${info.extension}`);
      console.log(`  Executors: ${info.features.executors?.join(', ') || 'N/A'}`);
      console.log(`  Auth Types: ${info.features.auth?.join(', ') || 'N/A'}`);
      console.log(`  Frameworks: ${info.features.frameworks?.join(', ') || 'N/A'}`);
      console.log(`  Tags: ${info.features.tags ? 'Yes' : 'No'}`);
      console.log(`  Checks: ${info.features.checks ? 'Yes' : 'No'}`);
      console.log(`  Thresholds: ${info.features.thresholds ? 'Yes' : 'No'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error comparing backends:', error.message);
    process.exit(1);
  }
}

// Validate required options
if (!process.env.TARGET_URL) {
  console.error(
    'Error: Target URL is required. Use --target, --config, or set TARGET_URL environment variable.'
  );
  process.exit(1);
}

console.log(`Strezz v${program.version()}`);
console.log(`Target: ${process.env.TARGET_URL}`);
console.log(`Framework: ${process.env.TARGET_FRAMEWORK}`);
console.log(`Backend: ${options.backend}`);
console.log(`Scenario: ${options.scenario}`);

// Run main function
if (options.dryRun) {
  console.log('Dry run mode - no files will be written');
  console.log('Configuration would generate tests for:', process.env.TARGET_URL);
} else {
  main().catch(error => {
    console.error('Error running Strezz:', error.message);
    process.exit(1);
  });
}
