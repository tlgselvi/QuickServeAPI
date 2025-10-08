import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { investments, transactions } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// Investment validation schemas
const createInvestmentSchema = z.object({
  title: z.string().min(1, 'Başlık gereklidir'),
  type: z.enum(['stock', 'crypto', 'bond', 'fund', 'real_estate']),
  symbol: z.string().optional(),
  quantity: z.number().positive('Miktar pozitif olmalıdır'),
  purchasePrice: z.number().positive('Alış fiyatı pozitif olmalıdır'),
  currentPrice: z.number().positive().optional(),
  currency: z.string().default('TRY'),
  category: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  purchaseDate: z.string().optional(),
  accountId: z.string().min(1, 'Hesap ID gereklidir'),
});

const updateInvestmentSchema = createInvestmentSchema.partial();

// GET /api/investments - Get all investments
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId))
      .orderBy(desc(investments.createdAt));

    res.json(userInvestments);
  } catch (error) {
    logger.error('Investments fetch error:', error);
    res.status(500).json({ error: 'Yatırımlar alınırken hata oluştu' });
  }
});

// GET /api/investments/:id - Get specific investment
router.get('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    const investment = await db
      .select()
      .from(investments)
      .where(and(eq(investments.id, id), eq(investments.userId, userId)))
      .limit(1);

    if (investment.length === 0) {
      return res.status(404).json({ error: 'Yatırım bulunamadı' });
    }

    res.json(investment[0]);
  } catch (error) {
    logger.error('Investment fetch error:', error);
    res.status(500).json({ error: 'Yatırım alınırken hata oluştu' });
  }
});

// POST /api/investments - Create new investment
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    const validatedData = createInvestmentSchema.parse(req.body);

    // Create investment record
    const [newInvestment] = await db
      .insert(investments)
      .values({
        title: validatedData.title,
        type: validatedData.type,
        userId,
        quantity: validatedData.quantity.toString(),
        purchasePrice: validatedData.purchasePrice.toString(),
        currentPrice: validatedData.currentPrice?.toString(),
        purchaseDate: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create corresponding transaction record
    await db.insert(transactions).values({
      accountId: validatedData.accountId,
      userId,
      type: 'expense',
      amount: (validatedData.quantity * validatedData.purchasePrice).toString(),
      description: `${validatedData.title} yatırım alımı`,
      category: 'investment',
      date: validatedData.purchaseDate ? new Date(validatedData.purchaseDate) : new Date(),
      investmentId: newInvestment.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json(newInvestment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Geçersiz veri',
        details: error.errors,
      });
    }
    logger.error('Investment creation error:', error);
    res.status(500).json({ error: 'Yatırım oluşturulurken hata oluştu' });
  }
});

// PUT /api/investments/:id - Update investment
router.put('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    const validatedData = updateInvestmentSchema.parse(req.body);

    const [updatedInvestment] = await db
      .update(investments)
      .set({
        ...(validatedData.quantity != null ? { quantity: String(validatedData.quantity) } : {}),
        ...(validatedData.purchasePrice != null ? { purchasePrice: String(validatedData.purchasePrice) } : {}),
        ...(validatedData.currentPrice != null ? { currentPrice: String(validatedData.currentPrice) } : {}),
        ...(validatedData.symbol != null ? { symbol: validatedData.symbol } : {}),
        ...(validatedData.type != null ? { type: validatedData.type } : {}),
        ...(validatedData.currency != null ? { currency: validatedData.currency } : {}),
        ...(validatedData.accountId != null ? { accountId: validatedData.accountId } : {}),
        ...(validatedData.category != null ? { category: validatedData.category } : {}),
        ...(validatedData.riskLevel != null ? { riskLevel: validatedData.riskLevel } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(investments.id, id), eq(investments.userId, userId)))
      .returning();

    if (!updatedInvestment) {
      return res.status(404).json({ error: 'Yatırım bulunamadı' });
    }

    res.json(updatedInvestment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Geçersiz veri',
        details: error.errors,
      });
    }
    logger.error('Investment update error:', error);
    res.status(500).json({ error: 'Yatırım güncellenirken hata oluştu' });
  }
});

// DELETE /api/investments/:id - Delete investment
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    const [deletedInvestment] = await db
      .delete(investments)
      .where(and(eq(investments.id, id), eq(investments.userId, userId)))
      .returning();

    if (!deletedInvestment) {
      return res.status(404).json({ error: 'Yatırım bulunamadı' });
    }

    res.json({ message: 'Yatırım başarıyla silindi' });
  } catch (error) {
    logger.error('Investment deletion error:', error);
    res.status(500).json({ error: 'Yatırım silinirken hata oluştu' });
  }
});

export default router;
