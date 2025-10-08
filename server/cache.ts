import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from './utils/logger.ts';

// In-memory cache implementation (fallback when Redis is not available)
class MemoryCache {
  private cache = new Map<string, { data: any; expiresAt: number; tags: string[] }>();
  private tags = new Map<string, Set<string>>();

  set(key: string, data: any, ttlSeconds: number = 300, tags: string[] = []): void {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiresAt, tags });

    // Track keys by tags for invalidation
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    });

    // Clean up expired entries
    this.cleanup();
  }

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByTag(tag: string): void {
    const keys = this.tags.get(tag);
    if (keys) {
      keys.forEach(key => this.cache.delete(key));
      this.tags.delete(tag);
    }
  }

  clear(): void {
    this.cache.clear();
    this.tags.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  stats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Simplified implementation
    };
  }
}

// Cache interface
interface CacheInterface {
  get(key: string): Promise<any>;
  set(key: string, data: any, ttlSeconds?: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<boolean>;
  invalidateByTag(tag: string): Promise<void>;
  clear(): Promise<void>;
}

// Memory cache implementation
class MemoryCacheAdapter implements CacheInterface {
  private cache = new MemoryCache();

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, data: any, ttlSeconds: number = 300, tags: string[] = []): Promise<void> {
    this.cache.set(key, data, ttlSeconds, tags);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    this.cache.invalidateByTag(tag);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Redis cache implementation (when Redis is available)
class RedisCacheAdapter implements CacheInterface {
  private redis: any;

  constructor() {
    try {
      // Dynamic import to avoid issues when Redis is not installed
      const Redis = require('redis');
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options: any) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.warn('Redis connection refused, falling back to memory cache');
            return null;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redis.on('error', (err: Error) => {
        logger.warn('Redis error:', err.message);
      });

      this.redis.connect();
    } catch (error) {
      logger.warn('Redis not available, using memory cache');
      this.redis = null;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttlSeconds: number = 300, tags: string[] = []): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setEx(key, ttlSeconds, JSON.stringify(data));
      
      // Store tags for invalidation
      if (tags.length > 0) {
        for (const tag of tags) {
          await this.redis.sAdd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttlSeconds);
        }
      }
    } catch (error) {
      logger.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.sMembers(`tag:${tag}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        await this.redis.del(`tag:${tag}`);
      }
    } catch (error) {
      logger.error('Redis invalidateByTag error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.flushDb();
    } catch (error) {
      logger.error('Redis clear error:', error);
    }
  }
}

// Cache manager
class CacheManager {
  private cache: CacheInterface;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor() {
    // Try Redis first, fallback to memory cache
    const redisCache = new RedisCacheAdapter();
    this.cache = redisCache;
  }

  async get(key: string): Promise<any> {
    const data = await this.cache.get(key);
    if (data !== null) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    return data;
  }

  async set(key: string, data: any, ttlSeconds: number = 300, tags: string[] = []): Promise<void> {
    await this.cache.set(key, data, ttlSeconds, tags);
    this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.cache.delete(key);
    if (result) {
      this.stats.deletes++;
    }
    return result;
  }

  async invalidateByTag(tag: string): Promise<void> {
    await this.cache.invalidateByTag(tag);
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  // Cache key generators
  generateKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  generateUserKey(userId: string, resource: string, ...parts: string[]): string {
    return this.generateKey('user', userId, resource, ...parts);
  }

  generateRequestKey(req: Request, ...parts: string[]): string {
    const userId = (req as any).user?.id || 'anonymous';
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query);
    const hash = this.hashString(`${method}:${path}:${query}`);
    return this.generateKey('request', userId, hash, ...parts);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Global cache instance
export const cache = new CacheManager();

// Cache middleware
export const cacheMiddleware = (options: {
  ttl?: number;
  tags?: string[];
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request, res: Response) => boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const {
      ttl = 300, // 5 minutes default
      tags = [],
      keyGenerator,
      skipCache
    } = options;

    // Skip cache for write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Skip cache if condition is met
    if (skipCache && skipCache(req, res)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator ? keyGenerator(req) : cache.generateRequestKey(req);

    try {
      // Try to get from cache
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Cache miss - override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body: any) {
        // Cache the response
        cache.set(cacheKey, body, ttl, tags).catch(error => {
          logger.error('Cache set error:', error);
        });

        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specific cache middlewares
export const cacheUserData = (resource: string, ttl: number = 600) => {
  return cacheMiddleware({
    ttl,
    tags: [`user:${resource}`],
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      return cache.generateUserKey(userId, resource, JSON.stringify(req.query));
    }
  });
};

export const cacheAccountData = cacheUserData('accounts', 300);
export const cacheTransactionData = cacheUserData('transactions', 180);
export const cacheDashboardData = cacheUserData('dashboard', 60);
export const cacheCreditData = cacheUserData('credits', 600);

// Cache invalidation helpers
export const invalidateUserCache = async (userId: string, resource?: string) => {
  if (resource) {
    await cache.invalidateByTag(`user:${resource}`);
  } else {
    // Invalidate all user-related cache
    const resources = ['accounts', 'transactions', 'dashboard', 'credits'];
    for (const res of resources) {
      await cache.invalidateByTag(`user:${res}`);
    }
  }
};

export const invalidateAccountCache = async (accountId: string) => {
  await cache.invalidateByTag('user:accounts');
  await cache.invalidateByTag('user:transactions');
  await cache.invalidateByTag('user:dashboard');
};

export const invalidateTransactionCache = async (transactionId: string) => {
  await cache.invalidateByTag('user:transactions');
  await cache.invalidateByTag('user:dashboard');
};

export const invalidateCreditCache = async (creditId: string) => {
  await cache.invalidateByTag('user:credits');
  await cache.invalidateByTag('user:dashboard');
};

// Cache warming utilities
export const warmCache = async (userId: string) => {
  try {
    // Pre-load common data
    const { storage } = await import('./storage');
    
    // Warm dashboard cache
    const dashboardKey = cache.generateUserKey(userId, 'dashboard');
    const dashboardData = await storage.getDashboardStats();
    await cache.set(dashboardKey, dashboardData, 60, [`user:dashboard`]);

    // Warm accounts cache
    const accountsKey = cache.generateUserKey(userId, 'accounts');
    const accountsData = await storage.getAccounts();
    await cache.set(accountsKey, accountsData, 300, [`user:accounts`]);

    logger.info(`Cache warmed for user ${userId}`);
  } catch (error) {
    logger.error('Cache warming error:', error);
  }
};

export default cache;
