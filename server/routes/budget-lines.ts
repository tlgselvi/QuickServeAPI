import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { budgetLines, insertBudgetLineSchema } from '@shared/schema';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/budget-lines - List budget lines
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { month, category } = req.query;
    const userId = req.user!.id;

    let query = db.select().from(budgetLines).where(eq(budgetLines.userId, userId));

    // Filter by month if provided
    if (month) {
      const startDate = new Date(month as string);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query.where(and(
        eq(budgetLines.userId, userId),
        gte(budgetLines.month, startDate),
        lte(budgetLines.month, endDate)
      ));
    }

    // Filter by category if provided
    if (category) {
      query = query.where(and(
        eq(budgetLines.userId, userId),
        eq(budgetLines.category, category as string)
      ));
    }

    const budgetLineList = await query.orderBy(budgetLines.month);

    res.json({
      success: true,
      data: budgetLineList,
      total: budgetLineList.length,
    });
  } catch (error) {
    logger.error('Budget lines fetch error:', error);
    res.status(500).json({
      error: 'Bütçe satırları alınırken hata oluştu',
    });
  }
});

// POST /api/budget-lines - Create budget line
router.post('/', requireAuth, requirePermission(Permission.MANAGE_BUDGET), async (req: AuthenticatedRequest, res) => {
  try {
    const validatedData = insertBudgetLineSchema.parse(req.body);
    const userId = req.user!.id;

    const newBudgetLine = {
      ...validatedData,
      userId,
    };

    const [createdBudgetLine] = await db.insert(budgetLines).values(newBudgetLine).returning();

    res.status(201).json({
      success: true,
      data: createdBudgetLine,
      message: 'Bütçe satırı başarıyla oluşturuldu',
    });
  } catch (error) {
    logger.error('Budget line creation error:', error);
    res.status(500).json({
      error: 'Bütçe satırı oluşturulurken hata oluştu',
    });
  }
});

// PUT /api/budget-lines/:id - Update budget line
router.put('/:id', requireAuth, requirePermission(Permission.MANAGE_BUDGET), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertBudgetLineSchema.partial().parse(req.body);
    const userId = req.user!.id;

    const [updatedBudgetLine] = await db
      .update(budgetLines)
      .set(validatedData)
      .where(and(eq(budgetLines.id, id), eq(budgetLines.userId, userId)))
      .returning();

    if (!updatedBudgetLine) {
      return res.status(404).json({
        error: 'Bütçe satırı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: updatedBudgetLine,
      message: 'Bütçe satırı başarıyla güncellendi',
    });
  } catch (error) {
    logger.error('Budget line update error:', error);
    res.status(500).json({
      error: 'Bütçe satırı güncellenirken hata oluştu',
    });
  }
});

// DELETE /api/budget-lines/:id - Delete budget line
router.delete('/:id', requireAuth, requirePermission(Permission.MANAGE_BUDGET), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [deletedBudgetLine] = await db
      .delete(budgetLines)
      .where(and(eq(budgetLines.id, id), eq(budgetLines.userId, userId)))
      .returning();

    if (!deletedBudgetLine) {
      return res.status(404).json({
        error: 'Bütçe satırı bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Bütçe satırı başarıyla silindi',
    });
  } catch (error) {
    logger.error('Budget line deletion error:', error);
    res.status(500).json({
      error: 'Bütçe satırı silinirken hata oluştu',
    });
  }
});

// GET /api/budget-lines/summary - Get budget summary
router.get('/summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { month } = req.query;
    const userId = req.user!.id;

    let query = db.select().from(budgetLines).where(eq(budgetLines.userId, userId));

    if (month) {
      const startDate = new Date(month as string);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      query = query.where(and(
        eq(budgetLines.userId, userId),
        gte(budgetLines.month, startDate),
        lte(budgetLines.month, endDate)
      ));
    }

    const budgetLineList = await query;

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

    const totalPlanned = Object.values(summary).reduce((sum, cat) => sum + cat.planned, 0);
    const totalActual = Object.values(summary).reduce((sum, cat) => sum + cat.actual, 0);

    res.json({
      success: true,
      data: {
        summary,
        totals: {
          planned: totalPlanned,
          actual: totalActual,
          variance: totalPlanned - totalActual,
        },
      },
    });
  } catch (error) {
    logger.error('Budget summary error:', error);
    res.status(500).json({
      error: 'Bütçe özeti alınırken hata oluştu',
    });
  }
});

export default router;

