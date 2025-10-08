import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getARTrends,
  getAPTrends,
  getCashFlowProjection,
  getFinancialHealthTrends,
} from '../modules/analytics/trends';

const router = Router();

// GET /api/analytics/trends/ar - Get AR trend analysis
router.get('/trends/ar', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { period = 'monthly', months = '12' } = req.query;

    const periodType = period as 'monthly' | 'quarterly' | 'yearly';
    const monthsCount = parseInt(months as string);

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const trends = await getARTrends(userId, periodType, monthsCount);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('AR trends error:', error);
    res.status(500).json({
      error: 'AR trend analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/analytics/trends/ap - Get AP trend analysis
router.get('/trends/ap', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { period = 'monthly', months = '12' } = req.query;

    const periodType = period as 'monthly' | 'quarterly' | 'yearly';
    const monthsCount = parseInt(months as string);

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const trends = await getAPTrends(userId, periodType, monthsCount);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('AP trends error:', error);
    res.status(500).json({
      error: 'AP trend analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/analytics/cashflow-projection - Get cash flow projection
router.get('/cashflow-projection', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    const monthsCount = parseInt(months as string);

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const projection = await getCashFlowProjection(userId, monthsCount);

    res.json({
      success: true,
      data: projection,
    });
  } catch (error) {
    logger.error('Cash flow projection error:', error);
    res.status(500).json({
      error: 'Nakit akışı projeksiyonu yapılırken hata oluştu',
    });
  }
});

// GET /api/analytics/financial-health-trends - Get financial health trends
router.get('/financial-health-trends', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    const monthsCount = parseInt(months as string);

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const trends = await getFinancialHealthTrends(userId, monthsCount);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Financial health trends error:', error);
    res.status(500).json({
      error: 'Finansal sağlık trend analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/analytics/combined - Get combined analytics
router.get('/combined', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months = '12' } = req.query;

    const monthsCount = parseInt(months as string);

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    // Get all analytics in parallel
    const [arTrends, apTrends, cashFlowProjection, healthTrends] = await Promise.all([
      getARTrends(userId, 'monthly', monthsCount),
      getAPTrends(userId, 'monthly', monthsCount),
      getCashFlowProjection(userId, monthsCount),
      getFinancialHealthTrends(userId, monthsCount),
    ]);

    res.json({
      success: true,
      data: {
        arTrends,
        apTrends,
        cashFlowProjection,
        healthTrends,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Combined analytics error:', error);
    res.status(500).json({
      error: 'Birleşik analiz yapılırken hata oluştu',
    });
  }
});

// GET /api/analytics/export/:type - Export analytics data
router.get('/export/:type', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { type } = req.params;
    const { months = '12', format = 'json' } = req.query;

    const monthsCount = parseInt(months as string);
    const exportFormat = format as 'json' | 'csv';

    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    let analyticsData: any;

    switch (type) {
      case 'ar':
        analyticsData = await getARTrends(userId, 'monthly', monthsCount);
        break;
      case 'ap':
        analyticsData = await getAPTrends(userId, 'monthly', monthsCount);
        break;
      case 'cashflow':
        analyticsData = await getCashFlowProjection(userId, monthsCount);
        break;
      case 'health':
        analyticsData = await getFinancialHealthTrends(userId, monthsCount);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid analytics type. Use: ar, ap, cashflow, or health',
        });
    }

    if (exportFormat === 'csv') {
      // Convert to CSV format
      let csv = '';
      
      if (type === 'cashflow') {
        csv = 'Period,Date,Projected Inflows,Projected Outflows,Net Cash Flow,Cumulative Cash,Confidence\n';
        analyticsData.forEach((item: any) => {
          csv += `"${item.period}","${item.date.toISOString()}","${item.projectedInflows}","${item.projectedOutflows}","${item.netCashFlow}","${item.cumulativeCash}","${item.confidence}"\n`;
        });
      } else {
        csv = 'Period,Date,Value,Change,Change Percent\n';
        analyticsData.data.forEach((item: any) => {
          csv += `"${item.period}","${item.date.toISOString()}","${item.value}","${item.change || ''}","${item.changePercent || ''}"\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_analytics_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: analyticsData,
        exportedAt: new Date().toISOString(),
        type,
        months: monthsCount,
      });
    }
  } catch (error) {
    logger.error('Analytics export error:', error);
    res.status(500).json({
      error: 'Analiz verileri dışa aktarılırken hata oluştu',
    });
  }
});

export default router;
