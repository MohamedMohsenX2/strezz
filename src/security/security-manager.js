/**
 * Security Manager
 * 
 * This module provides comprehensive security features including authentication,
 * authorization, rate limiting, input validation, and security headers.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { readFileSync, existsSync } from 'fs';

/**
 * Security Manager Class
 */
export class SecurityManager {
  constructor(options = {}) {
    this.options = {
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      enableHelmet: process.env.ENABLE_HELMET !== 'false',
      enableCORS: process.env.ENABLE_CORS !== 'false',
      enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
      ...options
    };
    
    this.users = new Map();
    this.sessions = new Map();
    this.blacklistedTokens = new Set();
    this.securityEvents = [];
    
    this.initializeSecurity();
  }

  /**
   * Initialize security features
   */
  initializeSecurity() {
    // Load users from configuration if available
    this.loadUsers();
    
    // Initialize security middleware
    this.middleware = {
      helmet: this.options.enableHelmet ? helmet() : null,
      cors: this.options.enableCORS ? this.createCORS() : null,
      rateLimit: this.options.enableRateLimit ? this.createRateLimit() : null,
      auth: this.authenticate.bind(this),
      authorize: this.authorize.bind(this),
      validateInput: this.validateInput.bind(this),
      sanitizeInput: this.sanitizeInput.bind(this),
      securityHeaders: this.setSecurityHeaders.bind(this)
    };
  }

