import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import {
  createAgingReport,
  getAgingReports,
  getAgingSummary,
  getAgingByCustomer,
  updateAgingReport,
  deleteAgingReport,
  getAgingStatistics,
  recalculateAging,
} from '../modules/finance/aging-analysis';
import { insertAgingReportSchema } from '@shared/schema';

const router = Router();

// GET /api/aging/ar - Get Accounts Receivable aging reports
router.get('/ar', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      customerVendorId, 
      status, 
      agingBucket, 
      minAmount, 
      maxAmount 
    } = req.query;

    const filters: any = {};
    
    if (customerVendorId) filters.customerVendorId = customerVendorId as string;
    if (status) filters.status = status as 'outstanding' | 'paid' | 'overdue';
    if (agingBucket) filters.agingBucket = agingBucket as string;
    if (minAmount) filters.minAmount = parseFloat(minAmount as string);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);

    const reports = await getAgingReports(userId, 'ar', filters);

    res.json({
      success: true,
      data: reports,
      total: reports.length,
    });
  } catch (error) {
    console.error('AR aging reports error:', error);
    res.status(500).json({
      error: 'Alacak yaşlandırma raporları alınırken hata oluştu',
    });
  }
});

// GET /api/aging/ap - Get Accounts Payable aging reports
router.get('/ap', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { 
      customerVendorId, 
      status, 
      agingBucket, 
      minAmount, 
      maxAmount 
    } = req.query;

    const filters: any = {};
    
    if (customerVendorId) filters.customerVendorId = customerVendorId as string;
    if (status) filters.status = status as 'outstanding' | 'paid' | 'overdue';
    if (agingBucket) filters.agingBucket = agingBucket as string;
    if (minAmount) filters.minAmount = parseFloat(minAmount as string);
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);

    const reports = await getAgingReports(userId, 'ap', filters);

    res.json({
      success: true,
      data: reports,
      total: reports.length,
    });
  } catch (error) {
    console.error('AP aging reports error:', error);
    res.status(500).json({
      error: 'Borç yaşlandırma raporları alınırken hata oluştu',
    });
  }
});

// GET /api/aging/summary/:type - Get aging summary (ar or ap)
router.get('/summary/:type', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.params;

    if (type !== 'ar' && type !== 'ap') {
      return res.status(400).json({
        error: 'Invalid type. Use "ar" or "ap"',
      });
    }

    const summary = await getAgingSummary(userId, type);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Aging summary error:', error);
    res.status(500).json({
      error: 'Yaşlandırma özeti alınırken hata oluştu',
    });
  }
});

// GET /api/aging/customer/:type - Get aging by customer/vendor
router.get('/customer/:type', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.params;

    if (type !== 'ar' && type !== 'ap') {
      return res.status(400).json({
        error: 'Invalid type. Use "ar" or "ap"',
      });
    }

    const customerAging = await getAgingByCustomer(userId, type);

    res.json({
      success: true,
      data: customerAging,
      total: customerAging.length,
    });
  } catch (error) {
    console.error('Customer aging error:', error);
    res.status(500).json({
      error: 'Müşteri/tedarikçi yaşlandırması alınırken hata oluştu',
    });
  }
});

// GET /api/aging/statistics - Get aging statistics
router.get('/statistics', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    const reportType = type === 'ar' || type === 'ap' ? type : undefined;
    const statistics = await getAgingStatistics(userId, reportType);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Aging statistics error:', error);
    res.status(500).json({
      error: 'Yaşlandırma istatistikleri alınırken hata oluştu',
    });
  }
});

// POST /api/aging - Create new aging report
router.post('/', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const validatedData = insertAgingReportSchema.parse(req.body);

    const agingReport = await createAgingReport(userId, validatedData);

    res.status(201).json({
      success: true,
      data: agingReport,
      message: 'Yaşlandırma raporu başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Aging report creation error:', error);
    res.status(500).json({
      error: 'Yaşlandırma raporu oluşturulurken hata oluştu',
    });
  }
});

// PUT /api/aging/:id - Update aging report
router.put('/:id', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const validatedData = insertAgingReportSchema.partial().parse(req.body);

    const updatedReport = await updateAgingReport(id, userId, validatedData);

    if (!updatedReport) {
      return res.status(404).json({
        error: 'Yaşlandırma raporu bulunamadı',
      });
    }

    res.json({
      success: true,
      data: updatedReport,
      message: 'Yaşlandırma raporu başarıyla güncellendi',
    });
  } catch (error) {
    console.error('Aging report update error:', error);
    res.status(500).json({
      error: 'Yaşlandırma raporu güncellenirken hata oluştu',
    });
  }
});

// DELETE /api/aging/:id - Delete aging report
router.delete('/:id', requireAuth, requirePermission(Permission.MANAGE_TRANSACTIONS), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const deleted = await deleteAgingReport(id, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Yaşlandırma raporu bulunamadı',
      });
    }

    res.json({
      success: true,
      message: 'Yaşlandırma raporu başarıyla silindi',
    });
  } catch (error) {
    console.error('Aging report deletion error:', error);
    res.status(500).json({
      error: 'Yaşlandırma raporu silinirken hata oluştu',
    });
  }
});

// POST /api/aging/recalculate - Recalculate all aging reports
router.post('/recalculate', requireAuth, requirePermission(Permission.ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const result = await recalculateAging(userId);

    res.json({
      success: true,
      data: result,
      message: `Yaşlandırma raporları güncellendi. ${result.updated} rapor güncellendi.`,
    });
  } catch (error) {
    console.error('Aging recalculation error:', error);
    res.status(500).json({
      error: 'Yaşlandırma raporları güncellenirken hata oluştu',
    });
  }
});

export default router;
