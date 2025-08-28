# Performance Gates Documentation

## 🎯 Overview

Performance Gates are automated checks that validate performance test results against configured thresholds. They ensure that code changes don't introduce performance regressions and maintain application performance standards.

## 🚀 Quick Start

### 1. **Enable Performance Gates**

Performance gates are automatically enabled for:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Manual workflow triggers

### 2. **Configure Thresholds**

Edit `.github/performance-gates.yml` to set your performance thresholds:

```yaml
global:
  response_time:
    smoke: 5000      # 5 seconds for smoke tests
    load: 2000       # 2 seconds for load tests
    stress: 3000     # 3 seconds for stress tests
    production: 1000 # 1 second for production
```

### 3. **Run Tests**

Performance gates automatically run when you:
- Create a pull request
- Push to protected branches
- Manually trigger the workflow

## 🔧 Configuration

### **Performance Gates Configuration File**

The `.github/performance-gates.yml` file controls all aspects of performance gates:

#### **Global Thresholds**
```yaml
global:
  response_time:
    smoke: 5000      # milliseconds
    load: 2000
    stress: 3000
    production: 1000
  error_rate:
    smoke: 5.0       # percentage
    load: 2.0
    stress: 5.0
    production: 1.0
  request_rate:
    smoke: 10        # requests per second
    load: 50
    stress: 100
    production: 200
```

#### **Framework-Specific Thresholds**
```yaml
frameworks:
  laravel:
    response_time:
      smoke: 3000    # Laravel-specific thresholds
      load: 1500
      stress: 2500
      production: 800
  yii:
    response_time:
      smoke: 4000    # Yii-specific thresholds
      load: 2000
      stress: 3000
      production: 1000
```

#### **Environment Multipliers**
```yaml
environments:
  staging:
    thresholds_multiplier: 1.5  # 50% more lenient
  production:
    thresholds_multiplier: 1.0  # Strict thresholds
  development:
    thresholds_multiplier: 2.0  # 100% more lenient
```

### **GitHub Actions Workflows**

#### **Performance Gates Workflow** (`.github/workflows/performance-gates.yml`)
- **Triggers**: PRs, pushes, manual dispatch
- **Matrix**: Tests all example configurations
- **Outputs**: JSON results, performance reports
- **Integration**: PR comments, artifact uploads

#### **Smoke Test Workflow** (`.github/workflows/smoke-test.yml`)
- **Purpose**: Quick performance validation
- **Duration**: 10 minutes maximum
- **Thresholds**: Lenient for fast feedback
- **Use Case**: PR validation, quick checks

## 📊 Test Scenarios

### **Smoke Tests**
- **Purpose**: Basic functionality verification
- **Duration**: 30 seconds
- **Virtual Users**: 1
- **Thresholds**: Very lenient
- **Use Case**: PR validation, quick checks

### **Load Tests**
- **Purpose**: Performance under expected load
- **Duration**: 5 minutes
- **Virtual Users**: 10
- **Thresholds**: Moderate
- **Use Case**: Pre-merge validation

### **Stress Tests**
- **Purpose**: Find breaking point
- **Duration**: 3 minutes
- **Virtual Users**: 20
- **Thresholds**: Higher
- **Use Case**: Release validation

### **Soak Tests**
- **Purpose**: Long-term stability
- **Duration**: 30 minutes
- **Virtual Users**: 10
- **Thresholds**: Strict
- **Use Case**: Production readiness

## 🎯 Performance Metrics

### **Response Time**
- **P50**: Median response time
- **P95**: 95th percentile (industry standard)
- **P99**: 99th percentile (worst-case scenarios)
- **Average**: Mean response time
- **Maximum**: Peak response time

### **Error Rates**
- **HTTP Errors**: 4xx and 5xx responses
- **Custom Checks**: Business logic validation
- **Acceptable Rates**: < 1% for production, < 5% for smoke tests

