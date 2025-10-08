/**
 * JWT Performance Tests
 * Tests JWT operations for performance and scalability
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TokenService } from '../../server/services/auth/token-service.js';
import { db } from '../../server/db.js';
import { users, userProfiles, refreshTokens, revokedTokens } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

describe('JWT Performance Tests', () => {
  let tokenService: TokenService;
  let testUserIds: string[] = [];

  beforeAll(async () => {
    // Ensure DATABASE_URL is set for tests
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }

    // Set JWT secret for tests
    process.env.JWT_SECRET = 'test-jwt-secret-for-performance-tests';

    tokenService = new TokenService();
  });

  beforeEach(async () => {
    // Create multiple test users for performance testing
    const userCount = 10;
    testUserIds = [];

    for (let i = 0; i < userCount; i++) {
      const userId = `perf-test-user-${Date.now()}-${i}`;
      const userEmail = `perf-test-${Date.now()}-${i}@example.com`;

      // Create test user
      await db.insert(users).values({
        id: userId,
        email: userEmail,
        password: await argon2.hash('TestPassword123!'),
        name: `Performance Test User ${i}`,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create test user profile
      await db.insert(userProfiles).values({
        userId: userId,
        role: 'USER',
        permissions: ['READ', 'WRITE'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      testUserIds.push(userId);
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      for (const userId of testUserIds) {
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        await db.delete(revokedTokens).where(eq(revokedTokens.userId, userId));
        await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
        await db.delete(users).where(eq(users.id, userId));
      }
    } catch (error) {
      logger.warn('Cleanup failed:', error);
    }
  });

  describe('Token Generation Performance', () => {
    it('should generate token pairs within acceptable time', async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i % 255}`,
          userAgent: `Mozilla/5.0 (Test Browser ${i})`
        };

        await tokenService.generateTokenPair(metadata);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      logger.info(`Generated ${iterations} token pairs in ${totalTime}ms (avg: ${averageTime}ms)`);

      // Should complete within reasonable time (5 seconds for 100 tokens)
      expect(totalTime).toBeLessThan(5000);
      // Average time should be less than 50ms per token
      expect(averageTime).toBeLessThan(50);
    });

    it('should handle concurrent token generation', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = testUserIds.slice(0, concurrentRequests).map(async (userId, index) => {
        const metadata = {
          userId,
          ipAddress: `192.168.1.${index + 1}`,
          userAgent: `Mozilla/5.0 (Concurrent Test ${index})`
        };

        return tokenService.generateTokenPair(metadata);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify all tokens were created
      for (const result of results) {
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      }
    });
  });

  describe('Token Refresh Performance', () => {
    let refreshTokens: string[] = [];

    beforeEach(async () => {
      // Generate refresh tokens for testing
      refreshTokens = [];
      for (let i = 0; i < 10; i++) {
        const userId = testUserIds[i];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Mozilla/5.0 (Refresh Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        refreshTokens.push(tokenPair.refreshToken);
      }
    });

    it('should refresh tokens within acceptable time', async () => {
      const iterations = 50;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const refreshToken = refreshTokens[i % refreshTokens.length];
        const metadata = {
          ipAddress: `192.168.1.${(i % 255) + 1}`,
          userAgent: `Mozilla/5.0 (Refresh Test ${i})`
        };

        await tokenService.refreshAccessToken(refreshToken, metadata);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      logger.info(`Refreshed ${iterations} tokens in ${totalTime}ms (avg: ${averageTime}ms)`);

      // Should complete within reasonable time (3 seconds for 50 refreshes)
      expect(totalTime).toBeLessThan(3000);
      // Average time should be less than 60ms per refresh
      expect(averageTime).toBeLessThan(60);
    });

    it('should handle concurrent token refreshes', async () => {
      const concurrentRequests = 15;
      const startTime = Date.now();

      const promises = refreshTokens.slice(0, concurrentRequests).map(async (refreshToken, index) => {
        const metadata = {
          ipAddress: `192.168.1.${index + 1}`,
          userAgent: `Mozilla/5.0 (Concurrent Refresh ${index})`
        };

        return tokenService.refreshAccessToken(refreshToken, metadata);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(1500); // Should complete within 1.5 seconds

      // Verify all refreshes were successful
      for (const result of results) {
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
      }
    });
  });

  describe('Token Revocation Performance', () => {
    let tokensToRevoke: string[] = [];

    beforeEach(async () => {
      // Generate tokens for revocation testing
      tokensToRevoke = [];
      for (let i = 0; i < 20; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Mozilla/5.0 (Revoke Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        tokensToRevoke.push(tokenPair.refreshToken);
      }
    });

    it('should revoke tokens within acceptable time', async () => {
      const startTime = Date.now();

      for (let i = 0; i < tokensToRevoke.length; i++) {
        const userId = testUserIds[i % testUserIds.length];
        await tokenService.revokeRefreshToken(tokensToRevoke[i], userId, 'performance_test');
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / tokensToRevoke.length;

      logger.info(`Revoked ${tokensToRevoke.length} tokens in ${totalTime}ms (avg: ${averageTime}ms)`);

      // Should complete within reasonable time (2 seconds for 20 revocations)
      expect(totalTime).toBeLessThan(2000);
      // Average time should be less than 100ms per revocation
      expect(averageTime).toBeLessThan(100);
    });

    it('should handle bulk token revocation efficiently', async () => {
      const userId = testUserIds[0];
      const startTime = Date.now();

      // Revoke all tokens for a user at once
      await tokenService.revokeAllUserTokens(userId, 'bulk_revocation');

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      logger.info(`Bulk revoked all tokens for user in ${totalTime}ms`);

      // Should complete within reasonable time (1 second for bulk revocation)
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Token Verification Performance', () => {
    let accessTokens: string[] = [];

    beforeEach(async () => {
      // Generate access tokens for verification testing
      accessTokens = [];
      for (let i = 0; i < 100; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Mozilla/5.0 (Verify Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        accessTokens.push(tokenPair.accessToken);
      }
    });

    it('should verify tokens within acceptable time', async () => {
      const iterations = 200;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const token = accessTokens[i % accessTokens.length];
        tokenService.verifyAccessToken(token);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      logger.info(`Verified ${iterations} tokens in ${totalTime}ms (avg: ${averageTime}ms)`);

      // Should complete within reasonable time (1 second for 200 verifications)
      expect(totalTime).toBeLessThan(1000);
      // Average time should be less than 5ms per verification
      expect(averageTime).toBeLessThan(5);
    });

    it('should handle concurrent token verification', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = accessTokens.slice(0, concurrentRequests).map(async (token) => {
        return tokenService.verifyAccessToken(token);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms

      // Verify all tokens were valid
      for (const result of results) {
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('userId');
        expect(result).toHaveProperty('familyId');
      }
    });
  });

  describe('Database Cleanup Performance', () => {
    it('should clean up expired tokens efficiently', async () => {
      // Generate some tokens and manually expire them
      const expiredTokens = [];
      for (let i = 0; i < 50; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i + 1}`,
          userAgent: `Mozilla/5.0 (Cleanup Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        expiredTokens.push(tokenPair.refreshToken);
      }

      // Manually expire all tokens
      for (const token of expiredTokens) {
        await db.update(refreshTokens)
          .set({ expiresAt: new Date(Date.now() - 1000) })
          .where(eq(refreshTokens.token, token));
      }

      const startTime = Date.now();
      const result = await tokenService.cleanupExpiredTokens();
      const endTime = Date.now();

      logger.info(`Cleaned up ${result.deleted} expired tokens in ${endTime - startTime}ms`);

      // Should complete within reasonable time (2 seconds for cleanup)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(result.deleted).toBeGreaterThan(0);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during token operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      // Perform many token operations
      for (let i = 0; i < iterations; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i % 255}`,
          userAgent: `Mozilla/5.0 (Memory Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        const decoded = tokenService.verifyAccessToken(tokenPair.accessToken);
        await tokenService.revokeRefreshToken(tokenPair.refreshToken, userId, 'memory_test');
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      logger.info(`Memory increase after ${iterations} operations: ${memoryIncrease} bytes`);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Scalability Tests', () => {
    it('should handle large number of active tokens', async () => {
      const tokenCount = 1000;
      const tokens = [];

      const startTime = Date.now();

      // Generate many tokens
      for (let i = 0; i < tokenCount; i++) {
        const userId = testUserIds[i % testUserIds.length];
        const metadata = {
          userId,
          ipAddress: `192.168.1.${i % 255}`,
          userAgent: `Mozilla/5.0 (Scale Test ${i})`
        };

        const tokenPair = await tokenService.generateTokenPair(metadata);
        tokens.push(tokenPair);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      logger.info(`Generated ${tokenCount} tokens in ${totalTime}ms`);

      // Should complete within reasonable time (30 seconds for 1000 tokens)
      expect(totalTime).toBeLessThan(30000);

      // Verify all tokens were created
      expect(tokens).toHaveLength(tokenCount);

      // Clean up
      for (const token of tokens) {
        const userId = testUserIds[0]; // Use first user for cleanup
        await tokenService.revokeRefreshToken(token.refreshToken, userId, 'cleanup');
      }
    });
  });
});
