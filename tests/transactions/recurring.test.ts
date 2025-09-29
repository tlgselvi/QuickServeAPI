import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../server/db';
import { recurringTransactions, transactions, accounts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  calculateNextDueDate,
  getUpcomingRecurringTransactions,
  getRecurringTransactionStats,
} from '../../server/modules/transactions/recurring';

describe('Recurring Transactions Module', () => {
  const testUserId = 'test-user-recurring';
  const testAccountId = 'test-account-recurring';

  beforeEach(async () => {
    // Clean up test data
    await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, testUserId));
    await db.delete(transactions).where(eq(transactions.userId, testUserId));
    
    // Create test account
    await db.insert(accounts).values({
      id: testAccountId,
      userId: testUserId,
      type: 'personal',
      bankName: 'Test Bank',
      accountName: 'Test Account',
      balance: '1000.00',
      currency: 'TRY',
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, testUserId));
    await db.delete(transactions).where(eq(transactions.userId, testUserId));
    await db.delete(accounts).where(eq(accounts.id, testAccountId));
  });

  describe('createRecurringTransaction', () => {
    it('should create a recurring transaction successfully', async () => {
      const recurringData = {
        accountId: testAccountId,
        amount: 1000,
        description: 'Monthly Salary',
        category: 'salary',
        interval: 'monthly' as const,
        intervalCount: 1,
        startDate: new Date('2024-01-01'),
        currency: 'TRY',
      };

      const created = await createRecurringTransaction(testUserId, recurringData);

      expect(created).toBeDefined();
      expect(created.userId).toBe(testUserId);
      expect(created.accountId).toBe(testAccountId);
      expect(created.amount).toBe('1000');
      expect(created.interval).toBe('monthly');
      expect(created.isActive).toBe(true);
      expect(created.nextDueDate).toBeDefined();
    });

    it('should calculate correct next due date for monthly interval', async () => {
      const startDate = new Date('2024-01-15');
      const recurringData = {
        accountId: testAccountId,
        amount: 500,
        description: 'Monthly Rent',
        interval: 'monthly' as const,
        intervalCount: 1,
        startDate,
        currency: 'TRY',
      };

      const created = await createRecurringTransaction(testUserId, recurringData);
      const expectedNextDate = new Date('2024-02-15');

      expect(created.nextDueDate).toEqual(expectedNextDate);
    });
  });

  describe('getUserRecurringTransactions', () => {
    beforeEach(async () => {
      // Create test recurring transactions
      await db.insert(recurringTransactions).values([
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '1000.00',
          description: 'Monthly Salary',
          interval: 'monthly',
          intervalCount: 1,
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-02-01'),
          isActive: true,
          currency: 'TRY',
        },
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '500.00',
          description: 'Weekly Groceries',
          interval: 'weekly',
          intervalCount: 1,
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-01-08'),
          isActive: false,
          currency: 'TRY',
        },
      ]);
    });

    it('should fetch all recurring transactions for user', async () => {
      const recurring = await getUserRecurringTransactions(testUserId);

      expect(recurring).toHaveLength(2);
      expect(recurring[0].userId).toBe(testUserId);
    });

    it('should filter by active status', async () => {
      const activeRecurring = await getUserRecurringTransactions(testUserId, true);
      const inactiveRecurring = await getUserRecurringTransactions(testUserId, false);

      expect(activeRecurring).toHaveLength(1);
      expect(inactiveRecurring).toHaveLength(1);
      expect(activeRecurring[0].isActive).toBe(true);
      expect(inactiveRecurring[0].isActive).toBe(false);
    });
  });

  describe('updateRecurringTransaction', () => {
    let recurringId: string;

    beforeEach(async () => {
      const [created] = await db.insert(recurringTransactions).values({
        userId: testUserId,
        accountId: testAccountId,
        amount: '1000.00',
        description: 'Monthly Salary',
        interval: 'monthly',
        intervalCount: 1,
        startDate: new Date('2024-01-01'),
        nextDueDate: new Date('2024-02-01'),
        isActive: true,
        currency: 'TRY',
      }).returning();
      
      recurringId = created.id;
    });

    it('should update recurring transaction successfully', async () => {
      const updates = {
        amount: 1200,
        description: 'Updated Salary',
      };

      const updated = await updateRecurringTransaction(recurringId, testUserId, updates);

      expect(updated).toBeDefined();
      expect(updated!.amount).toBe('1200');
      expect(updated!.description).toBe('Updated Salary');
    });

    it('should recalculate next due date when interval changes', async () => {
      const updates = {
        interval: 'weekly' as const,
        intervalCount: 2,
      };

      const updated = await updateRecurringTransaction(recurringId, testUserId, updates);

      expect(updated).toBeDefined();
      expect(updated!.interval).toBe('weekly');
      expect(updated!.intervalCount).toBe(2);
      // Next due date should be recalculated
      expect(updated!.nextDueDate).not.toEqual(new Date('2024-02-01'));
    });
  });

  describe('deleteRecurringTransaction', () => {
    let recurringId: string;

    beforeEach(async () => {
      const [created] = await db.insert(recurringTransactions).values({
        userId: testUserId,
        accountId: testAccountId,
        amount: '1000.00',
        description: 'Monthly Salary',
        interval: 'monthly',
        intervalCount: 1,
        startDate: new Date('2024-01-01'),
        nextDueDate: new Date('2024-02-01'),
        isActive: true,
        currency: 'TRY',
      }).returning();
      
      recurringId = created.id;
    });

    it('should delete recurring transaction successfully', async () => {
      const deleted = await deleteRecurringTransaction(recurringId, testUserId);

      expect(deleted).toBe(true);

      // Verify deletion
      const remaining = await getUserRecurringTransactions(testUserId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('toggleRecurringTransaction', () => {
    let recurringId: string;

    beforeEach(async () => {
      const [created] = await db.insert(recurringTransactions).values({
        userId: testUserId,
        accountId: testAccountId,
        amount: '1000.00',
        description: 'Monthly Salary',
        interval: 'monthly',
        intervalCount: 1,
        startDate: new Date('2024-01-01'),
        nextDueDate: new Date('2024-02-01'),
        isActive: true,
        currency: 'TRY',
      }).returning();
      
      recurringId = created.id;
    });

    it('should toggle active status successfully', async () => {
      const toggled = await toggleRecurringTransaction(recurringId, testUserId);

      expect(toggled).toBeDefined();
      expect(toggled!.isActive).toBe(false);

      // Toggle again
      const toggledAgain = await toggleRecurringTransaction(recurringId, testUserId);
      expect(toggledAgain!.isActive).toBe(true);
    });
  });

  describe('calculateNextDueDate', () => {
    const baseDate = new Date('2024-01-15');

    it('should calculate daily interval correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'daily', 1);
      const expected = new Date('2024-01-16');
      expect(nextDate).toEqual(expected);
    });

    it('should calculate weekly interval correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'weekly', 1);
      const expected = new Date('2024-01-22');
      expect(nextDate).toEqual(expected);
    });

    it('should calculate monthly interval correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'monthly', 1);
      const expected = new Date('2024-02-15');
      expect(nextDate).toEqual(expected);
    });

    it('should calculate quarterly interval correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'quarterly', 1);
      const expected = new Date('2024-04-15');
      expect(nextDate).toEqual(expected);
    });

    it('should calculate yearly interval correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'yearly', 1);
      const expected = new Date('2025-01-15');
      expect(nextDate).toEqual(expected);
    });

    it('should handle interval count correctly', () => {
      const nextDate = calculateNextDueDate(baseDate, 'weekly', 2);
      const expected = new Date('2024-01-29'); // 2 weeks later
      expect(nextDate).toEqual(expected);
    });
  });

  describe('getUpcomingRecurringTransactions', () => {
    beforeEach(async () => {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(recurringTransactions).values([
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '500.00',
          description: 'Weekly Groceries',
          interval: 'weekly',
          intervalCount: 1,
          startDate: now,
          nextDueDate: nextWeek,
          isActive: true,
          currency: 'TRY',
        },
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '1000.00',
          description: 'Monthly Salary',
          interval: 'monthly',
          intervalCount: 1,
          startDate: now,
          nextDueDate: nextMonth,
          isActive: true,
          currency: 'TRY',
        },
      ]);
    });

    it('should fetch upcoming recurring transactions', async () => {
      const upcoming = await getUpcomingRecurringTransactions(testUserId, 30);

      expect(upcoming).toHaveLength(2);
      upcoming.forEach(transaction => {
        expect(transaction.isActive).toBe(true);
        expect(new Date(transaction.nextDueDate)).toBeGreaterThan(new Date());
      });
    });

    it('should respect days parameter', async () => {
      const upcoming = await getUpcomingRecurringTransactions(testUserId, 10);

      // Should only return transactions due within 10 days
      upcoming.forEach(transaction => {
        const daysUntilDue = Math.ceil((new Date(transaction.nextDueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        expect(daysUntilDue).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('getRecurringTransactionStats', () => {
    beforeEach(async () => {
      await db.insert(recurringTransactions).values([
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '1000.00',
          description: 'Monthly Salary',
          interval: 'monthly',
          intervalCount: 1,
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-02-01'),
          isActive: true,
          currency: 'TRY',
        },
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '500.00',
          description: 'Weekly Groceries',
          interval: 'weekly',
          intervalCount: 1,
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-01-08'),
          isActive: false,
          currency: 'TRY',
        },
        {
          userId: testUserId,
          accountId: testAccountId,
          amount: '2000.00',
          description: 'Quarterly Bonus',
          interval: 'quarterly',
          intervalCount: 1,
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-04-01'),
          isActive: true,
          currency: 'TRY',
        },
      ]);
    });

    it('should calculate correct statistics', async () => {
      const stats = await getRecurringTransactionStats(testUserId);

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.byInterval.monthly).toBe(1);
      expect(stats.byInterval.weekly).toBe(1);
      expect(stats.byInterval.quarterly).toBe(1);
      expect(stats.totalAmount).toBe(3500); // 1000 + 500 + 2000
      expect(stats.upcomingCount).toBeGreaterThanOrEqual(0);
    });
  });
});
