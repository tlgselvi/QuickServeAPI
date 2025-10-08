import type { Request, Response, NextFunction } from 'express';
import type { UserRoleType, PermissionType } from '../../shared/schema.ts';
import { hasPermission, hasAnyPermission } from '../../shared/schema.ts';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: UserRoleType;
  };
}

// JWT Refresh Token middleware
export const requireJWTAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: 'JWT token gerekli',
      code: 'JWT_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Load fresh user data
    const { storage } = await import('../storage');
    const currentUser = await storage.getUser(decoded.userId);

    if (!currentUser || !currentUser.isActive) {
      return res.status(401).json({
        error: 'Geçersiz token veya kullanıcı bulunamadı',
        code: 'INVALID_TOKEN',
      });
    }

    // Attach user to request
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      username: currentUser.username,
      role: currentUser.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Geçersiz token',
      code: 'INVALID_TOKEN',
    });
  }
};

// Authentication middleware - ensures user is logged in and active (supports both JWT and session)
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Try JWT token from header or query parameter (for EventSource)
  let token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : null;
  
  // Fallback to query parameter for EventSource connections
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (token) {
    // Use JWT authentication
    try {
      const { JWTAuthService } = await import('../jwt-auth');
      const decoded = JWTAuthService.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          error: 'Geçersiz token',
          code: 'INVALID_TOKEN',
        });
      }

      // Attach user to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        error: 'Geçersiz token',
        code: 'INVALID_TOKEN',
      });
    }
  }

  // Fallback to session authentication
  if (!req.session?.user) {
    return res.status(401).json({
      error: 'Oturum açmanız gerekiyor',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    // Load fresh user data from authoritative storage
    const { storage } = await import('../storage');
    const currentUser = await storage.getUser(req.session.user.id);

    if (!currentUser) {
      // User no longer exists - destroy session
      req.session.destroy((err) => {});
      return res.status(401).json({
        error: 'Kullanıcı hesabı bulunamadı',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if user account is active (authoritative check)
    if (!currentUser.isActive) {
      req.session.destroy((err) => {});
      return res.status(403).json({
        error: 'Hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Update session with fresh data and attach to request
    req.session.user = {
      id: currentUser.id,
      email: currentUser.email,
      username: currentUser.username,
      role: currentUser.role,
      isActive: currentUser.isActive,
    };
    req.user = req.session.user as any;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Kimlik doğrulama hatası',
      code: 'AUTH_ERROR',
    });
  }
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: UserRoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Oturum açmanız gerekiyor',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Bu işlem için yetkiniz bulunmuyor',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Permission-based authorization middleware
export const requirePermission = (...requiredPermissions: PermissionType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Oturum açmanız gerekiyor',
        code: 'AUTH_REQUIRED',
      });
    }

    const userHasPermission = hasAnyPermission(req.user.role, requiredPermissions);

    if (!userHasPermission) {
      return res.status(403).json({
        error: 'Bu işlem için yetkiniz bulunmuyor',
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermissions,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Check specific permission without blocking request
export const checkPermission = (req: AuthenticatedRequest, permission: PermissionType): boolean => {
  if (!req.user) {
    return false;
  }
  return hasPermission(req.user.role, permission);
};

// Account type access middleware
export const requireAccountTypeAccess = (accountType: 'personal' | 'company') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Oturum açmanız gerekiyor',
        code: 'AUTH_REQUIRED',
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Company users can access both
    if (req.user.role === 'company_user') {
      return next();
    }

    // Personal users can only access personal accounts
    if (req.user.role === 'personal_user' && accountType === 'personal') {
      return next();
    }

    return res.status(403).json({
      error: `${accountType === 'company' ? 'Şirket' : 'Kişisel'} hesaplarına erişim yetkiniz bulunmuyor`,
      code: 'ACCOUNT_TYPE_ACCESS_DENIED',
      accountType,
      userRole: req.user.role,
    });
  };
};

// Optional auth middleware - attaches user if logged in but doesn't require it
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.session?.user) {
    req.user = req.session.user as any;
  }
  next();
};

// Admin only middleware (shorthand)
export const requireAdmin = requireRole('admin');

// Log access attempts for security audit
export const logAccess = (action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    logger.info(`🔐 [AUTH] ${action} - User: ${req.user?.username || 'anonymous'} (${req.user?.role || 'no-role'}) - IP: ${req.ip}`);
    next();
  };
};

// Admin Protection Middleware - Check if this is the last admin
export const lastAdminCheck = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Oturum açmanız gerekiyor',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const { storage } = await import('../storage');
    
    // Get all users with admin role
    const adminUsers = await storage.getUsersByRole('admin');
    const activeAdminUsers = adminUsers.filter(user => user.isActive);

    // If this is the last active admin, prevent certain operations
    if (activeAdminUsers.length === 1 && activeAdminUsers[0].id === req.user.id) {
      return res.status(403).json({
        error: 'Bu işlem gerçekleştirilemez çünkü sistemde sadece siz aktif admin olarak bulunuyorsunuz',
        code: 'LAST_ADMIN_PROTECTION',
        message: 'En az bir aktif admin hesabının bulunması gerekmektedir',
      });
    }

    next();
  } catch (error) {
    logger.error('Last admin check error:', error);
    return res.status(500).json({
      error: 'Admin kontrolü sırasında hata oluştu',
      code: 'ADMIN_CHECK_ERROR',
    });
  }
};

