import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';
import { logger } from '../utils/logger';

// Sentry integration with fallback for development
class SentryIntegration {
  private sentry: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Dynamic import to avoid issues when Sentry is not installed
      const Sentry = await import('@sentry/node');
      
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          release: process.env.npm_package_version || '1.0.0',
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Sentry.Integrations.Express({ app: undefined }),
            new Sentry.Integrations.OnUncaughtException(),
            new Sentry.Integrations.OnUnhandledRejection(),
          ],
          beforeSend(event) {
            // Filter out development errors
            if (process.env.NODE_ENV === 'development') {
              logger.info('Sentry event (development):', event);
              return null; // Don't send in development
            }
            return event;
          },
          beforeSendTransaction(event) {
            // Filter out health check and metrics endpoints
            if (event.transaction?.includes('/health') || 
                event.transaction?.includes('/metrics') ||
                event.transaction?.includes('/logs')) {
              return null;
            }
            return event;
          }
        });

        this.sentry = Sentry;
        this.isInitialized = true;
        logger.info('✅ Sentry initialized successfully');
      } else {
        logger.info('⚠️  Sentry DSN not configured, using fallback logging');
      }
    } catch (error) {
      logger.warn('⚠️  Sentry not available:', error);
      this.sentry = null;
      this.isInitialized = false;
    }
  }

  // Capture exception
  captureException(error: Error, context?: any) {
    if (this.sentry && this.isInitialized) {
      this.sentry.captureException(error, context);
    } else {
      // Fallback logging
      logger.error('🚨 Exception (Sentry fallback):', {
        error: error.message,
        stack: error.stack,
        context
      });
    }
  }

  // Capture message
  captureMessage(message: string, level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info', context?: any) {
    if (this.sentry && this.isInitialized) {
      this.sentry.captureMessage(message, level, context);
    } else {
      // Fallback logging
      const emoji = level === 'error' ? '🚨' : level === 'warning' ? '⚠️' : 'ℹ️';
      logger.info(`${emoji} Message (Sentry fallback):`, {
        message,
        level,
        context
      });
    }
  }

  // Add breadcrumb
  addBreadcrumb(breadcrumb: any) {
    if (this.sentry && this.isInitialized) {
      this.sentry.addBreadcrumb(breadcrumb);
    }
  }

  // Set user context
  setUser(user: { id?: string; email?: string; username?: string; role?: string }) {
    if (this.sentry && this.isInitialized) {
      this.sentry.setUser(user);
    }
  }

  // Set tags
  setTag(key: string, value: string) {
    if (this.sentry && this.isInitialized) {
      this.sentry.setTag(key, value);
    }
  }

  // Set context
  setContext(key: string, context: any) {
    if (this.sentry && this.isInitialized) {
      this.sentry.setContext(key, context);
    }
  }

  // Start transaction
  startTransaction(name: string, op: string) {
    if (this.sentry && this.isInitialized) {
      return this.sentry.startTransaction({ name, op });
    }
    return null;
  }

  // Get current scope
  getCurrentScope() {
    if (this.sentry && this.isInitialized) {
      return this.sentry.getCurrentScope();
    }
    return null;
  }

  // Configure scope
  configureScope(callback: (scope: any) => void) {
    if (this.sentry && this.isInitialized) {
      this.sentry.configureScope(callback);
    }
  }

  // Close and flush
  async close() {
    if (this.sentry && this.isInitialized) {
      await this.sentry.close();
    }
  }
}

// Global Sentry instance
export const sentry = new SentryIntegration();

// Sentry middleware for Express
export const sentryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (sentry.sentry && sentry.isInitialized) {
    sentry.sentry.requestHandler()(req, res, next);
  } else {
    next();
  }
};

// Sentry error handler middleware
export const sentryErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  if (sentry.sentry && sentry.isInitialized) {
    sentry.sentry.errorHandler()(req, res, next);
  } else {
    next();
  }
};

// Sentry tracing middleware
export const sentryTracingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (sentry.sentry && sentry.isInitialized) {
    sentry.sentry.tracingHandler()(req, res, next);
  } else {
    next();
  }
};

