import { BaseBackend, BackendRegistry } from './base.js';

// Mock backend for testing
class MockBackend extends BaseBackend {
  constructor(name = 'mock') {
    super();
    this.name = name;
  }

  getName() {
    return this.name;
  }

  getSupportedFeatures() {
    return { test: true };
  }

  validateConfig() {
    return true;
  }

  getFileExtension() {
    return '.test';
  }

  getDefaultFilename() {
    return 'test.test';
  }

  generate() {
    return 'test script';
  }
}

describe('Base Backend Classes', () => {
  describe('BaseBackend', () => {
    it('should not allow instantiation of abstract class', () => {
      expect(() => new BaseBackend()).toThrow('BaseBackend is abstract and cannot be instantiated');
    });

    it('should allow instantiation of concrete subclass', () => {
      expect(() => new MockBackend()).not.toThrow();
    });
  });

  describe('BackendRegistry', () => {
    let registry;

    beforeEach(() => {
      registry = new BackendRegistry();
    });

    it('should register a backend', () => {
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.has('mock')).toBe(true);
    });

    it('should reject non-BaseBackend instances', () => {
      const invalidBackend = { getName: () => 'invalid' };
      expect(() => registry.register(invalidBackend)).toThrow('Backend must extend BaseBackend');
    });

    it('should get backend by name', () => {
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.get('mock')).toBe(backend);
    });

    it('should throw error for non-existent backend', () => {
      expect(() => registry.get('nonexistent')).toThrow('Backend \'nonexistent\' not found');
    });

    it('should get all registered backends', () => {
      const backend1 = new MockBackend('mock1');
      const backend2 = new MockBackend('mock2');
      registry.register(backend1);
      registry.register(backend2);
      
      const all = registry.getAll();
      expect(all.size).toBe(2);
      expect(all.has('mock1')).toBe(true);
      expect(all.has('mock2')).toBe(true);
    });

    it('should get backend names', () => {
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.getNames()).toEqual(['mock']);
    });

    it('should check if backend exists', () => {
      expect(registry.has('mock')).toBe(false);
      
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.has('mock')).toBe(true);
    });

    it('should get default backend', () => {
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.getDefault()).toBe(backend);
    });

    it('should return first backend if no default found', () => {
      const backend = new MockBackend();
      registry.register(backend);
      expect(registry.getDefault()).toBe(backend);
    });
  });
});
