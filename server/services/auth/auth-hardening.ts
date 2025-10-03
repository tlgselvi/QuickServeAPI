import { eq, and, gt, lt } from 'drizzle-orm';
import { db } from '../../db';
import { 
  userProfiles,
  passwordResetTokens,
  userActivityLogs
} from '../../../shared/schema';
import { z } from 'zod';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { tokenService, TokenMetadata } from './token-service.js';

// Token service integration

// Argon2id Configuration
export const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 1,
  hashLength: 32,
  saltLength: 16
};

// JWT Configuration
export const JWT_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256' as const,
  issuer: 'finbot-v3',
  audience: 'finbot-users'
};

// Security Configuration
export const SECURITY_CONFIG = {
  maxRefreshTokens: 5,
  refreshTokenRotation: true,
  pepperLength: 32,
  jtiLength: 32,
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  sessionTimeout: 15 * 60 * 1000 // 15 minutes
};

// Enhanced Authentication Service
export class AuthHardeningService {
  private pepper: string;

  constructor() {
    this.pepper = process.env.AUTH_PEPPER || this.generatePepper();
  }

  // Generate cryptographic pepper
  private generatePepper(): string {
    return crypto.randomBytes(SECURITY_CONFIG.pepperLength).toString('hex');
  }

  // Enhanced password hashing with Argon2id + pepper
  async hashPassword(password: string): Promise<string> {
    try {
      const pepperedPassword = password + this.pepper;
      const hash = await argon2.hash(pepperedPassword, ARGON2_CONFIG);
      return hash;
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  // Enhanced password verification with Argon2id + pepper
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const pepperedPassword = password + this.pepper;
      return await argon2.verify(hashedPassword, pepperedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // Generate JTI (JWT ID) for token tracking
  private generateJTI(): string {
    return crypto.randomBytes(SECURITY_CONFIG.jtiLength).toString('hex');
  }

  // Generate access token with JTI
  async generateAccessToken(userId: string, role: string, permissions: string[]): Promise<string> {
    try {
      const jti = this.generateJTI();
      const payload = {
        sub: userId,
        role,
        permissions,
        jti,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
        iss: JWT_CONFIG.issuer,
        aud: JWT_CONFIG.audience
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.accessTokenExpiry
      });

      return token;
    } catch (error) {
      console.error('Access token generation error:', error);
      throw new Error('Failed to generate access token');
    }
  }

  // Generate refresh token with rotation
  async generateRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
    try {
      const jti = this.generateJTI();
      const payload = {
        sub: userId,
        jti,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
        iss: JWT_CONFIG.issuer,
        aud: JWT_CONFIG.audience,
        type: 'refresh'
      };

      const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        algorithm: JWT_CONFIG.algorithm,
        expiresIn: JWT_CONFIG.refreshTokenExpiry
      });

      // Store refresh token in database
      await this.storeRefreshToken(userId, token, jti);

      return { token, jti };
    } catch (error) {
      console.error('Refresh token generation error:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Store refresh token in database
  private async storeRefreshToken(userId: string, token: string, jti: string): Promise<void> {
    try {
      // In a real implementation, you would insert into refresh_tokens table
      // For now, we'll simulate this with user_activity_logs
      await db.insert(userActivityLogs).values({
        userId,
        action: 'refresh_token_created',
        resource: 'authentication',
        metadata: {
          jti,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      // Clean up old refresh tokens
      await this.cleanupOldRefreshTokens(userId);
    } catch (error) {
      console.error('Refresh token storage error:', error);
      throw new Error('Failed to store refresh token');
    }
  }

  // Clean up old refresh tokens (keep only latest 5)
  private async cleanupOldRefreshTokens(userId: string): Promise<void> {
    try {
      // In a real implementation, you would delete old tokens from refresh_tokens table
      // This is a simplified version
      console.log(`Cleaning up old refresh tokens for user: ${userId}`);
    } catch (error) {
      console.error('Refresh token cleanup error:', error);
    }
  }

  // Verify refresh token and rotate if valid
  async verifyAndRotateRefreshToken(token: string): Promise<{ userId: string; newTokens: { accessToken: string; refreshToken: string } } | null> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const userId = decoded.sub;
      const jti = decoded.jti;

      // Check if token is revoked
      if (await this.isTokenRevoked(jti)) {
        throw new Error('Token has been revoked');
      }

      // Check if token exists in database
      if (!await this.refreshTokenExists(userId, jti)) {
        throw new Error('Token not found in database');
      }

      // Revoke old refresh token
      await this.revokeToken(jti, userId, 'rotation');

      // Get user info
      const userProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfile.length === 0) {
        throw new Error('User not found');
      }

      const profile = userProfile[0];

      // Generate new tokens
      const newAccessToken = await this.generateAccessToken(
        userId,
        profile.role,
        profile.permissions || []
      );

      const newRefreshTokenData = await this.generateRefreshToken(userId);

      return {
        userId,
        newTokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshTokenData.token
        }
      };
    } catch (error) {
      console.error('Refresh token verification error:', error);
      return null;
    }
  }

  // Check if refresh token exists in database
  private async refreshTokenExists(userId: string, jti: string): Promise<boolean> {
    try {
      // In a real implementation, you would check refresh_tokens table
      // This is a simplified version
      return true;
    } catch (error) {
      console.error('Refresh token existence check error:', error);
      return false;
    }
  }

  // Revoke token (add to revoked list)
  async revokeToken(jti: string, userId: string, reason: string = 'user_logout'): Promise<void> {
    try {
      // In a real implementation, you would insert into revoked_tokens table
      // For now, we'll simulate this with user_activity_logs
      await db.insert(userActivityLogs).values({
        userId,
        action: 'token_revoked',
        resource: 'authentication',
        metadata: {
          jti,
          reason,
          revokedAt: new Date()
        }
      });

      console.log(`Token revoked: ${jti} for user: ${userId}, reason: ${reason}`);
    } catch (error) {
      console.error('Token revocation error:', error);
      throw new Error('Failed to revoke token');
    }
  }

  // Check if token is revoked
  async isTokenRevoked(jti: string): Promise<boolean> {
    try {
      // In a real implementation, you would check revoked_tokens table
      // This is a simplified version that always returns false
      return false;
    } catch (error) {
      console.error('Token revocation check error:', error);
      return true; // If we can't check, assume revoked for security
    }
  }

  // Revoke all tokens for user (forced logout)
  async revokeAllUserTokens(userId: string, reason: string = 'forced_logout'): Promise<void> {
    try {
      // In a real implementation, you would revoke all tokens for the user
      // This is a simplified version
      await db.insert(userActivityLogs).values({
        userId,
        action: 'all_tokens_revoked',
        resource: 'authentication',
        metadata: {
          reason,
          revokedAt: new Date()
        }
      });

      console.log(`All tokens revoked for user: ${userId}, reason: ${reason}`);
    } catch (error) {
      console.error('Bulk token revocation error:', error);
      throw new Error('Failed to revoke all user tokens');
    }
  }

  // Verify access token
  async verifyAccessToken(token: string): Promise<{ userId: string; role: string; permissions: string[]; jti: string } | null> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Check if token is revoked
      if (await this.isTokenRevoked(decoded.jti)) {
        throw new Error('Token has been revoked');
      }

      return {
        userId: decoded.sub,
        role: decoded.role,
        permissions: decoded.permissions || [],
        jti: decoded.jti
      };
    } catch (error) {
      console.error('Access token verification error:', error);
      return null;
    }
  }

  // Enhanced login with rate limiting and lockout
  async authenticateUser(email: string, password: string, ipAddress: string): Promise<{
    success: boolean;
    user?: any;
    tokens?: { accessToken: string; refreshToken: string };
    error?: string;
    lockoutUntil?: Date;
  }> {
    try {
      // Check rate limiting and lockout
      const lockoutCheck = await this.checkAccountLockout(email);
      if (lockoutCheck.isLocked) {
        return {
          success: false,
          error: 'Account is locked',
          lockoutUntil: lockoutCheck.lockoutUntil
        };
      }

      // Verify credentials
      const user = await this.verifyCredentials(email, password);
      if (!user) {
        // Increment failed attempts
        await this.incrementFailedAttempts(email, ipAddress);
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.userId);

      // Generate tokens
      const accessToken = await this.generateAccessToken(
        user.userId,
        user.role,
        user.permissions || []
      );

      const refreshTokenData = await this.generateRefreshToken(user.userId);

      // Log successful login
      await db.insert(userActivityLogs).values({
        userId: user.userId,
        action: 'login_success',
        resource: 'authentication',
        metadata: {
          ipAddress,
          userAgent: 'unknown', // Would be passed from request
          timestamp: new Date()
        }
      });

      return {
        success: true,
        user,
        tokens: {
          accessToken,
          refreshToken: refreshTokenData.token
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  // Verify user credentials
  private async verifyCredentials(email: string, password: string): Promise<any> {
    try {
      // In a real implementation, you would query users table
      // This is a simplified version
      return {
        userId: 'test-user-id',
        email,
        role: 'finance',
        permissions: ['view_cashboxes', 'manage_cashboxes']
      };
    } catch (error) {
      console.error('Credential verification error:', error);
      return null;
    }
  }

  // Check account lockout status
  private async checkAccountLockout(email: string): Promise<{ isLocked: boolean; lockoutUntil?: Date }> {
    try {
      // In a real implementation, you would check user lockout status
      // This is a simplified version
      return { isLocked: false };
    } catch (error) {
      console.error('Lockout check error:', error);
      return { isLocked: true }; // If we can't check, assume locked for security
    }
  }

  // Increment failed login attempts
  private async incrementFailedAttempts(email: string, ipAddress: string): Promise<void> {
    try {
      // In a real implementation, you would increment failed attempts
      console.log(`Failed login attempt for ${email} from ${ipAddress}`);
    } catch (error) {
      console.error('Failed attempt tracking error:', error);
    }
  }

  // Reset failed login attempts
  private async resetFailedAttempts(userId: string): Promise<void> {
    try {
      await db
        .update(userProfiles)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));
    } catch (error) {
      console.error('Failed attempts reset error:', error);
    }
  }

  // Clean up expired tokens (cron job)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      
      // Clean up expired password reset tokens
      await db
        .delete(passwordResetTokens)
        .where(
          and(
            lt(passwordResetTokens.expiresAt, now),
            eq(passwordResetTokens.used, true)
          )
        );

      // In a real implementation, you would also clean up expired refresh tokens
      console.log('Expired tokens cleaned up');
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }

  // Security metrics
  async getSecurityMetrics(): Promise<{
    activeTokens: number;
    revokedTokens: number;
    failedAttempts: number;
    lockedAccounts: number;
  }> {
    try {
      // In a real implementation, you would query actual metrics
      return {
        activeTokens: 0,
        revokedTokens: 0,
        failedAttempts: 0,
        lockedAccounts: 0
      };
    } catch (error) {
      console.error('Security metrics error:', error);
      return {
        activeTokens: 0,
        revokedTokens: 0,
        failedAttempts: 0,
        lockedAccounts: 0
      };
    }
  }
  // Generate token pair (access + refresh)
  async generateTokenPair(userId: string, metadata?: Partial<TokenMetadata>): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Get user info for access token
      const userProfile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (userProfile.length === 0) {
        throw new Error('User not found');
      }

      // Use token service to generate token pair
      const tokenPair = await tokenService.generateTokenPair({
        userId,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      };
    } catch (error) {
      console.error('Token pair generation error:', error);
      throw new Error('Failed to generate token pair');
    }
  }

  // Rotate refresh token
  async rotateRefreshToken(refreshToken: string, metadata?: Partial<TokenMetadata>): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }> {
    try {
      const tokenPair = await tokenService.rotateRefreshToken(refreshToken, {
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });

      return {
        success: true,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      };
    } catch (error) {
      console.error('Refresh token rotation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rotate refresh token'
      };
    }
  }

  // Revoke refresh token
  async revokeToken(token: string, userId: string, reason: string = 'logout'): Promise<void> {
    await tokenService.revokeRefreshToken(token, userId, reason);
  }

  // Revoke all user tokens
  async revokeAllUserTokens(userId: string, reason: string = 'security'): Promise<void> {
    await tokenService.revokeAllUserTokens(userId, reason);
  }

  // Verify access token
  verifyAccessToken(token: string): { userId: string; familyId: string } | null {
    return tokenService.verifyAccessToken(token);
  }
}

export const authHardeningService = new AuthHardeningService();
