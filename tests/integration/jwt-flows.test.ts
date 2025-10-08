/**
 * JWT Flows Integration Tests
 * Tests complete JWT authentication flows with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TokenService } from '../../server/services/auth/token-service.js';
import { AuthHardeningService } from '../../server/services/auth/auth-hardening.js';
import { db } from '../../server/db.js';
import { users, refreshTokens, revokedTokens, userProfiles } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import argon2 from 'argon2';

describe('JWT Flows Integration Tests', () => {
  let tokenService: TokenService;
  let authHardeningService: AuthHardeningService;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for tests
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }

    // Set JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';

    tokenService = new TokenService();
    authHardeningService = new AuthHardeningService();
  });

  beforeEach(async () => {
    // Create a test user for each test
    testUserId = `test-user-${Date.now()}`;
    testUserEmail = `test-${Date.now()}@example.com`;

    // Create test user
    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      password: await argon2.hash('TestPassword123!'),
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

  describe('Complete Authentication Flow', () => {
    it('should complete full login -> refresh -> logout flow', async () => {
      // Step 1: Generate initial token pair
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      const tokenPair = await tokenService.generateTokenPair(metadata);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair).toHaveProperty('expiresIn');

      // Verify tokens are stored in database
      const storedTokens = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, testUserId));

      expect(storedTokens).toHaveLength(1);
      expect(storedTokens[0].token).toBe(tokenPair.refreshToken);
      expect(storedTokens[0].isRevoked).toBe(false);

      // Step 2: Refresh access token
      const refreshResult = await tokenService.refreshAccessToken(
        tokenPair.refreshToken,
        { ipAddress: '192.168.1.2', userAgent: 'Mozilla/5.0 (Updated)' }
      );

      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult).toHaveProperty('refreshToken', tokenPair.refreshToken);
      expect(refreshResult.accessToken).not.toBe(tokenPair.accessToken);

      // Step 3: Verify access token
      const decoded = tokenService.verifyAccessToken(refreshResult.accessToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);

      // Step 4: Revoke refresh token (logout)
      await tokenService.revokeRefreshToken(tokenPair.refreshToken, testUserId, 'logout');

      // Verify token is revoked
      const revokedTokens = await db.select()
        .from(revokedTokens)
        .where(eq(revokedTokens.token, tokenPair.refreshToken));

      expect(revokedTokens).toHaveLength(1);
      expect(revokedTokens[0].reason).toBe('logout');

      // Step 5: Verify refresh token is no longer valid
      await expect(
        tokenService.refreshAccessToken(tokenPair.refreshToken, metadata)
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should handle token rotation flow', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      // Generate initial token pair
      const initialPair = await tokenService.generateTokenPair(metadata);

      // Rotate refresh token
      const rotatedPair = await tokenService.rotateRefreshToken(
        initialPair.refreshToken,
        { ipAddress: '192.168.1.2', userAgent: 'Mozilla/5.0 (Updated)' }
      );

      expect(rotatedPair).toHaveProperty('accessToken');
      expect(rotatedPair).toHaveProperty('refreshToken');
      expect(rotatedPair.refreshToken).not.toBe(initialPair.refreshToken);

      // Verify old refresh token is revoked
      const revokedTokens = await db.select()
        .from(revokedTokens)
        .where(eq(revokedTokens.token, initialPair.refreshToken));

      expect(revokedTokens).toHaveLength(1);
      expect(revokedTokens[0].reason).toBe('rotation');

      // Verify new refresh token works
      const refreshResult = await tokenService.refreshAccessToken(
        rotatedPair.refreshToken,
        metadata
      );

      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult).toHaveProperty('refreshToken', rotatedPair.refreshToken);
    });

    it('should handle security logout (revoke all tokens)', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      // Generate multiple token pairs
      const tokenPair1 = await tokenService.generateTokenPair(metadata);
      const tokenPair2 = await tokenService.generateTokenPair(metadata);

      // Verify both tokens exist
      const activeTokens = await db.select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, testUserId),
            eq(refreshTokens.isRevoked, false)
          )
        );

      expect(activeTokens).toHaveLength(2);

      // Revoke all user tokens
      await tokenService.revokeAllUserTokens(testUserId, 'security');

      // Verify all tokens are revoked
      const revokedTokens = await db.select()
        .from(revokedTokens)
        .where(eq(revokedTokens.userId, testUserId));

      expect(revokedTokens).toHaveLength(2);
      expect(revokedTokens.every(token => token.reason === 'security')).toBe(true);

      // Verify tokens are no longer valid
      await expect(
        tokenService.refreshAccessToken(tokenPair1.refreshToken, metadata)
      ).rejects.toThrow('Invalid or expired refresh token');

      await expect(
        tokenService.refreshAccessToken(tokenPair2.refreshToken, metadata)
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('Token Security Features', () => {
    it('should track IP address and user agent', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const tokenPair = await tokenService.generateTokenPair(metadata);

      const storedToken = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, tokenPair.refreshToken))
        .limit(1);

      expect(storedToken).toHaveLength(1);
      expect(storedToken[0].ipAddress).toBe('192.168.1.100');
      expect(storedToken[0].userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    });

    it('should update last used timestamp on refresh', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      const tokenPair = await tokenService.generateTokenPair(metadata);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh the token
      await tokenService.refreshAccessToken(tokenPair.refreshToken, metadata);

      const updatedToken = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, tokenPair.refreshToken))
        .limit(1);

      expect(updatedToken).toHaveLength(1);
      expect(updatedToken[0].lastUsedAt.getTime()).toBeGreaterThan(updatedToken[0].createdAt.getTime());
    });

    it('should limit concurrent refresh tokens per user', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      // Generate more than the limit (5) of refresh tokens
      const tokenPairs = [];
      for (let i = 0; i < 7; i++) {
        const pair = await tokenService.generateTokenPair(metadata);
        tokenPairs.push(pair);
      }

      // Check that only the limit number of tokens are active
      const activeTokens = await db.select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, testUserId),
            eq(refreshTokens.isRevoked, false)
          )
        );

      expect(activeTokens).toHaveLength(5); // Should be limited to 5

      // Check that some tokens were revoked due to limit
      const revokedTokens = await db.select()
        .from(revokedTokens)
        .where(eq(revokedTokens.userId, testUserId));

      expect(revokedTokens).toHaveLength(2); // 2 tokens should be revoked
      expect(revokedTokens.every(token => token.reason === 'limit_exceeded')).toBe(true);
    });
  });

  describe('Token Expiration and Cleanup', () => {
    it('should handle expired refresh tokens', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      const tokenPair = await tokenService.generateTokenPair(metadata);

      // Manually expire the token by updating its expiry date
      await db.update(refreshTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) }) // 1 second ago
        .where(eq(refreshTokens.token, tokenPair.refreshToken));

      // Verify expired token is rejected
      await expect(
        tokenService.refreshAccessToken(tokenPair.refreshToken, metadata)
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should clean up expired tokens', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      // Create some tokens
      const tokenPair1 = await tokenService.generateTokenPair(metadata);
      const tokenPair2 = await tokenService.generateTokenPair(metadata);

      // Manually expire one token
      await db.update(refreshTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(refreshTokens.token, tokenPair1.refreshToken));

      // Run cleanup
      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toHaveProperty('deleted');
      expect(result.deleted).toBeGreaterThan(0);

      // Verify expired token is removed
      const remainingTokens = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, testUserId));

      expect(remainingTokens).toHaveLength(1);
      expect(remainingTokens[0].token).toBe(tokenPair2.refreshToken);
    });
  });

  describe('AuthHardeningService Integration', () => {
    it('should work with AuthHardeningService', async () => {
      const metadata = {
        userId: testUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      // Generate token pair through AuthHardeningService
      const tokenPair = await authHardeningService.generateTokenPair(testUserId, metadata);

      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');

      // Verify token can be verified
      const decoded = authHardeningService.verifyAccessToken(tokenPair.accessToken);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);

      // Test token rotation through AuthHardeningService
      const rotationResult = await authHardeningService.rotateRefreshToken(
        tokenPair.refreshToken,
        metadata
      );

      expect(rotationResult.success).toBe(true);
      expect(rotationResult).toHaveProperty('accessToken');
      expect(rotationResult).toHaveProperty('refreshToken');
      expect(rotationResult.refreshToken).not.toBe(tokenPair.refreshToken);

      // Test token revocation through AuthHardeningService
      await authHardeningService.revokeToken(rotationResult.refreshToken!, testUserId, 'logout');

      // Verify token is revoked
      const isRevoked = await tokenService.isTokenRevoked(rotationResult.refreshToken!, 'refresh');
      expect(isRevoked).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test would require mocking database errors
      // For now, we'll test with invalid user ID
      const metadata = {
        userId: 'non-existent-user',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Test Browser)'
      };

      await expect(tokenService.generateTokenPair(metadata))
        .rejects.toThrow('User not found');
    });

    it('should handle malformed tokens gracefully', async () => {
      const result = tokenService.verifyAccessToken('malformed-token');
      expect(result).toBeNull();
    });
  });
});
