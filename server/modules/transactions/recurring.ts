import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { recurringTransactions, transactions, accounts } from '@shared/schema';
import type { RecurringTransaction, InsertRecurringTransaction } from '@shared/schema';

export interface RecurringTransactionWithAccount extends RecurringTransaction {
  accountName?: string;
  accountType?: string;
}

export interface ProcessRecurringResult {
  processed: number;
  created: number;
  errors: string[];
}

/**
 * Create a new recurring transaction
 */
export async function createRecurringTransaction(
  userId: string,
  data: InsertRecurringTransaction
): Promise<RecurringTransaction> {
  // Calculate next due date
  const nextDueDate = calculateNextDueDate(data.startDate, data.interval, data.intervalCount);

  const recurringData = {
    userId,
    ...data,
    amount: data.amount.toString(),
    nextDueDate,
  };

  const [created] = await db.insert(recurringTransactions).values(recurringData).returning();
  return created;
}

/**
 * Get all recurring transactions for a user
 */
export async function getUserRecurringTransactions(
  userId: string,
  isActive?: boolean
): Promise<RecurringTransactionWithAccount[]> {
  let query = db
    .select({
      ...recurringTransactions,
      accountName: accounts.accountName,
      accountType: accounts.type,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .where(eq(recurringTransactions.userId, userId));

  if (isActive !== undefined) {
    query = query.where(and(
      eq(recurringTransactions.userId, userId),
      eq(recurringTransactions.isActive, isActive)
    ));
  }

  return await query.orderBy(recurringTransactions.nextDueDate);
}

/**
 * Get recurring transaction by ID
 */
export async function getRecurringTransaction(
  id: string,
  userId: string
): Promise<RecurringTransactionWithAccount | null> {
  const result = await db
    .select({
      ...recurringTransactions,
      accountName: accounts.accountName,
      accountType: accounts.type,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .where(and(
      eq(recurringTransactions.id, id),
      eq(recurringTransactions.userId, userId)
    ))
    .limit(1);

  return result[0] || null;
}

/**
 * Update recurring transaction
 */
export async function updateRecurringTransaction(
  id: string,
  userId: string,
  updates: Partial<InsertRecurringTransaction>
): Promise<RecurringTransaction | null> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Update basic fields
  if (updates.amount !== undefined) updateData.amount = updates.amount.toString();
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.currency !== undefined) updateData.currency = updates.currency;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

  // If interval or intervalCount changed, recalculate next due date
  if (updates.interval !== undefined || updates.intervalCount !== undefined) {
    const current = await getRecurringTransaction(id, userId);
    if (current) {
      const newInterval = updates.interval || current.interval;
      const newIntervalCount = updates.intervalCount || current.intervalCount;
      updateData.interval = newInterval;
      updateData.intervalCount = newIntervalCount;
      updateData.nextDueDate = calculateNextDueDate(
        new Date(current.nextDueDate),
        newInterval,
        newIntervalCount
      );
    }
  }

  const [updated] = await db
    .update(recurringTransactions)
    .set(updateData)
    .where(and(
      eq(recurringTransactions.id, id),
      eq(recurringTransactions.userId, userId)
    ))
    .returning();

  return updated || null;
}

/**
 * Delete recurring transaction
 */
export async function deleteRecurringTransaction(
  id: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(recurringTransactions)
    .where(and(
      eq(recurringTransactions.id, id),
      eq(recurringTransactions.userId, userId)
    ))
    .returning();

  return !!deleted;
}

/**
 * Toggle recurring transaction active status
 */
export async function toggleRecurringTransaction(
  id: string,
  userId: string
): Promise<RecurringTransaction | null> {
  const current = await getRecurringTransaction(id, userId);
  if (!current) return null;

  const [updated] = await db
    .update(recurringTransactions)
    .set({
      isActive: !current.isActive,
      updatedAt: new Date(),
    })
    .where(and(
      eq(recurringTransactions.id, id),
      eq(recurringTransactions.userId, userId)
    ))
    .returning();

  return updated || null;
}

/**
 * Process all due recurring transactions
 */
export async function processRecurringTransactions(): Promise<ProcessRecurringResult> {
  const now = new Date();
  const result: ProcessRecurringResult = {
    processed: 0,
    created: 0,
    errors: [],
  };

  try {
    // Get all active recurring transactions that are due
    const dueRecurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(
        eq(recurringTransactions.isActive, true),
        lte(recurringTransactions.nextDueDate, now)
      ));

    result.processed = dueRecurring.length;

    for (const recurring of dueRecurring) {
      try {
        // Check if transaction already exists for this period
        const existingTransaction = await db
          .select()
          .from(transactions)
          .where(and(
            eq(transactions.userId, recurring.userId),
            eq(transactions.accountId, recurring.accountId),
            eq(transactions.amount, recurring.amount),
            eq(transactions.description, recurring.description),
            gte(transactions.createdAt, recurring.nextDueDate),
            lte(transactions.createdAt, new Date(recurring.nextDueDate.getTime() + 24 * 60 * 60 * 1000))
          ))
          .limit(1);

        if (existingTransaction.length > 0) {
          // Transaction already exists, just update next due date
          await updateNextDueDate(recurring.id);
          continue;
        }

        // Create new transaction
        await db.insert(transactions).values({
          userId: recurring.userId,
          accountId: recurring.accountId,
          type: parseFloat(recurring.amount) >= 0 ? 'income' : 'expense',
          amount: recurring.amount,
          description: recurring.description || `Recurring: ${recurring.interval}`,
          category: recurring.category,
          createdAt: new Date(),
        });

        // Update next due date and last processed
        await updateNextDueDate(recurring.id);

        // Check if recurring transaction should end
        if (recurring.endDate && new Date(recurring.nextDueDate) > recurring.endDate) {
          await db
            .update(recurringTransactions)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(recurringTransactions.id, recurring.id));
        }

        result.created++;
      } catch (error) {
        result.errors.push(`Failed to process recurring transaction ${recurring.id}: ${error}`);
      }
    }
  } catch (error) {
    result.errors.push(`Failed to process recurring transactions: ${error}`);
  }

  return result;
}

