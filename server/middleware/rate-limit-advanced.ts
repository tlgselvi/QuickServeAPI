import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { eq, and, gt, desc } from 'drizzle-orm';
import { db } from '../db';
import { userActivityLogs, userProfiles } from '../../shared/schema';

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  // Login attempts
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // 2FA attempts
  twoFactor: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // API calls by role
  api: {
    admin: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 1000
    },
    finance: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 500
    },
    viewer: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 200
    },
    auditor: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 300
    }
  }
};

// Lockout Configuration
export const LOCKOUT_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes
  maxFailedAttemptsPerIP: 10,
  ipLockoutDuration: 60 * 60 * 1000, // 1 hour
  adminBypass: true
};

// Enhanced Rate Limiter Factory
export class AdvancedRateLimiter {
  // Create login rate limiter
  static createLoginRateLimit() {
    return rateLimit({
      ...RATE_LIMIT_CONFIG.login,
      keyGenerator: (req: Request) => {
        return `login:${req.ip}:${req.body.email || 'unknown'}`;
      },
      handler: async (req: Request, res: Response) => {
        const email = req.body.email;
        const ipAddress = req.ip || 'unknown';
        
        // Log failed login attempt
        await this.logFailedAttempt(email, ipAddress, 'login_rate_limit');
        
        res.status(429).json({
          error: 'Too many login attempts',
          message: 'Please try again in 15 minutes',
          retryAfter: 15 * 60
        });
      },
      skip: async (req: Request) => {
        // Skip rate limiting for admin bypass
        const isAdminBypass = req.headers['x-admin-bypass'] === process.env.ADMIN_BYPASS_KEY;
        return isAdminBypass && LOCKOUT_CONFIG.adminBypass;
      }
    });
  }

  // Create 2FA rate limiter
  static create2FARateLimit() {
    return rateLimit({
      ...RATE_LIMIT_CONFIG.twoFactor,
      keyGenerator: (req: Request) => {
        return `2fa:${req.ip}:${req.user?.id || 'unknown'}`;
      },
      handler: async (req: Request, res: Response) => {
        const userId = req.user?.id;
        const ipAddress = req.ip || 'unknown';
        
        // Log failed 2FA attempt
        await this.logFailedAttempt(userId, ipAddress, '2fa_rate_limit');
        
        res.status(429).json({
          error: 'Too many 2FA attempts',
          message: 'Please try again in 15 minutes',
          retryAfter: 15 * 60
        });
      }
    });
  }

  // Create password reset rate limiter
  static createPasswordResetRateLimit() {
    return rateLimit({
      ...RATE_LIMIT_CONFIG.passwordReset,
      keyGenerator: (req: Request) => {
        return `password_reset:${req.ip}:${req.body.email || 'unknown'}`;
      },
      handler: async (req: Request, res: Response) => {
        const email = req.body.email;
        const ipAddress = req.ip || 'unknown';
        
        // Log failed password reset attempt
        await this.logFailedAttempt(email, ipAddress, 'password_reset_rate_limit');
        
        res.status(429).json({
          error: 'Too many password reset attempts',
          message: 'Please try again in 1 hour',
          retryAfter: 60 * 60
        });
      }
    });
  }

