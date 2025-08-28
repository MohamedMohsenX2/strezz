import LocustBackend from './locust.js';
import { TestConfig } from '../model/index.js';

describe('Locust Backend', () => {
  let backend;

  beforeEach(() => {
    backend = new LocustBackend();
  });

  describe('Basic Properties', () => {
    it('should have correct name', () => {
      expect(backend.getName()).toBe('locust');
    });

    it('should have correct file extension', () => {
      expect(backend.getFileExtension()).toBe('.py');
    });

    it('should have correct default filename', () => {
      expect(backend.getDefaultFilename()).toBe('locustfile.py');
    });

    it('should have limited feature support', () => {
      const features = backend.getSupportedFeatures();
      expect(features.executors).toEqual(['constant-vus', 'ramping-vus']);
      expect(features.auth).toEqual(['session', 'none']);
      expect(features.frameworks).toEqual(['generic']);
      expect(features.tags).toBe(false);
      expect(features.thresholds).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate compatible configuration', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        auth: { type: 'session' },
        scenarios: [{ executor: 'constant-vus' }],
      });

      expect(backend.validateConfig(config)).toBe(true);
    });
  });

  describe('Test Generation', () => {
    it('should generate basic Locust script', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ name: 'smoke', vus: 5, duration: '1m' }],
      });

      const result = backend.generate(config);
      expect(result).toContain('from locust import HttpUser, task, between, events');
      expect(result).toContain('class StrezzUser(HttpUser):');
      expect(result).toContain('wait_time = between(1, 3)');
      expect(result).toContain('Users: 5');
      expect(result).toContain('Run time: 1m');
    });

    it('should generate script with session authentication', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        auth: { type: 'session' },
        scenarios: [{ name: 'smoke', vus: 1, duration: '10s' }],
      });

      const result = backend.generate(config);
      expect(result).toContain('def on_start(self):');
      expect(result).toContain('Session-based authentication');
      expect(result).toContain('login_data');
      expect(result).toContain('test@example.com');
    });

    it('should generate script with custom requests', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ name: 'smoke', vus: 1, duration: '10s' }],
        requests: [
          { method: 'GET', path: '/api/users' },
          { method: 'POST', path: '/api/users', body: { name: 'Test User' } },
        ],
      });

      const result = backend.generate(config);
      expect(result).toContain('@task(1)');
      expect(result).toContain('def get_1(self):');
      expect(result).toContain('@task(2)');
      expect(result).toContain('def post_2(self):');
      expect(result).toContain('"name":"Test User"');
    });

    it('should generate example task when no requests defined', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ name: 'smoke', vus: 1, duration: '10s' }],
        requests: [],
      });

      const result = backend.generate(config);
      expect(result).toContain('@task(1)');
      expect(result).toContain('def index_page(self):');
      expect(result).toContain('Basic index page test');
    });
  });

  describe('Authentication Functions', () => {
    it('should generate no auth setup for none type', () => {
      const auth = { type: 'none' };
      const target = { baseURL: 'https://example.com' };
      const setup = backend.generateOnStartFunction(auth, target);
      expect(setup).toContain('pass');
    });

    it('should generate session auth setup', () => {
      const auth = { type: 'session' };
      const target = { baseURL: 'https://example.com' };
      const setup = backend.generateOnStartFunction(auth, target);
      expect(setup).toContain('Session-based authentication');
      expect(setup).toContain('login_data');
      expect(setup).toContain('test@example.com');
      expect(setup).toContain('password');
    });

    it('should generate cleanup function for session auth', () => {
      const auth = { type: 'session' };
      const cleanup = backend.generateOnStopFunction(auth);
      expect(cleanup).toContain('Cleanup authentication');
      expect(cleanup).toContain('session_id');
      expect(cleanup).toContain('/logout');
    });

    it('should generate no cleanup for none auth', () => {
      const auth = { type: 'none' };
      const cleanup = backend.generateOnStopFunction(auth);
      expect(cleanup).toContain('pass');
    });
  });

  describe('Task Generation', () => {
    it('should generate tasks from requests', () => {
      const requests = [
        { method: 'GET', path: '/api/users' },
        { method: 'POST', path: '/api/users', body: { name: 'Test' } },
      ];
      const auth = { type: 'none' };
      const tasks = backend.generateTasks(requests, auth);
      expect(tasks).toContain('@task(1)');
      expect(tasks).toContain('def get_1(self):');
      expect(tasks).toContain('@task(2)');
      expect(tasks).toContain('def post_2(self):');
      expect(tasks).toContain('"name":"Test"');
    });

    it('should generate headers with session auth', () => {
      const headers = { 'Content-Type': 'application/json' };
      const auth = { type: 'session' };
      const result = backend.generateHeaders(headers, auth);
      expect(result['Cookie']).toBe('session=${sessionId}');
      expect(result['Content-Type']).toBe('application/json');
    });

    it('should generate checks from request checks', () => {
      const checks = [
        { name: 'status check', condition: 'r.status_code == 200' },
        { name: 'content check', condition: 'r.json()' },
      ];
      const result = backend.generateChecks(checks);
      expect(result).toContain('status check: r.status_code == 200');
      expect(result).toContain('content check: r.json()');
    });

    it('should handle string checks', () => {
      const checks = ['simple check'];
      const result = backend.generateChecks(checks);
      expect(result).toContain('simple check');
    });
  });

  describe('Configuration Conversion', () => {
    it('should convert scenario to Locust config', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ vus: 20, duration: '2m' }],
      });

      const result = backend.generate(config);
      expect(result).toContain('Users: 20');
      expect(result).toContain('Run time: 2m');
    });

    it('should handle rate-based scenarios', () => {
      const config = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ vus: 100, rate: 50 }],
      });

      const result = backend.generate(config);
      expect(result).toContain('Spawn rate: 5'); // rate / 10
    });
  });
});