### **Throughput**
- **Request Rate**: Requests per second
- **Concurrency**: Simultaneous users
- **Resource Utilization**: CPU, memory, network

## 🚨 Performance Gate Rules

### **Pull Request Gates**
```yaml
gates:
  pull_request:
    required: true
    scenarios: ["smoke"]
    failure_action: "block"
    message: "Performance regression detected. Please optimize before merging."
```

### **Main Branch Protection**
```yaml
gates:
  main_branch:
    required: true
    scenarios: ["smoke", "load"]
    failure_action: "block"
    message: "Performance regression in main branch. Immediate action required."
```

### **Release Validation**
```yaml
gates:
  release:
    required: true
    scenarios: ["smoke", "load", "stress"]
    failure_action: "block"
    message: "Release blocked due to performance issues."
```

## 🔍 Regression Detection

### **Baseline Comparison**
Performance gates automatically detect regressions by comparing current results against baseline:

```yaml
regression_detection:
  enabled: true
  baseline:
    source: "main"  # Use main branch as baseline
  thresholds:
    response_time_increase: 20    # 20% increase is regression
    error_rate_increase: 50      # 50% increase is regression
    request_rate_decrease: 25    # 25% decrease is regression
```

### **Regression Alerts**
- **Response Time**: > 20% increase triggers alert
- **Error Rate**: > 50% increase triggers alert
- **Request Rate**: > 25% decrease triggers alert

## 📈 Reporting and Visualization

### **Automated Reports**
Performance gates generate comprehensive reports:

#### **Markdown Reports**
- Performance summary
- Threshold violations
- Regression detection
- Next steps

#### **JSON Outputs**
- Raw metrics data
- Structured results
- Machine-readable format

#### **Artifact Uploads**
- Test results
- Generated scripts
- Performance reports

### **PR Integration**
- **Automatic Comments**: Performance results posted to PRs
- **Status Checks**: Pass/fail status in PR interface
- **Artifact Links**: Download test results and reports

## 🛠️ Manual Testing

### **Using the Performance Gate Utility**

The `scripts/performance-gate.js` utility can be used for manual validation:

```bash
# Basic usage
node scripts/performance-gate.js \
  --results results.json \
  --config .github/performance-gates.yml \
  --scenario smoke

# With environment and framework
node scripts/performance-gate.js \
  --results results.json \
  --config .github/performance-gates.yml \
  --scenario load \
  --environment production \
  --framework laravel

# Regression detection
node scripts/performance-gate.js \
  --results current-results.json \
  --config .github/performance-gates.yml \
  --scenario load \
  --baseline baseline-results.json

# Output formats
node scripts/performance-gate.js \
  --results results.json \
  --config .github/performance-gates.yml \
  --scenario smoke \
  --output json
```

### **Command Line Options**

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `-r, --results` | Path to k6 results JSON file | Yes | - |
| `-c, --config` | Path to performance gates config | Yes | - |
| `-s, --scenario` | Test scenario type | Yes | - |
| `-e, --environment` | Environment | No | staging |
| `-f, --framework` | Framework type | No | generic |
| `--strict` | Fail on any threshold violation | No | false |
| `--output` | Output format (json, text, markdown) | No | text |
| `--baseline` | Path to baseline results | No | - |

## 🔧 Customization

### **Adding New Frameworks**

1. **Update Configuration**
```yaml
frameworks:
  new_framework:
    response_time:
      smoke: 3000
      load: 1500
      stress: 2500
      production: 800
    error_rate:
      smoke: 3.0
      load: 1.5
      stress: 3.0
      production: 0.8
```

2. **Update Examples**
Create new example configurations in the `examples/` directory.

3. **Update Workflows**
Add new configurations to the matrix in GitHub Actions workflows.

### **Custom Metrics**

Add custom metrics to track business-specific performance:

```yaml
reporting:
  custom_metrics:
    - "login_duration"
    - "checkout_duration"
    - "search_response_time"
    - "database_query_time"
```