/**
 * Update next due date for a recurring transaction
 */
async function updateNextDueDate(recurringId: string): Promise<void> {
  const recurring = await db
    .select()
    .from(recurringTransactions)
    .where(eq(recurringTransactions.id, recurringId))
    .limit(1);

  if (recurring.length > 0) {
    const nextDueDate = calculateNextDueDate(
      new Date(recurring[0].nextDueDate),
      recurring[0].interval,
      recurring[0].intervalCount
    );

    await db
      .update(recurringTransactions)
      .set({
        nextDueDate,
        lastProcessed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, recurringId));
  }
}

/**
 * Calculate next due date based on interval
 */
export function calculateNextDueDate(
  currentDate: Date,
  interval: string,
  intervalCount: number = 1
): Date {
  const nextDate = new Date(currentDate);

  switch (interval) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + intervalCount);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * intervalCount));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + intervalCount);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + (3 * intervalCount));
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
      break;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }

  return nextDate;
}

/**
 * Get upcoming recurring transactions (next 30 days)
 */
export async function getUpcomingRecurringTransactions(
  userId: string,
  days: number = 30
): Promise<RecurringTransactionWithAccount[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return await db
    .select({
      ...recurringTransactions,
      accountName: accounts.accountName,
      accountType: accounts.type,
    })
    .from(recurringTransactions)
    .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
    .where(and(
      eq(recurringTransactions.userId, userId),
      eq(recurringTransactions.isActive, true),
      lte(recurringTransactions.nextDueDate, futureDate),
      gte(recurringTransactions.nextDueDate, new Date())
    ))
    .orderBy(recurringTransactions.nextDueDate);
}

/**
 * Get recurring transaction statistics
 */
export async function getRecurringTransactionStats(userId: string): Promise<{
  total: number;
  active: number;
  inactive: number;
  byInterval: Record<string, number>;
  totalAmount: number;
  upcomingCount: number;
}> {
  const allRecurring = await getUserRecurringTransactions(userId);
  const upcoming = await getUpcomingRecurringTransactions(userId);

  const stats = {
    total: allRecurring.length,
    active: allRecurring.filter(r => r.isActive).length,
    inactive: allRecurring.filter(r => !r.isActive).length,
    byInterval: {} as Record<string, number>,
    totalAmount: 0,
    upcomingCount: upcoming.length,
  };

  // Calculate by interval
  allRecurring.forEach(transaction => {
    stats.byInterval[transaction.interval] = (stats.byInterval[transaction.interval] || 0) + 1;
    stats.totalAmount += parseFloat(transaction.amount);
  });

  return stats;
}
