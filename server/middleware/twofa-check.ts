import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    twofaVerified?: boolean;
  };
}

// 2FA Required Middleware for Critical Operations
export const twofaRequired = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if 2FA is verified for this session
    if (!req.user.twofaVerified) {
      logger.warn(`2FA required for user ${req.user.id} on ${req.method} ${req.path}`);
      return res.status(403).json({ 
        error: 'Two-factor authentication required for this operation',
        code: '2FA_REQUIRED',
        message: 'Please complete two-factor authentication to proceed'
      });
    }

    next();
  } catch (error) {
    logger.error('2FA check middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: '2FA_CHECK_ERROR'
    });
  }
};

// 2FA Optional Middleware (logs but doesn't block)
export const twofaOptional = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user && !req.user.twofaVerified) {
      logger.info(`User ${req.user.id} accessing ${req.method} ${req.path} without 2FA`);
    }
    next();
  } catch (error) {
    logger.error('2FA optional middleware error:', error);
    next(); // Don't block on optional check
  }
};

// Critical operations that require 2FA
export const CRITICAL_OPERATIONS = [
  '/api/accounts/delete',
  '/api/transactions/delete',
  '/api/portfolio/delete',
  '/api/settings/password',
  '/api/settings/email',
  '/api/admin/',
  '/api/finance/transfer',
  '/api/finance/withdraw'
];

// Check if current path requires 2FA
export const isCriticalOperation = (path: string): boolean => {
  return CRITICAL_OPERATIONS.some(operation => path.startsWith(operation));
};

// Dynamic 2FA middleware based on operation type
export const dynamicTwofaCheck = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (isCriticalOperation(req.path)) {
    return twofaRequired(req, res, next);
  } else {
    return twofaOptional(req, res, next);
  }
};
