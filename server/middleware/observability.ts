import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import type { AuthenticatedRequest } from './auth';

// Request logging interface
interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  query: Record<string, any>;
  headers: Record<string, string>;
  userAgent: string;
  ip: string;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: string;
  stack?: string;
  metadata?: Record<string, any>;
}

// Performance metrics interface
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  slowestRequests: Array<{
    path: string;
    method: string;
    duration: number;
    timestamp: string;
  }>;
  statusCodes: Record<number, number>;
  endpoints: Record<string, {
    count: number;
    averageTime: number;
    errorCount: number;
  }>;
}

// In-memory metrics store (for development/testing)
class MetricsStore {
  private logs: RequestLog[] = [];
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    slowestRequests: [],
    statusCodes: {},
    endpoints: {}
  };
  private maxLogs = 10000; // Keep last 10k requests
  private maxSlowRequests = 100; // Keep top 100 slowest requests

  addLog(log: RequestLog): void {
    this.logs.push(log);
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.updateMetrics(log);
  }

  private updateMetrics(log: RequestLog): void {
    if (!log.endTime || !log.duration) return;

    this.metrics.requestCount++;
    
    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + log.duration;
    this.metrics.averageResponseTime = totalTime / this.metrics.requestCount;

    // Update status codes
    if (log.statusCode) {
      this.metrics.statusCodes[log.statusCode] = (this.metrics.statusCodes[log.statusCode] || 0) + 1;
    }

    // Update endpoints
    const endpointKey = `${log.method} ${log.path}`;
    if (!this.metrics.endpoints[endpointKey]) {
      this.metrics.endpoints[endpointKey] = {
        count: 0,
        averageTime: 0,
        errorCount: 0
      };
    }
    
    const endpoint = this.metrics.endpoints[endpointKey];
    endpoint.count++;
    endpoint.averageTime = (endpoint.averageTime * (endpoint.count - 1) + log.duration) / endpoint.count;
    
    if (log.statusCode && log.statusCode >= 400) {
      endpoint.errorCount++;
    }

    // Update error rate
    const errorCount = Object.entries(this.metrics.statusCodes)
      .filter(([code]) => parseInt(code) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    this.metrics.errorRate = (errorCount / this.metrics.requestCount) * 100;

    // Update slowest requests
    if (log.duration > 1000) { // Only track requests > 1 second
      this.metrics.slowestRequests.push({
        path: log.path,
        method: log.method,
        duration: log.duration,
        timestamp: log.timestamp
      });

      // Sort by duration and keep only top 100
      this.metrics.slowestRequests.sort((a, b) => b.duration - a.duration);
      this.metrics.slowestRequests = this.metrics.slowestRequests.slice(0, this.maxSlowRequests);
    }
  }

  getLogs(filters?: {
    userId?: string;
    statusCode?: number;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): RequestLog[] {
    let filteredLogs = [...this.logs];

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters?.statusCode) {
      filteredLogs = filteredLogs.filter(log => log.statusCode === filters.statusCode);
    }

    if (filters?.startTime) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= filters.startTime!);
    }

    if (filters?.endTime) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= filters.endTime!);
    }

    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(-filters.limit);
    }

    return filteredLogs;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  clear(): void {
    this.logs = [];
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowestRequests: [],
      statusCodes: {},
      endpoints: {}
    };
  }
}

// Global metrics store
const metricsStore = new MetricsStore();

