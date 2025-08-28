/**
 * Base backend adapter interface
 * All backend adapters must implement this interface
 */

export class BaseBackend {
  constructor() {
    if (this.constructor === BaseBackend) {
      throw new Error('BaseBackend is abstract and cannot be instantiated');
    }
  }

  /**
   * Generate test script from configuration
   * @param {TestConfig} config - Test configuration
   * @returns {string} Generated test script
   */
  generate(config) {
    throw new Error('generate method must be implemented');
  }

  /**
   * Get backend name
   * @returns {string} Backend name
   */
  getName() {
    throw new Error('getName method must be implemented');
  }

  /**
   * Get supported features
   * @returns {Object} Supported features
   */
  getSupportedFeatures() {
    throw new Error('getSupportedFeatures method must be implemented');
  }

  /**
   * Validate configuration compatibility
   * @param {TestConfig} config - Test configuration
   * @returns {boolean} True if compatible
   */
  validateConfig(config) {
    throw new Error('validateConfig method must be implemented');
  }

  /**
   * Get file extension for generated files
   * @returns {string} File extension
   */
  getFileExtension() {
    throw new Error('getFileExtension method must be implemented');
  }

  /**
   * Get default filename
   * @returns {string} Default filename
   */
  getDefaultFilename() {
    throw new Error('getDefaultFilename method must be implemented');
  }
}

/**
 * Backend registry for managing available backends
 */
export class BackendRegistry {
  constructor() {
    this.backends = new Map();
  }

  /**
   * Register a backend
   * @param {BaseBackend} backend - Backend instance
   */
  register(backend) {
    if (!(backend instanceof BaseBackend)) {
      throw new Error('Backend must extend BaseBackend');
    }
    
    const name = backend.getName();
    this.backends.set(name, backend);
  }

  /**
   * Get backend by name
   * @param {string} name - Backend name
   * @returns {BaseBackend} Backend instance
   */
  get(name) {
    const backend = this.backends.get(name);
    if (!backend) {
      throw new Error(`Backend '${name}' not found. Available: ${Array.from(this.backends.keys()).join(', ')}`);
    }
    return backend;
  }

  /**
   * Get all registered backends
   * @returns {Map} Map of backend names to instances
   */
  getAll() {
    return new Map(this.backends);
  }

  /**
   * Get backend names
   * @returns {string[]} Array of backend names
   */
  getNames() {
    return Array.from(this.backends.keys());
  }

  /**
   * Check if backend exists
   * @param {string} name - Backend name
   * @returns {boolean} True if backend exists
   */
  has(name) {
    return this.backends.has(name);
  }

  /**
   * Get default backend
   * @returns {BaseBackend} Default backend
   */
  getDefault() {
    return this.backends.get('k6') || this.backends.values().next().value;
  }
}

export default {
  BaseBackend,
  BackendRegistry,
};
