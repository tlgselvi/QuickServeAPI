import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnvironment, maskSensitiveValue, logEnvironmentConfig } from '../../server/utils/env-validation.js';

// Mock process.env
const originalEnv = process.env;

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should validate a complete development environment', () => {
      process.env = {
        NODE_ENV: 'development',
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev_jwt_secret_key_for_development_only_32_chars',
        JWT_EXPIRES_IN: '24h',
        API_PORT: '5000',
        CORS_ORIGIN: 'http://localhost:5000',
        BCRYPT_ROUNDS: '10',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        LOG_LEVEL: 'debug',
        ENABLE_ALERTS: 'true',
        ENABLE_NOTIFICATIONS: 'true',
        ENABLE_MONTE_CARLO: 'true',
        ENABLE_SCENARIOS: 'true',
        ENABLE_REPORTS: 'true',
        DEFAULT_CURRENCY: 'TRY',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '50',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '1800',
      };

      const result = validateEnvironment();
      
      expect(result.NODE_ENV).toBe('development');
      expect(result.DATABASE_URL).toBe('file:./dev.db');
      expect(result.JWT_SECRET).toBe('dev_jwt_secret_key_for_development_only_32_chars');
      expect(result.API_PORT).toBe(5000);
      expect(result.CORS_ORIGIN).toBe('http://localhost:5000');
      expect(result.BCRYPT_ROUNDS).toBe(10);
      expect(result.ENABLE_ALERTS).toBe(true);
      expect(result.DEFAULT_CURRENCY).toBe('TRY');
    });

    it('should validate a production environment', () => {
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/finbot',
        JWT_SECRET: 'production_super_secure_jwt_secret_key_here_2024',
        API_PORT: '3000',
        CORS_ORIGIN: 'https://finbot.example.com',
        BCRYPT_ROUNDS: '12',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        LOG_LEVEL: 'info',
        ENABLE_ALERTS: 'true',
        ENABLE_NOTIFICATIONS: 'false',
        ENABLE_MONTE_CARLO: 'true',
        ENABLE_SCENARIOS: 'true',
        ENABLE_REPORTS: 'true',
        DEFAULT_CURRENCY: 'TRY',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '100',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '3600',
      };

      const result = validateEnvironment();
      
      expect(result.NODE_ENV).toBe('production');
      expect(result.API_PORT).toBe(3000);
      expect(result.BCRYPT_ROUNDS).toBe(12);
      expect(result.ENABLE_NOTIFICATIONS).toBe(false);
    });

    it('should use default values for optional fields', () => {
      // Mock process.exit to prevent actual exit
      const originalExit = process.exit;
      process.exit = vi.fn() as any;

      process.env = {
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev_jwt_secret_key_for_development_only_32_chars',
        API_PORT: '5000',
        CORS_ORIGIN: 'http://localhost:5000',
        BCRYPT_ROUNDS: '10',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '50',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '1800',
      };

      const result = validateEnvironment();
      
      expect(result.NODE_ENV).toBe('development');
      expect(result.JWT_EXPIRES_IN).toBe('24h');
      expect(result.JWT_REFRESH_EXPIRES_IN).toBe('7d');
      expect(result.API_HOST).toBe('0.0.0.0');
      expect(result.LOG_LEVEL).toBe('info');
      expect(result.ENABLE_ALERTS).toBe(true);
      expect(result.DEFAULT_CURRENCY).toBe('TRY');

      // Restore original process.exit
      process.exit = originalExit;
    });

    it('should throw error for missing required fields', () => {
      process.env = {
        NODE_ENV: 'development',
        // Missing DATABASE_URL and JWT_SECRET
      };

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error for invalid JWT_SECRET length', () => {
      process.env = {
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'short', // Too short
        API_PORT: '5000',
        CORS_ORIGIN: 'http://localhost:5000',
        BCRYPT_ROUNDS: '10',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '50',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '1800',
      };

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error for invalid API_PORT range', () => {
      process.env = {
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev_jwt_secret_key_for_development_only_32_chars',
        API_PORT: '999', // Too low
        CORS_ORIGIN: 'http://localhost:5000',
        BCRYPT_ROUNDS: '10',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '50',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '1800',
      };

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error for invalid CORS_ORIGIN URL', () => {
      process.env = {
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev_jwt_secret_key_for_development_only_32_chars',
        API_PORT: '5000',
        CORS_ORIGIN: 'invalid-url', // Invalid URL
        BCRYPT_ROUNDS: '10',
        RATE_LIMIT_WINDOW: '15',
        RATE_LIMIT_MAX: '100',
        VAT_RATE: '0.20',
        SGK_RATE: '0.15',
        MAX_CONCURRENT_REQUESTS: '50',
        REQUEST_TIMEOUT: '30000',
        CACHE_TTL: '1800',
      };

      expect(() => validateEnvironment()).toThrow();
    });
  });

  describe('maskSensitiveValue', () => {
    it('should mask long values correctly', () => {
      const value = 'super_secret_jwt_key_here_2024';
      const masked = maskSensitiveValue(value, 4);
      expect(masked).toBe('supe**************************');
    });

    it('should mask short values completely', () => {
      const value = 'short';
      const masked = maskSensitiveValue(value, 4);
      expect(masked).toBe('shor*');
    });

    it('should handle empty strings', () => {
      const value = '';
      const masked = maskSensitiveValue(value, 4);
      expect(masked).toBe('');
    });
  });

  describe('logEnvironmentConfig', () => {
    it('should not throw when logging environment config', () => {
      const env = {
        NODE_ENV: 'development' as const,
        DATABASE_URL: 'file:./dev.db',
        JWT_SECRET: 'dev_jwt_secret_key_for_development_only_32_chars',
        JWT_EXPIRES_IN: '24h',
        JWT_REFRESH_EXPIRES_IN: '7d',
        API_PORT: 5000,
        API_HOST: '0.0.0.0',
        CORS_ORIGIN: 'http://localhost:5000',
        BCRYPT_ROUNDS: 10,
        RATE_LIMIT_WINDOW: 15,
        RATE_LIMIT_MAX: 100,
        LOG_LEVEL: 'info' as const,
        ENABLE_ALERTS: true,
        ENABLE_NOTIFICATIONS: true,
        ENABLE_MONTE_CARLO: true,
        ENABLE_SCENARIOS: true,
        ENABLE_REPORTS: true,
        DEFAULT_CURRENCY: 'TRY',
        VAT_RATE: 0.20,
        SGK_RATE: 0.15,
        MAX_CONCURRENT_REQUESTS: 50,
        REQUEST_TIMEOUT: 30000,
        CACHE_TTL: 1800,
      };

      expect(() => logEnvironmentConfig(env)).not.toThrow();
    });
  });
});
