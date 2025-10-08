import { db } from './db';
import { and, or, eq, desc, asc, like, ilike, gte, lte, between, isNull } from 'drizzle-orm';
import { accounts, transactions, credits, auditLogs, categories, tags } from '@shared/schema';
import { logger } from './utils/logger.ts';

// Query optimization utilities
export class QueryOptimizer {
  
  // Optimized transaction queries with proper indexing
  static async getTransactionsOptimized(filters: {
    accountId?: string;
    type?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'date' | 'amount' | 'createdAt';
    orderDirection?: 'asc' | 'desc';
  }) {
    const conditions = [
      eq(transactions.isActive, true),
      isNull(transactions.deletedAt)
    ];

    // Add filters with proper indexing
    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    
    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    
    if (filters.category) {
      conditions.push(eq(transactions.category, filters.category));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(transactions.date, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(transactions.date, filters.dateTo));
    }
    
    if (filters.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${filters.search}%`),
          ilike(transactions.category, `%${filters.search}%`),
          ilike(sql`${transactions.amount}::text`, `%${filters.search}%`)
        )
      );
    }

    // Build query with optimized ordering
    const orderByField = filters.orderBy === 'amount' ? transactions.amount :
                        filters.orderBy === 'createdAt' ? transactions.createdAt :
                        transactions.date;
    
    const orderDirection = filters.orderDirection === 'asc' ? asc : desc;

    let query = db.select().from(transactions)
      .where(and(...conditions))
      .orderBy(orderDirection(orderByField));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  // Optimized paginated transactions with count
  static async getTransactionsPaginatedOptimized(page: number, limit: number, filters: {
    accountId?: string;
    type?: string;
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    orderBy?: 'date' | 'amount' | 'createdAt';
    orderDirection?: 'asc' | 'desc';
  }) {
    const conditions = [
      eq(transactions.isActive, true),
      isNull(transactions.deletedAt)
    ];

    // Add filters
    if (filters.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
    }
    
    if (filters.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    
    if (filters.category) {
      conditions.push(eq(transactions.category, filters.category));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(transactions.date, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(transactions.date, filters.dateTo));
    }
    
    if (filters.search) {
      conditions.push(
        or(
          ilike(transactions.description, `%${filters.search}%`),
          ilike(transactions.category, `%${filters.search}%`),
          ilike(sql`${transactions.amount}::text`, `%${filters.search}%`)
        )
      );
    }

    const whereClause = and(...conditions);

    // Get total count efficiently
    const countResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Build optimized query with proper ordering
    const orderByField = filters.orderBy === 'amount' ? transactions.amount :
                        filters.orderBy === 'createdAt' ? transactions.createdAt :
                        transactions.date;
    
    const orderDirection = filters.orderDirection === 'asc' ? asc : desc;

    const offset = (page - 1) * limit;
    
    const transactionResults = await db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(orderDirection(orderByField))
      .limit(limit)
      .offset(offset);

    return {
      transactions: transactionResults,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    };
  }

  // Optimized account queries
  static async getAccountsOptimized(filters: {
    userId?: string;
    type?: 'personal' | 'company';
    isActive?: boolean;
    bankName?: string;
  }) {
    const conditions = [
      eq(accounts.isActive, filters.isActive ?? true),
      isNull(accounts.deletedAt)
    ];

    if (filters.userId) {
      conditions.push(eq(accounts.userId, filters.userId));
    }
    
    if (filters.type) {
      conditions.push(eq(accounts.type, filters.type));
    }
    
    if (filters.bankName) {
      conditions.push(ilike(accounts.bankName, `%${filters.bankName}%`));
    }

    return db.select().from(accounts)
      .where(and(...conditions))
      .orderBy(asc(accounts.accountName));
  }

  // Optimized credit queries
  static async getCreditsOptimized(filters: {
    userId?: string;
    accountId?: string;
    type?: string;
    status?: string;
    isActive?: boolean;
    dueDateFrom?: Date;
    dueDateTo?: Date;
  }) {
    const conditions = [
      eq(credits.isActive, filters.isActive ?? true),
      isNull(credits.deletedAt)
    ];

    if (filters.userId) {
      conditions.push(eq(credits.userId, filters.userId));
    }
    
    if (filters.accountId) {
      conditions.push(eq(credits.accountId, filters.accountId));
    }
    
    if (filters.type) {
      conditions.push(eq(credits.type, filters.type));
    }
    
    if (filters.status) {
      conditions.push(eq(credits.status, filters.status));
    }
    
    if (filters.dueDateFrom) {
      conditions.push(gte(credits.dueDate, filters.dueDateFrom));
    }
    
    if (filters.dueDateTo) {
      conditions.push(lte(credits.dueDate, filters.dueDateTo));
    }

    return db.select().from(credits)
      .where(and(...conditions))
      .orderBy(desc(credits.dueDate));
  }

  // Optimized audit log queries
  static async getAuditLogsOptimized(filters: {
    tableName?: string;
    recordId?: string;
    userId?: string;
    operation?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [];

    if (filters.tableName) {
      conditions.push(eq(auditLogs.tableName, filters.tableName));
    }
    
    if (filters.recordId) {
      conditions.push(eq(auditLogs.recordId, filters.recordId));
    }
    
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    
    if (filters.operation) {
      conditions.push(eq(auditLogs.operation, filters.operation));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(auditLogs.timestamp, filters.dateFrom));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(auditLogs.timestamp, filters.dateTo));
    }

    let query = db.select().from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  // Dashboard statistics with optimized queries
  static async getDashboardStatsOptimized(userId?: string) {
    const baseConditions = [
      eq(accounts.isActive, true),
      isNull(accounts.deletedAt)
    ];

    if (userId) {
      baseConditions.push(eq(accounts.userId, userId));
    }

    // Get account balances efficiently
    const accountStats = await db
      .select({
        totalBalance: sql<number>`SUM(CAST(${accounts.balance} AS DECIMAL))`,
        personalBalance: sql<number>`SUM(CASE WHEN ${accounts.type} = 'personal' THEN CAST(${accounts.balance} AS DECIMAL) ELSE 0 END)`,
        companyBalance: sql<number>`SUM(CASE WHEN ${accounts.type} = 'company' THEN CAST(${accounts.balance} AS DECIMAL) ELSE 0 END)`,
        accountCount: count()
      })
      .from(accounts)
      .where(and(...baseConditions));

    // Get transaction counts efficiently
    const transactionConditions = [
      eq(transactions.isActive, true),
      isNull(transactions.deletedAt)
    ];

    const transactionStats = await db
      .select({
        totalTransactions: count(),
        incomeTransactions: sql<number>`COUNT(CASE WHEN ${transactions.type} = 'income' THEN 1 END)`,
        expenseTransactions: sql<number>`COUNT(CASE WHEN ${transactions.type} = 'expense' THEN 1 END)`
      })
      .from(transactions)
      .where(and(...transactionConditions));

    return {
      ...accountStats[0],
      ...transactionStats[0]
    };
  }

  // Batch operations for better performance
  static async batchUpdateAccounts(updates: Array<{ id: string; updates: Partial<any> }>) {
    const results = [];
    
    for (const update of updates) {
      try {
        const result = await db.update(accounts)
          .set({ ...update.updates, updatedAt: new Date() })
          .where(eq(accounts.id, update.id))
          .returning();
        results.push(result[0]);
      } catch (error) {
        logger.error(`Failed to update account ${update.id}:`, error);
      }
    }
    
    return results;
  }

  // Optimized search across multiple tables
  static async globalSearch(query: string, userId?: string, limit: number = 20) {
    const searchPattern = `%${query}%`;
    const conditions = userId ? [eq(accounts.userId, userId)] : [];

    // Search accounts
    const accountResults = await db
      .select()
      .from(accounts)
      .where(and(
        ...conditions,
        eq(accounts.isActive, true),
        isNull(accounts.deletedAt),
        or(
          ilike(accounts.accountName, searchPattern),
          ilike(accounts.bankName, searchPattern)
        )
      ))
      .limit(limit);

    // Search transactions
    const transactionResults = await db
      .select()
      .from(transactions)
      .where(and(
        eq(transactions.isActive, true),
        isNull(transactions.deletedAt),
        or(
          ilike(transactions.description, searchPattern),
          ilike(transactions.category, searchPattern)
        )
      ))
      .limit(limit);

    // Search credits
    const creditResults = await db
      .select()
      .from(credits)
      .where(and(
        ...conditions,
        eq(credits.isActive, true),
        isNull(credits.deletedAt),
        or(
          ilike(credits.title, searchPattern),
          ilike(credits.description, searchPattern)
        )
      ))
      .limit(limit);

    return {
      accounts: accountResults,
      transactions: transactionResults,
      credits: creditResults
    };
  }
}

export default QueryOptimizer;
