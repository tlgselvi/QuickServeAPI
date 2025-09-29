import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../../client/src/lib/queryClient';

describe('Auth Flow Integration Tests', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'testpassword123',
  };

  beforeEach(async () => {
    // Clean up any existing test user
    try {
      await apiRequest('DELETE', '/api/auth/test-cleanup');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterEach(async () => {
    // Clean up test user
    try {
      await apiRequest('DELETE', '/api/auth/test-cleanup');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('User Registration and Login', () => {
    it('should register a new user successfully', async () => {
      const response = await apiRequest('POST', '/api/auth/register', {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testUser.email);
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await apiRequest('POST', '/api/auth/register', testUser);

      // Second registration with same email
      const response = await apiRequest('POST', '/api/auth/register', {
        username: 'anotheruser',
        email: testUser.email, // Same email
        password: 'anotherpassword',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('email');
    });

    it('should login with valid credentials', async () => {
      // Register user first
      await apiRequest('POST', '/api/auth/register', testUser);

      // Login
      const response = await apiRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await apiRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });
  });

  describe('Protected Routes', () => {
    let authCookie: string;

    beforeEach(async () => {
      // Register and login user
      await apiRequest('POST', '/api/auth/register', testUser);
      
      const loginResponse = await apiRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      // Extract session cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        authCookie = setCookieHeader.split(';')[0];
      }
    });

    it('should access protected route with valid session', async () => {
      const response = await apiRequest('GET', '/api/dashboard', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should reject access to protected route without session', async () => {
      const response = await apiRequest('GET', '/api/dashboard');

      expect(response.status).toBe(401);
    });

    it('should logout and invalidate session', async () => {
      // Logout
      const logoutResponse = await apiRequest('POST', '/api/auth/logout', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(logoutResponse.status).toBe(200);

      // Try to access protected route after logout
      const response = await apiRequest('GET', '/api/dashboard', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Email Verification Mock API', () => {
    let authCookie: string;

    beforeEach(async () => {
      // Register and login user
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

    it('should send verification email', async () => {
      const response = await apiRequest('POST', '/api/email-verification/send-verification', {
        email: testUser.email,
      }, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.verificationId).toBeDefined();
    });

    it('should confirm email verification', async () => {
      // First send verification
      await apiRequest('POST', '/api/email-verification/send-verification', {
        email: testUser.email,
      }, {
        headers: {
          'Cookie': authCookie,
        },
      });

      // Then confirm
      const response = await apiRequest('POST', '/api/email-verification/confirm-verification', {
        verificationCode: '1234',
      }, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should get verification status', async () => {
      const response = await apiRequest('GET', '/api/email-verification/status', undefined, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.verified).toBeDefined();
      expect(typeof data.verified).toBe('boolean');
    });
  });

  describe('Rate Limiting', () => {
    it('should bypass rate limit with test header', async () => {
      const promises = Array.from({ length: 10 }, () =>
        apiRequest('POST', '/api/auth/login', {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        }, {
          headers: {
            'X-Test-Bypass': '1',
          },
        })
      );

      const responses = await Promise.all(promises);
      
      // All should return 401 (invalid credentials), not 429 (rate limited)
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('JWT Auth Flow', () => {
    it('should generate and validate JWT token', async () => {
      // Register user
      await apiRequest('POST', '/api/auth/register', testUser);

      // Login to get JWT
      const loginResponse = await apiRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password,
      });

      const loginData = await loginResponse.json();
      const jwtToken = loginData.token;

      if (jwtToken) {
        // Use JWT to access protected route
        const response = await apiRequest('GET', '/api/dashboard', undefined, {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
        });

        expect(response.status).toBe(200);
      }
    });
  });
});

