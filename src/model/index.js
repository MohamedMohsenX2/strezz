/**
 * Core intermediate model for test generation
 * This model abstracts test scenarios and can be rendered by different backends
 */

/**
 * Target application configuration
 */
export class Target {
  constructor(config = {}) {
    this.url = config.url || '';
    this.baseURL = config.baseURL || '';
    this.framework = config.framework || 'generic';
    this.auth = config.auth || 'none';
    this.version = config.version || 'v1';
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = config.defaultHeaders || {};
  }

  /**
   * Validate target configuration
   */
  validate() {
    if (!this.url) {
      throw new Error('Target URL is required');
    }
    if (!this.baseURL) {
      this.baseURL = this.url;
    }
    return true;
  }
}

/**
 * Test scenario configuration
 */
export class Scenario {
  constructor(config = {}) {
    this.name = config.name || 'default';
    this.executor = config.executor || 'constant-vus';
    this.vus = config.vus || 10;
    this.duration = config.duration || '30s';
    this.rampUp = config.rampUp || '10s';
    this.stages = config.stages || [];
    this.rate = config.rate || null;
    this.timeUnit = config.timeUnit || '1s';
  }

  /**
   * Convert to k6 executor configuration
   */
  toK6Executor() {
    switch (this.executor) {
      case 'constant-vus':
        return {
          executor: 'constant-vus',
          vus: this.vus,
          duration: this.duration,
        };
      case 'ramping-vus':
        return {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: this.stages.length > 0 ? this.stages : [
            { duration: this.rampUp, target: this.vus },
            { duration: this.duration, target: this.vus },
            { duration: '10s', target: 0 },
          ],
        };
      case 'constant-arrival-rate':
        return {
          executor: 'constant-arrival-rate',
          rate: this.rate || this.vus,
          timeUnit: this.timeUnit,
          duration: this.duration,
        };
      case 'ramping-arrival-rate':
        return {
          executor: 'ramping-arrival-rate',
          startRate: 0,
          timeUnit: this.timeUnit,
          stages: this.stages.length > 0 ? this.stages : [
            { duration: this.rampUp, target: this.rate || this.vus },
            { duration: this.duration, target: this.rate || this.vus },
            { duration: '10s', target: 0 },
          ],
        };
      default:
        return {
          executor: 'constant-vus',
          vus: this.vus,
          duration: this.duration,
        };
    }
  }

  /**
   * Convert to Locust configuration
   */
  toLocustConfig() {
    return {
      users: this.vus,
      spawnRate: this.rate ? Math.ceil(this.rate / 10) : 1,
      runTime: this.duration,
    };
  }
}

/**
 * Performance thresholds
 */
export class Thresholds {
  constructor(config = {}) {
    this.httpReqDuration = config.httpReqDuration || 'p(95)<500';
    this.httpReqFailed = config.httpReqFailed || 'rate<1%';
    this.custom = config.custom || {};
  }

  /**
   * Convert to k6 thresholds
   */
  toK6Thresholds() {
    return {
      http_req_duration: [this.httpReqDuration],
      http_req_failed: [this.httpReqFailed],
      ...this.custom,
    };
  }

  /**
   * Convert to Locust thresholds
   */
  toLocustThresholds() {
    return {
      response_time_p95: parseInt(this.httpReqDuration.match(/p\(95\)<(\d+)/)?.[1] || '500'),
      error_rate: parseFloat(this.httpReqFailed.match(/rate<([\d.]+)%/)?.[1] || '1') / 100,
    };
  }
}

/**
 * Authentication configuration
 */
export class Auth {
  constructor(config = {}) {
    this.type = config.type || 'none';
    this.endpoints = config.endpoints || {};
    this.credentials = config.credentials || {};
    this.headers = config.headers || {};
    this.cookies = config.cookies || {};
  }

  /**
   * Get authentication flow for the specified type
   */
  getAuthFlow() {
    switch (this.type) {
      case 'sanctum':
        return {
          login: this.endpoints.login || '/api/auth/login',
          tokenHeader: this.headers.token || 'Authorization',
          tokenPrefix: 'Bearer',
          refresh: this.endpoints.refresh || '/api/auth/refresh',
        };
      case 'jwt':
        return {
          login: this.endpoints.login || '/api/auth/login',
          tokenHeader: this.headers.token || 'Authorization',
          tokenPrefix: 'Bearer',
          refresh: this.endpoints.refresh || '/api/auth/refresh',
        };
      case 'csrf':
        return {
          tokenEndpoint: this.endpoints.csrf || '/site/csrf',
          tokenHeader: this.headers.csrf || 'X-CSRF-Token',
          tokenCookie: this.cookies.csrf || '_csrf',
        };
      case 'session':
        return {
          login: this.endpoints.login || '/login',
          sessionCookie: this.cookies.session || 'session',
        };
      default:
        return {};
    }
  }
}

/**
 * Test request configuration
 */
export class Request {
  constructor(config = {}) {
    this.method = config.method || 'GET';
    this.path = config.path || '/';
    this.headers = config.headers || {};
    this.body = config.body || null;
    this.params = config.params || {};
    this.tags = config.tags || {};
    this.checks = config.checks || [];
    this.timeout = config.timeout || 30000;
  }

  /**
   * Add authentication headers
   */
  withAuth(auth) {
    if (auth && auth.token) {
      this.headers[auth.tokenHeader || 'Authorization'] = 
        `${auth.tokenPrefix || 'Bearer'} ${auth.token}`;
    }
    return this;
  }

  /**
   * Add CSRF token
   */
  withCSRF(csrfToken) {
    if (csrfToken) {
      this.headers['X-CSRF-Token'] = csrfToken;
    }
    return this;
  }
}

/**
 * Main test configuration
 */
export class TestConfig {
  constructor(config = {}) {
    this.target = new Target(config.target);
    this.scenarios = (config.scenarios || []).map(s => new Scenario(s));
    this.thresholds = new Thresholds(config.thresholds);
    this.auth = new Auth(config.auth);
    this.requests = (config.requests || []).map(r => new Request(r));
    this.tags = config.tags || {};
    this.output = config.output || {};
    this.observability = config.observability || {};
  }

  /**
   * Validate configuration
   */
  validate() {
    this.target.validate();
    
    if (this.scenarios.length === 0) {
      this.scenarios = [new Scenario({ name: 'default' })];
    }
    
    return true;
  }

  /**
   * Get scenario by name
   */
  getScenario(name) {
    return this.scenarios.find(s => s.name === name) || this.scenarios[0];
  }

  /**
   * Get default scenario
   */
  getDefaultScenario() {
    return this.scenarios[0];
  }
}

export default {
  Target,
  Scenario,
  Thresholds,
  Auth,
  Request,
  TestConfig,
};