// Request logging middleware
export const requestLoggingMiddleware = (options: {
  logLevel?: 'all' | 'errors' | 'slow' | 'none';
  slowThreshold?: number; // milliseconds
  logBody?: boolean;
  logHeaders?: boolean;
  excludePaths?: string[];
}) => {
  const {
    logLevel = 'all',
    slowThreshold = 1000,
    logBody = false,
    logHeaders = false,
    excludePaths = ['/health', '/metrics']
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const requestId = req.headers['x-request-id'] as string || randomUUID();
    const startTime = Date.now();

    // Create request log
    const requestLog: RequestLog = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: logHeaders ? req.headers as Record<string, string> : {},
      userAgent: req.get('User-Agent') || '',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userId: (req as AuthenticatedRequest).user?.id,
      userRole: (req as AuthenticatedRequest).user?.role,
      sessionId: (req as any).sessionID,
      requestId,
      startTime,
      metadata: {
        body: logBody ? req.body : undefined,
        params: req.params,
        protocol: req.protocol,
        secure: req.secure,
        hostname: req.hostname
      }
    };

    // Set request ID in response headers
    res.setHeader('X-Request-ID', requestId);

    // Override res.json to capture response details
    const originalJson = res.json;
    res.json = function(body: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update request log with response details
      requestLog.endTime = endTime;
      requestLog.duration = duration;
      requestLog.statusCode = res.statusCode;
      requestLog.responseSize = JSON.stringify(body).length;

      // Determine if we should log this request
      const shouldLog = 
        logLevel === 'all' ||
        (logLevel === 'errors' && res.statusCode >= 400) ||
        (logLevel === 'slow' && duration > slowThreshold);

      if (shouldLog) {
        metricsStore.addLog(requestLog);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          const logMessage = `${requestLog.method} ${requestLog.path} - ${res.statusCode} - ${duration}ms`;
          if (res.statusCode >= 400) {
            console.error(`❌ ${logMessage}`);
          } else if (duration > slowThreshold) {
            console.warn(`⚠️  ${logMessage}`);
          } else {
            console.log(`✅ ${logMessage}`);
          }
        }
      }

      return originalJson.call(this, body);
    };

    // Handle errors
    const originalEnd = res.end;
    res.end = function(chunk?: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      requestLog.endTime = endTime;
      requestLog.duration = duration;
      requestLog.statusCode = res.statusCode;

      if (res.statusCode >= 400) {
        metricsStore.addLog(requestLog);
      }

      return originalEnd.call(this, chunk);
    };

    next();
  };
};

// Error logging middleware
export const errorLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    if (res.statusCode >= 400) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        error: body.error || body.message,
        userId: (req as AuthenticatedRequest).user?.id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.headers['x-request-id'],
        stack: body.stack,
        body: req.body,
        query: req.query,
        params: req.params
      };

      // Log error to console
      console.error('🚨 API Error:', errorLog);

      // Store error in metrics
      metricsStore.addLog({
        id: randomUUID(),
        timestamp: errorLog.timestamp,
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: {},
        userAgent: errorLog.userAgent || '',
        ip: errorLog.ip || 'unknown',
        userId: errorLog.userId,
        sessionId: (req as any).sessionID,
        requestId: errorLog.requestId as string || randomUUID(),
        startTime: Date.now() - 100, // Approximate
        endTime: Date.now(),
        duration: 100, // Approximate
        statusCode: res.statusCode,
        error: errorLog.error,
        stack: errorLog.stack
      });
    }

    return originalJson.call(this, body);
  };

  next();
};

// Performance metrics endpoint
export const metricsMiddleware = (req: Request, res: Response) => {
  const metrics = metricsStore.getMetrics();
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: {
      ...metrics,
      slowestRequests: metrics.slowestRequests.slice(0, 10) // Only return top 10
    }
  });
};

// Request logs endpoint (for debugging)
export const logsMiddleware = (req: Request, res: Response) => {
  const { userId, statusCode, limit = 100 } = req.query;
  
  const filters: any = {};
  if (userId) filters.userId = userId as string;
  if (statusCode) filters.statusCode = parseInt(statusCode as string);
  if (limit) filters.limit = parseInt(limit as string);

  const logs = metricsStore.getLogs(filters);
  
  res.json({
    count: logs.length,
    logs: logs.map(log => ({
      ...log,
      // Remove sensitive data
      headers: log.headers ? Object.fromEntries(
        Object.entries(log.headers).filter(([key]) => 
          !['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())
        )
      ) : {},
      metadata: log.metadata ? {
        ...log.metadata,
        body: undefined // Remove body from logs
      } : undefined
    }))
  });
};

// Health check endpoint
export const healthCheckMiddleware = (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  res.json(health);
};

// Export utilities
export const getMetrics = () => metricsStore.getMetrics();
export const getLogs = (filters?: any) => metricsStore.getLogs(filters);
export const clearMetrics = () => metricsStore.clear();

// Structured logging for application events
export const logEvent = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown'
  };

  switch (level) {
    case 'error':
      console.error('🔴', JSON.stringify(logEntry, null, 2));
      break;
    case 'warn':
      console.warn('🟡', JSON.stringify(logEntry, null, 2));
      break;
    default:
      console.log('🔵', JSON.stringify(logEntry, null, 2));
  }
};

export default {
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  metricsMiddleware,
  logsMiddleware,
  healthCheckMiddleware,
  getMetrics,
  getLogs,
  clearMetrics,
  logEvent
};
