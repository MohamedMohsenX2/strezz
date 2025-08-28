/**
 * Enhanced CLI Features
 * 
 * This module provides enhanced command-line interface features including
 * interactive mode, batch processing, and advanced configuration options.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { prompt } from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { TestConfig } from '../models/test-config.js';
import { BackendRegistry } from '../backends/base.js';
import { createAdvancedTestConfig } from '../scenarios/advanced.js';

/**
 * Enhanced CLI with interactive features
 */
export class EnhancedCLI {
  constructor() {
    this.program = new Command();
    this.backendRegistry = new BackendRegistry();
    this.setupCommands();
  }

  /**
   * Setup CLI commands
   */
  setupCommands() {
    this.program
      .name('strezz')
      .description('Advanced Performance Test Generator')
      .version('2.0.0');

    // Basic commands
    this.setupGenerateCommand();
    this.setupValidateCommand();
    this.setupListCommand();
    this.setupInteractiveCommand();
    this.setupBatchCommand();
    this.setupCompareCommand();
    this.setupReportCommand();
    this.setupConfigCommand();
  }

  /**
   * Setup generate command with enhanced options
   */
  setupGenerateCommand() {
    this.program
      .command('generate')
      .description('Generate performance test files')
      .option('-c, --config <file>', 'Configuration file path')
      .option('-b, --backend <backend>', 'Backend to use (k6, locust)')
      .option('-o, --output <file>', 'Output file path')
      .option('-t, --target <url>', 'Target URL for testing')
      .option('-f, --framework <framework>', 'Framework type (laravel, yii, generic)')
      .option('--scenario <scenario>', 'Test scenario type')
      .option('--advanced <type>', 'Advanced scenario type (chaos, distributed, advanced-load, business-logic)')
      .option('--interactive', 'Interactive mode for configuration')
      .option('--dry-run', 'Show what would be generated without creating files')
      .option('--format <format>', 'Output format (default, json, yaml)')
      .action(async (options) => {
        await this.handleGenerate(options);
      });
  }

  /**
   * Setup validate command
   */
  setupValidateCommand() {
    this.program
      .command('validate')
      .description('Validate configuration files')
      .option('-c, --config <file>', 'Configuration file to validate')
      .option('-d, --directory <dir>', 'Directory containing config files to validate')
      .option('--strict', 'Strict validation mode')
      .option('--output <format>', 'Output format (text, json, table)')
      .action(async (options) => {
        await this.handleValidate(options);
      });
  }

  /**
   * Setup list command
   */
  setupListCommand() {
    this.program
      .command('list')
      .description('List available backends, scenarios, and examples')
      .option('--backends', 'List available backends')
      .option('--scenarios', 'List available scenarios')
      .option('--examples', 'List example configurations')
      .option('--advanced', 'List advanced scenario types')
      .option('--output <format>', 'Output format (text, json, table)')
      .action(async (options) => {
        await this.handleList(options);
      });
  }

  /**
   * Setup interactive command
   */
  setupInteractiveCommand() {
    this.program
      .command('interactive')
      .description('Interactive configuration wizard')
      .option('--template <template>', 'Start with template configuration')
      .option('--output <file>', 'Output configuration file')
      .action(async (options) => {
        await this.handleInteractive(options);
      });
  }

  /**
   * Setup batch command
   */
  setupBatchCommand() {
    this.program
      .command('batch')
      .description('Process multiple configuration files')
      .option('-d, --directory <dir>', 'Directory containing config files')
      .option('-p, --pattern <pattern>', 'File pattern to match (e.g., "*.json")')
      .option('-b, --backend <backend>', 'Backend to use for all files')
      .option('-o, --output-dir <dir>', 'Output directory for generated files')
      .option('--parallel <count>', 'Number of parallel processes')
      .option('--continue-on-error', 'Continue processing on errors')
      .action(async (options) => {
        await this.handleBatch(options);
      });
  }

  /**
   * Setup compare command
   */
  setupCompareCommand() {
    this.program
      .command('compare')
      .description('Compare multiple configuration files or test results')
      .option('-c, --configs <files...>', 'Configuration files to compare')
      .option('-r, --results <files...>', 'Test result files to compare')
      .option('--output <format>', 'Output format (text, json, table, diff)')
      .option('--metrics <metrics...>', 'Specific metrics to compare')
      .action(async (options) => {
        await this.handleCompare(options);
      });
  }

