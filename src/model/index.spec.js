import { Target, Scenario, Thresholds, Auth, Request, TestConfig } from './index.js';

describe('Core Model Classes', () => {
  describe('Target', () => {
    it('should create target with default values', () => {
      const target = new Target();
      expect(target.url).toBe('');
      expect(target.framework).toBe('generic');
      expect(target.auth).toBe('none');
    });

    it('should create target with custom values', () => {
      const config = {
        url: 'https://example.com',
        framework: 'laravel',
        auth: 'sanctum',
      };
      const target = new Target(config);
      expect(target.url).toBe('https://example.com');
      expect(target.framework).toBe('laravel');
      expect(target.auth).toBe('sanctum');
    });

    it('should validate target configuration', () => {
      const target = new Target({ url: 'https://example.com' });
      expect(() => target.validate()).not.toThrow();
    });

    it('should throw error for missing URL', () => {
      const target = new Target();
      expect(() => target.validate()).toThrow('Target URL is required');
    });

    it('should set baseURL to URL if not provided', () => {
      const target = new Target({ url: 'https://example.com' });
      target.validate();
      expect(target.baseURL).toBe('https://example.com');
    });
  });

  describe('Scenario', () => {
    it('should create scenario with default values', () => {
      const scenario = new Scenario();
      expect(scenario.name).toBe('default');
      expect(scenario.executor).toBe('constant-vus');
      expect(scenario.vus).toBe(10);
      expect(scenario.duration).toBe('30s');
    });

    it('should convert to k6 executor configuration', () => {
      const scenario = new Scenario({
        executor: 'constant-vus',
        vus: 5,
        duration: '1m',
      });
      
      const k6Config = scenario.toK6Executor();
      expect(k6Config.executor).toBe('constant-vus');
      expect(k6Config.vus).toBe(5);
      expect(k6Config.duration).toBe('1m');
    });

    it('should convert to Locust configuration', () => {
      const scenario = new Scenario({
        vus: 20,
        duration: '2m',
      });
      
      const locustConfig = scenario.toLocustConfig();
      expect(locustConfig.users).toBe(20);
      expect(locustConfig.runTime).toBe('2m');
    });

    it('should handle ramping-vus executor', () => {
      const scenario = new Scenario({
        executor: 'ramping-vus',
        vus: 10,
        rampUp: '30s',
        duration: '5m',
      });
      
      const k6Config = scenario.toK6Executor();
      expect(k6Config.executor).toBe('ramping-vus');
      expect(k6Config.stages).toHaveLength(3);
      expect(k6Config.stages[0].target).toBe(10);
    });
  });

  describe('Thresholds', () => {
    it('should create thresholds with default values', () => {
      const thresholds = new Thresholds();
      expect(thresholds.httpReqDuration).toBe('p(95)<500');
      expect(thresholds.httpReqFailed).toBe('rate<1%');
    });

    it('should convert to k6 thresholds', () => {
      const thresholds = new Thresholds({
        httpReqDuration: 'p(99)<1000',
        httpReqFailed: 'rate<0.5%',
      });
      
      const k6Thresholds = thresholds.toK6Thresholds();
      expect(k6Thresholds.http_req_duration).toEqual(['p(99)<1000']);
      expect(k6Thresholds.http_req_failed).toEqual(['rate<0.5%']);
    });

    it('should convert to Locust thresholds', () => {
      const thresholds = new Thresholds({
        httpReqDuration: 'p(95)<500',
        httpReqFailed: 'rate<1%',
      });
      
      const locustThresholds = thresholds.toLocustThresholds();
      expect(locustThresholds.response_time_p95).toBe(500);
      expect(locustThresholds.error_rate).toBe(0.01);
    });
  });

  describe('Auth', () => {
    it('should create auth with default values', () => {
      const auth = new Auth();
      expect(auth.type).toBe('none');
      expect(auth.endpoints).toEqual({});
    });

    it('should get Sanctum auth flow', () => {
      const auth = new Auth({
        type: 'sanctum',
        endpoints: {
          login: '/api/auth/login',
          refresh: '/api/auth/refresh',
        },
      });
      
      const flow = auth.getAuthFlow();
      expect(flow.login).toBe('/api/auth/login');
      expect(flow.tokenHeader).toBe('Authorization');
      expect(flow.tokenPrefix).toBe('Bearer');
    });

    it('should get CSRF auth flow', () => {
      const auth = new Auth({
        type: 'csrf',
        endpoints: {
          csrf: '/site/csrf',
        },
        headers: {
          csrf: 'X-CSRF-Token',
        },
        cookies: {
          csrf: '_csrf',
        },
      });
      
      const flow = auth.getAuthFlow();
      expect(flow.tokenEndpoint).toBe('/site/csrf');
      expect(flow.tokenHeader).toBe('X-CSRF-Token');
      expect(flow.tokenCookie).toBe('_csrf');
    });
  });

  describe('Request', () => {
    it('should create request with default values', () => {
      const request = new Request();
      expect(request.method).toBe('GET');
      expect(request.path).toBe('/');
      expect(request.headers).toEqual({});
    });

    it('should add authentication headers', () => {
      const request = new Request();
      const auth = {
        token: 'test-token',
        tokenHeader: 'Authorization',
        tokenPrefix: 'Bearer',
      };
      
      request.withAuth(auth);
      expect(request.headers.Authorization).toBe('Bearer test-token');
    });

    it('should add CSRF token', () => {
      const request = new Request();
      request.withCSRF('csrf-token');
      expect(request.headers['X-CSRF-Token']).toBe('csrf-token');
    });
  });

  describe('TestConfig', () => {
    it('should create test config with default values', () => {
      const config = new TestConfig();
      expect(config.target).toBeInstanceOf(Target);
      expect(config.scenarios).toHaveLength(0);
      expect(config.thresholds).toBeInstanceOf(Thresholds);
      expect(config.auth).toBeInstanceOf(Auth);
    });

    it('should validate configuration', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
      });
      
      expect(() => config.validate()).not.toThrow();
    });

    it('should get scenario by name', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [
          { name: 'smoke', vus: 1 },
          { name: 'load', vus: 10 },
        ],
      });
      
      const smokeScenario = config.getScenario('smoke');
      expect(smokeScenario.name).toBe('smoke');
      expect(smokeScenario.vus).toBe(1);
    });

    it('should get default scenario if name not found', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ name: 'smoke', vus: 1 }],
      });
      
      const scenario = config.getScenario('nonexistent');
      expect(scenario.name).toBe('smoke');
    });
  });
});