  /**
   * Create CORS configuration
   */
  createCORS() {
    return cors({
      origin: (origin, callback) => {
        if (!origin || this.options.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count']
    });
  }

  /**
   * Create rate limiting
   */
  createRateLimit() {
    return rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.options.rateLimitWindow / 1000)
        });
      }
    });
  }

  /**
   * Load users from configuration
   */
  loadUsers() {
    try {
      const usersPath = process.env.USERS_CONFIG_PATH || './config/users.json';
      if (existsSync(usersPath)) {
        const usersData = JSON.parse(readFileSync(usersPath, 'utf8'));
        usersData.forEach(user => {
          this.users.set(user.username, {
            ...user,
            passwordHash: user.passwordHash || this.hashPassword(user.password)
          });
        });
      }
    } catch (error) {
      console.warn('Could not load users configuration:', error.message);
    }
  }

  /**
   * User authentication
   */
  async authenticate(username, password) {
    try {
      const user = this.users.get(username);
      if (!user) {
        this.logSecurityEvent('AUTH_FAILED', { username, reason: 'User not found' });
        return { success: false, error: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        this.logSecurityEvent('AUTH_FAILED', { username, reason: 'Invalid password' });
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate JWT token
      const token = this.generateJWT(user);
      
      // Create session
      const session = {
        id: crypto.randomUUID(),
        userId: user.id,
        username: user.username,
        roles: user.roles || [],
        createdAt: new Date(),
        lastActivity: new Date(),
        ip: null,
        userAgent: null
      };
      
      this.sessions.set(session.id, session);
      
      this.logSecurityEvent('AUTH_SUCCESS', { username, sessionId: session.id });
      
      return {
        success: true,
        token,
        sessionId: session.id,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles || []
        }
      };
      
    } catch (error) {
      this.logSecurityEvent('AUTH_ERROR', { username, error: error.message });
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Token validation and user authorization
   */
  async authorize(token, requiredRoles = []) {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        this.logSecurityEvent('AUTH_FAILED', { reason: 'Blacklisted token' });
        return { success: false, error: 'Invalid token' };
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.options.jwtSecret);
      
      // Find user
      const user = this.users.get(decoded.username);
      if (!user) {
        this.logSecurityEvent('AUTH_FAILED', { reason: 'User not found in token' });
        return { success: false, error: 'Invalid token' };
      }

      // Check if user is active
      if (user.status === 'inactive') {
        this.logSecurityEvent('AUTH_FAILED', { username: user.username, reason: 'Inactive user' });
        return { success: false, error: 'User account is inactive' };
      }

      // Check roles if required
      if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => 
          user.roles && user.roles.includes(role)
        );
        
        if (!hasRequiredRole) {
          this.logSecurityEvent('AUTH_FAILED', { 
            username: user.username, 
            reason: 'Insufficient permissions',
            requiredRoles,
            userRoles: user.roles
          });
          return { success: false, error: 'Insufficient permissions' };
        }
      }

      // Update session activity
      this.updateSessionActivity(decoded.sessionId);
      
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles || []
        }
      };
      
    } catch (error) {
      this.logSecurityEvent('AUTH_FAILED', { reason: 'Token validation failed', error: error.message });
      return { success: false, error: 'Invalid token' };
    }
  }

  /**
   * Generate JWT token
   */
  generateJWT(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      roles: user.roles || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (this.parseDuration(this.options.jwtExpiresIn))
    };
    
    return jwt.sign(payload, this.options.jwtSecret, {
      expiresIn: this.options.jwtExpiresIn,
      algorithm: 'HS256'
    });
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, this.options.bcryptRounds);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Input validation
   */
  validateInput(data, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        // Type validation
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }
        
        // Length validation
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters long`);
        }
        
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be no more than ${rules.maxLength} characters long`);
        }
        
        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} format is invalid`);
        }
        
        // Range validation
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be no more than ${rules.max}`);
        }
        
        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
        
        // Custom validation
        if (rules.custom) {
          const customResult = rules.custom(value, data);
          if (customResult !== true) {
            errors.push(customResult || `${field} validation failed`);
          }
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Input sanitization
   */
  sanitizeInput(input, type = 'string') {
    if (typeof input !== 'string') {
      return input;
    }
    
    switch (type) {
      case 'html':
        return this.sanitizeHTML(input);
      case 'sql':
        return this.sanitizeSQL(input);
      case 'url':
        return this.sanitizeURL(input);
      case 'email':
        return this.sanitizeEmail(input);
      case 'filename':
        return this.sanitizeFilename(input);
      default:
        return this.sanitizeString(input);
    }
  }

  /**
   * HTML sanitization
   */
  sanitizeHTML(input) {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * SQL injection prevention
   */
  sanitizeSQL(input) {
    // Remove SQL keywords and special characters
    const sqlKeywords = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|WHERE|AND|OR)\b)/gi;
    return input.replace(sqlKeywords, '');
  }

  /**
   * URL sanitization
   */
  sanitizeURL(input) {
    try {
      const url = new URL(input);
      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Email sanitization
   */
  sanitizeEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input) ? input.toLowerCase() : '';
  }

  /**
   * Filename sanitization
   */
  sanitizeFilename(input) {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * String sanitization
   */
  sanitizeString(input) {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-]/g, '');
  }

  /**
   * Set security headers
   */
  setSecurityHeaders(req, res, next) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', this.generateCSP());
    
    // HSTS header
    if (req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  }

  /**
   * Generate Content Security Policy
   */
  generateCSP() {
    const csp = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };
    
    return Object.entries(csp)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
  }

  /**
   * Log security events
   */
  logSecurityEvent(type, details) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      details,
      severity: this.getEventSeverity(type)
    };
    
    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${type}:`, details);
    }
  }

  /**
   * Get event severity
   */
  getEventSeverity(type) {
    const severityMap = {
      'AUTH_SUCCESS': 'info',
      'AUTH_FAILED': 'warning',
      'AUTH_ERROR': 'error',
      'RATE_LIMIT_EXCEEDED': 'warning',
      'PERMISSION_DENIED': 'warning',
      'INPUT_VALIDATION_FAILED': 'warning',
      'SECURITY_VIOLATION': 'error'
    };
    
    return severityMap[type] || 'info';
  }

  /**
   * Get security events
   */
  getSecurityEvents(filter = {}) {
    let events = [...this.securityEvents];
    
    if (filter.type) {
      events = events.filter(event => event.type === filter.type);
    }
    
    if (filter.severity) {
      events = events.filter(event => event.severity === filter.severity);
    }
    
    if (filter.startDate) {
      events = events.filter(event => new Date(event.timestamp) >= new Date(filter.startDate));
    }
    
    if (filter.endDate) {
      events = events.filter(event => new Date(event.timestamp) <= new Date(filter.endDate));
    }
    
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Blacklist token
   */
  blacklistToken(token) {
    this.blacklistedTokens.add(token);
    
    // Clean up expired tokens periodically
    setTimeout(() => {
      this.blacklistedTokens.delete(token);
    }, this.parseDuration(this.options.jwtExpiresIn) * 1000);
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Parse duration string to seconds
   */
  parseDuration(duration) {
    const units = {
      's': 1,
      'm': 60,
      'h': 60 * 60,
      'd': 24 * 60 * 60
    };
    
    const match = duration.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      return value * units[unit];
    }
    
    return 3600; // Default to 1 hour
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(
      event => new Date(event.timestamp) >= last24h
    );
    
    const stats = {
      totalEvents: this.securityEvents.length,
      eventsLast24h: recentEvents.length,
      activeSessions: this.sessions.size,
      blacklistedTokens: this.blacklistedTokens.size,
      eventTypes: {},
      severityDistribution: {}
    };
    
    // Count event types
    this.securityEvents.forEach(event => {
      stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
      stats.severityDistribution[event.severity] = (stats.severityDistribution[event.severity] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Export security configuration
   */
  exportConfig() {
    return {
      jwt: {
        secret: this.options.jwtSecret ? '[HIDDEN]' : undefined,
        expiresIn: this.options.jwtExpiresIn,
        algorithm: 'HS256'
      },
      bcrypt: {
        rounds: this.options.bcryptRounds
      },
      rateLimit: {
        windowMs: this.options.rateLimitWindow,
        max: this.options.rateLimitMax
      },
      cors: {
        origins: this.options.corsOrigins
      },
      features: {
        helmet: this.options.enableHelmet,
        cors: this.options.enableCORS,
        rateLimit: this.options.enableRateLimit
      }
    };
  }
}

export default SecurityManager;
