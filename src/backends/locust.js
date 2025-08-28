import { BaseBackend } from './base.js';

/**
 * Locust backend adapter (DEPRECATED)
 * Generates Python Locust test scripts
 * This adapter is maintained for backward compatibility during transition
 */
export class LocustBackend extends BaseBackend {
  constructor() {
    super();
    console.warn('⚠️  Locust backend is deprecated and will be removed in a future version. Use k6 backend instead.');
  }

  getName() {
    return 'locust';
  }

  getSupportedFeatures() {
    return {
      executors: ['constant-vus', 'ramping-vus'],
      auth: ['session', 'none'],
      frameworks: ['generic'],
      metrics: ['response_time', 'error_rate'],
      tags: false,
      checks: true,
      thresholds: false,
    };
  }

  validateConfig(config) {
    // Locust has limited feature support
    const unsupportedFeatures = [];
    
    if (config.auth.type === 'sanctum' || config.auth.type === 'jwt' || config.auth.type === 'csrf') {
      unsupportedFeatures.push(`${config.auth.type} authentication`);
    }
    
    if (config.scenarios.some(s => s.executor.includes('arrival-rate'))) {
      unsupportedFeatures.push('arrival-rate executors');
    }
    
    if (unsupportedFeatures.length > 0) {
      console.warn(`⚠️  Locust backend does not support: ${unsupportedFeatures.join(', ')}`);
    }
    
    return true;
  }

  getFileExtension() {
    return '.py';
  }

  getDefaultFilename() {
    return 'locustfile.py';
  }

  generate(config) {
    config.validate();
    
    const scenario = config.getDefaultScenario();
    const locustConfig = scenario.toLocustConfig();
    
    return this.generateLocustScript(config, locustConfig);
  }

  /**
   * Generate Locust test script
   */
  generateLocustScript(config, locustConfig) {
    const { target, auth, requests } = config;
    
    const script = `import random
from locust import HttpUser, task, between, events
from locust.exception import StopUser

class StrezzUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        ${this.generateOnStartFunction(auth, target)}
    
    ${this.generateTasks(requests, auth)}
    
    def on_stop(self):
        ${this.generateOnStopFunction(auth)}

# Locust configuration
# Run with: locust -f locustfile.py --host=${target.baseURL}
# Users: ${locustConfig.users}
# Spawn rate: ${locustConfig.spawnRate}
# Run time: ${locustConfig.runTime}`;

    return script;
  }

  /**
   * Generate on_start function for authentication
   */
  generateOnStartFunction(auth, target) {
    if (auth.type === 'none') {
      return 'pass';
    }
    
    if (auth.type === 'session') {
      return `
        # Session-based authentication
        login_data = {
            'email': self.environment.parsed_options.username or 'test@example.com',
            'password': self.environment.parsed_options.password or 'password'
        }
        
        response = self.client.post('${target.baseURL}/login', json=login_data)
        if response.status_code == 200:
            print(f"Logged in successfully: {response.json()}")
        else:
            print(f"Login failed: {response.status_code}")`;
    }
    
    return 'pass';
  }

  /**
   * Generate tasks
   */
  generateTasks(requests, auth) {
    if (!requests || requests.length === 0) {
      return `
    @task(1)
    def index_page(self):
        """Basic index page test"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Expected 200, got {response.status_code}")`;
    }
    
    return requests.map((request, index) => {
      const method = request.method.toLowerCase();
      const path = request.path;
      const headers = this.generateHeaders(request.headers, auth);
      const body = request.body ? `, json=${JSON.stringify(request.body)}` : '';
      const checks = this.generateChecks(request.checks || []);
      
      return `
    @task(${index + 1})
    def ${method}_${index + 1}(self):
        """${method.toUpperCase()} ${path}"""
        with self.client.${method}("${path}"${body}, headers=${JSON.stringify(headers)}, catch_response=True) as response:
            ${checks}
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Expected 200, got {response.status_code}")`;
    }).join('');
  }

  /**
   * Generate headers with authentication
   */
  generateHeaders(headers, auth) {
    const allHeaders = { ...headers };
    
    if (auth.type === 'session') {
      allHeaders['Cookie'] = 'session=${sessionId}';
    }
    
    return allHeaders;
  }

  /**
   * Generate checks
   */
  generateChecks(checks) {
    if (!checks || checks.length === 0) {
      return 'pass';
    }
    
    return checks.map(check => {
      if (typeof check === 'string') {
        return `# ${check}`;
      }
      return `# ${check.name}: ${check.condition}`;
    }).join('\n            ');
  }

  /**
   * Generate on_stop function
   */
  generateOnStopFunction(auth) {
    if (auth.type === 'none') {
      return 'pass';
    }
    
    return `
        # Cleanup authentication
        if hasattr(self, 'session_id'):
            self.client.post('/logout')`;
  }
}

export default LocustBackend;
