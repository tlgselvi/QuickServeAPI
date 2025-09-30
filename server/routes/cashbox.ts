import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import {
  createCashbox,
  getCashboxes,
  getCashboxById,
  updateCashbox,
  deleteCashbox,
  restoreCashbox,
  createCashboxTransaction,
  transferBetweenCashboxes,
  getCashboxTransactions,
  getCashboxSummary,
  getCashboxAuditLogs,
} from '../modules/cashbox/cashbox-service';
import { insertCashboxSchema, updateCashboxSchema, insertCashboxTransactionSchema, transferCashboxSchema } from '@shared/schema';

const router = Router();

// GET /api/cashbox - Get all cashboxes for user
router.get('/', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { includeDeleted = 'false' } = req.query;

    const cashboxes = await getCashboxes(userId, includeDeleted === 'true');

    res.json({
      success: true,
      data: cashboxes,
    });
  } catch (error) {
    console.error('Get cashboxes error:', error);
    res.status(500).json({
      error: 'Kasalar alınırken hata oluştu',
    });
  }
});

// GET /api/cashbox/summary - Get cashbox summary
router.get('/summary', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const summary = await getCashboxSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get cashbox summary error:', error);
    res.status(500).json({
      error: 'Kasa özeti alınırken hata oluştu',
    });
  }
});

// GET /api/cashbox/:id - Get cashbox by ID
router.get('/:id', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const cashbox = await getCashboxById(userId, id);

    if (!cashbox) {
      return res.status(404).json({
        error: 'Kasa bulunamadı',
      });
    }

    res.json({
      success: true,
      data: cashbox,
    });
  } catch (error) {
    console.error('Get cashbox error:', error);
    res.status(500).json({
      error: 'Kasa alınırken hata oluştu',
    });
  }
});

// POST /api/cashbox - Create new cashbox
router.post('/', requireAuth, requirePermission(Permission.MANAGE_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Validate input
    const validatedData = insertCashboxSchema.parse(data);

    const cashbox = await createCashbox(userId, validatedData, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      data: cashbox,
      message: 'Kasa başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Create cashbox error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Kasa oluşturulurken hata oluştu',
    });
  }
});

// PUT /api/cashbox/:id - Update cashbox
router.put('/:id', requireAuth, requirePermission(Permission.MANAGE_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Validate input
    const validatedData = updateCashboxSchema.parse(data);

    const cashbox = await updateCashbox(userId, id, validatedData, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: data.reason,
    });

    if (!cashbox) {
      return res.status(404).json({
        error: 'Kasa bulunamadı',
      });
    }

    res.json({
      success: true,
      data: cashbox,
      message: 'Kasa başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Update cashbox error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Kasa güncellenirken hata oluştu',
    });
  }
});

// DELETE /api/cashbox/:id - Soft delete cashbox
router.delete('/:id', requireAuth, requirePermission(Permission.MANAGE_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const success = await deleteCashbox(userId, id, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason,
    });

    if (!success) {
      return res.status(404).json({
        error: 'Kasa bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Kasa başarıyla silindi',
    });
  } catch (error) {
    console.error('Delete cashbox error:', error);
    res.status(500).json({
      error: 'Kasa silinirken hata oluştu',
    });
  }
});

// POST /api/cashbox/:id/restore - Restore deleted cashbox
router.post('/:id/restore', requireAuth, requirePermission(Permission.MANAGE_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason } = req.body;

    const success = await restoreCashbox(userId, id, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason,
    });

    if (!success) {
      return res.status(404).json({
        error: 'Kasa bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Kasa başarıyla geri yüklendi',
    });
  } catch (error) {
    console.error('Restore cashbox error:', error);
    res.status(500).json({
      error: 'Kasa geri yüklenirken hata oluştu',
    });
  }
});

// GET /api/cashbox/:id/transactions - Get cashbox transactions
router.get('/:id/transactions', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { 
      limit = '50', 
      offset = '0', 
      type,
      startDate,
      endDate 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      type: type as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const transactions = await getCashboxTransactions(userId, id, options);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Get cashbox transactions error:', error);
    res.status(500).json({
      error: 'Kasa işlemleri alınırken hata oluştu',
    });
  }
});

// POST /api/cashbox/:id/transactions - Create cashbox transaction
router.post('/:id/transactions', requireAuth, requirePermission(Permission.MANAGE_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Validate input
    const validatedData = insertCashboxTransactionSchema.parse({
      ...data,
      cashboxId: id,
    });

    const transaction = await createCashboxTransaction(userId, validatedData, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'İşlem başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Create cashbox transaction error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Kasa bulunamadı veya erişim yetkiniz yok') {
        return res.status(404).json({
          error: error.message,
        });
      }
      if (error.message === 'Yetersiz bakiye') {
        return res.status(400).json({
          error: error.message,
        });
      }
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'İşlem oluşturulurken hata oluştu',
    });
  }
});

// POST /api/cashbox/transfer - Transfer between cashboxes
router.post('/transfer', requireAuth, requirePermission(Permission.TRANSFER_CASHBOX), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Validate input
    const validatedData = transferCashboxSchema.parse(data);

    const result = await transferBetweenCashboxes(userId, validatedData, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Transfer başarıyla tamamlandı',
    });
  } catch (error) {
    console.error('Transfer cashbox error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Kasa bulunamadı veya erişim yetkiniz yok') {
        return res.status(404).json({
          error: error.message,
        });
      }
      if (error.message === 'Para birimleri farklı kasalar arasında transfer edilemez') {
        return res.status(400).json({
          error: error.message,
        });
      }
      if (error.message === 'Yetersiz bakiye') {
        return res.status(400).json({
          error: error.message,
        });
      }
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Transfer işlemi sırasında hata oluştu',
    });
  }
});

// GET /api/cashbox/:id/audit - Get cashbox audit logs
router.get('/:id/audit', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { 
      limit = '50', 
      offset = '0', 
      action,
      startDate,
      endDate 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      action: action as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const auditLogs = await getCashboxAuditLogs(userId, id, options);

    res.json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    console.error('Get cashbox audit logs error:', error);
    res.status(500).json({
      error: 'Audit logları alınırken hata oluştu',
    });
  }
});

// GET /api/cashbox/audit/all - Get all audit logs for user
router.get('/audit/all', requireAuth, requirePermission(Permission.VIEW_CASHBOXES), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      limit = '50', 
      offset = '0', 
      action,
      startDate,
      endDate 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      action: action as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const auditLogs = await getCashboxAuditLogs(userId, undefined, options);

    res.json({
      success: true,
      data: auditLogs,
    });
  } catch (error) {
    console.error('Get all audit logs error:', error);
    res.status(500).json({
      error: 'Audit logları alınırken hata oluştu',
    });
  }
});

export default router;