  // Create API rate limiter based on user role
  static createAPIRateLimit(role: string) {
    const config = RATE_LIMIT_CONFIG.api[role as keyof typeof RATE_LIMIT_CONFIG.api] || RATE_LIMIT_CONFIG.api.viewer;
    
    return rateLimit({
      ...config,
      keyGenerator: (req: Request) => {
        return `api:${role}:${req.user?.id || req.ip}`;
      },
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests for ${role} role`,
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      },
      skip: async (req: Request) => {
        // Skip rate limiting for admin bypass
        const isAdminBypass = req.headers['x-admin-bypass'] === process.env.ADMIN_BYPASS_KEY;
        return isAdminBypass && LOCKOUT_CONFIG.adminBypass;
      }
    });
  }

  // Create slow down middleware
  static createSlowDown() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // Allow 50 requests per window without delay
      delayMs: (used: number, req: Request) => {
        // New express-slow-down v2 behavior
        const delayAfter = req.slowDown?.limit || 50;
        return (used - delayAfter) * 500;
      },
      maxDelayMs: 20000, // Max delay of 20 seconds
      validate: {
        delayMs: false // Disable warning for delayMs
      },
      skip: (req: Request) => {
        // Skip slow down for admin bypass
        const isAdminBypass = req.headers['x-admin-bypass'] === process.env.ADMIN_BYPASS_KEY;
        return isAdminBypass && LOCKOUT_CONFIG.adminBypass;
      }
    });
  }

  // Account lockout checker
  static createAccountLockoutChecker() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        const email = req.body.email;
        const ipAddress = req.ip || 'unknown';

        if (userId) {
          // Check user account lockout
          const lockoutStatus = await this.checkUserLockout(userId);
          if (lockoutStatus.isLocked) {
            return res.status(423).json({
              error: 'Account is locked',
              message: 'Too many failed attempts',
              lockedUntil: lockoutStatus.lockedUntil,
              retryAfter: Math.ceil((new Date(lockoutStatus.lockedUntil!).getTime() - Date.now()) / 1000)
            });
          }
        }

        // Check IP-based lockout
        const ipLockoutStatus = await this.checkIPLockout(ipAddress);
        if (ipLockoutStatus.isLocked) {
          return res.status(423).json({
            error: 'IP address is locked',
            message: 'Too many failed attempts from this IP',
            lockedUntil: ipLockoutStatus.lockedUntil,
            retryAfter: Math.ceil((new Date(ipLockoutStatus.lockedUntil!).getTime() - Date.now()) / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('Account lockout check error:', error);
        next(); // Continue on error
      }
    };
  }

  // Check user account lockout status
  private static async checkUserLockout(userId: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    failedAttempts: number;
  }> {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return { isLocked: false, failedAttempts: 0 };
      }

      const userProfile = profile[0];
      const isLocked = userProfile.lockedUntil && new Date() < new Date(userProfile.lockedUntil);

      return {
        isLocked: !!isLocked,
        lockedUntil: userProfile.lockedUntil || undefined,
        failedAttempts: userProfile.failedLoginAttempts
      };
    } catch (error) {
      console.error('User lockout check error:', error);
      return { isLocked: false, failedAttempts: 0 };
    }
  }

  // Check IP-based lockout status
  private static async checkIPLockout(ipAddress: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
  }> {
    try {
      // In a real implementation, you would check IP lockout table
      // This is a simplified version
      return { isLocked: false };
    } catch (error) {
      console.error('IP lockout check error:', error);
      return { isLocked: false };
    }
  }

  // Log failed attempt
  private static async logFailedAttempt(identifier: string, ipAddress: string, action: string): Promise<void> {
    try {
      await db.insert(userActivityLogs).values({
        userId: identifier,
        action: `failed_${action}`,
        resource: 'security',
        metadata: {
          ipAddress,
          timestamp: new Date(),
          identifier
        }
      });
    } catch (error) {
      console.error('Failed attempt logging error:', error);
    }
  }

  // Handle failed authentication attempt
  static async handleFailedAuth(userId: string, ipAddress: string, action: string): Promise<void> {
    try {
      // Increment failed attempts
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return;
      }

      const currentAttempts = profile[0].failedLoginAttempts + 1;
      const lockoutUntil = currentAttempts >= LOCKOUT_CONFIG.maxFailedAttempts 
        ? new Date(Date.now() + LOCKOUT_CONFIG.lockoutDuration)
        : null;

      await db
        .update(userProfiles)
        .set({
          failedLoginAttempts: currentAttempts,
          lockedUntil: lockoutUntil,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

      // Log failed attempt
      await db.insert(userActivityLogs).values({
        userId,
        action: `failed_${action}`,
        resource: 'authentication',
        metadata: {
          ipAddress,
          failedAttempts: currentAttempts,
          locked: !!lockoutUntil,
          timestamp: new Date()
        }
      });

    } catch (error) {
      console.error('Failed auth handling error:', error);
    }
  }

  // Reset failed attempts on successful authentication
  static async resetFailedAttempts(userId: string): Promise<void> {
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

      // Log successful authentication
      await db.insert(userActivityLogs).values({
        userId,
        action: 'auth_success',
        resource: 'authentication',
        metadata: {
          timestamp: new Date(),
          resetAttempts: true
        }
      });

    } catch (error) {
      console.error('Failed attempts reset error:', error);
    }
  }

  // Admin unlock functionality
  static async adminUnlock(userId: string, adminUserId: string): Promise<void> {
    try {
      await db
        .update(userProfiles)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

      // Log admin unlock
      await db.insert(userActivityLogs).values({
        userId: adminUserId,
        action: 'admin_unlock_user',
        resource: 'user_management',
        resourceId: userId,
        metadata: {
          timestamp: new Date(),
          unlockedUser: userId
        }
      });

    } catch (error) {
      console.error('Admin unlock error:', error);
      throw new Error('Failed to unlock user account');
    }
  }

  // Auto-unlock expired accounts (cron job)
  static async autoUnlockExpiredAccounts(): Promise<number> {
    try {
      const now = new Date();
      
      // Find accounts that are locked but lockout has expired
      const lockedProfiles = await db
        .select()
        .from(userProfiles)
        .where(
          and(
            gt(userProfiles.lockedUntil, new Date(0)), // Has lockout timestamp
            lt(userProfiles.lockedUntil, now) // Lockout has expired
          )
        );

      let unlockedCount = 0;
      
      for (const profile of lockedProfiles) {
        await db
          .update(userProfiles)
          .set({
            failedLoginAttempts: 0,
            lockedUntil: null,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, profile.userId));

        // Log auto-unlock
        await db.insert(userActivityLogs).values({
          userId: profile.userId,
          action: 'auto_unlock_expired',
          resource: 'authentication',
          metadata: {
            timestamp: new Date(),
            previousLockout: profile.lockedUntil
          }
        });

        unlockedCount++;
      }

      console.log(`Auto-unlocked ${unlockedCount} expired accounts`);
      return unlockedCount;

    } catch (error) {
      console.error('Auto-unlock error:', error);
      return 0;
    }
  }

  // Get rate limiting metrics
  static async getRateLimitMetrics(): Promise<{
    lockedAccounts: number;
    failedAttempts24h: number;
    topFailedIPs: Array<{ ip: string; count: number }>;
    rateLimitHits: number;
  }> {
    try {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Count locked accounts
      const lockedAccounts = await db
        .select({ count: userProfiles.userId })
        .from(userProfiles)
        .where(gt(userProfiles.lockedUntil, now));

      // Count failed attempts in last 24h
      const failedAttempts = await db
        .select({ count: userActivityLogs.id })
        .from(userActivityLogs)
        .where(
          and(
            gt(userActivityLogs.timestamp, last24h),
            eq(userActivityLogs.action, 'failed_login')
          )
        );

      // In a real implementation, you would have more detailed metrics
      return {
        lockedAccounts: lockedAccounts.length,
        failedAttempts24h: failedAttempts.length,
        topFailedIPs: [],
        rateLimitHits: 0
      };

    } catch (error) {
      console.error('Rate limit metrics error:', error);
      return {
        lockedAccounts: 0,
        failedAttempts24h: 0,
        topFailedIPs: [],
        rateLimitHits: 0
      };
    }
  }
}

// Export middleware functions
export const rateLimitMiddleware = {
  login: AdvancedRateLimiter.createLoginRateLimit(),
  twoFactor: AdvancedRateLimiter.create2FARateLimit(),
  passwordReset: AdvancedRateLimiter.createPasswordResetRateLimit(),
  api: {
    admin: AdvancedRateLimiter.createAPIRateLimit('admin'),
    finance: AdvancedRateLimiter.createAPIRateLimit('finance'),
    viewer: AdvancedRateLimiter.createAPIRateLimit('viewer'),
    auditor: AdvancedRateLimiter.createAPIRateLimit('auditor')
  },
  slowDown: AdvancedRateLimiter.createSlowDown(),
  accountLockout: AdvancedRateLimiter.createAccountLockoutChecker()
};