// Custom error handler with Sentry integration
export const errorHandlerWithSentry = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Set user context if available
  if ((req as AuthenticatedRequest).user) {
    const user = (req as AuthenticatedRequest).user!;
    sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });
  }

  // Set request context
  sentry.setContext('request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    params: req.params,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    sessionId: (req as any).sessionID
  });

  // Add breadcrumb
  sentry.addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.path}`,
    level: 'info',
    data: {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode
    }
  });

  // Capture exception
  sentry.captureException(error, {
    tags: {
      endpoint: `${req.method} ${req.path}`,
      userId: (req as AuthenticatedRequest).user?.id
    },
    extra: {
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString()
    }
  });

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.error('🚨 Unhandled Error:', {
      message: error.message,
      stack: error.stack,
      request: {
        method: req.method,
        url: req.url,
        userId: (req as AuthenticatedRequest).user?.id
      }
    });
  }

  // Send error response
  const statusCode = res.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    code: 'INTERNAL_ERROR',
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString()
  });
};

// Performance monitoring middleware
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const transaction = sentry.startTransaction(`${req.method} ${req.path}`, 'http.server');

  if (transaction) {
    // Set transaction context
    transaction.setData('method', req.method);
    transaction.setData('url', req.url);
    transaction.setData('userAgent', req.get('User-Agent'));
    transaction.setData('ip', req.ip || req.connection.remoteAddress);

    // Set user context if available
    if ((req as AuthenticatedRequest).user) {
      const user = (req as AuthenticatedRequest).user!;
      transaction.setUser({
        id: user.id,
        email: user.email,
        username: user.username
      });
    }

    // Override res.end to finish transaction
    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      const duration = Date.now() - startTime;
      
      transaction.setData('statusCode', res.statusCode);
      transaction.setData('duration', duration);
      
      if (res.statusCode >= 400) {
        transaction.setStatus('internal_error');
      } else if (res.statusCode >= 300) {
        transaction.setStatus('ok');
      } else {
        transaction.setStatus('ok');
      }

      transaction.finish();
      return originalEnd.call(this, chunk);
    };
  }

  next();
};

// Database query monitoring
export const databaseQueryMonitoring = (query: string, duration: number, error?: Error) => {
  if (duration > 1000) { // Log slow queries (>1 second)
    sentry.addBreadcrumb({
      category: 'db',
      message: 'Slow database query',
      level: 'warning',
      data: {
        query: query.substring(0, 200), // Truncate long queries
        duration
      }
    });

    sentry.captureMessage('Slow database query detected', 'warning', {
      query: query.substring(0, 500),
      duration,
      tags: {
        type: 'database',
        performance: 'slow_query'
      }
    });
  }

  if (error) {
    sentry.captureException(error, {
      tags: {
        type: 'database',
        query: query.substring(0, 100)
      }
    });
  }
};

// Custom error classes for better Sentry grouping
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public statusCode?: number) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

// Helper function to capture and handle errors
export const captureError = (error: Error, context?: any) => {
  // Add context to error
  if (context) {
    sentry.setContext('error_context', context);
  }

  // Capture exception
  sentry.captureException(error);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.error('🚨 Captured Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context
    });
  }
};

// Helper function to capture performance issues
export const capturePerformanceIssue = (operation: string, duration: number, threshold: number = 1000) => {
  if (duration > threshold) {
    sentry.captureMessage(`Performance issue: ${operation} took ${duration}ms`, 'warning', {
      operation,
      duration,
      threshold,
      tags: {
        type: 'performance',
        operation
      }
    });
  }
};

// Graceful shutdown handler
export const gracefulShutdown = async () => {
  logger.info('🔄 Gracefully shutting down...');
  
  try {
    await sentry.close();
    logger.info('✅ Sentry closed successfully');
  } catch (error) {
    logger.error('❌ Error closing Sentry:', error);
  }

  process.exit(0);
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  sentry.captureException(error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  sentry.captureException(new Error(`Unhandled Rejection: ${reason}`));
});

// Handle SIGTERM and SIGINT
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default {
  sentry,
  sentryMiddleware,
  sentryErrorHandler,
  sentryTracingMiddleware,
  errorHandlerWithSentry,
  performanceMonitoringMiddleware,
  databaseQueryMonitoring,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalServiceError,
  captureError,
  capturePerformanceIssue,
  gracefulShutdown
};
