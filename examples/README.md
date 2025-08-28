# Strezz Test Examples

This directory contains comprehensive, production-ready example configurations for the Strezz performance test generator. Each example demonstrates different authentication patterns, request scenarios, and testing strategies.

## 📁 Example Configurations

### 1. Laravel E-commerce (`laravel-ecommerce.json`)
**Framework**: Laravel with Sanctum authentication  
**Use Case**: Full e-commerce application testing

**Features**:
- **Authentication**: Laravel Sanctum JWT tokens
- **Scenarios**: Smoke, Load, Stress testing
- **Operations**: Product catalog, shopping cart, checkout, order management
- **Realistic Data**: Product listings, user profiles, payment processing

**Key Endpoints**:
- Product catalog with pagination
- Shopping cart CRUD operations
- Checkout process with address/payment
- Order history and tracking
- User profile management

**Performance Targets**:
- 95th percentile response time < 1000ms
- Error rate < 1%
- Request rate > 100 req/s

### 2. Yii CMS (`yii-cms.json`)
**Framework**: Yii with CSRF protection  
**Use Case**: Content management system testing

**Features**:
- **Authentication**: CSRF token-based session management
- **Scenarios**: Smoke, Load, Spike testing
- **Operations**: Content management, user administration, media handling
- **Realistic Data**: Articles, categories, user management

**Key Endpoints**:
- Article CRUD operations
- Category browsing and search
- User registration and authentication
- Media upload/download
- Admin dashboard access

**Performance Targets**:
- 95th percentile response time < 800ms
- Error rate < 0.5%
- Request rate > 80 req/s

### 3. Generic API (`generic-api.json`)
**Framework**: Generic REST API with JWT  
**Use Case**: Multi-purpose API testing

**Features**:
- **Authentication**: JWT with refresh tokens
- **Scenarios**: Smoke, Load, Soak testing
- **Operations**: User management, project tracking, file handling
- **Realistic Data**: Project management, task tracking, notifications

**Key Endpoints**:
- User authentication and profile management
- Project CRUD with complex filtering
- File upload/download operations
- Task management and analytics
- System monitoring and metrics

**Performance Targets**:
- 95th percentile response time < 800ms
- Error rate < 0.5%
- Request rate > 120 req/s

## 🚀 Getting Started

### 1. Choose Your Example
Select the example that best matches your application's architecture and requirements.

### 2. Customize Configuration
Modify the configuration to match your specific:
- Target URLs and endpoints
- Authentication credentials
- Performance thresholds
- Test scenarios

### 3. Generate Tests
Use the Strezz CLI to generate tests for your chosen backend:

```bash
# Generate k6 test (recommended)
strezz --config examples/laravel-ecommerce.json --backend k6

# Generate Locust test (deprecated)
strezz --config examples/laravel-ecommerce.json --backend locust
```

### 4. Run Performance Tests
Execute the generated test files:

```bash
# k6
k6 run laravel-ecommerce-test.js

# Locust
locust -f locustfile.py --host=https://your-app.com
```

## 🔧 Configuration Structure

Each example follows the same configuration schema:

```json
{
  "target": {
    "url": "https://your-app.com",
    "baseURL": "https://your-app.com",
    "framework": "laravel|yii|generic"
  },
  "scenarios": [
    {
      "name": "scenario_name",
      "executor": "constant-vus|ramping-vus|constant-arrival-rate",
      "vus": 10,
      "duration": "5m"
    }
  ],
  "auth": {
    "type": "sanctum|jwt|csrf|session|none",
    "endpoints": {
      "login": "/auth/login",
      "logout": "/auth/logout"
    }
  },
  "requests": [
    {
      "name": "Request Name",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "path": "/api/endpoint",
      "body": {},
      "query": {},
      "checks": []
    }
  ],
  "thresholds": {
    "http_req_duration": ["p(95)<1000"],
    "http_req_failed": ["rate<1%"]
  }
}
```

