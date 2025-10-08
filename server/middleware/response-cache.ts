import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag: string;
}

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
  vary?: string[]; // Headers that affect caching
}

// In-memory cache store
const cache = new Map<string, CacheEntry>();

// Default cache configuration
const defaultConfig: Required<CacheConfig> = {
  ttl: 5 * 60 * 1000, // 5 minutes
  keyGenerator: (req: Request) => {
    const url = req.originalUrl || req.url;
    const userId = req.user?.id || 'anonymous';
    const query = req.query ? JSON.stringify(req.query) : '';
    const varyHeaders = req.headers['accept'] || '';
    
    return crypto
      .createHash('sha256')
      .update(`${req.method}:${url}:${userId}:${query}:${varyHeaders}`)
      .digest('hex');
  },
  shouldCache: (req: Request, res: Response) => {
    // Only cache GET requests with 200 status
    return req.method === 'GET' && res.statusCode === 200;
  },
  vary: ['accept', 'accept-language']
};

// Generate ETag for response data
function generateETag(data: any): string {
  const content = JSON.stringify(data);
  return crypto
    .createHash('md5')
    .update(content)
    .digest('hex');
}

// Check if request has conditional headers
function hasConditionalHeaders(req: Request): boolean {
  return !!(req.headers['if-none-match'] || req.headers['if-modified-since']);
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// Response cache middleware factory
export function responseCache(config: CacheConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or when explicitly disabled
    if (req.method !== 'GET' || req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    const cacheKey = finalConfig.keyGenerator(req);
    const cachedEntry = cache.get(cacheKey);

    // Check if we have a valid cached entry
    if (cachedEntry && isCacheValid(cachedEntry)) {
      // Check conditional headers for 304 Not Modified
      if (req.headers['if-none-match'] === cachedEntry.etag) {
        logger.info(`📋 Cache hit (304): ${req.method} ${req.url}`);
        return res.status(304).end();
      }

      // Return cached data
      logger.info(`📋 Cache hit: ${req.method} ${req.url}`);
      res.setHeader('ETag', cachedEntry.etag);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Timestamp', new Date(cachedEntry.timestamp).toISOString());
      return res.json(cachedEntry.data);
    }

    // Store original res.json method
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let responseData: any;
    let statusCode = 200;

    // Override res.json to capture response data
    res.json = function(data: any) {
      responseData = data;
      statusCode = res.statusCode;
      
      // Check if we should cache this response
      if (finalConfig.shouldCache(req, res)) {
        const etag = generateETag(data);
        const entry: CacheEntry = {
          data,
          timestamp: Date.now(),
          ttl: finalConfig.ttl,
          etag
        };

        cache.set(cacheKey, entry);
        
        // Set cache headers
        res.setHeader('ETag', etag);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(finalConfig.ttl / 1000)}`);
        
        logger.info(`📋 Cache miss (stored): ${req.method} ${req.url}`);
      } else {
        res.setHeader('X-Cache', 'SKIP');
      }

      // Clean up old cache entries periodically
      if (cache.size > 1000) {
        cleanupCache();
      }

      return originalJson(data);
    };

    // Override res.status to capture status code
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus(code);
    };

    next();
  };
}

// Cleanup old cache entries
function cleanupCache() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of cache.entries()) {
    if (!isCacheValid(entry)) {
      cache.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
  }
}

// Cache management endpoints
export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  let totalSize = 0;

  for (const entry of cache.values()) {
    if (isCacheValid(entry)) {
      validEntries++;
      totalSize += JSON.stringify(entry.data).length;
    } else {
      expiredEntries++;
    }
  }

  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    totalSize,
    memoryUsage: process.memoryUsage()
  };
}

export function clearCache(pattern?: string) {
  if (!pattern) {
    const size = cache.size;
    cache.clear();
    logger.info(`🗑️ Cleared entire cache (${size} entries)`);
    return size;
  }

  let clearedCount = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      clearedCount++;
    }
  }

  logger.info(`🗑️ Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
  return clearedCount;
}

// Warm up cache with common queries
export async function warmupCache(queries: Array<{
  url: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}>) {
  logger.info(`🔥 Starting cache warmup with ${queries.length} queries`);
  
  for (const query of queries) {
    try {
      // This would need to be implemented with actual HTTP requests
      // or by calling the route handlers directly
      logger.info(`🔥 Warming up: ${query.method || 'GET'} ${query.url}`);
    } catch (error) {
      logger.error(`🔥 Warmup failed for ${query.url}:`, error);
    }
  }
}

// Auto-cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

export default {
  responseCache,
  getCacheStats,
  clearCache,
  warmupCache
};
