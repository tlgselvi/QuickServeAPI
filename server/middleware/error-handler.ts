import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import jwt from 'jsonwebtoken';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor (message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor (message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor (message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor (message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor (message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor (message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor (message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

// Error logging interface
interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  body?: any;
  query?: any;
  params?: any;
  code?: string;
  statusCode: number;
}

// Enhanced error logging
function logError (error: Error, req: Request, statusCode: number, code?: string) {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'error' : 'warn',
    message: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'] as string,
    userId: (req as any).user?.id,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    code,
    statusCode,
  };

  // Log to console with structured format
  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error Details:', JSON.stringify(errorLog, null, 2));
  } else {
    // In production, use structured logging
    console.error(JSON.stringify(errorLog));
  }

  // TODO: Send to external logging service (e.g., Sentry, LogRocket, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   externalLoggingService.log(errorLog);
  // }
}

// Handle different types of errors
function handleZodError (error: ZodError): { message: string; details: any } {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    message: 'Validation failed',
    details: issues,
  };
}

function handleJWTError (error: jwt.JsonWebTokenError | jwt.TokenExpiredError): { message: string; code: string } {
  if (error instanceof jwt.TokenExpiredError) {
    return {
      message: 'Token has expired',
      code: 'TOKEN_EXPIRED',
    };
  }

  return {
    message: 'Invalid token',
    code: 'INVALID_TOKEN',
  };
}

function handleDatabaseError (error: any): { message: string; code: string } {
  // Handle common database errors
  if (error.code === '23505') { // Unique constraint violation
    return {
      message: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
    };
  }

  if (error.code === '23503') { // Foreign key constraint violation
    return {
      message: 'Referenced resource does not exist',
      code: 'FOREIGN_KEY_VIOLATION',
    };
  }

  if (error.code === '23502') { // Not null constraint violation
    return {
      message: 'Required field is missing',
      code: 'NULL_CONSTRAINT_VIOLATION',
    };
  }

  return {
    message: 'Database operation failed',
    code: 'DATABASE_ERROR',
  };
}

// Main error handling middleware
export function errorHandler (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any;

  // Handle known error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
  } else if (error instanceof ZodError) {
    statusCode = 400;
    const zodResult = handleZodError(error);
    message = zodResult.message;
    details = zodResult.details;
    code = 'VALIDATION_ERROR';
  } else if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    const jwtResult = handleJWTError(error);
    message = jwtResult.message;
    code = jwtResult.code;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 400;
    const dbResult = handleDatabaseError(error);
    message = dbResult.message;
    code = dbResult.code;
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON format';
    code = 'INVALID_JSON';
  }

  // Log the error
  logError(error, req, statusCode, code);

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Add details for validation errors
  if (details) {
    errorResponse.details = details;
  }

  // Add request ID if available
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    errorResponse.error = 'Internal server error';
    errorResponse.details = undefined;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper
export function asyncHandler (fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler
export function notFoundHandler (req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

// Global unhandled rejection handler
export function setupGlobalErrorHandlers () {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
      timestamp: new Date().toISOString(),
    });

    // In production, you might want to exit the process
    // process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Exit the process for uncaught exceptions
    process.exit(1);
  });
}

// Request ID middleware
export function requestIdMiddleware (req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] ||
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}

export default errorHandler;
