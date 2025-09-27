// Database query optimization utilities

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Optimize query parameters
export function optimizeQueryParams (options: QueryOptions) {
  const {
    limit = 20,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'DESC',
    search = '',
    filters = {},
  } = options;

  // Validate and sanitize parameters
  const sanitizedLimit = Math.min(Math.max(parseInt(limit.toString()) || 20, 1), 100);
  const sanitizedOffset = Math.max(parseInt(offset.toString()) || 0, 0);
  const sanitizedOrderBy = sanitizeColumnName(orderBy);
  const sanitizedOrderDirection = orderDirection === 'ASC' ? 'ASC' : 'DESC';
  const sanitizedSearch = search.toString().trim();
  const sanitizedFilters = sanitizeFilters(filters);

  return {
    limit: sanitizedLimit,
    offset: sanitizedOffset,
    orderBy: sanitizedOrderBy,
    orderDirection: sanitizedOrderDirection,
    search: sanitizedSearch,
    filters: sanitizedFilters,
  };
}

// Sanitize column names to prevent SQL injection
function sanitizeColumnName (column: string): string {
  // Only allow alphanumeric characters, underscores, and dots
  const sanitized = column.replace(/[^a-zA-Z0-9_.]/g, '');

  // Common allowed columns
  const allowedColumns = [
    'id', 'created_at', 'updated_at', 'name', 'email', 'username',
    'amount', 'date', 'description', 'category', 'type', 'balance',
    'bank_name', 'account_name', 'currency', 'is_active',
  ];

  // If column is not in allowed list, default to created_at
  if (!allowedColumns.includes(sanitized)) {
    return 'created_at';
  }

  return sanitized;
}

// Sanitize filter values
function sanitizeFilters (filters: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(filters)) {
    const sanitizedKey = sanitizeColumnName(key);

    if (typeof value === 'string') {
      // Sanitize string values
      sanitized[sanitizedKey] = value.trim().slice(0, 255);
    } else if (typeof value === 'number') {
      // Validate numeric values
      if (isFinite(value) && value >= 0) {
        sanitized[sanitizedKey] = value;
      }
    } else if (typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      // Sanitize array values
      sanitized[sanitizedKey] = value
        .filter(item => typeof item === 'string' || typeof item === 'number')
        .slice(0, 10); // Limit array size
    }
  }

  return sanitized;
}

// Build WHERE clause for filters
export function buildWhereClause (filters: Record<string, any>): { clause: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        values.push(...value);
      }
    } else if (typeof value === 'string' && value.includes('%')) {
      // LIKE query
      conditions.push(`${key} LIKE ?`);
      values.push(value);
    } else {
      // Exact match
      conditions.push(`${key} = ?`);
      values.push(value);
    }
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, values };
}

// Build search clause
export function buildSearchClause (search: string, searchColumns: string[]): { clause: string; values: any[] } {
  if (!search || searchColumns.length === 0) {
    return { clause: '', values: [] };
  }

  const conditions = searchColumns.map(column => `${column} ILIKE ?`);
  const clause = `AND (${conditions.join(' OR ')})`;
  const values = searchColumns.map(() => `%${search}%`);

  return { clause, values };
}

// Calculate pagination info
export function calculatePagination (total: number, page: number, limit: number): {
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  offset: number;
} {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const offset = (page - 1) * limit;

  return {
    totalPages,
    hasNext,
    hasPrev,
    offset,
  };
}

// Create paginated result
export function createPaginatedResult<T> (
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const { totalPages, hasNext, hasPrev } = calculatePagination(total, page, limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
}

// Query performance monitoring
export class QueryPerformanceMonitor {
  private static queries = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  static startQuery (queryId: string): () => void {
    const startTime = Date.now();

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const existing = this.queries.get(queryId) || { count: 0, totalTime: 0, avgTime: 0 };
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;

      this.queries.set(queryId, existing);

      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected: ${queryId} took ${duration}ms`);
      }
    };
  }

  static getStats (): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [queryId, data] of Array.from(this.queries.entries())) {
      stats[queryId] = {
        count: data.count,
        totalTime: data.totalTime,
        avgTime: Math.round(data.avgTime * 100) / 100,
      };
    }

    return stats;
  }

  static clearStats (): void {
    this.queries.clear();
  }
}

// Database connection health check
export async function checkDatabaseHealth (pool: any): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const result = await pool.query('SELECT 1 as health_check');
    const latency = Date.now() - startTime;

    return {
      healthy: result.rows.length > 0,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default {
  optimizeQueryParams,
  buildWhereClause,
  buildSearchClause,
  calculatePagination,
  createPaginatedResult,
  QueryPerformanceMonitor,
  checkDatabaseHealth,
};
