/**
 * JWT Test Configuration
 * Centralized configuration for JWT-related tests
 */

export const JWT_TEST_CONFIG = {
  // Test JWT Secret (different from production)
  JWT_SECRET: 'test-jwt-secret-for-all-jwt-tests',
  
  // Test Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/finbot_test',
  
  // Test User Configuration
  TEST_USERS: {
    ADMIN: {
      id: 'test-admin-user',
      email: 'admin@test.com',
      password: 'AdminTest123!',
      role: 'ADMIN',
      permissions: ['READ', 'WRITE', 'ADMIN']
    },
    USER: {
      id: 'test-user-user',
      email: 'user@test.com',
      password: 'UserTest123!',
      role: 'USER',
      permissions: ['READ', 'WRITE']
    },
    GUEST: {
      id: 'test-guest-user',
      email: 'guest@test.com',
      password: 'GuestTest123!',
      role: 'GUEST',
      permissions: ['READ']
    }
  },

  // Performance Test Configuration
  PERFORMANCE: {
    TOKEN_GENERATION: {
      ITERATIONS: 100,
      MAX_TIME_MS: 5000,
      MAX_AVERAGE_TIME_MS: 50
    },
    TOKEN_REFRESH: {
      ITERATIONS: 50,
      MAX_TIME_MS: 3000,
      MAX_AVERAGE_TIME_MS: 60
    },
    TOKEN_REVOCATION: {
      ITERATIONS: 20,
      MAX_TIME_MS: 2000,
      MAX_AVERAGE_TIME_MS: 100
    },
    TOKEN_VERIFICATION: {
      ITERATIONS: 200,
      MAX_TIME_MS: 1000,
      MAX_AVERAGE_TIME_MS: 5
    },
    CONCURRENT_REQUESTS: 20,
    MEMORY_TEST_ITERATIONS: 1000,
    MAX_MEMORY_INCREASE_MB: 50
  },

  // Test Data Configuration
  TEST_DATA: {
    IP_ADDRESSES: [
      '192.168.1.1',
      '192.168.1.2',
      '10.0.0.1',
      '172.16.0.1',
      '127.0.0.1'
    ],
    USER_AGENTS: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Android 10; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0'
    ],
    TOKEN_FAMILIES: [
      'family-123',
      'family-456',
      'family-789',
      'family-abc',
      'family-def'
    ]
  },

  // Test Timeouts
  TIMEOUTS: {
    UNIT_TEST: 5000,
    INTEGRATION_TEST: 10000,
    PERFORMANCE_TEST: 30000,
    API_TEST: 15000
  },

  // Test Cleanup Configuration
  CLEANUP: {
    BATCH_SIZE: 100,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },

  // Mock Configuration
  MOCKS: {
    DATABASE_RESPONSE_DELAY_MS: 10,
    JWT_VERIFICATION_DELAY_MS: 1,
    EMAIL_SEND_DELAY_MS: 50
  }
};

// Helper functions for tests
export const JWT_TEST_HELPERS = {
  /**
   * Generate random test metadata
   */
  generateTestMetadata: (overrides: Partial<{
    userId: string;
    ipAddress: string;
    userAgent: string;
  }> = {}) => ({
    userId: overrides.userId || `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ipAddress: overrides.ipAddress || JWT_TEST_CONFIG.TEST_DATA.IP_ADDRESSES[
      Math.floor(Math.random() * JWT_TEST_CONFIG.TEST_DATA.IP_ADDRESSES.length)
    ],
    userAgent: overrides.userAgent || JWT_TEST_CONFIG.TEST_DATA.USER_AGENTS[
      Math.floor(Math.random() * JWT_TEST_CONFIG.TEST_DATA.USER_AGENTS.length)
    ]
  }),

  /**
   * Generate multiple test users
   */
  generateTestUsers: (count: number) => {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        id: `test-user-${Date.now()}-${i}`,
        email: `test-${Date.now()}-${i}@example.com`,
        password: 'TestPassword123!',
        name: `Test User ${i}`,
        role: 'USER'
      });
    }
    return users;
  },

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> => {
    const startTime = Date.now();
    const result = await fn();
    const endTime = Date.now();
    return {
      result,
      timeMs: endTime - startTime
    };
  },

  /**
   * Generate test token family
   */
  generateTokenFamily: () => 
    JWT_TEST_CONFIG.TEST_DATA.TOKEN_FAMILIES[
      Math.floor(Math.random() * JWT_TEST_CONFIG.TEST_DATA.TOKEN_FAMILIES.length)
    ],

  /**
   * Create test database connection string
   */
  createTestDatabaseUrl: (testName: string) => 
    `${JWT_TEST_CONFIG.DATABASE_URL}_${testName.replace(/[^a-zA-Z0-9]/g, '_')}`,

  /**
   * Validate JWT token structure
   */
  validateTokenStructure: (token: string): boolean => {
    try {
      const parts = token.split('.');
      return parts.length === 3 && parts.every(part => part.length > 0);
    } catch {
      return false;
    }
  },

  /**
   * Generate test error scenarios
   */
  generateErrorScenarios: () => [
    { name: 'Invalid Token', token: 'invalid.token.here' },
    { name: 'Malformed Token', token: 'not-a-jwt-token' },
    { name: 'Empty Token', token: '' },
    { name: 'Null Token', token: null as any },
    { name: 'Undefined Token', token: undefined as any },
    { name: 'Expired Token', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwLCJ0eXBlIjoiYWNjZXNzIn0.invalid' }
  ]
};

// Test data factories
export const JWT_TEST_FACTORIES = {
  /**
   * Create a test user with all required fields
   */
  createTestUser: (overrides: Partial<{
    id: string;
    email: string;
    password: string;
    name: string;
    role: string;
  }> = {}) => ({
    id: overrides.id || `test-user-${Date.now()}`,
    email: overrides.email || `test-${Date.now()}@example.com`,
    password: overrides.password || 'TestPassword123!',
    name: overrides.name || 'Test User',
    role: overrides.role || 'USER',
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  /**
   * Create a test user profile
   */
  createTestUserProfile: (userId: string, overrides: Partial<{
    role: string;
    permissions: string[];
  }> = {}) => ({
    userId,
    role: overrides.role || 'USER',
    permissions: overrides.permissions || ['READ', 'WRITE'],
    createdAt: new Date(),
    updatedAt: new Date()
  }),

  /**
   * Create test refresh token data
   */
  createTestRefreshToken: (userId: string, overrides: Partial<{
    token: string;
    expiresAt: Date;
    familyId: string;
    ipAddress: string;
    userAgent: string;
  }> = {}) => ({
    userId,
    token: overrides.token || `test-refresh-token-${Date.now()}`,
    expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    familyId: overrides.familyId || JWT_TEST_HELPERS.generateTokenFamily(),
    ipAddress: overrides.ipAddress || '192.168.1.1',
    userAgent: overrides.userAgent || 'Mozilla/5.0 (Test Browser)',
    createdAt: new Date(),
    lastUsedAt: new Date(),
    isRevoked: false
  })
};

export default JWT_TEST_CONFIG;
