/**
 * JWT Token Management Service
 * Handles refresh token storage, rotation, and revocation
 */

import { db } from '../../db.js';
import { refreshTokens, revokedTokens, users } from '../../../shared/schema.js';
import { eq, and, lt, sql } from 'drizzle-orm';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenMetadata {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  isRevoked: boolean;
  familyId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TokenService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  private readonly REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private readonly MAX_REFRESH_TOKENS_PER_USER = 5; // Limit concurrent refresh tokens

  /**
   * Generate a new token pair (access + refresh)
   */
  async generateTokenPair(metadata: TokenMetadata): Promise<TokenPair> {
    const { userId, ipAddress, userAgent } = metadata;

    // Verify user exists
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Generate token family ID for rotation tracking
    const familyId = crypto.randomUUID();

    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId, 
        type: 'access',
        familyId 
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        issuer: 'finbot-v3',
        audience: 'finbot-users'
      }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY_MS);

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId,
      token: refreshToken,
      expiresAt,
      familyId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      isRevoked: false
    });

    // Clean up old refresh tokens for this user
    await this.cleanupOldRefreshTokens(userId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, metadata: TokenMetadata): Promise<TokenPair> {
    const { ipAddress, userAgent } = metadata;

    // Find the refresh token
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          eq(refreshTokens.isRevoked, false),
          sql`${refreshTokens.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const token = tokenRecord[0];

    // Update last used timestamp
    await db.update(refreshTokens)
      .set({ 
        lastUsedAt: new Date(),
        ipAddress: ipAddress || token.ipAddress,
        userAgent: userAgent || token.userAgent
      })
      .where(eq(refreshTokens.id, token.id));

    // Generate new access token
    const newAccessToken = jwt.sign(
      { 
        userId: token.userId, 
        type: 'access',
        familyId: token.familyId 
      },
      process.env.JWT_SECRET!,
      { 
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        issuer: 'finbot-v3',
        audience: 'finbot-users'
      }
    );

    return {
      accessToken: newAccessToken,
      refreshToken, // Return the same refresh token
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Rotate refresh token (generate new refresh token and revoke old one)
   */
  async rotateRefreshToken(refreshToken: string, metadata: TokenMetadata): Promise<TokenPair> {
    const { ipAddress, userAgent } = metadata;

    // Find the refresh token
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.token, refreshToken),
          eq(refreshTokens.isRevoked, false),
          sql`${refreshTokens.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (tokenRecord.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const oldToken = tokenRecord[0];

    // Revoke the old refresh token
    await this.revokeRefreshToken(refreshToken, oldToken.userId, 'rotation');

    // Generate new token pair with same family ID
    return this.generateTokenPair({
      userId: oldToken.userId,
      ipAddress,
      userAgent
    });
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string, userId: string, reason: string = 'logout'): Promise<void> {
    // Find and revoke the refresh token
    const tokenRecord = await db.select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .limit(1);

    if (tokenRecord.length > 0) {
      const tokenData = tokenRecord[0];

      // Mark as revoked
      await db.update(refreshTokens)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy: userId,
          reason
        })
        .where(eq(refreshTokens.id, tokenData.id));

      // Add to revoked tokens table
      await db.insert(revokedTokens).values({
        userId: tokenData.userId,
        token,
        tokenType: 'refresh',
        expiresAt: tokenData.expiresAt,
        revokedBy: userId,
        reason,
        ipAddress: tokenData.ipAddress,
        userAgent: tokenData.userAgent
      });
    }
  }

  /**
   * Revoke all refresh tokens for a user (security logout)
   */
  async revokeAllUserTokens(userId: string, reason: string = 'security'): Promise<void> {
    // Get all active refresh tokens for user
    const userTokens = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false)
        )
      );

    // Revoke each token
    for (const token of userTokens) {
      await this.revokeRefreshToken(token.token, userId, reason);
    }
  }

  /**
   * Revoke all tokens in a family (security measure)
   */
  async revokeTokenFamily(familyId: string, userId: string, reason: string = 'security'): Promise<void> {
    // Get all tokens in the family
    const familyTokens = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          eq(refreshTokens.isRevoked, false)
        )
      );

    // Revoke each token
    for (const token of familyTokens) {
      await this.revokeRefreshToken(token.token, userId, reason);
    }
  }

  /**
   * Check if a token is revoked
   */
  async isTokenRevoked(token: string, tokenType: 'access' | 'refresh'): Promise<boolean> {
    if (tokenType === 'access') {
      // Access tokens are stateless, check against revoked tokens table
      const revoked = await db.select()
        .from(revokedTokens)
        .where(
          and(
            eq(revokedTokens.token, token),
            eq(revokedTokens.tokenType, 'access')
          )
        )
        .limit(1);

      return revoked.length > 0;
    } else {
      // Refresh tokens are stored in database
      const tokenRecord = await db.select()
        .from(refreshTokens)
        .where(eq(refreshTokens.token, token))
        .limit(1);

      return tokenRecord.length === 0 || tokenRecord[0].isRevoked;
    }
  }

  /**
   * Get token statistics for a user
   */
  async getTokenStats(userId: string): Promise<{
    activeRefreshTokens: number;
    lastUsedAt: Date | null;
    oldestTokenAge: number | null;
  }> {
    const activeTokens = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false),
          sql`${refreshTokens.expiresAt} > NOW()`
        )
      );

    const lastUsedAt = activeTokens.length > 0 
      ? new Date(Math.max(...activeTokens.map(t => t.lastUsedAt.getTime())))
      : null;

    const oldestTokenAge = activeTokens.length > 0
      ? Math.max(...activeTokens.map(t => Date.now() - t.createdAt.getTime()))
      : null;

    return {
      activeRefreshTokens: activeTokens.length,
      lastUsedAt,
      oldestTokenAge
    };
  }

  /**
   * Clean up expired and old refresh tokens
   */
  async cleanupExpiredTokens(): Promise<{ deleted: number }> {
    // Delete expired refresh tokens
    const expiredResult = await db.delete(refreshTokens)
      .where(sql`${refreshTokens.expiresAt} < NOW()`);

    // Delete old revoked tokens (older than 30 days)
    const oldRevokedResult = await db.delete(revokedTokens)
      .where(sql`${revokedTokens.revokedAt} < NOW() - INTERVAL '30 days'`);

    return {
      deleted: expiredResult.rowCount || 0 + (oldRevokedResult.rowCount || 0)
    };
  }

  /**
   * Clean up old refresh tokens for a specific user
   */
  private async cleanupOldRefreshTokens(userId: string): Promise<void> {
    // Get all active tokens for user, ordered by creation date
    const userTokens = await db.select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .orderBy(refreshTokens.createdAt);

    // If user has more than the limit, revoke the oldest ones
    if (userTokens.length > this.MAX_REFRESH_TOKENS_PER_USER) {
      const tokensToRevoke = userTokens.slice(0, userTokens.length - this.MAX_REFRESH_TOKENS_PER_USER);
      
      for (const token of tokensToRevoke) {
        await this.revokeRefreshToken(token.token, userId, 'limit_exceeded');
      }
    }
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): { userId: string; familyId: string } | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
        issuer: 'finbot-v3',
        audience: 'finbot-users'
      }) as any;

      if (decoded.type !== 'access') {
        return null;
      }

      return {
        userId: decoded.userId,
        familyId: decoded.familyId
      };
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const tokenService = new TokenService();
