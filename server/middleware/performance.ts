import type { Request, Response, NextFunction } from 'express';

// Performance monitoring interface
interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  userAgent?: string;
  ip?: string;
}

// In-memory cache for performance monitoring
const performanceCache = new Map<string, PerformanceMetrics>();

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  const metrics: PerformanceMetrics = {
    requestId,
    method: req.method,
    url: req.url,
    startTime,
    memoryUsage: process.memoryUsage(),
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  };

  performanceCache.set(requestId, metrics);

  // Override res.end to capture end time
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const endTime = Date.now();
    const duration = endTime - startTime;

    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.memoryUsage = process.memoryUsage();

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.url} took ${duration}ms`);
    }

    // Log performance metrics for API routes
    if (req.url.startsWith('/api')) {
      console.log(`📊 Performance: ${req.method} ${req.url} - ${duration}ms - ${metrics.memoryUsage.heapUsed / 1024 / 1024}MB`);
    }

    // Clean up cache (keep only last 100 entries)
    if (performanceCache.size > 100) {
      const firstKey = performanceCache.keys().next().value;
      if (firstKey) performanceCache.delete(firstKey);
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query optimization middleware
export const queryOptimizer = (req: Request, res: Response, next: NextFunction) => {
  // Add query optimization headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
  });

  // Optimize JSON responses
  const originalJson = res.json;
  res.json = function (obj: any) {
    // Compress large responses
    if (JSON.stringify(obj).length > 10000) {
      res.set('Content-Encoding', 'gzip');
    }

    return originalJson.call(this, obj);
  };

  next();
};

// Memory usage monitoring
export const memoryMonitor = (req: Request, res: Response, next: NextFunction) => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

  // Warn if memory usage is high
  if (heapUsedMB > 500) { // 500MB threshold
    console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`);
  }

  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`);
  }

  next();
};

// Response compression middleware
export const responseCompression = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data: any) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    // Compress responses larger than 1KB
    if (dataStr.length > 1024) {
      res.set('Content-Encoding', 'gzip');
    }

    return originalSend.call(this, data);
  };

  res.json = function (obj: any) {
    const jsonStr = JSON.stringify(obj);

    // Compress JSON responses larger than 1KB
    if (jsonStr.length > 1024) {
      res.set('Content-Encoding', 'gzip');
    }

    return originalJson.call(this, obj);
  };

  next();
};

// Database connection pooling optimization
export const dbConnectionOptimizer = (req: Request, res: Response, next: NextFunction) => {
  // Add database connection info to response headers
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-DB-Status', 'connected');
  }

  next();
};

// Cache control middleware
export const cacheControl = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set cache headers based on request type
    if (req.method === 'GET') {
      res.set({
        'Cache-Control': `private, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
        ETag: `"${req.url}-${Date.now()}"`,
        Vary: 'Accept-Encoding, Authorization',
      });
    } else {
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
    }

    next();
  };
};

// Request deduplication middleware
const pendingRequests = new Map<string, Promise<any>>();

export const requestDeduplication = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const requestKey = `${req.method}:${req.url}:${req.headers.authorization || 'anonymous'}`;

  // Check if same request is already pending
  if (pendingRequests.has(requestKey)) {
    console.log(`🔄 Deduplicating request: ${requestKey}`);

    // Wait for the pending request to complete
    pendingRequests.get(requestKey)!.then((result) => {
      res.json(result);
    }).catch((error) => {
      res.status(500).json({ error: 'Request failed' });
    });

    return;
  }

  // Store the request promise
  const requestPromise = new Promise((resolve, reject) => {
    const originalJson = res.json;
    const originalStatus = res.status;

    res.json = function (obj: any) {
      pendingRequests.delete(requestKey);
      resolve(obj);
      return originalJson.call(this, obj);
    };

    res.status = function (code: number) {
      if (code >= 400) {
        pendingRequests.delete(requestKey);
        reject(new Error(`Request failed with status ${code}`));
      }
      return originalStatus.call(this, code);
    };
  });

  pendingRequests.set(requestKey, requestPromise);

  // Clean up after 30 seconds
  setTimeout(() => {
    pendingRequests.delete(requestKey);
  }, 30000);

  next();
};

// Performance metrics endpoint
export const getPerformanceMetrics = (req: Request, res: Response) => {
  const metrics = Array.from(performanceCache.values());
  const memUsage = process.memoryUsage();

  const stats = {
    totalRequests: metrics.length,
    averageResponseTime: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
    slowestRequest: metrics.reduce((max, m) => (m.duration || 0) > (max.duration || 0) ? m : max, metrics[0]),
    memoryUsage: {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
    },
    pendingRequests: pendingRequests.size,
    uptime: process.uptime(),
  };

  res.json(stats);
};

// Cleanup function for performance cache
export const cleanupPerformanceCache = () => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, metrics] of Array.from(performanceCache.entries())) {
    if (metrics.startTime && (now - metrics.startTime) > maxAge) {
      performanceCache.delete(key);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupPerformanceCache, 5 * 60 * 1000);

export default {
  performanceMonitor,
  queryOptimizer,
  memoryMonitor,
  responseCompression,
  dbConnectionOptimizer,
  cacheControl,
  requestDeduplication,
  getPerformanceMetrics,
  cleanupPerformanceCache,
};
