import backendManager from './index.js';
import { TestConfig } from '../model/index.js';

describe('Backend Manager', () => {
  describe('Backend Registration', () => {
    it('should have k6 backend registered', () => {
      expect(backendManager.hasBackend('k6')).toBe(true);
    });

    it('should have locust backend registered', () => {
      expect(backendManager.hasBackend('locust')).toBe(true);
    });

    it('should list all backend names', () => {
      const names = backendManager.getBackendNames();
      expect(names).toContain('k6');
      expect(names).toContain('locust');
    });

    it('should get all backends', () => {
      const backends = backendManager.getAllBackends();
      expect(backends.size).toBe(2);
      expect(backends.has('k6')).toBe(true);
      expect(backends.has('locust')).toBe(true);
    });
  });

  describe('Backend Information', () => {
    it('should get k6 backend info', () => {
      const info = backendManager.getBackendInfo('k6');
      expect(info.name).toBe('k6');
      expect(info.extension).toBe('.js');
      expect(info.defaultFilename).toBe('k6-test.js');
      expect(info.deprecated).toBe(false);
    });

    it('should get locust backend info', () => {
      const info = backendManager.getBackendInfo('locust');
      expect(info.name).toBe('locust');
      expect(info.extension).toBe('.py');
      expect(info.defaultFilename).toBe('locustfile.py');
      expect(info.deprecated).toBe(true);
    });

    it('should throw error for non-existent backend', () => {
      expect(() => backendManager.getBackendInfo('nonexistent')).toThrow();
    });
  });

  describe('Backend Comparison', () => {
    it('should provide backend comparison', () => {
      const comparison = backendManager.getBackendComparison();
      
      expect(comparison.k6).toBeDefined();
      expect(comparison.locust).toBeDefined();
      
      expect(comparison.k6.recommended).toBe(true);
      expect(comparison.locust.recommended).toBe(false);
      
      expect(comparison.k6.deprecated).toBe(false);
      expect(comparison.locust.deprecated).toBe(true);
    });

    it('should show k6 as recommended', () => {
      const comparison = backendManager.getBackendComparison();
      expect(comparison.k6.recommended).toBe(true);
    });

    it('should show locust as deprecated', () => {
      const comparison = backendManager.getBackendComparison();
      expect(comparison.locust.deprecated).toBe(true);
    });
  });

  describe('Test Generation', () => {
    let testConfig;

    beforeEach(() => {
      testConfig = new TestConfig({
        target: { url: 'https://example.com' },
        scenarios: [{ name: 'smoke', vus: 5, duration: '1m' }],
      });
    });

    it('should generate test with k6 backend', () => {
      const result = backendManager.generateTest('k6', testConfig);
      
      expect(result.backend).toBe('k6');
      expect(result.filename).toBe('k6-test.js');
      expect(result.extension).toBe('.js');
      expect(result.script).toContain('import http from \'k6/http\'');
      expect(result.features.executors).toContain('constant-vus');
    });

    it('should generate test with locust backend', () => {
      const result = backendManager.generateTest('locust', testConfig);
      
      expect(result.backend).toBe('locust');
      expect(result.filename).toBe('locustfile.py');
      expect(result.extension).toBe('.py');
      expect(result.script).toContain('from locust import HttpUser, task, between, events');
      expect(result.features.executors).toContain('constant-vus');
    });

    it('should generate test with default backend (k6)', () => {
      const result = backendManager.generateDefaultTest(testConfig);
      
      expect(result.backend).toBe('k6');
      expect(result.filename).toBe('k6-test.js');
      expect(result.extension).toBe('.js');
    });

    it('should throw error for non-existent backend', () => {
      expect(() => backendManager.generateTest('nonexistent', testConfig)).toThrow(
        'Backend \'nonexistent\' not found'
      );
    });
  });

  describe('Default Backend', () => {
    it('should have k6 as default backend', () => {
      const defaultBackend = backendManager.getDefaultBackend();
      expect(defaultBackend.getName()).toBe('k6');
    });

    it('should get k6 backend by name', () => {
      const k6Backend = backendManager.getBackend('k6');
      expect(k6Backend.getName()).toBe('k6');
    });

    it('should get locust backend by name', () => {
      const locustBackend = backendManager.getBackend('locust');
      expect(locustBackend.getName()).toBe('locust');
    });
  });

  describe('Feature Support', () => {
    it('should show k6 feature support', () => {
      const k6Backend = backendManager.getBackend('k6');
      const features = k6Backend.getSupportedFeatures();
      
      expect(features.executors).toContain('constant-vus');
      expect(features.executors).toContain('ramping-vus');
      expect(features.executors).toContain('constant-arrival-rate');
      expect(features.executors).toContain('ramping-arrival-rate');
      expect(features.auth).toContain('sanctum');
      expect(features.auth).toContain('jwt');
      expect(features.auth).toContain('csrf');
      expect(features.auth).toContain('session');
      expect(features.frameworks).toContain('laravel');
      expect(features.frameworks).toContain('yii');
      expect(features.frameworks).toContain('generic');
      expect(features.tags).toBe(true);
      expect(features.checks).toBe(true);
      expect(features.thresholds).toBe(true);
    });

    it('should show locust feature support', () => {
      const locustBackend = backendManager.getBackend('locust');
      const features = locustBackend.getSupportedFeatures();
      
      expect(features.executors).toEqual(['constant-vus', 'ramping-vus']);
      expect(features.auth).toEqual(['session', 'none']);
      expect(features.frameworks).toEqual(['generic']);
      expect(features.tags).toBe(false);
      expect(features.checks).toBe(true);
      expect(features.thresholds).toBe(false);
    });
  });
});
