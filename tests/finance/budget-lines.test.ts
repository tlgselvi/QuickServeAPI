import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../server/db';
import { budgetLines, insertBudgetLineSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('BudgetLine CRUD Operations', () => {
  const testUserId = 'test-user-budget-lines';
  const testBudgetLine = {
    userId: testUserId,
    category: 'Test Category',
    plannedAmount: '1000.00',
    actualAmount: '800.00',
    month: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    // Clean up test data
    await db.delete(budgetLines).where(eq(budgetLines.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(budgetLines).where(eq(budgetLines.userId, testUserId));
  });

  describe('Create BudgetLine', () => {
    it('should create a budget line successfully', async () => {
      const [created] = await db.insert(budgetLines).values(testBudgetLine).returning();

      expect(created).toBeDefined();
      expect(created.category).toBe(testBudgetLine.category);
      expect(created.plannedAmount).toBe(testBudgetLine.plannedAmount);
      expect(created.actualAmount).toBe(testBudgetLine.actualAmount);
      expect(created.userId).toBe(testUserId);
    });

    it('should validate budget line schema', () => {
      const validData = {
        category: 'Test Category',
        plannedAmount: 1000,
        actualAmount: 800,
        month: new Date('2024-01-01'),
      };

      expect(() => insertBudgetLineSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid budget line data', () => {
      const invalidData = {
        category: '', // Empty category should fail
        plannedAmount: -100, // Negative amount should fail
        month: 'invalid-date', // Invalid date should fail
      };

      expect(() => insertBudgetLineSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Read BudgetLine', () => {
    beforeEach(async () => {
      // Create test data
      await db.insert(budgetLines).values([
        testBudgetLine,
        {
          ...testBudgetLine,
          category: 'Another Category',
          plannedAmount: '2000.00',
          actualAmount: '1500.00',
        },
      ]);
    });

    it('should fetch budget lines by user', async () => {
      const userBudgetLines = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.userId, testUserId));

      expect(userBudgetLines).toHaveLength(2);
      expect(userBudgetLines[0].userId).toBe(testUserId);
    });

    it('should fetch budget lines by category', async () => {
      const categoryBudgetLines = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.category, 'Test Category'));

      expect(categoryBudgetLines).toHaveLength(1);
      expect(categoryBudgetLines[0].category).toBe('Test Category');
    });

    it('should calculate budget variance', () => {
      const planned = parseFloat(testBudgetLine.plannedAmount);
      const actual = parseFloat(testBudgetLine.actualAmount);
      const variance = planned - actual;

      expect(variance).toBe(200);
    });
  });

  describe('Update BudgetLine', () => {
    let budgetLineId: string;

    beforeEach(async () => {
      const [created] = await db.insert(budgetLines).values(testBudgetLine).returning();
      budgetLineId = created.id;
    });

    it('should update budget line successfully', async () => {
      const updateData = {
        plannedAmount: '1200.00',
        actualAmount: '1000.00',
      };

      const [updated] = await db
        .update(budgetLines)
        .set(updateData)
        .where(eq(budgetLines.id, budgetLineId))
        .returning();

      expect(updated.plannedAmount).toBe('1200.00');
      expect(updated.actualAmount).toBe('1000.00');
    });

    it('should update only specified fields', async () => {
      const updateData = {
        actualAmount: '900.00',
      };

      const [updated] = await db
        .update(budgetLines)
        .set(updateData)
        .where(eq(budgetLines.id, budgetLineId))
        .returning();

      expect(updated.plannedAmount).toBe(testBudgetLine.plannedAmount); // Should remain unchanged
      expect(updated.actualAmount).toBe('900.00'); // Should be updated
    });
  });

  describe('Delete BudgetLine', () => {
    let budgetLineId: string;

    beforeEach(async () => {
      const [created] = await db.insert(budgetLines).values(testBudgetLine).returning();
      budgetLineId = created.id;
    });

    it('should delete budget line successfully', async () => {
      const [deleted] = await db
        .delete(budgetLines)
        .where(eq(budgetLines.id, budgetLineId))
        .returning();

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(budgetLineId);

      // Verify deletion
      const remaining = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.id, budgetLineId));

      expect(remaining).toHaveLength(0);
    });
  });

  describe('BudgetLine Summary', () => {
    beforeEach(async () => {
      // Create test data with multiple categories
      await db.insert(budgetLines).values([
        {
          ...testBudgetLine,
          category: 'Food',
          plannedAmount: '1000.00',
          actualAmount: '800.00',
        },
        {
          ...testBudgetLine,
          category: 'Transport',
          plannedAmount: '500.00',
          actualAmount: '450.00',
        },
        {
          ...testBudgetLine,
          category: 'Entertainment',
          plannedAmount: '300.00',
          actualAmount: '350.00',
        },
      ]);
    });

    it('should calculate budget summary by category', async () => {
      const budgetLineList = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.userId, testUserId));

      const summary = budgetLineList.reduce((acc, line) => {
        const category = line.category;
        if (!acc[category]) {
          acc[category] = { planned: 0, actual: 0, variance: 0 };
        }
        acc[category].planned += parseFloat(line.plannedAmount);
        acc[category].actual += parseFloat(line.actualAmount || '0');
        acc[category].variance = acc[category].planned - acc[category].actual;
        return acc;
      }, {} as Record<string, { planned: number; actual: number; variance: number }>);

      expect(summary.Food.planned).toBe(1000);
      expect(summary.Food.actual).toBe(800);
      expect(summary.Food.variance).toBe(200);

      expect(summary.Transport.planned).toBe(500);
      expect(summary.Transport.actual).toBe(450);
      expect(summary.Transport.variance).toBe(50);

      expect(summary.Entertainment.planned).toBe(300);
      expect(summary.Entertainment.actual).toBe(350);
      expect(summary.Entertainment.variance).toBe(-50); // Over budget
    });

    it('should calculate total budget variance', async () => {
      const budgetLineList = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.userId, testUserId));

      const totalPlanned = budgetLineList.reduce((sum, line) => 
        sum + parseFloat(line.plannedAmount), 0);
      const totalActual = budgetLineList.reduce((sum, line) => 
        sum + parseFloat(line.actualAmount || '0'), 0);
      const totalVariance = totalPlanned - totalActual;

      expect(totalPlanned).toBe(1800);
      expect(totalActual).toBe(1600);
      expect(totalVariance).toBe(200);
    });
  });
});
