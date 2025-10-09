/**
 * JWT Token Service Unit Tests
 * Tests the TokenService class for token generation, rotation, and revocation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TokenService } from '../../server/services/auth/token-service.js';
import { db } from '../../server/db.js';
import { users, refreshTokens, revokedTokens } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// Mock the database with proper chaining
vi.mock('../../server/db.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => Promise.resolve([]))
        })),
        limit: vi.fn(() => Promise.resolve([]))
      }))
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
  }
}));

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockDb: any;

  beforeEach(() => {
    tokenService = new TokenService();
    mockDb = db as any;
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', async () => {
      // Mock user exists
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      // Mock refresh token insertion
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      const metadata = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const result = await tokenService.generateTokenPair(metadata);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.expiresIn).toBe(15 * 60); // 15 minutes

      // Verify access token can be decoded
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.type).toBe('access');
      expect(decoded.familyId).toBeDefined();
    });

    it('should throw error if user not found', async () => {
      // Mock user not found
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const metadata = {
        userId: 'non-existent-user',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await expect(tokenService.generateTokenPair(metadata))
        .rejects.toThrow('User not found');
    });

    it('should include metadata in refresh token storage', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      const insertMock = vi.fn().mockResolvedValue({});
      mockDb.insert.mockReturnValue({
        values: insertMock
      });

      const metadata = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await tokenService.generateTokenPair(metadata);

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          isRevoked: false
        })
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const mockRefreshToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'valid-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        familyId: 'family-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRefreshToken])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      const metadata = {
        ipAddress: '192.168.1.2',
        userAgent: 'Mozilla/5.0 Updated'
      };

      const result = await tokenService.refreshAccessToken('valid-refresh-token', metadata);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken', 'valid-refresh-token');
      expect(result).toHaveProperty('expiresIn', 15 * 60);

      // Verify new access token
      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.familyId).toBe('family-123');
    });

    it('should throw error for invalid refresh token', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await expect(tokenService.refreshAccessToken('invalid-token', metadata))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    it.skip('should throw error for expired refresh token', async () => {
      const expiredToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'expired-refresh-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        familyId: 'family-123'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([expiredToken])
          })
        })
      });

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      await expect(tokenService.refreshAccessToken('expired-refresh-token', metadata))
        .rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('rotateRefreshToken', () => {
    it('should rotate refresh token and revoke old one', async () => {
      const mockRefreshToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        familyId: 'family-123'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRefreshToken]),
            orderBy: vi.fn().mockResolvedValue([])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      const metadata = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      const result = await tokenService.rotateRefreshToken('old-refresh-token', metadata);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.refreshToken).not.toBe('old-refresh-token');
    });
  });

  describe('revokeRefreshToken', () => {
    it.skip('should revoke refresh token successfully', async () => {
      const mockRefreshToken = {
        id: 'token-123',
        userId: 'user-123',
        token: 'refresh-token-to-revoke',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockRefreshToken])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      await tokenService.revokeRefreshToken('refresh-token-to-revoke', 'user-123', 'logout');

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'refresh-token-to-revoke',
          tokenType: 'refresh',
          revokedBy: 'user-123',
          reason: 'logout'
        })
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it.skip('should revoke all tokens for a user', async () => {
      const mockTokens = [
        { id: 'token-1', userId: 'user-123', token: 'token-1' },
        { id: 'token-2', userId: 'user-123', token: 'token-2' }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTokens)
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({})
      });

      await tokenService.revokeAllUserTokens('user-123', 'security');

      expect(mockDb.update).toHaveBeenCalledTimes(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true for revoked access token', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ token: 'revoked-token' }])
          })
        })
      });

      const isRevoked = await tokenService.isTokenRevoked('revoked-token', 'access');
      expect(isRevoked).toBe(true);
    });

    it('should return false for non-revoked access token', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const isRevoked = await tokenService.isTokenRevoked('valid-token', 'access');
      expect(isRevoked).toBe(false);
    });

    it('should return true for revoked refresh token', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ isRevoked: true }])
          })
        })
      });

      const isRevoked = await tokenService.isTokenRevoked('revoked-refresh-token', 'refresh');
      expect(isRevoked).toBe(true);
    });
  });

  describe('getTokenStats', () => {
    it('should return token statistics for user', async () => {
      const mockTokens = [
        {
          lastUsedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01')
        },
        {
          lastUsedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02')
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockTokens)
        })
      });

      const stats = await tokenService.getTokenStats('user-123');

      expect(stats).toHaveProperty('activeRefreshTokens', 2);
      expect(stats).toHaveProperty('lastUsedAt');
      expect(stats).toHaveProperty('oldestTokenAge');
      expect(stats.activeRefreshTokens).toBe(2);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 5 })
      });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result).toHaveProperty('deleted');
      expect(result.deleted).toBe(5); // 5 from delete operation
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = jwt.sign(
        { userId: 'user-123', type: 'access', familyId: 'family-123' },
        process.env.JWT_SECRET!,
        { 
          expiresIn: '15m',
          issuer: 'finbot-v3',
          audience: 'finbot-users'
        }
      );

      const result = tokenService.verifyAccessToken(token);

      expect(result).toEqual({
        userId: 'user-123',
        familyId: 'family-123'
      });
    });

    it('should return null for invalid token', () => {
      const result = tokenService.verifyAccessToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for token with wrong type', () => {
      const token = jwt.sign(
        { userId: 'user-123', type: 'refresh', familyId: 'family-123' },
        process.env.JWT_SECRET!,
        { 
          expiresIn: '7d',
          issuer: 'finbot-v3',
          audience: 'finbot-users'
        }
      );

      const result = tokenService.verifyAccessToken(token);
      expect(result).toBeNull();
    });
  });
});
