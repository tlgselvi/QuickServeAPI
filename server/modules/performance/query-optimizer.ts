import { eq, and, gte, lte, sql, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { agingReports, accounts, transactions } from '@shared/schema';

export interface QueryMetrics {
  queryId: string;
  query: string;
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  timestamp: Date;
}

export interface OptimizationSuggestion {
  type: 'index' | 'cache' | 'query_rewrite' | 'pagination';
  description: string;
  impact: 'low' | 'medium' | 'high';
  sql?: string;
}

class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryMetrics: Map<string, QueryMetrics[]> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Cleanup old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    // Cleanup expired cache entries every minute
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000);
  }

  public static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Execute query with optimization and monitoring
   */
  public async executeOptimizedQuery<T>(
    queryId: string,
    queryFn: () => Promise<T[]>,
    useCache: boolean = true
  ): Promise<T[]> {
    const startTime = performance.now();

    // Check cache first
    if (useCache) {
      const cached = this.getFromCache(queryId);
      if (cached) {
        this.recordMetrics(queryId, 'cached', performance.now() - startTime, 0, true);
        return cached as T[];
      }
    }

    try {
      // Execute query
      const result = await queryFn();
      const executionTime = performance.now() - startTime;

      // Record metrics
      this.recordMetrics(queryId, 'executed', executionTime, result.length, false);

      // Cache result
      if (useCache && result.length > 0) {
        this.setCache(queryId, result);
      }

      // Check for optimization suggestions
      if (executionTime > 100) { // > 100ms
        this.analyzeSlowQuery(queryId, executionTime, result.length);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      this.recordMetrics(queryId, 'error', executionTime, 0, false);
      throw error;
    }
  }

  /**
   * Optimized aging reports query with pagination
   */
  public async getAgingReportsOptimized(
    userId: string,
    reportType: 'ar' | 'ap',
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'currentAmount' | 'agingDays';
      sortOrder?: 'asc' | 'desc';
      filters?: {
        status?: string;
        agingBucket?: string;
        minAmount?: number;
        maxAmount?: number;
      };
    } = {}
  ) {
    const queryId = `aging_reports_${userId}_${reportType}_${JSON.stringify(options)}`;

    return this.executeOptimizedQuery(queryId, async () => {
      let query = db
        .select()
        .from(agingReports)
        .where(and(
          eq(agingReports.userId, userId),
          eq(agingReports.reportType, reportType)
        ));

      // Apply filters
      if (options.filters) {
        const conditions = [eq(agingReports.userId, userId), eq(agingReports.reportType, reportType)];

        if (options.filters.status) {
          conditions.push(eq(agingReports.status, options.filters.status));
        }
        if (options.filters.agingBucket) {
          conditions.push(eq(agingReports.agingBucket, options.filters.agingBucket));
        }
        if (options.filters.minAmount !== undefined) {
          conditions.push(gte(agingReports.currentAmount, options.filters.minAmount.toString()));
        }
        if (options.filters.maxAmount !== undefined) {
          conditions.push(lte(agingReports.currentAmount, options.filters.maxAmount.toString()));
        }

        query = query.where(and(...conditions));
      }

      // Apply sorting
      if (options.sortBy) {
        const sortColumn = agingReports[options.sortBy];
        if (sortColumn) {
          query = query.orderBy(
            options.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn)
          );
        }
      } else {
        query = query.orderBy(desc(agingReports.createdAt));
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.offset(options.offset);
      }

      return await query;
    });
  }

  /**
   * Optimized dashboard data query
   */
  public async getDashboardDataOptimized(userId: string) {
    const queryId = `dashboard_data_${userId}`;

    return this.executeOptimizedQuery(queryId, async () => {
      // Get accounts and transactions in parallel
      const [accountsData, transactionsData] = await Promise.all([
        db.select().from(accounts).where(eq(accounts.userId, userId)),
        db.select()
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.createdAt))
          .limit(100), // Limit recent transactions
      ]);

      return { accounts: accountsData, transactions: transactionsData };
    });
  }

  /**
   * Optimized aging summary query
   */
  public async getAgingSummaryOptimized(
    userId: string,
    reportType: 'ar' | 'ap'
  ) {
    const queryId = `aging_summary_${userId}_${reportType}`;

    return this.executeOptimizedQuery(queryId, async () => {
      // Use raw SQL for better performance on aggregation
      const result = await db.execute(sql`
        SELECT 
          aging_bucket,
          COUNT(*) as count,
          SUM(current_amount::numeric) as total_amount,
          AVG(aging_days) as avg_days
        FROM aging_reports 
        WHERE user_id = ${userId} 
          AND report_type = ${reportType}
        GROUP BY aging_bucket
        ORDER BY aging_bucket
      `);

      return result.rows;
    });
  }

  /**
   * Batch operations for better performance
   */
  public async batchInsert<T>(
    table: any,
    data: T[],
    batchSize: number = 1000
  ): Promise<void> {
    const startTime = performance.now();

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(table).values(batch);
    }

    const executionTime = performance.now() - startTime;
    console.log(`Batch insert completed: ${data.length} rows in ${executionTime.toFixed(2)}ms`);
  }

  /**
   * Get query performance metrics
   */
  public getQueryMetrics(queryId?: string): QueryMetrics[] | Map<string, QueryMetrics[]> {
    if (queryId) {
      return this.queryMetrics.get(queryId) || [];
    }
    return this.queryMetrics;
  }

  /**
   * Get optimization suggestions
   */
  public getOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze slow queries
    for (const [queryId, metrics] of this.queryMetrics.entries()) {
      const recentMetrics = metrics.filter(m => 
        Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
      );

      if (recentMetrics.length === 0) continue;

      const avgExecutionTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length;

      if (avgExecutionTime > 500) { // > 500ms
        suggestions.push({
          type: 'index',
          description: `Query ${queryId} is slow (${avgExecutionTime.toFixed(2)}ms avg). Consider adding indexes.`,
          impact: 'high',
          sql: recentMetrics[0].query,
        });
      }

      if (recentMetrics.length > 100) { // Called frequently
        suggestions.push({
          type: 'cache',
          description: `Query ${queryId} is called frequently (${recentMetrics.length} times). Consider caching.`,
          impact: 'medium',
        });
      }
    }

    // General suggestions
    suggestions.push({
      type: 'index',
      description: 'Add index on aging_reports(user_id, report_type, created_at) for better performance',
      impact: 'high',
      sql: 'CREATE INDEX idx_aging_reports_user_type_created ON aging_reports(user_id, report_type, created_at);',
    });

    suggestions.push({
      type: 'index',
      description: 'Add index on accounts(user_id, account_type) for faster account queries',
      impact: 'medium',
      sql: 'CREATE INDEX idx_accounts_user_type ON accounts(user_id, account_type);',
    });

    suggestions.push({
      type: 'index',
      description: 'Add index on transactions(user_id, created_at) for transaction history',
      impact: 'medium',
      sql: 'CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at);',
    });

    return suggestions;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private recordMetrics(
    queryId: string,
    query: string,
    executionTime: number,
    rowsReturned: number,
    cacheHit: boolean
  ): void {
    if (!this.queryMetrics.has(queryId)) {
      this.queryMetrics.set(queryId, []);
    }

    this.queryMetrics.get(queryId)!.push({
      queryId,
      query,
      executionTime,
      rowsReturned,
      cacheHit,
      timestamp: new Date(),
    });

    // Keep only last 100 metrics per query
    const metrics = this.queryMetrics.get(queryId)!;
    if (metrics.length > 100) {
      this.queryMetrics.set(queryId, metrics.slice(-100));
    }
  }

  private analyzeSlowQuery(queryId: string, executionTime: number, rowsReturned: number): void {
    console.warn(`Slow query detected: ${queryId}`, {
      executionTime: `${executionTime.toFixed(2)}ms`,
      rowsReturned,
      timestamp: new Date().toISOString(),
    });
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    for (const [queryId, metrics] of this.queryMetrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      if (filtered.length === 0) {
        this.queryMetrics.delete(queryId);
      } else {
        this.queryMetrics.set(queryId, filtered);
      }
    }
  }

  /**
   * Clear cache
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  } {
    let totalRequests = 0;
    let cacheHits = 0;

    for (const metrics of this.queryMetrics.values()) {
      totalRequests += metrics.length;
      cacheHits += metrics.filter(m => m.cacheHit).length;
    }

    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
      totalRequests,
      cacheHits,
    };
  }
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance();

// Performance monitoring middleware
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const originalSend = res.send;

    res.send = function(data: any) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Log slow requests
      if (executionTime > 500) {
        console.warn(`Slow API request: ${req.method} ${req.path}`, {
          executionTime: `${executionTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        });
      }

      // Add performance headers
      res.setHeader('X-Response-Time', `${executionTime.toFixed(2)}ms`);

      originalSend.call(this, data);
    };

    next();
  };
}
