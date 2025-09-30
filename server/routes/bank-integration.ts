import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import multer from 'multer';
import {
  createBankIntegration,
  getBankIntegrations,
  getBankIntegrationById,
  updateBankIntegration,
  deleteBankIntegration,
  syncBankData,
  importTransactionsFromFile,
  getBankTransactions,
  reconcileTransactions,
  getReconciliationSummary,
  getImportBatches,
} from '../modules/bank/bank-integration-service';
import { 
  insertBankIntegrationSchema, 
  updateBankIntegrationSchema,
  importTransactionsSchema,
  reconciliationSchema 
} from '@shared/schema';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/xml', 'text/xml', 'application/ofx'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Geçersiz dosya tipi. Sadece CSV, XML ve OFX dosyaları desteklenir.'));
    }
  },
});

// GET /api/bank-integrations - Get all bank integrations for user
router.get('/', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { includeInactive = 'false' } = req.query;

    const integrations = await getBankIntegrations(userId, includeInactive === 'true');

    res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    console.error('Get bank integrations error:', error);
    res.status(500).json({
      error: 'Banka entegrasyonları alınırken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/:id - Get bank integration by ID
router.get('/:id', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const integration = await getBankIntegrationById(userId, id);

    if (!integration) {
      return res.status(404).json({
        error: 'Banka entegrasyonu bulunamadı',
      });
    }

    res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    console.error('Get bank integration error:', error);
    res.status(500).json({
      error: 'Banka entegrasyonu alınırken hata oluştu',
    });
  }
});

// POST /api/bank-integrations - Create new bank integration
router.post('/', requireAuth, requirePermission(Permission.MANAGE_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Validate input
    const validatedData = insertBankIntegrationSchema.parse(data);

    const integration = await createBankIntegration(userId, validatedData);

    res.status(201).json({
      success: true,
      data: integration,
      message: 'Banka entegrasyonu başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Create bank integration error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Banka entegrasyonu oluşturulurken hata oluştu',
    });
  }
});

// PUT /api/bank-integrations/:id - Update bank integration
router.put('/:id', requireAuth, requirePermission(Permission.MANAGE_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Validate input
    const validatedData = updateBankIntegrationSchema.parse(data);

    const integration = await updateBankIntegration(userId, id, validatedData);

    if (!integration) {
      return res.status(404).json({
        error: 'Banka entegrasyonu bulunamadı',
      });
    }

    res.json({
      success: true,
      data: integration,
      message: 'Banka entegrasyonu başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Update bank integration error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Banka entegrasyonu güncellenirken hata oluştu',
    });
  }
});

// DELETE /api/bank-integrations/:id - Delete bank integration
router.delete('/:id', requireAuth, requirePermission(Permission.MANAGE_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const success = await deleteBankIntegration(userId, id);

    if (!success) {
      return res.status(404).json({
        error: 'Banka entegrasyonu bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Banka entegrasyonu başarıyla silindi',
    });
  } catch (error) {
    console.error('Delete bank integration error:', error);
    res.status(500).json({
      error: 'Banka entegrasyonu silinirken hata oluştu',
    });
  }
});

// POST /api/bank-integrations/:id/sync - Sync bank data via API
router.post('/:id/sync', requireAuth, requirePermission(Permission.IMPORT_BANK_DATA), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { credentials } = req.body;

    const result = await syncBankData(userId, id, credentials);

    res.json({
      success: result.success,
      data: {
        transactionsCount: result.transactionsCount,
      },
      message: result.success 
        ? `${result.transactionsCount} işlem başarıyla senkronize edildi`
        : 'Senkronizasyon başarısız',
      error: result.error,
    });
  } catch (error) {
    console.error('Sync bank data error:', error);
    res.status(500).json({
      error: 'Banka verileri senkronize edilirken hata oluştu',
    });
  }
});

