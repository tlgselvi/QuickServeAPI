import { Request, Response, NextFunction } from 'express';
import { JWTAuthService, TokenBlacklist } from '../jwt-auth';
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

// JWT Authentication middleware - ensures user is logged in and active
export const requireJWTAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from Authorization header
    const token = JWTAuthService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authorization token is required',
        code: 'AUTH_TOKEN_REQUIRED' 
      });
    }

    // Check if token is blacklisted (for logout functionality)
    if (TokenBlacklist.isBlacklisted(token)) {
      return res.status(401).json({
        error: 'Token has been invalidated',
        code: 'TOKEN_INVALIDATED'
      });
    }

    // Verify JWT token
    const payload = JWTAuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Load fresh user data from storage
    const { storage } = await import('../storage');
    const currentUser = await storage.getUser(payload.userId);
    
    if (!currentUser) {
      return res.status(401).json({
        error: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user account is active
    if (!currentUser.isActive) {
      return res.status(403).json({
        error: 'Account is inactive. Please contact administrator',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user info to request
    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      username: currentUser.username,
      role: currentUser.role as UserRoleType
    };

    next();
  } catch (error) {
    console.error('JWT Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware for JWT
export const requireJWTRole = (...allowedRoles: UserRoleType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Permission-based authorization middleware for JWT
export const requireJWTPermission = (...requiredPermissions: PermissionType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    const userHasPermission = hasAnyPermission(req.user.role, requiredPermissions);
    
    if (!userHasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSION',
        requiredPermissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

// Account type access middleware for JWT
export const requireJWTAccountTypeAccess = (accountType: 'personal' | 'company') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
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
      error: `Access denied for ${accountType} accounts`,
      code: 'ACCOUNT_TYPE_ACCESS_DENIED',
      accountType,
      userRole: req.user.role
    });
  };
};

// Optional JWT auth middleware - attaches user if token is valid but doesn't require it
export const optionalJWTAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = JWTAuthService.extractTokenFromHeader(req.headers.authorization);
    
    if (token && !TokenBlacklist.isBlacklisted(token)) {
      const payload = JWTAuthService.verifyToken(token);
      if (payload) {
        const { storage } = await import('../storage');
        const currentUser = await storage.getUser(payload.userId);
        
        if (currentUser && currentUser.isActive) {
          req.user = {
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.username,
            role: currentUser.role as UserRoleType
          };
        }
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional JWT auth failed:', error);
  }
  
  next();
};

// Admin only middleware for JWT (shorthand)
export const requireJWTAdmin = requireJWTRole('admin');

// Log access attempts for security audit
export const logJWTAccess = (action: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log(`🔐 [JWT-AUTH] ${action} - User: ${req.user?.username || 'anonymous'} (${req.user?.role || 'no-role'}) - IP: ${req.ip}`);
    next();
  };
};

