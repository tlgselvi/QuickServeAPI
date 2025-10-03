/**
 * Mock Factory for Test Utilities
 * Centralized mock creation and management for tests
 */

import { vi } from 'vitest';

export class MockFactory {
  /**
   * Create mock database instance
   */
  static createMockDatabase() {
    return {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
            orderBy: vi.fn(() => Promise.resolve([])),
            groupBy: vi.fn(() => Promise.resolve([]))
          })),
          orderBy: vi.fn(() => Promise.resolve([]))
        })),
        limit: vi.fn(() => Promise.resolve([])),
        offset: vi.fn(() => Promise.resolve([]))
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve([])),
        returning: vi.fn(() => Promise.resolve([]))
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
          returning: vi.fn(() => Promise.resolve([]))
        }))
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([]))
      })),
      execute: vi.fn(() => Promise.resolve({ rowCount: 0 }))
    };
  }

  /**
   * Create mock user data
   */
  static createMockUser(overrides: Partial<{
    id: string;
    email: string;
    password: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      id: overrides.id || 'test-user-id',
      email: overrides.email || 'test@example.com',
      password: overrides.password || 'hashed-password',
      name: overrides.name || 'Test User',
      role: overrides.role || 'USER',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date()
    };
  }

  /**
   * Create mock user profile data
   */
  static createMockUserProfile(overrides: Partial<{
    userId: string;
    role: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      userId: overrides.userId || 'test-user-id',
      role: overrides.role || 'USER',
      permissions: overrides.permissions || ['READ', 'WRITE'],
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date()
    };
  }

  /**
   * Create mock bank account data
   */
  static createMockBankAccount(overrides: Partial<{
    id: string;
    userId: string;
    name: string;
    type: string;
    balance: number;
    currency: string;
    accountNumber: string;
    iban: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      id: overrides.id || 'test-account-id',
      userId: overrides.userId || 'test-user-id',
      name: overrides.name || 'Test Account',
      type: overrides.type || 'checking',
      balance: overrides.balance || 10000.00,
      currency: overrides.currency || 'TRY',
      accountNumber: overrides.accountNumber || '1234567890',
      iban: overrides.iban || 'TR1234567890123456789012345',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date()
    };
  }

  /**
   * Create mock transaction data
   */
  static createMockTransaction(overrides: Partial<{
    id: string;
    userId: string;
    accountId: string;
    amount: number;
    currency: string;
    description: string;
    type: string;
    category: string;
    date: Date;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      id: overrides.id || 'test-transaction-id',
      userId: overrides.userId || 'test-user-id',
      accountId: overrides.accountId || 'test-account-id',
      amount: overrides.amount || 100.00,
      currency: overrides.currency || 'TRY',
      description: overrides.description || 'Test Transaction',
      type: overrides.type || 'debit',
      category: overrides.category || 'Expense',
      date: overrides.date || new Date(),
      balance: overrides.balance || 9900.00,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date()
    };
  }

  /**
   * Create mock bank integration data
   */
  static createMockBankIntegration(overrides: Partial<{
    id: string;
    userId: string;
    bankName: string;
    accountName: string;
    credentials: any;
    isActive: boolean;
    syncStatus: string;
    lastSyncAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }> = {}) {
    return {
      id: overrides.id || 'test-integration-id',
      userId: overrides.userId || 'test-user-id',
      bankName: overrides.bankName || 'Test Bank',
      accountName: overrides.accountName || 'Test Account',
      credentials: overrides.credentials || { username: 'test', password: 'test' },
      isActive: overrides.isActive ?? true,
      syncStatus: overrides.syncStatus || 'success',
      lastSyncAt: overrides.lastSyncAt || new Date(),
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date()
    };
  }

  /**
   * Create mock refresh token data
   */
  static createMockRefreshToken(overrides: Partial<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    lastUsedAt: Date;
    isRevoked: boolean;
    familyId: string;
    ipAddress: string;
    userAgent: string;
  }> = {}) {
    return {
      id: overrides.id || 'test-token-id',
      userId: overrides.userId || 'test-user-id',
      token: overrides.token || 'test-refresh-token',
      expiresAt: overrides.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: overrides.createdAt || new Date(),
      lastUsedAt: overrides.lastUsedAt || new Date(),
      isRevoked: overrides.isRevoked ?? false,
      familyId: overrides.familyId || 'test-family-id',
      ipAddress: overrides.ipAddress || '192.168.1.1',
      userAgent: overrides.userAgent || 'Mozilla/5.0 (Test Browser)'
    };
  }

  /**
   * Create mock JWT payload
   */
  static createMockJwtPayload(overrides: Partial<{
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    type: string;
    familyId: string;
    iat: number;
    exp: number;
  }> = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
      userId: overrides.userId || 'test-user-id',
      email: overrides.email || 'test@example.com',
      role: overrides.role || 'USER',
      permissions: overrides.permissions || ['READ', 'WRITE'],
      type: overrides.type || 'access',
      familyId: overrides.familyId || 'test-family-id',
      iat: overrides.iat || now,
      exp: overrides.exp || now + 3600 // 1 hour
    };
  }

  /**
   * Create mock API response
   */
  static createMockApiResponse<T>(
    data: T,
    overrides: Partial<{
      success: boolean;
      error: any;
      metadata: any;
    }> = {}
  ) {
    return {
      success: overrides.success ?? true,
      data: data,
      error: overrides.error,
      metadata: overrides.metadata || {
        requestId: 'test-request-id',
        timestamp: new Date()
      }
    };
  }

  /**
   * Create mock HTTP request
   */
  static createMockRequest(overrides: Partial<{
    method: string;
    url: string;
    headers: Record<string, string>;
    body: any;
    params: Record<string, string>;
    query: Record<string, string>;
    user: any;
  }> = {}) {
    return {
      method: overrides.method || 'GET',
      url: overrides.url || '/api/test',
      headers: overrides.headers || { 'content-type': 'application/json' },
      body: overrides.body || {},
      params: overrides.params || {},
      query: overrides.query || {},
      user: overrides.user || this.createMockUser()
    };
  }

  /**
   * Create mock HTTP response
   */
  static createMockResponse() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      redirect: vi.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  }

  /**
   * Create mock Express app
   */
  static createMockApp() {
    return {
      use: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      listen: vi.fn(),
      set: vi.fn(),
      get: vi.fn()
    };
  }

  /**
   * Create mock email service
   */
  static createMockEmailService() {
    return {
      sendEmail: vi.fn(() => Promise.resolve({ success: true })),
      sendPasswordResetEmail: vi.fn(() => Promise.resolve({ success: true })),
      sendVerificationEmail: vi.fn(() => Promise.resolve({ success: true })),
      sendNotificationEmail: vi.fn(() => Promise.resolve({ success: true }))
    };
  }

  /**
   * Create mock file upload
   */
  static createMockFileUpload(overrides: Partial<{
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }> = {}) {
    return {
      fieldname: overrides.fieldname || 'file',
      originalname: overrides.originalname || 'test.csv',
      encoding: overrides.encoding || '7bit',
      mimetype: overrides.mimetype || 'text/csv',
      size: overrides.size || 1024,
      buffer: overrides.buffer || Buffer.from('test,data\n1,2')
    };
  }

  /**
   * Create mock bank provider
   */
  static createMockBankProvider() {
    return {
      validateCredentials: vi.fn(() => Promise.resolve({ success: true, data: true })),
      getAccounts: vi.fn(() => Promise.resolve({ success: true, data: [] })),
      getAccount: vi.fn(() => Promise.resolve({ success: true, data: null })),
      getTransactions: vi.fn(() => Promise.resolve({ success: true, data: [] })),
      getTransaction: vi.fn(() => Promise.resolve({ success: true, data: null })),
      syncData: vi.fn(() => Promise.resolve({ success: true, data: { accountsUpdated: 0, transactionsCount: 0 } })),
      createTransfer: vi.fn(() => Promise.resolve({ success: true, data: null })),
      getTransfer: vi.fn(() => Promise.resolve({ success: true, data: null })),
      getCards: vi.fn(() => Promise.resolve({ success: true, data: [] })),
      updateCardStatus: vi.fn(() => Promise.resolve({ success: true, data: null })),
      getBalance: vi.fn(() => Promise.resolve({ success: true, data: 0 })),
      getStatement: vi.fn(() => Promise.resolve({ success: true, data: Buffer.from('test') })),
      setupWebhook: vi.fn(() => Promise.resolve({ success: true, data: { webhookId: 'test', secret: 'test' } })),
      verifyWebhook: vi.fn(() => Promise.resolve(true)),
      handleWebhook: vi.fn(() => Promise.resolve({ success: true, data: {} })),
      refreshToken: vi.fn(() => Promise.resolve({ success: true, data: { token: 'test', expiresAt: new Date() } })),
      revokeAuth: vi.fn(() => Promise.resolve({ success: true, data: true })),
      getProviderName: vi.fn(() => 'Mock Provider'),
      getSupportedFeatures: vi.fn(() => ['accounts', 'transactions']),
      supportsFeature: vi.fn(() => true),
      getRateLimits: vi.fn(() => ({ requestsPerMinute: 100, requestsPerHour: 1000, requestsPerDay: 10000 }))
    };
  }

  /**
   * Create mock AI service
   */
  static createMockAIService() {
    return {
      generateResponse: vi.fn(() => Promise.resolve({ success: true, data: 'Mock AI response' })),
      analyzeData: vi.fn(() => Promise.resolve({ success: true, data: {} })),
      generateInsights: vi.fn(() => Promise.resolve({ success: true, data: [] })),
      translateText: vi.fn(() => Promise.resolve({ success: true, data: 'Mock translation' }))
    };
  }

  /**
   * Create mock notification service
   */
  static createMockNotificationService() {
    return {
      sendNotification: vi.fn(() => Promise.resolve({ success: true })),
      sendEmail: vi.fn(() => Promise.resolve({ success: true })),
      sendSMS: vi.fn(() => Promise.resolve({ success: true })),
      sendPushNotification: vi.fn(() => Promise.resolve({ success: true })),
      scheduleNotification: vi.fn(() => Promise.resolve({ success: true, id: 'test-id' })),
      cancelNotification: vi.fn(() => Promise.resolve({ success: true }))
    };
  }

  /**
   * Create mock cache service
   */
  static createMockCacheService() {
    return {
      get: vi.fn(() => Promise.resolve(null)),
      set: vi.fn(() => Promise.resolve(true)),
      delete: vi.fn(() => Promise.resolve(true)),
      clear: vi.fn(() => Promise.resolve(true)),
      has: vi.fn(() => Promise.resolve(false)),
      keys: vi.fn(() => Promise.resolve([]))
    };
  }

  /**
   * Create mock logger
   */
  static createMockLogger() {
    return {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn()
    };
  }

  /**
   * Reset all mocks
   */
  static resetAllMocks() {
    vi.clearAllMocks();
    vi.resetAllMocks();
  }

  /**
   * Create mock date
   */
  static createMockDate(dateString: string) {
    const date = new Date(dateString);
    vi.setSystemTime(date);
    return date;
  }

  /**
   * Restore real date
   */
  static restoreRealDate() {
    vi.useRealTimers();
  }
}

export default MockFactory;
