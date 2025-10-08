import { Request, Response, NextFunction } from 'express';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { 
  userProfiles, 
  userActivityLogs, 
  hasPermissionV2, 
  hasAnyPermissionV2,
  PermissionV2,
  UserRoleV2Type,
  insertUserActivityLogSchema,
  logUserActivitySchema
} from '../../shared/schema';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Extended Request interface for security context
export interface SecurityRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRoleV2Type;
    permissions?: string[];
    profile?: any;
  };
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
  };
}

// Permission-based middleware factory
export const requirePermission = (permission: PermissionV2Type) => {
  return async (req: SecurityRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user has the required permission
      const hasPermission = hasPermissionV2(req.user.role, permission);
      
      if (!hasPermission) {
        // Log unauthorized access attempt
        await logUserActivity({
          userId: req.user.id,
          action: 'unauthorized_access_attempt',
          resource: req.route?.path || req.path,
          metadata: {
            permission,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method
          }
        }, req);

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          current: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Multiple permissions check (OR logic)
export const requireAnyPermission = (permissions: PermissionV2Type[]) => {
  return async (req: SecurityRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAnyPermission = hasAnyPermissionV2(req.user.role, permissions);
      
      if (!hasAnyPermission) {
        await logUserActivity({
          userId: req.user.id,
          action: 'unauthorized_access_attempt',
          resource: req.route?.path || req.path,
          metadata: {
            permissions,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method
          }
        }, req);

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          current: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

// Role-based access control
export const requireRole = (roles: UserRoleV2Type[]) => {
  return async (req: SecurityRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        await logUserActivity({
          userId: req.user.id,
          action: 'unauthorized_role_access',
          resource: req.route?.path || req.path,
          metadata: {
            requiredRoles: roles,
            userRole: req.user.role,
            endpoint: req.path,
            method: req.method
          }
        }, req);

        return res.status(403).json({ 
          error: 'Insufficient role privileges',
          required: roles,
          current: req.user.role
        });
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({ error: 'Role check failed' });
    }
  };
};

// Account lockout check
export const checkAccountLockout = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, req.user.id))
      .limit(1);

    if (profile.length > 0 && profile[0].lockedUntil && new Date() < new Date(profile[0].lockedUntil)) {
      return res.status(423).json({ 
        error: 'Account is locked',
        lockedUntil: profile[0].lockedUntil
      });
    }

    next();
  } catch (error) {
    logger.error('Account lockout check error:', error);
    next(); // Continue on error
  }
};

// Session timeout check
export const checkSessionTimeout = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, req.user.id))
      .limit(1);

    if (profile.length > 0 && profile[0].lastLogin) {
      const sessionTimeout = profile[0].sessionTimeout * 1000; // Convert to milliseconds
      const lastLogin = new Date(profile[0].lastLogin);
      const now = new Date();

      if (now.getTime() - lastLogin.getTime() > sessionTimeout) {
        await logUserActivity({
          userId: req.user.id,
          action: 'session_timeout',
          resource: 'session',
          metadata: {
            sessionTimeout: profile[0].sessionTimeout,
            lastLogin: profile[0].lastLogin
          }
        }, req);

        return res.status(401).json({ 
          error: 'Session expired',
          message: 'Please log in again'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Session timeout check error:', error);
    next(); // Continue on error
  }
};

// Activity logging middleware
export const logActivity = (action: string, resource?: string) => {
  return async (req: SecurityRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await logUserActivity({
          userId: req.user.id,
          action,
          resource,
          metadata: {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }
        }, req);
      }
      next();
    } catch (error) {
      logger.error('Activity logging error:', error);
      next(); // Continue on error
    }
  };
};

// Enhanced security context middleware
export const securityContext = async (req: SecurityRequest, res: Response, next: NextFunction) => {
  try {
    // Extract security context from request
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    req.securityContext = {
      ipAddress,
      userAgent,
      sessionId: req.sessionID
    };

    // Load user profile if user is authenticated
    if (req.user) {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length > 0) {
        req.user.profile = profile[0];
        req.user.role = profile[0].role as UserRoleV2Type;
        req.user.permissions = profile[0].permissions;
      }
    }

    next();
  } catch (error) {
    logger.error('Security context error:', error);
    next(); // Continue on error
  }
};

// User activity logging helper
export const logUserActivity = async (
  activity: z.infer<typeof logUserActivitySchema> & { userId: string },
  req: SecurityRequest
) => {
  try {
    const logData = insertUserActivityLogSchema.parse({
      ...activity,
      endpoint: req.path,
      method: req.method,
      ipAddress: req.securityContext?.ipAddress,
      userAgent: req.securityContext?.userAgent,
      statusCode: req.res?.statusCode
    });

    await db.insert(userActivityLogs).values(logData);
  } catch (error) {
    logger.error('Failed to log user activity:', error);
  }
};

// Rate limiting by user role
export const rateLimitByRole = (limits: Record<UserRoleV2Type, { windowMs: number; max: number }>) => {
  return async (req: SecurityRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next();
      }

      const userLimit = limits[req.user.role];
      if (!userLimit) {
        return next();
      }

      // Simple in-memory rate limiting (in production, use Redis)
      const key = `rate_limit_${req.user.id}_${req.path}`;
      const now = Date.now();
      const windowStart = now - userLimit.windowMs;

      // This is a simplified implementation
      // In production, implement proper rate limiting with Redis
      
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // CSP header
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self'; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  next();
};

// Export all middleware
export const securityMiddleware = {
  requirePermission,
  requireAnyPermission,
  requireRole,
  checkAccountLockout,
  checkSessionTimeout,
  logActivity,
  securityContext,
  rateLimitByRole,
  securityHeaders,
  logUserActivity
};
