// Simple in-memory cache implementation
interface CacheItem<T> {
  value: T;
  expires: number;
  createdAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor (maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    // Clean up expired items every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set<T> (key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expires = now + (ttl || this.defaultTTL);

    // If cache is full, remove oldest item
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expires,
      createdAt: now,
    });
  }

  get<T> (key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has (key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete (key: string): boolean {
    return this.cache.delete(key);
  }

  clear (): void {
    this.cache.clear();
  }

  size (): number {
    return this.cache.size;
  }

  keys (): string[] {
    return Array.from(this.cache.keys());
  }

  private cleanup (): void {
    const now = Date.now();

    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats (): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
    } {
    const now = Date.now();
    let oldestItem = now;
    let newestItem = 0;

    for (const item of Array.from(this.cache.values())) {
      if (item.createdAt < oldestItem) {
        oldestItem = item.createdAt;
      }
      if (item.createdAt > newestItem) {
        newestItem = item.createdAt;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for this
      oldestItem: oldestItem === now ? 0 : now - oldestItem,
      newestItem: newestItem === 0 ? 0 : now - newestItem,
    };
  }
}

// Global cache instance
export const cache = new MemoryCache(1000, 300000); // 1000 items, 5 minutes TTL

// Cache decorator for functions
export function cached (ttl?: number, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      cache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}

// Cache middleware for Express routes
export function cacheMiddleware (ttl: number = 300000) {
  return (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `route:${req.method}:${req.originalUrl}:${req.headers.authorization || 'anonymous'}`;

    // Try to get from cache
    const cached = cache.get(key);
    if (cached !== null) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function (obj: any) {
      // Cache the response
      cache.set(key, obj, ttl);
      res.setHeader('X-Cache', 'MISS');

      return originalJson.call(this, obj);
    };

    next();
  };
}

// Cache invalidation utilities
export class CacheInvalidator {
  static invalidatePattern (pattern: string): void {
    const regex = new RegExp(pattern);

    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  }

  static invalidateUser (userId: string): void {
    this.invalidatePattern(`.*:${userId}:.*`);
  }

  static invalidateRoute (route: string): void {
    this.invalidatePattern(`route:.*:${route}:.*`);
  }

  static invalidateAll (): void {
    cache.clear();
  }
}

// Cache warming utilities
export class CacheWarmer {
  static async warmUserData (userId: string, userService: any): Promise<void> {
    try {
      const userData = await userService.getUserById(userId);
      cache.set(`user:${userId}`, userData, 600000); // 10 minutes
    } catch (error) {
      console.error('Failed to warm user cache:', error);
    }
  }

  static async warmDashboardData (userId: string, dashboardService: any): Promise<void> {
    try {
      const dashboardData = await dashboardService.getDashboardData(userId);
      cache.set(`dashboard:${userId}`, dashboardData, 300000); // 5 minutes
    } catch (error) {
      console.error('Failed to warm dashboard cache:', error);
    }
  }
}

// Cache health check
export function getCacheHealth (): {
  healthy: boolean;
  stats: any;
  memoryUsage: NodeJS.MemoryUsage;
  } {
  const stats = cache.getStats();
  const memoryUsage = process.memoryUsage();

  return {
    healthy: stats.size < stats.maxSize * 0.9, // Healthy if less than 90% full
    stats,
    memoryUsage,
  };
}

export default {
  cache,
  cached,
  cacheMiddleware,
  CacheInvalidator,
  CacheWarmer,
  getCacheHealth,
};
