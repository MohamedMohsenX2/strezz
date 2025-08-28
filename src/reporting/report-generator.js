/**
 * Advanced Report Generator
 * 
 * This module provides comprehensive report generation capabilities for
 * performance test results, including multiple output formats and
 * advanced analytics.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { ChartJSNode } from 'chartjs-node';
import { marked } from 'marked';
import { html } from 'html-pdf-node';
import { TestConfig } from '../models/test-config.js';

/**
 * Report Generator Class
 */
export class ReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: './reports',
      format: 'html',
      template: 'default',
      includeCharts: true,
      includeMetrics: true,
      includeRecommendations: true,
      ...options
    };
    
    this.chartCanvas = null;
    this.results = null;
    this.config = null;
    this.metrics = null;
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(resultsPath, configPath, outputPath = null) {
    try {
      // Load data
      await this.loadData(resultsPath, configPath);
      
      // Analyze results
      this.analyzeResults();
      
      // Generate report based on format
      const report = await this.generateReportContent();
      
      // Write report
      const finalOutputPath = outputPath || this.getDefaultOutputPath();
      await this.writeReport(report, finalOutputPath);
      
      return {
        success: true,
        outputPath: finalOutputPath,
        format: this.options.format,
        metrics: this.metrics
      };
      
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load test results and configuration
   */
  async loadData(resultsPath, configPath) {
    // Load test results
    if (!existsSync(resultsPath)) {
      throw new Error(`Results file not found: ${resultsPath}`);
    }
    
    const resultsContent = readFileSync(resultsPath, 'utf8');
    this.results = JSON.parse(resultsContent);
    
    // Load configuration if provided
    if (configPath && existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf8');
      this.config = new TestConfig(JSON.parse(configContent));
    }
    
    // Initialize chart canvas if needed
    if (this.options.includeCharts) {
      this.chartCanvas = new ChartJSNode(800, 600);
    }
  }

  /**
   * Analyze test results and extract metrics
   */
  analyzeResults() {
    this.metrics = {
      summary: this.extractSummaryMetrics(),
      performance: this.extractPerformanceMetrics(),
      errors: this.extractErrorMetrics(),
      trends: this.extractTrendMetrics(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Extract summary metrics
   */
  extractSummaryMetrics() {
    const metrics = this.results.metrics || {};
    
    return {
      totalRequests: metrics.http_reqs?.count || 0,
      totalErrors: metrics.http_req_failed?.count || 0,
      totalDuration: metrics.http_req_duration?.avg || 0,
      totalDataSent: metrics.data_sent?.count || 0,
      totalDataReceived: metrics.data_received?.count || 0,
      virtualUsers: metrics.vus?.max || 0,
      testDuration: this.results.state?.testRunDuration || 0,
      startTime: this.results.state?.startTime || new Date().toISOString(),
      endTime: this.results.state?.endTime || new Date().toISOString()
    };
  }

  /**
   * Extract performance metrics
   */
  extractPerformanceMetrics() {
    const metrics = this.results.metrics || {};
    
    return {
      responseTime: {
        min: metrics.http_req_duration?.min || 0,
        max: metrics.http_req_duration?.max || 0,
        avg: metrics.http_req_duration?.avg || 0,
        p50: metrics.http_req_duration?.med || 0,
        p90: metrics.http_req_duration?.p(90) || 0,
        p95: metrics.http_req_duration?.p(95) || 0,
        p99: metrics.http_req_duration?.p(99) || 0
      },
      requestRate: {
        avg: metrics.http_reqs?.rate || 0,
        max: metrics.http_reqs?.max || 0
      },
      errorRate: {
        rate: metrics.http_req_failed?.rate || 0,
        percentage: this.calculateErrorPercentage()
      },
      throughput: {
        dataSent: metrics.data_sent?.rate || 0,
        dataReceived: metrics.data_received?.rate || 0
      }
    };
  }

  /**
   * Extract error metrics
   */
  extractErrorMetrics() {
    const errors = this.results.errors || [];
    
    return {
      totalErrors: errors.length,
      errorTypes: this.groupErrorsByType(errors),
      errorTimeline: this.createErrorTimeline(errors),
      topErrorPaths: this.getTopErrorPaths(errors)
    };
  }

  /**
   * Extract trend metrics
   */
  extractTrendMetrics() {
    const metrics = this.results.metrics || {};
    
    return {
      responseTimeTrend: this.calculateTrend(metrics.http_req_duration?.values || []),
      requestRateTrend: this.calculateTrend(metrics.http_reqs?.values || []),
      errorRateTrend: this.calculateTrend(metrics.http_req_failed?.values || []),
      virtualUsersTrend: this.calculateTrend(metrics.vus?.values || [])
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const performance = this.metrics.performance;
    
    // Response time recommendations
    if (performance.responseTime.p95 > 2000) {
      recommendations.push({
        category: 'Performance',
        severity: 'high',
        title: 'High P95 Response Time',
        description: 'P95 response time exceeds 2 seconds',
        suggestion: 'Investigate database queries, caching, and application performance',
        impact: 'User experience degradation'
      });
    }
    
    // Error rate recommendations
    if (performance.errorRate.percentage > 0.01) {
      recommendations.push({
        category: 'Reliability',
        severity: 'high',
        title: 'High Error Rate',
        description: `Error rate is ${(performance.errorRate.percentage * 100).toFixed(2)}%`,
        suggestion: 'Review error logs and fix application issues',
        impact: 'Service reliability issues'
      });
    }
    
    // Request rate recommendations
    if (performance.requestRate.avg < 100) {
      recommendations.push({
        category: 'Capacity',
        severity: 'medium',
        title: 'Low Request Rate',
        description: 'Request rate is below expected capacity',
        suggestion: 'Check for bottlenecks in application or infrastructure',
        impact: 'Underutilized resources'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate report content based on format
   */
  async generateReportContent() {
    switch (this.options.format) {
      case 'html':
        return await this.generateHTMLReport();
      case 'markdown':
        return this.generateMarkdownReport();
      case 'pdf':
        return await this.generatePDFReport();
      case 'json':
        return this.generateJSONReport();
      default:
        return await this.generateHTMLReport();
    }
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport() {
    const charts = this.options.includeCharts ? await this.generateCharts() : '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strezz Performance Test Report</title>
    <style>
        ${this.getHTMLStyles()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>🚀 Strezz Performance Test Report</h1>
            <div class="report-meta">
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Test Duration:</strong> ${this.formatDuration(this.metrics.summary.testDuration)}</p>
                <p><strong>Total Requests:</strong> ${this.metrics.summary.totalRequests.toLocaleString()}</p>
            </div>
        </header>

        <section class="executive-summary">
            <h2>📊 Executive Summary</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Response Time</h3>
                    <div class="metric-value">${this.metrics.performance.responseTime.p95.toFixed(0)}ms</div>
                    <div class="metric-label">P95</div>
                </div>
                <div class="summary-card">
                    <h3>Error Rate</h3>
                    <div class="metric-value">${(this.metrics.performance.errorRate.percentage * 100).toFixed(2)}%</div>
                    <div class="metric-label">Percentage</div>
                </div>
                <div class="summary-card">
                    <h3>Request Rate</h3>
                    <div class="metric-value">${this.metrics.performance.requestRate.avg.toFixed(1)}</div>
                    <div class="metric-label">req/s</div>
                </div>
                <div class="summary-card">
                    <h3>Virtual Users</h3>
                    <div class="metric-value">${this.metrics.summary.virtualUsers}</div>
                    <div class="metric-label">Max VUs</div>
                </div>
            </div>
        </section>

        <section class="detailed-metrics">
            <h2>📈 Detailed Metrics</h2>
            <div class="metrics-grid">
                <div class="metric-section">
                    <h3>Response Time Distribution</h3>
                    <div class="metric-table">
                        <table>
                            <tr><td>Min:</td><td>${this.metrics.performance.responseTime.min.toFixed(0)}ms</td></tr>
                            <tr><td>P50:</td><td>${this.metrics.performance.responseTime.p50.toFixed(0)}ms</td></tr>
                            <tr><td>P90:</td><td>${this.metrics.performance.responseTime.p90.toFixed(0)}ms</td></tr>
                            <tr><td>P95:</td><td>${this.metrics.performance.responseTime.p95.toFixed(0)}ms</td></tr>
                            <tr><td>P99:</td><td>${this.metrics.performance.responseTime.p99.toFixed(0)}ms</td></tr>
                            <tr><td>Max:</td><td>${this.metrics.performance.responseTime.max.toFixed(0)}ms</td></tr>
                        </table>
                    </div>
                </div>
                
                <div class="metric-section">
                    <h3>Performance Summary</h3>
                    <div class="metric-table">
                        <table>
                            <tr><td>Total Requests:</td><td>${this.metrics.summary.totalRequests.toLocaleString()}</td></tr>
                            <tr><td>Total Errors:</td><td>${this.metrics.summary.totalErrors.toLocaleString()}</td></tr>
                            <tr><td>Success Rate:</td><td>${((1 - this.metrics.performance.errorRate.percentage) * 100).toFixed(2)}%</td></tr>
                            <tr><td>Data Sent:</td><td>${this.formatBytes(this.metrics.summary.totalDataSent)}</td></tr>
                            <tr><td>Data Received:</td><td>${this.formatBytes(this.metrics.summary.totalDataReceived)}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        </section>

        ${charts}

        ${this.options.includeRecommendations ? this.generateRecommendationsHTML() : ''}

        <section class="test-details">
            <h2>🔍 Test Details</h2>
            <div class="details-grid">
                <div class="detail-section">
                    <h3>Test Configuration</h3>
                    <pre><code>${JSON.stringify(this.config || {}, null, 2)}</code></pre>
                </div>
                
                <div class="detail-section">
                    <h3>Test Results</h3>
                    <pre><code>${JSON.stringify(this.results, null, 2)}</code></pre>
                </div>
            </div>
        </section>
    </div>

    <script>
        ${this.getChartScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport() {
    return `# 🚀 Strezz Performance Test Report

## 📊 Executive Summary

**Generated:** ${new Date().toLocaleString()}
**Test Duration:** ${this.formatDuration(this.metrics.summary.testDuration)}
**Total Requests:** ${this.metrics.summary.totalRequests.toLocaleString()}

### Key Metrics

| Metric | Value |
|--------|-------|
| Response Time (P95) | ${this.metrics.performance.responseTime.p95.toFixed(0)}ms |
| Error Rate | ${(this.metrics.performance.errorRate.percentage * 100).toFixed(2)}% |
| Request Rate | ${this.metrics.performance.requestRate.avg.toFixed(1)} req/s |
| Virtual Users | ${this.metrics.summary.virtualUsers} |

## 📈 Detailed Metrics

### Response Time Distribution

- **Min:** ${this.metrics.performance.responseTime.min.toFixed(0)}ms
- **P50:** ${this.metrics.performance.responseTime.p50.toFixed(0)}ms
- **P90:** ${this.metrics.performance.responseTime.p90.toFixed(0)}ms
- **P95:** ${this.metrics.performance.responseTime.p95.toFixed(0)}ms
- **P99:** ${this.metrics.performance.responseTime.p99.toFixed(0)}ms
- **Max:** ${this.metrics.performance.responseTime.max.toFixed(0)}ms

### Performance Summary

- **Total Requests:** ${this.metrics.summary.totalRequests.toLocaleString()}
- **Total Errors:** ${this.metrics.summary.totalErrors.toLocaleString()}
- **Success Rate:** ${((1 - this.metrics.performance.errorRate.percentage) * 100).toFixed(2)}%
- **Data Sent:** ${this.formatBytes(this.metrics.summary.totalDataSent)}
- **Data Received:** ${this.formatBytes(this.metrics.summary.totalDataReceived)}

${this.options.includeRecommendations ? this.generateRecommendationsMarkdown() : ''}

## 🔍 Test Details

### Test Configuration

\`\`\`json
${JSON.stringify(this.config || {}, null, 2)}
\`\`\`

### Test Results

\`\`\`json
${JSON.stringify(this.results, null, 2)}
\`\`\`
`;
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport() {
    const htmlContent = await this.generateHTMLReport();
    const options = {
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    };
    
    return await html.generatePdf({ content: htmlContent }, options);
  }

  /**
   * Generate JSON report
   */
  generateJSONReport() {
    return JSON.stringify({
      metadata: {
        generated: new Date().toISOString(),
        format: 'json',
        version: '2.0.0'
      },
      summary: this.metrics.summary,
      performance: this.metrics.performance,
      errors: this.metrics.errors,
      trends: this.metrics.trends,
      recommendations: this.metrics.recommendations,
      config: this.config,
      results: this.results
    }, null, 2);
  }

  /**
   * Generate charts for HTML report
   */
  async generateCharts() {
    if (!this.chartCanvas) return '';
    
    try {
      // Response time chart
      const responseTimeChart = await this.createResponseTimeChart();
      
      // Request rate chart
      const requestRateChart = await this.createRequestRateChart();
      
      // Error rate chart
      const errorRateChart = await this.createErrorRateChart();
      
      return `
        <section class="charts">
            <h2>📊 Performance Charts</h2>
            <div class="charts-grid">
                <div class="chart-container">
                    <h3>Response Time Over Time</h3>
                    <img src="data:image/png;base64,${responseTimeChart}" alt="Response Time Chart" />
                </div>
                <div class="chart-container">
                    <h3>Request Rate Over Time</h3>
                    <img src="data:image/png;base64,${requestRateChart}" alt="Request Rate Chart" />
                </div>
                <div class="chart-container">
                    <h3>Error Rate Over Time</h3>
                    <img src="data:image/png;base64,${errorRateChart}" alt="Error Rate Chart" />
                </div>
            </div>
        </section>
      `;
    } catch (error) {
      console.warn('Chart generation failed:', error);
      return '<p>Charts could not be generated</p>';
    }
  }

  /**
   * Create response time chart
   */
  async createResponseTimeChart() {
    const config = {
      type: 'line',
      data: {
        labels: this.getTimeLabels(),
        datasets: [{
          label: 'Response Time (ms)',
          data: this.getResponseTimeData(),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Response Time Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Response Time (ms)'
            }
          }
        }
      }
    };
    
    await this.chartCanvas.drawChart(config);
    return this.chartCanvas.getImageBuffer().toString('base64');
  }

  /**
   * Create request rate chart
   */
  async createRequestRateChart() {
    const config = {
      type: 'line',
      data: {
        labels: this.getTimeLabels(),
        datasets: [{
          label: 'Request Rate (req/s)',
          data: this.getRequestRateData(),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Request Rate Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Request Rate (req/s)'
            }
          }
        }
      }
    };
    
    await this.chartCanvas.drawChart(config);
    return this.chartCanvas.getImageBuffer().toString('base64');
  }

  /**
   * Create error rate chart
   */
  async createErrorRateChart() {
    const config = {
      type: 'line',
      data: {
        labels: this.getTimeLabels(),
        datasets: [{
          label: 'Error Rate (%)',
          data: this.getErrorRateData(),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Error Rate Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Error Rate (%)'
            }
          }
        }
      }
    };
    
    await this.chartCanvas.drawChart(config);
    return this.chartCanvas.getImageBuffer().toString('base64');
  }

  /**
   * Generate recommendations HTML
   */
  generateRecommendationsHTML() {
    if (!this.metrics.recommendations.length) {
      return '<p>No recommendations to display</p>';
    }
    
    const recommendationsHTML = this.metrics.recommendations.map(rec => `
      <div class="recommendation ${rec.severity}">
        <h4>${rec.title}</h4>
        <p><strong>Category:</strong> ${rec.category}</p>
        <p><strong>Severity:</strong> ${rec.severity}</p>
        <p><strong>Description:</strong> ${rec.description}</p>
        <p><strong>Suggestion:</strong> ${rec.suggestion}</p>
        <p><strong>Impact:</strong> ${rec.impact}</p>
      </div>
    `).join('');
    
    return `
      <section class="recommendations">
        <h2>💡 Recommendations</h2>
        <div class="recommendations-grid">
          ${recommendationsHTML}
        </div>
      </section>
    `;
  }

  /**
   * Generate recommendations Markdown
   */
  generateRecommendationsMarkdown() {
    if (!this.metrics.recommendations.length) {
      return 'No recommendations to display.';
    }
    
    return `
## 💡 Recommendations

${this.metrics.recommendations.map(rec => `
### ${rec.title}

- **Category:** ${rec.category}
- **Severity:** ${rec.severity}
- **Description:** ${rec.description}
- **Suggestion:** ${rec.suggestion}
- **Impact:** ${rec.impact}
`).join('\n')}
`;
  }

  /**
   * Write report to file
   */
  async writeReport(content, outputPath) {
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }
    
    // Write report
    if (this.options.format === 'pdf') {
      writeFileSync(outputPath, content);
    } else {
      writeFileSync(outputPath, content, 'utf8');
    }
  }

  /**
   * Get default output path
   */
  getDefaultOutputPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `strezz-report-${timestamp}.${this.options.format}`;
    return join(this.options.outputDir, filename);
  }

  /**
   * Helper methods
   */
  calculateErrorPercentage() {
    const total = this.metrics.summary.totalRequests;
    const errors = this.metrics.summary.totalErrors;
    return total > 0 ? errors / total : 0;
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  groupErrorsByType(errors) {
    const groups = {};
    errors.forEach(error => {
      const type = error.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    });
    return groups;
  }

  createErrorTimeline(errors) {
    // Implementation for error timeline
    return [];
  }

  getTopErrorPaths(errors) {
    // Implementation for top error paths
    return [];
  }

  getTimeLabels() {
    // Implementation for time labels
    return [];
  }

  getResponseTimeData() {
    // Implementation for response time data
    return [];
  }

  getRequestRateData() {
    // Implementation for request rate data
    return [];
  }

  getErrorRateData() {
    // Implementation for error rate data
    return [];
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getHTMLStyles() {
    return `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .report-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
      .report-header h1 { margin: 0 0 20px 0; font-size: 2.5em; }
      .report-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .summary-card { background: white; padding: 20px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .metric-value { font-size: 2em; font-weight: bold; color: #667eea; margin: 10px 0; }
      .metric-label { color: #666; font-size: 0.9em; }
      .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .metric-section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .metric-table table { width: 100%; border-collapse: collapse; }
      .metric-table td { padding: 8px; border-bottom: 1px solid #eee; }
      .metric-table td:first-child { font-weight: bold; color: #666; }
      .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .chart-container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
      .recommendations-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .recommendation { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border-left: 5px solid; }
      .recommendation.high { border-left-color: #dc3545; }
      .recommendation.medium { border-left-color: #ffc107; }
      .recommendation.low { border-left-color: #28a745; }
      .details-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
      .detail-section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
      code { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
      h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
      h3 { color: #555; margin-top: 0; }
    `;
  }

  getChartScripts() {
    return `
      // Chart.js configuration and initialization
      Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      Chart.defaults.color = '#666';
    `;
  }
}

export default ReportGenerator;