// POST /api/bank-integrations/:id/import - Import transactions from file
router.post('/:id/import', requireAuth, requirePermission(Permission.IMPORT_BANK_DATA), upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const file = req.file;
    const { autoReconcile = false, duplicateHandling = 'skip' } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'Dosya gereklidir',
      });
    }

    // Determine file type from mimetype
    let fileType: 'csv' | 'ofx' | 'xml';
    switch (file.mimetype) {
      case 'text/csv':
        fileType = 'csv';
        break;
      case 'application/xml':
      case 'text/xml':
        fileType = 'xml';
        break;
      case 'application/ofx':
        fileType = 'ofx';
        break;
      default:
        return res.status(400).json({
          error: 'Desteklenmeyen dosya tipi',
        });
    }

    const fileData = file.buffer.toString('utf-8');
    
    const result = await importTransactionsFromFile(userId, id, fileData, fileType, {
      fileName: file.originalname,
      autoReconcile: autoReconcile === 'true',
      duplicateHandling: duplicateHandling as 'skip' | 'update' | 'create',
    });

    res.json({
      success: true,
      data: result,
      message: `İçe aktarma tamamlandı: ${result.successfulRecords}/${result.totalRecords} başarılı`,
    });
  } catch (error) {
    console.error('Import transactions error:', error);
    res.status(500).json({
      error: 'İşlemler içe aktarılırken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/:id/transactions - Get bank transactions
router.get('/:id/transactions', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { 
      limit = '50', 
      offset = '0', 
      startDate,
      endDate,
      transactionType,
      isReconciled,
      search 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      transactionType: transactionType as 'debit' | 'credit',
      isReconciled: isReconciled === 'true' ? true : isReconciled === 'false' ? false : undefined,
      search: search as string,
    };

    const transactions = await getBankTransactions(userId, id, options);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Get bank transactions error:', error);
    res.status(500).json({
      error: 'Banka işlemleri alınırken hata oluştu',
    });
  }
});

// POST /api/bank-integrations/:id/reconcile - Reconcile transactions
router.post('/:id/reconcile', requireAuth, requirePermission(Permission.RECONCILE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Validate input
    const validatedData = reconciliationSchema.parse(data);

    const log = await reconcileTransactions(userId, validatedData);

    res.json({
      success: true,
      data: log,
      message: 'İşlem başarıyla eşleştirildi',
    });
  } catch (error) {
    console.error('Reconcile transactions error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Geçersiz veri formatı',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'İşlemler eşleştirilirken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/:id/reconciliation-summary - Get reconciliation summary
router.get('/:id/reconciliation-summary', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const summary = await getReconciliationSummary(userId, id);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get reconciliation summary error:', error);
    res.status(500).json({
      error: 'Eşleştirme özeti alınırken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/:id/import-batches - Get import batches
router.get('/:id/import-batches', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { 
      limit = '50', 
      offset = '0',
      status 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      status: status as string,
    };

    const batches = await getImportBatches(userId, id, options);

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error('Get import batches error:', error);
    res.status(500).json({
      error: 'İçe aktarma toplu işlemleri alınırken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/import-batches/all - Get all import batches for user
router.get('/import-batches/all', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      limit = '50', 
      offset = '0',
      status 
    } = req.query;

    const options = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      status: status as string,
    };

    const batches = await getImportBatches(userId, undefined, options);

    res.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error('Get all import batches error:', error);
    res.status(500).json({
      error: 'Tüm içe aktarma toplu işlemleri alınırken hata oluştu',
    });
  }
});

// GET /api/bank-integrations/reconciliation-summary/all - Get all reconciliation summary for user
router.get('/reconciliation-summary/all', requireAuth, requirePermission(Permission.VIEW_BANK_INTEGRATIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const summary = await getReconciliationSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Get all reconciliation summary error:', error);
    res.status(500).json({
      error: 'Tüm eşleştirme özeti alınırken hata oluştu',
    });
  }
});

export default router;