// Admin Role Change Guard - Prevent admin role changes without proper authorization
export const adminRoleChangeGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Oturum açmanız gerekiyor',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const { storage } = await import('../storage');
    
    // Check if this is a role change operation
    const { role, userId } = req.body;
    const targetUserId = userId || req.params.userId;
    
    if (!role || !targetUserId) {
      return next(); // Not a role change operation
    }

    // Get target user
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if target user is currently an admin
    if (targetUser.role === 'admin') {
      // Get all users with admin role
      const adminUsers = await storage.getUsersByRole('admin');
      const activeAdminUsers = adminUsers.filter(user => user.isActive);

      // If this is the last active admin, prevent role change
      if (activeAdminUsers.length === 1 && activeAdminUsers[0].id === targetUserId) {
        return res.status(403).json({
          error: 'Son aktif admin kullanıcısının rolü değiştirilemez',
          code: 'LAST_ADMIN_ROLE_CHANGE_DENIED',
          message: 'En az bir aktif admin hesabının bulunması gerekmektedir',
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Admin role change guard error:', error);
    return res.status(500).json({
      error: 'Rol değişikliği kontrolü sırasında hata oluştu',
      code: 'ROLE_CHANGE_CHECK_ERROR',
    });
  }
};

// System Account Guard - Protect system accounts from modification
export const systemAccountGuard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Oturum açmanız gerekiyor',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const { storage } = await import('../storage');
    
    // Check if this is a user modification operation
    const targetUserId = req.params.userId || req.body.userId;
    
    if (!targetUserId) {
      return next(); // Not a user modification operation
    }

    // Get target user
    const targetUser = await storage.getUser(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'Kullanıcı bulunamadı',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if target user is a system account
    if (targetUser.email === 'system@finbot.com' || targetUser.username === 'system') {
      return res.status(403).json({
        error: 'Sistem hesapları değiştirilemez',
        code: 'SYSTEM_ACCOUNT_PROTECTION',
        message: 'Sistem hesapları güvenlik nedeniyle korunmaktadır',
      });
    }

    next();
  } catch (error) {
    logger.error('System account guard error:', error);
    return res.status(500).json({
      error: 'Sistem hesabı kontrolü sırasında hata oluştu',
      code: 'SYSTEM_ACCOUNT_CHECK_ERROR',
    });
  }
};
