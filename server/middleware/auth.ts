import { Request, Response, NextFunction } from 'express';
import { UserRoleType, PermissionType, hasPermission, hasAnyPermission } from '@shared/schema';

// Extend Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: UserRoleType;
  };
}

// Authentication middleware - ensures user is logged in
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ 
      error: 'Oturum açmanız gerekiyor',
      code: 'AUTH_REQUIRED' 
    });
  }
  
  // Attach user to request object for convenience
  req.user = req.session.user as any;
  next();
};

// Role-based authorization middleware
export const requireRole = (...allowedRoles: UserRoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Oturum açmanız gerekiyor',
        code: 'AUTH_REQUIRED' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Bu işlem için yetkiniz bulunmuyor',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        userRole: req.user.role
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
        code: 'AUTH_REQUIRED' 
      });
    }

    const userHasPermission = hasAnyPermission(req.user.role, requiredPermissions);
    
    if (!userHasPermission) {
      return res.status(403).json({ 
        error: 'Bu işlem için yetkiniz bulunmuyor',
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Check specific permission without blocking request
export const checkPermission = (req: AuthenticatedRequest, permission: PermissionType): boolean => {
  if (!req.user) return false;
  return hasPermission(req.user.role, permission);
};

// Account type access middleware
export const requireAccountTypeAccess = (accountType: 'personal' | 'company') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Oturum açmanız gerekiyor',
        code: 'AUTH_REQUIRED' 
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
      userRole: req.user.role
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
    console.log(`🔐 [AUTH] ${action} - User: ${req.user?.username || 'anonymous'} (${req.user?.role || 'no-role'}) - IP: ${req.ip}`);
    next();
  };
};