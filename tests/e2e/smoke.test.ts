import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest } from '../../client/src/lib/queryClient';

describe('E2E Smoke Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
  const testUser = {
    username: 'smoketest',
    email: 'smoketest@example.com',
    password: 'smoketest123',
  };

  let authCookie: string;

  beforeAll(async () => {
    // Clean up any existing test data
    try {
      await apiRequest('DELETE', '/api/auth/test-cleanup');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await apiRequest('DELETE', '/api/auth/test-cleanup');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Health Check', () => {
    it('should respond to health check endpoint', async () => {
      const response = await apiRequest('GET', '/api/health');
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('DSCR Endpoint', () => {
    it('should calculate DSCR successfully', async () => {
      const response = await apiRequest('GET', '/api/finance/dscr', undefined, {
        headers: {
          'X-Test-Bypass': '1',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.dscr).toBeDefined();
      expect(typeof data.dscr).toBe('number');
      expect(data.status).toBeDefined();
      expect(['ok', 'warning', 'critical']).toContain(data.status);
    });
  });

  describe('Account Management', () => {
    beforeAll(async () => {
      // Register and login test user
      await apiRequest('POST', '/api/auth/register', testUser);
      
      const loginResponse = await apiRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        authCookie = setCookieHeader.split(';')[0];
      }
    });

    it('should fetch accounts list', async () => {
      const response = await apiRequest('GET', '/api/accounts', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should create a new account', async () => {
      const accountData = {
        type: 'personal',
        bankName: 'Test Bank',
        accountName: 'Test Account',
        balance: '1000.00',
        currency: 'TRY',
      };

      const response = await apiRequest('POST', '/api/accounts', accountData, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.accountName).toBe(accountData.accountName);
    });

    it('should fetch transactions', async () => {
      const response = await apiRequest('GET', '/api/transactions', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Financial Modules', () => {
    it('should access budget lines endpoint', async () => {
      const response = await apiRequest('GET', '/api/budget-lines', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should create a budget line', async () => {
      const budgetData = {
        category: 'Test Category',
        plannedAmount: 1000,
        actualAmount: 800,
        month: new Date('2024-01-01').toISOString(),
      };

      const response = await apiRequest('POST', '/api/budget-lines', budgetData, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.category).toBe(budgetData.category);
    });
  });

  describe('Export Functionality', () => {
    it('should export accounts to CSV', async () => {
      const response = await apiRequest('GET', '/api/export/accounts/csv', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    it('should export transactions to CSV', async () => {
      const response = await apiRequest('GET', '/api/export/transactions/csv', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/csv');
    });

    it('should get export periods', async () => {
      const response = await apiRequest('GET', '/api/export/periods', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('AI Services', () => {
    it('should access AI generate endpoint', async () => {
      const response = await apiRequest('POST', '/api/ai/generate', {
        query: 'Test query',
        persona: 'default',
      }, {
        headers: {
          'Cookie': authCookie,
        },
      });

      // Should not return 500 error (service should be available)
      expect(response.status).not.toBe(500);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data.response).toBeDefined();
      }
    });
  });

  describe('Dashboard', () => {
    it('should load dashboard data', async () => {
      const response = await apiRequest('GET', '/api/dashboard', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.accounts).toBeDefined();
      expect(data.recentTransactions).toBeDefined();
      expect(data.totalBalance).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await apiRequest('GET', '/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      const response = await apiRequest('GET', '/api/accounts');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Oturum');
    });
  });

  describe('Performance', () => {
    it('should respond to health check within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await apiRequest('GET', '/api/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        apiRequest('GET', '/api/health')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
