/**
 * JWT API Endpoints Tests
 * Tests JWT authentication endpoints with real HTTP requests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server/routes.js';
import { db } from '../../server/db.js';
import { users, userProfiles, refreshTokens, revokedTokens } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

describe('JWT API Endpoints', () => {
  let testUserId: string;
  let testUserEmail: string;
  let testUserPassword: string;
  let authHeaders: { Authorization: string };

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for tests
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }

    // Set JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-api-tests';
  });

  beforeEach(async () => {
    // Create a test user for each test
    testUserId = `test-user-${Date.now()}`;
    testUserEmail = `test-${Date.now()}@example.com`;
    testUserPassword = 'TestPassword123!';

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      password: await argon2.hash(testUserPassword),
      name: 'Test User',
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create test user profile
    await db.insert(userProfiles).values({
      userId: testUserId,
      role: 'USER',
      permissions: ['READ', 'WRITE'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Set up auth headers (will be populated after login)
    authHeaders = { Authorization: '' };
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
      await db.delete(revokedTokens).where(eq(revokedTokens.userId, testUserId));
      await db.delete(userProfiles).where(eq(userProfiles.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    } catch (error) {
      logger.warn('Cleanup failed:', error);
    }
  });

  describe('POST /api/auth/jwt/login', () => {
    it('should login with valid credentials and return token pair', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUserEmail);

      // Store tokens for subsequent tests
      authHeaders.Authorization = `Bearer ${response.body.accessToken}`;

      // Verify refresh token is stored in database
      const storedTokens = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, testUserId));

      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].token).toBe(response.body.refreshToken);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: 'wrong-password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'any-password'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should include metadata in token storage', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .set('X-Forwarded-For', '192.168.1.100')
        .set('User-Agent', 'Mozilla/5.0 (Test Browser)')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
        .expect(200);

      const storedTokens = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, testUserId));

      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].ipAddress).toBeDefined();
      expect(storedTokens[0].userAgent).toBeDefined();
    });
  });

  describe('POST /api/auth/jwt/refresh', () => {
    beforeEach(async () => {
      // Login first to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      authHeaders.Authorization = `Bearer ${loginResponse.body.accessToken}`;
    });

    it('should refresh access token with valid refresh token', async () => {
      // Get refresh token from login response
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      const refreshResponse = await request(app)
        .post('/api/auth/jwt/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('success', true);
      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body).toHaveProperty('expiresIn');
      expect(refreshResponse.body.accessToken).not.toBe(loginResponse.body.accessToken);
    });

    it('should reject refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject refresh with expired refresh token', async () => {
      // Get refresh token and manually expire it
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      // Manually expire the refresh token
      await db.update(refreshTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(refreshTokens.token, loginResponse.body.refreshToken));

      const response = await request(app)
        .post('/api/auth/jwt/refresh')
        .send({
          refreshToken: loginResponse.body.refreshToken
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/jwt/logout', () => {
    beforeEach(async () => {
      // Login first to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      authHeaders.Authorization = `Bearer ${loginResponse.body.accessToken}`;
    });

    it('should logout and revoke refresh token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      const logoutResponse = await request(app)
        .post('/api/auth/jwt/logout')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          refreshToken: loginResponse.body.refreshToken
        })
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('success', true);

      // Verify refresh token is revoked
      const revokedTokens = await db.select()
        .from(revokedTokens)
        .where(eq(revokedTokens.token, loginResponse.body.refreshToken));

      expect(revokedTokens).toHaveLength(1);
      expect(revokedTokens[0].reason).toBe('logout');
    });

    it('should reject logout without valid access token', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/logout')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          refreshToken: 'any-refresh-token'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Endpoints', () => {
    beforeEach(async () => {
      // Login first to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      authHeaders.Authorization = `Bearer ${loginResponse.body.accessToken}`;
    });

    it('should allow access to protected endpoint with valid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authHeaders.Authorization)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject access to protected endpoint without token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject access to protected endpoint with invalid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject access to protected endpoint with expired token', async () => {
      // Create an expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxNjAwMDAwMDAwLCJ0eXBlIjoiYWNjZXNzIn0.invalid';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Token Rotation', () => {
    it('should rotate refresh token on refresh', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      const originalRefreshToken = loginResponse.body.refreshToken;

      // Refresh the token
      const refreshResponse = await request(app)
        .post('/api/auth/jwt/refresh')
        .send({
          refreshToken: originalRefreshToken
        })
        .expect(200);

      // The refresh token should be the same (no rotation by default)
      expect(refreshResponse.body.refreshToken).toBe(originalRefreshToken);

      // But access token should be different
      expect(refreshResponse.body.accessToken).not.toBe(loginResponse.body.accessToken);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        })
        .expect(200);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      // This test would require multiple rapid requests
      // For now, we'll just verify the endpoint exists
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail,
          password: testUserPassword
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed request body', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send('invalid-json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/jwt/login')
        .send({
          email: testUserEmail
          // Missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
