import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import {
  createRecurringTransaction,
  getUserRecurringTransactions,
  getRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  processRecurringTransactions,
  getUpcomingRecurringTransactions,
  getRecurringTransactionStats,
} from '../modules/transactions/recurring';
import { insertRecurringTransactionSchema } from '@shared/schema';

const router = Router();

// GET /api/recurring - List all recurring transactions
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { active } = req.query;

    const isActive = active !== undefined ? active === 'true' : undefined;
    const recurringTransactions = await getUserRecurringTransactions(userId, isActive);

    res.json({
      success: true,
      data: recurringTransactions,
      total: recurringTransactions.length,
    });
  } catch (error) {
    console.error('Recurring transactions fetch error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlemler alınırken hata oluştu',
    });
  }
});

// GET /api/recurring/stats - Get recurring transaction statistics
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const stats = await getRecurringTransactionStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Recurring transaction stats error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlem istatistikleri alınırken hata oluştu',
    });
  }
});

// GET /api/recurring/upcoming - Get upcoming recurring transactions
router.get('/upcoming', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { days } = req.query;

    const daysCount = days ? parseInt(days as string) : 30;
    const upcoming = await getUpcomingRecurringTransactions(userId, daysCount);

    res.json({
      success: true,
      data: upcoming,
      total: upcoming.length,
    });
  } catch (error) {
    console.error('Upcoming recurring transactions error:', error);
    res.status(500).json({
      error: 'Yaklaşan tekrarlayan işlemler alınırken hata oluştu',
    });
  }
});

// GET /api/recurring/:id - Get specific recurring transaction
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const recurringTransaction = await getRecurringTransaction(id, userId);

    if (!recurringTransaction) {
      return res.status(404).json({
        error: 'Tekrarlayan işlem bulunamadı',
      });
    }

    res.json({
      success: true,
      data: recurringTransaction,
    });
  } catch (error) {
    console.error('Recurring transaction fetch error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlem alınırken hata oluştu',
    });
  }
});

// POST /api/recurring - Create new recurring transaction
router.post('/', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = insertRecurringTransactionSchema.parse(req.body);

    const recurringTransaction = await createRecurringTransaction(userId, validatedData);

    res.status(201).json({
      success: true,
      data: recurringTransaction,
      message: 'Tekrarlayan işlem başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Recurring transaction creation error:', error);
    if (error instanceof Error && error.message.includes('Invalid interval')) {
      return res.status(400).json({
        error: 'Geçersiz tekrar aralığı',
      });
    }
    res.status(500).json({
      error: 'Tekrarlayan işlem oluşturulurken hata oluştu',
    });
  }
});

// PUT /api/recurring/:id - Update recurring transaction
router.put('/:id', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const validatedData = insertRecurringTransactionSchema.partial().parse(req.body);

    const updatedTransaction = await updateRecurringTransaction(id, userId, validatedData);

    if (!updatedTransaction) {
      return res.status(404).json({
        error: 'Tekrarlayan işlem bulunamadı',
      });
    }

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Tekrarlayan işlem başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Recurring transaction update error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlem güncellenirken hata oluştu',
    });
  }
});

// DELETE /api/recurring/:id - Delete recurring transaction
router.delete('/:id', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const deleted = await deleteRecurringTransaction(id, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Tekrarlayan işlem bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Tekrarlayan işlem başarıyla silindi',
    });
  } catch (error) {
    console.error('Recurring transaction deletion error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlem silinirken hata oluştu',
    });
  }
});

// PATCH /api/recurring/:id/toggle - Toggle recurring transaction active status
router.patch('/:id/toggle', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const toggledTransaction = await toggleRecurringTransaction(id, userId);

    if (!toggledTransaction) {
      return res.status(404).json({
        error: 'Tekrarlayan işlem bulunamadı',
      });
    }

    res.json({
      success: true,
      data: toggledTransaction,
      message: `Tekrarlayan işlem ${toggledTransaction.isActive ? 'aktifleştirildi' : 'pasifleştirildi'}`,
    });
  } catch (error) {
    console.error('Recurring transaction toggle error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlem durumu değiştirilirken hata oluştu',
    });
  }
});

// POST /api/recurring/process - Process all due recurring transactions (Admin only)
router.post('/process', requireAuth, requirePermission(Permission.ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await processRecurringTransactions();

    res.json({
      success: true,
      data: result,
      message: `Tekrarlayan işlemler işlendi. ${result.created} yeni işlem oluşturuldu.`,
    });
  } catch (error) {
    console.error('Recurring transactions processing error:', error);
    res.status(500).json({
      error: 'Tekrarlayan işlemler işlenirken hata oluştu',
    });
  }
});

export default router;