### **Custom Thresholds**

Define application-specific thresholds:

```yaml
custom_thresholds:
  checkout_process:
    response_time: 3000
    error_rate: 0.5
  search_function:
    response_time: 1000
    error_rate: 1.0
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Performance Gate Fails**
1. **Check Thresholds**: Verify thresholds are realistic for your application
2. **Review Metrics**: Analyze which metrics are failing
3. **Environment Factors**: Consider network, infrastructure, and data volume
4. **Optimize Code**: Identify and fix performance bottlenecks

#### **Tests Time Out**
1. **Reduce Duration**: Use shorter test durations for CI
2. **Reduce Concurrency**: Lower virtual user count
3. **Optimize Scripts**: Simplify test scenarios
4. **Check Infrastructure**: Ensure adequate CI resources

#### **Missing Metrics**
1. **Verify k6 Output**: Ensure k6 generates expected metrics
2. **Check Parsing**: Verify metric extraction logic
3. **Update Configuration**: Add missing metrics to config
4. **Test Locally**: Run tests locally to debug

### **Debug Mode**

Enable debug mode in workflows for detailed logging:

```yaml
- name: Run performance test
  run: |
    k6 run \
      --out json=results.json \
      --out text=results.txt \
      --verbose \
      smoke-test.js
```

### **Local Testing**

Test performance gates locally before pushing:

```bash
# Generate test
node dist/strezz.js --config examples/minimal-working.json --backend k6

# Run test
k6 run --out json=results.json k6-test.js

# Validate results
node scripts/performance-gate.js \
  --results results.json \
  --config .github/performance-gates.yml \
  --scenario smoke
```

## 📚 Best Practices

### **1. Set Realistic Thresholds**
- Start with lenient thresholds
- Gradually tighten based on performance improvements
- Consider environment differences
- Account for network latency

### **2. Use Appropriate Test Scenarios**
- **Smoke**: Quick validation, lenient thresholds
- **Load**: Pre-merge validation, moderate thresholds
- **Stress**: Release validation, higher thresholds
- **Soak**: Production readiness, strict thresholds

### **3. Monitor Trends**
- Track performance over time
- Detect gradual degradation
- Set up alerts for regressions
- Maintain performance baselines

### **4. Integrate with Development Workflow**
- Run smoke tests on every PR
- Block merges on failures
- Provide clear feedback
- Include optimization guidance

### **5. Environment Considerations**
- **Development**: Very lenient thresholds
- **Staging**: Moderate thresholds
- **Production**: Strict thresholds
- **CI/CD**: Balanced thresholds

## 🔮 Future Enhancements

### **Short Term**
- **More Metrics**: Additional performance indicators
- **Better Visualization**: Enhanced reporting and charts
- **Integration**: More CI/CD platform support
- **Templates**: Pre-built configurations

### **Medium Term**
- **AI Analysis**: Intelligent performance insights
- **Auto-optimization**: Automated performance improvements
- **Predictive Alerts**: Proactive performance monitoring
- **Team Collaboration**: Shared performance dashboards

### **Long Term**
- **Performance ML**: Machine learning for optimization
- **Auto-scaling**: Dynamic threshold adjustment
- **Global Monitoring**: Cross-environment performance tracking
- **Performance Culture**: Built-in performance awareness

## 📞 Support

### **Getting Help**
1. **Check Documentation**: Review this guide thoroughly
2. **Review Examples**: Study the example configurations
3. **Test Locally**: Debug issues in your local environment
4. **Community**: Reach out to the development team

### **Contributing**
1. **Report Issues**: Create detailed bug reports
2. **Suggest Improvements**: Propose new features
3. **Share Configurations**: Contribute example configurations
4. **Documentation**: Help improve this guide

---

**Performance Gates** ensure your application maintains high performance standards and prevents regressions from reaching production. Use them wisely and continuously optimize your application's performance! 🚀