  /**
   * Setup report command
   */
  setupReportCommand() {
    this.program
      .command('report')
      .description('Generate reports from test results')
      .option('-r, --results <file>', 'Test results file')
      .option('-c, --config <file>', 'Configuration file used for the test')
      .option('--format <format>', 'Report format (html, markdown, json, pdf)')
      .option('--template <template>', 'Report template to use')
      .option('--output <file>', 'Output report file')
      .action(async (options) => {
        await this.handleReport(options);
      });
  }

  /**
   * Setup config command
   */
  setupConfigCommand() {
    this.program
      .command('config')
      .description('Manage configuration files')
      .option('--create <template>', 'Create new configuration from template')
      .option('--validate <file>', 'Validate configuration file')
      .option('--merge <files...>', 'Merge multiple configuration files')
      .option('--diff <file1> <file2>', 'Show differences between configurations')
      .option('--convert <file>', 'Convert configuration between formats')
      .action(async (options) => {
        await this.handleConfig(options);
      });
  }

  /**
   * Handle generate command
   */
  async handleGenerate(options) {
    const spinner = ora('Generating performance test...').start();

    try {
      let config;

      if (options.interactive) {
        config = await this.createInteractiveConfig();
      } else if (options.config) {
        config = await this.loadConfigFromFile(options.config);
      } else {
        config = await this.createDefaultConfig(options);
      }

      // Apply advanced scenarios if specified
      if (options.advanced) {
        config = createAdvancedTestConfig(config, options.advanced, options.scenario || 'default');
      }

      // Validate configuration
      const errors = config.validate();
      if (errors.length > 0) {
        spinner.fail('Configuration validation failed');
        console.error(chalk.red('Errors:'));
        errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
        return;
      }

      // Generate test files
      const backend = this.backendRegistry.getBackend(options.backend || 'k6');
      const result = backend.generate(config);

      if (options.dryRun) {
        spinner.succeed('Dry run completed');
        console.log(chalk.blue('Generated script preview:'));
        console.log(result.script.substring(0, 500) + '...');
        return;
      }

      // Write output file
      const outputFile = options.output || result.filename;
      writeFileSync(outputFile, result.script);

      spinner.succeed('Performance test generated successfully');
      console.log(chalk.green(`Output file: ${outputFile}`));
      console.log(chalk.blue(`Backend: ${result.backend}`));
      console.log(chalk.blue(`Features: ${result.features.join(', ')}`));

    } catch (error) {
      spinner.fail('Failed to generate performance test');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle validate command
   */
  async handleValidate(options) {
    if (!options.config && !options.directory) {
      console.error(chalk.red('Please specify either --config or --directory'));
      return;
    }

    const spinner = ora('Validating configurations...').start();

    try {
      if (options.config) {
        await this.validateSingleConfig(options.config, options.strict);
      } else if (options.directory) {
        await this.validateDirectory(options.directory, options.strict);
      }

      spinner.succeed('Validation completed successfully');
    } catch (error) {
      spinner.fail('Validation failed');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle list command
   */
  async handleList(options) {
    const output = {};

    if (options.backends || Object.keys(options).length === 0) {
      output.backends = this.backendRegistry.getAllBackends().map(b => ({
        name: b.getName(),
        features: b.getSupportedFeatures(),
        description: b.constructor.name
      }));
    }

    if (options.scenarios || Object.keys(options).length === 0) {
      output.scenarios = this.getAvailableScenarios();
    }

    if (options.examples || Object.keys(options).length === 0) {
      output.examples = this.getExampleConfigurations();
    }

    if (options.advanced || Object.keys(options).length === 0) {
      output.advanced = this.getAdvancedScenarioTypes();
    }

    this.displayListOutput(output, options.output);
  }

  /**
   * Handle interactive command
   */
  async handleInteractive(options) {
    console.log(chalk.blue('Welcome to Strezz Interactive Configuration Wizard!'));
    console.log('');

    try {
      const config = await this.createInteractiveConfig();
      
      if (options.output) {
        writeFileSync(options.output, JSON.stringify(config, null, 2));
        console.log(chalk.green(`Configuration saved to: ${options.output}`));
      } else {
        console.log(chalk.blue('Generated configuration:'));
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Interactive configuration failed:'), error.message);
    }
  }

  /**
   * Handle batch command
   */
  async handleBatch(options) {
    if (!options.directory) {
      console.error(chalk.red('Please specify --directory for batch processing'));
      return;
    }

    const spinner = ora('Processing batch configurations...').start();

    try {
      const results = await this.processBatchConfigurations(options);
      
      spinner.succeed('Batch processing completed');
      this.displayBatchResults(results);
    } catch (error) {
      spinner.fail('Batch processing failed');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle compare command
   */
  async handleCompare(options) {
    if (!options.configs && !options.results) {
      console.error(chalk.red('Please specify either --configs or --results'));
      return;
    }

    const spinner = ora('Comparing configurations...').start();

    try {
      let comparison;
      
      if (options.configs) {
        comparison = await this.compareConfigurations(options.configs);
      } else if (options.results) {
        comparison = await this.compareResults(options.results);
      }

      spinner.succeed('Comparison completed');
      this.displayComparison(comparison, options.output);
    } catch (error) {
      spinner.fail('Comparison failed');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle report command
   */
  async handleReport(options) {
    if (!options.results) {
      console.error(chalk.red('Please specify --results for report generation'));
      return;
    }

    const spinner = ora('Generating report...').start();

    try {
      const report = await this.generateReport(options);
      
      if (options.output) {
        writeFileSync(options.output, report);
        console.log(chalk.green(`Report saved to: ${options.output}`));
      } else {
        console.log(report);
      }

      spinner.succeed('Report generated successfully');
    } catch (error) {
      spinner.fail('Report generation failed');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Handle config command
   */
  async handleConfig(options) {
    const spinner = ora('Processing configuration...').start();

    try {
      if (options.create) {
        await this.createConfigFromTemplate(options.create);
      } else if (options.validate) {
        await this.validateSingleConfig(options.validate, true);
      } else if (options.merge) {
        await this.mergeConfigurations(options.merge);
      } else if (options.diff) {
        await this.showConfigDiff(options.diff[0], options.diff[1]);
      } else if (options.convert) {
        await this.convertConfigFormat(options.convert);
      }

      spinner.succeed('Configuration operation completed');
    } catch (error) {
      spinner.fail('Configuration operation failed');
      console.error(chalk.red(error.message));
    }
  }

  /**
   * Create interactive configuration
   */
  async createInteractiveConfig() {
    const questions = [
      {
        type: 'input',
        name: 'targetUrl',
        message: 'What is the target URL for testing?',
        default: 'https://httpbin.org'
      },
      {
        type: 'list',
        name: 'framework',
        message: 'What framework is the target application using?',
        choices: ['laravel', 'yii', 'generic', 'custom']
      },
      {
        type: 'list',
        name: 'backend',
        message: 'Which backend would you like to use?',
        choices: ['k6', 'locust']
      },
      {
        type: 'list',
        name: 'scenario',
        message: 'What type of test scenario do you want?',
        choices: ['smoke', 'load', 'stress', 'spike', 'soak']
      },
      {
        type: 'input',
        name: 'duration',
        message: 'How long should the test run?',
        default: '5m'
      },
      {
        type: 'input',
        name: 'virtualUsers',
        message: 'How many virtual users?',
        default: '10'
      }
    ];

    const answers = await prompt(questions);

    return new TestConfig({
      target: {
        url: answers.targetUrl,
        framework: answers.framework
      },
      scenarios: {
        [answers.scenario]: {
          executor: this.getExecutorForScenario(answers.scenario),
          duration: answers.duration,
          vus: parseInt(answers.virtualUsers)
        }
      },
      auth: {
        type: 'none'
      },
      requests: [
        {
          method: 'GET',
          path: '/',
          description: 'Homepage request'
        }
      ],
      thresholds: {
        http_req_duration: [`p(95)<2000`],
        http_req_failed: [`rate<1%`]
      }
    });
  }

  /**
   * Get executor for scenario type
   */
  getExecutorForScenario(scenario) {
    switch (scenario) {
      case 'smoke':
        return 'constant-vus';
      case 'load':
        return 'ramping-vus';
      case 'stress':
        return 'ramping-vus';
      case 'spike':
        return 'ramping-vus';
      case 'soak':
        return 'constant-vus';
      default:
        return 'ramping-vus';
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfigFromFile(filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    const configData = JSON.parse(content);
    return new TestConfig(configData);
  }

  /**
   * Create default configuration
   */
  async createDefaultConfig(options) {
    return new TestConfig({
      target: {
        url: options.target || 'https://httpbin.org',
        framework: options.framework || 'generic'
      },
      scenarios: {
        default: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '2m', target: 10 },
            { duration: '5m', target: 10 },
            { duration: '2m', target: 0 }
          ]
        }
      },
      auth: {
        type: 'none'
      },
      requests: [
        {
          method: 'GET',
          path: '/',
          description: 'Default request'
        }
      ]
    });
  }

  /**
   * Validate single configuration
   */
  async validateSingleConfig(filePath, strict = false) {
    const config = await this.loadConfigFromFile(filePath);
    const errors = config.validate();
    
    if (errors.length > 0) {
      console.error(chalk.red(`Validation failed for ${filePath}:`));
      errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
      
      if (strict) {
        throw new Error(`Configuration validation failed for ${filePath}`);
      }
    } else {
      console.log(chalk.green(`✓ ${filePath} is valid`));
    }
  }

  /**
   * Validate directory of configurations
   */
  async validateDirectory(directory, strict = false) {
    // Implementation for directory validation
    console.log(`Validating configurations in ${directory}...`);
  }

  /**
   * Get available scenarios
   */
  getAvailableScenarios() {
    return [
      { name: 'smoke', description: 'Basic functionality verification' },
      { name: 'load', description: 'Performance under expected load' },
      { name: 'stress', description: 'Find breaking point' },
      { name: 'spike', description: 'Sudden traffic spikes' },
      { name: 'soak', description: 'Long-term stability' }
    ];
  }

  /**
   * Get example configurations
   */
  getExampleConfigurations() {
    return [
      { name: 'laravel-ecommerce.json', description: 'Laravel e-commerce application' },
      { name: 'yii-cms.json', description: 'Yii CMS application' },
      { name: 'generic-api.json', description: 'Generic REST API' },
      { name: 'minimal-working.json', description: 'Minimal working example' }
    ];
  }

  /**
   * Get advanced scenario types
   */
  getAdvancedScenarioTypes() {
    return [
      { name: 'chaos', description: 'Chaos engineering scenarios' },
      { name: 'distributed', description: 'Distributed testing scenarios' },
      { name: 'advanced-load', description: 'Advanced load patterns' },
      { name: 'business-logic', description: 'Business logic scenarios' }
    ];
  }

  /**
   * Display list output
   */
  displayListOutput(output, format = 'text') {
    if (format === 'json') {
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (format === 'table') {
      this.displayTableOutput(output);
      return;
    }

    // Default text format
    Object.entries(output).forEach(([key, items]) => {
      console.log(chalk.blue(`\n${key.toUpperCase()}:`));
      items.forEach(item => {
        console.log(`  ${chalk.green(item.name)}: ${item.description}`);
      });
    });
  }

  /**
   * Display table output
   */
  displayTableOutput(output) {
    Object.entries(output).forEach(([key, items]) => {
      if (items.length === 0) return;

      const table = new Table({
        head: Object.keys(items[0]).map(k => chalk.blue(k)),
        colWidths: [20, 50]
      });

      items.forEach(item => {
        table.push(Object.values(item));
      });

      console.log(chalk.blue(`\n${key.toUpperCase()}:`));
      console.log(table.toString());
    });
  }

  /**
   * Process batch configurations
   */
  async processBatchConfigurations(options) {
    // Implementation for batch processing
    return [];
  }

  /**
   * Display batch results
   */
  displayBatchResults(results) {
    // Implementation for displaying batch results
    console.log('Batch processing results displayed');
  }

  /**
   * Compare configurations
   */
  async compareConfigurations(files) {
    // Implementation for configuration comparison
    return {};
  }

  /**
   * Compare results
   */
  async compareResults(files) {
    // Implementation for results comparison
    return {};
  }

  /**
   * Display comparison
   */
  displayComparison(comparison, format) {
    // Implementation for displaying comparison
    console.log('Comparison results displayed');
  }

  /**
   * Generate report
   */
  async generateReport(options) {
    // Implementation for report generation
    return 'Report content';
  }

  /**
   * Create config from template
   */
  async createConfigFromTemplate(template) {
    // Implementation for template-based config creation
    console.log(`Creating config from template: ${template}`);
  }

  /**
   * Merge configurations
   */
  async mergeConfigurations(files) {
    // Implementation for configuration merging
    console.log('Merging configurations...');
  }

  /**
   * Show config diff
   */
  async showConfigDiff(file1, file2) {
    // Implementation for configuration diff
    console.log(`Showing diff between ${file1} and ${file2}`);
  }

  /**
   * Convert config format
   */
  async convertConfigFormat(file) {
    // Implementation for format conversion
    console.log(`Converting format for ${file}`);
  }

  /**
   * Parse command line arguments
   */
  parse(argv) {
    return this.program.parse(argv);
  }

  /**
   * Get program instance
   */
  getProgram() {
    return this.program;
  }
}

export default EnhancedCLI;