## 📊 Test Scenarios

### Smoke Testing
- **Purpose**: Basic functionality verification
- **Duration**: 30 seconds
- **Concurrency**: 1 virtual user
- **Use Case**: Quick validation before detailed testing

### Load Testing
- **Purpose**: Performance under expected load
- **Duration**: 9 minutes (2m ramp-up, 5m sustained, 2m ramp-down)
- **Concurrency**: 10-20 virtual users
- **Use Case**: Validate performance under normal conditions

### Stress Testing
- **Purpose**: Find breaking point
- **Duration**: 9 minutes with higher concurrency
- **Concurrency**: 20+ virtual users
- **Use Case**: Identify performance bottlenecks

### Spike Testing
- **Purpose**: Handle traffic bursts
- **Duration**: 4 minutes with rapid scaling
- **Concurrency**: 50 virtual users
- **Use Case**: Validate burst handling capability

### Soak Testing
- **Purpose**: Long-term stability
- **Duration**: 30+ minutes
- **Concurrency**: 10 virtual users
- **Use Case**: Detect memory leaks and degradation

## 🔐 Authentication Patterns

### Laravel Sanctum
- JWT-based authentication
- Automatic token refresh
- Secure API access
- Session management

### Yii CSRF
- CSRF token protection
- Session-based authentication
- Form security
- Cookie management

### JWT (Generic)
- Stateless authentication
- Access and refresh tokens
- Token expiration handling
- Secure API communication

## 📈 Performance Metrics

### Response Time
- **P50**: Median response time
- **P95**: 95th percentile (industry standard)
- **P99**: 99th percentile (worst-case scenarios)

### Error Rates
- **HTTP Errors**: 4xx and 5xx responses
- **Custom Checks**: Business logic validation
- **Thresholds**: Acceptable error percentages

### Throughput
- **Request Rate**: Requests per second
- **Concurrency**: Simultaneous users
- **Resource Utilization**: CPU, memory, network

## 🎯 Best Practices

### 1. Realistic Data
- Use production-like data volumes
- Include edge cases and error scenarios
- Test with realistic user behavior patterns

### 2. Gradual Scaling
- Start with smoke tests
- Gradually increase load
- Monitor system resources
- Stop at first sign of degradation

### 3. Comprehensive Coverage
- Test all critical user journeys
- Include authentication flows
- Test error handling
- Validate business logic

### 4. Environment Considerations
- Test against staging environments
- Use production-like data
- Consider network latency
- Account for external dependencies

## 🚨 Common Pitfalls

### 1. Over-testing
- Don't test everything at once
- Focus on critical paths
- Use realistic test data
- Avoid excessive concurrency

### 2. Ignoring Setup/Teardown
- Proper authentication setup
- Clean test data
- Resource cleanup
- Session management

### 3. Missing Thresholds
- Set realistic performance goals
- Include error rate limits
- Monitor custom metrics
- Alert on threshold violations

### 4. Network Assumptions
- Account for latency
- Test with realistic bandwidth
- Consider geographic distribution
- Validate CDN performance

## 🔍 Troubleshooting

### Common Issues
1. **Authentication Failures**: Check credentials and endpoints
2. **CSRF Token Errors**: Verify token extraction and usage
3. **Rate Limiting**: Adjust request timing and concurrency
4. **Timeout Errors**: Increase timeout values and check network

### Debug Tips
- Enable verbose logging
- Check response headers
- Validate request payloads
- Monitor network traffic

## 📚 Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)
- [API Testing Strategies](https://k6.io/docs/testing-guides/api-load-testing/)

## 🤝 Contributing

To add new examples or improve existing ones:

1. Follow the established configuration schema
2. Include comprehensive documentation
3. Test with real applications
4. Provide realistic performance targets
5. Update this README accordingly

---

**Note**: These examples are designed for educational and reference purposes. Always customize configurations for your specific use case and test against appropriate environments.
