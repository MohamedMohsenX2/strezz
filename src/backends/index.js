import { BackendRegistry } from './base.js';
import K6Backend from './k6.js';
import LocustBackend from './locust.js';

/**
 * Main backend manager
 * Registers and manages all available backend adapters
 */
export class BackendManager {
  constructor() {
    this.registry = new BackendRegistry();
    this.registerDefaultBackends();
  }

  /**
   * Register default backend adapters
   */
  registerDefaultBackends() {
    // Register k6 as the default backend
    this.registry.register(new K6Backend());
    
    // Register Locust as deprecated backend
    this.registry.register(new LocustBackend());
  }

  /**
   * Get backend by name
   * @param {string} name - Backend name
   * @returns {BaseBackend} Backend instance
   */
  getBackend(name) {
    return this.registry.get(name);
  }

  /**
   * Get default backend (k6)
   * @returns {BaseBackend} Default backend instance
   */
  getDefaultBackend() {
    return this.registry.getDefault();
  }

  /**
   * Get all available backends
   * @returns {Map} Map of backend names to instances
   */
  getAllBackends() {
    return this.registry.getAll();
  }

  /**
   * Get list of backend names
   * @returns {string[]} Array of backend names
   */
  getBackendNames() {
    return this.registry.getNames();
  }

  /**
   * Check if backend exists
   * @param {string} name - Backend name
   * @returns {boolean} True if backend exists
   */
  hasBackend(name) {
    return this.registry.has(name);
  }

  /**
   * Generate test script with specified backend
   * @param {string} backendName - Backend name
   * @param {TestConfig} config - Test configuration
   * @returns {Object} Generated test script and metadata
   */
  generateTest(backendName, config) {
    const backend = this.getBackend(backendName);
    
    // Validate configuration compatibility
    if (!backend.validateConfig(config)) {
      throw new Error(`Configuration not compatible with ${backendName} backend`);
    }
    
    // Generate test script
    const script = backend.generate(config);
    
    return {
      script,
      backend: backendName,
      filename: backend.getDefaultFilename(),
      extension: backend.getFileExtension(),
      features: backend.getSupportedFeatures(),
    };
  }

  /**
   * Generate test with default backend (k6)
   * @param {TestConfig} config - Test configuration
   * @returns {Object} Generated test script and metadata
   */
  generateDefaultTest(config) {
    return this.generateTest('k6', config);
  }

  /**
   * Get backend information
   * @param {string} name - Backend name
   * @returns {Object} Backend information
   */
  getBackendInfo(name) {
    const backend = this.getBackend(name);
    return {
      name: backend.getName(),
      features: backend.getSupportedFeatures(),
      extension: backend.getFileExtension(),
      defaultFilename: backend.getDefaultFilename(),
      deprecated: name === 'locust',
    };
  }

  /**
   * Get comparison of all backends
   * @returns {Object} Backend comparison
   */
  getBackendComparison() {
    const comparison = {};
    
    for (const [name, backend] of this.registry.getAll()) {
      comparison[name] = {
        name: backend.getName(),
        features: backend.getSupportedFeatures(),
        extension: backend.getFileExtension(),
        deprecated: name === 'locust',
        recommended: name === 'k6',
      };
    }
    
    return comparison;
  }
}

// Create singleton instance
const backendManager = new BackendManager();

export default backendManager;
