import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  calculateRunway,
  calculateCashGap,
  getDashboardRunwayCashGap,
  getCashFlowForecast,
} from '../modules/dashboard/runway-cashgap';

const router = Router();

// GET /api/dashboard/extended - Get extended dashboard data
router.get('/extended', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get all extended dashboard data
    const runwayData = await getDashboardRunwayCashGap(userId, 12);
    const cashGapData = await calculateCashGap(userId, 12);
    const cashFlowForecast = await getCashFlowForecast(userId, 12);
    
    const extendedData = {
      runway: runwayData,
      cashGap: cashGapData,
      cashFlowForecast: cashFlowForecast,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[DASHBOARD] Extended dashboard data retrieved for user: ${userId}`);
    res.json(extendedData);
  } catch (error) {
    logger.error('Extended dashboard error:', error);
    res.status(500).json({ 
      error: 'Extended dashboard data could not be retrieved',
      code: 'DASHBOARD_EXTENDED_ERROR'
    });
  }
});

// GET /api/dashboard/runway - Get runway analysis
router.get('/runway', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months } = req.query;

    const monthsCount = months ? parseInt(months as string) : 12;
    
    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const runway = await calculateRunway(userId, monthsCount);

    res.json({
      success: true,
      data: runway,
    });
  } catch (error) {
    logger.error('Runway analysis error:', error);
    res.status(500).json({
      error: 'Runway analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/dashboard/cashgap - Get cash gap analysis
router.get('/cashgap', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months } = req.query;

    const monthsCount = months ? parseInt(months as string) : 6;
    
    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 12) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 12',
      });
    }

    const cashGap = await calculateCashGap(userId, monthsCount);

    res.json({
      success: true,
      data: cashGap,
    });
  } catch (error) {
    logger.error('Cash gap analysis error:', error);
    res.status(500).json({
      error: 'Cash gap analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/dashboard/runway-cashgap - Get combined runway and cash gap analysis
router.get('/runway-cashgap', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const combinedAnalysis = await getDashboardRunwayCashGap(userId);

    res.json({
      success: true,
      data: combinedAnalysis,
    });
  } catch (error) {
    logger.error('Combined runway cash gap analysis error:', error);
    res.status(500).json({
      error: 'Birleşik runway ve cash gap analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/dashboard/cashflow-forecast - Get cash flow forecast
router.get('/cashflow-forecast', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months } = req.query;

    const monthsCount = months ? parseInt(months as string) : 12;
    
    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const forecast = await getCashFlowForecast(userId, monthsCount);

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    logger.error('Cash flow forecast error:', error);
    res.status(500).json({
      error: 'Nakit akışı tahmini yapılırken hata oluştu',
    });
  }
});

// GET /api/dashboard/financial-health - Get overall financial health summary
router.get('/financial-health', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const [runway, cashGap] = await Promise.all([
      calculateRunway(userId, 12),
      calculateCashGap(userId, 6),
    ]);

    // Calculate overall financial health score (0-100)
    let healthScore = 100;
    
    // Deduct points based on runway
    if (runway.status === 'critical') healthScore -= 40;
    else if (runway.status === 'warning') healthScore -= 20;
    
    // Deduct points based on cash gap risk
    if (cashGap.riskLevel === 'critical') healthScore -= 30;
    else if (cashGap.riskLevel === 'high') healthScore -= 20;
    else if (cashGap.riskLevel === 'medium') healthScore -= 10;
    
    // Deduct points for high overdue amounts
    const overduePercentage = cashGap.totalAR > 0 ? (cashGap.totalAR - cashGap.arDueIn30Days) / cashGap.totalAR : 0;
    if (overduePercentage > 0.5) healthScore -= 15;
    else if (overduePercentage > 0.3) healthScore -= 10;
    
    healthScore = Math.max(0, healthScore);

    // Determine health status
    let healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    if (healthScore >= 90) healthStatus = 'excellent';
    else if (healthScore >= 75) healthStatus = 'good';
    else if (healthScore >= 60) healthStatus = 'fair';
    else if (healthScore >= 40) healthStatus = 'poor';
    else healthStatus = 'critical';

    // Generate health insights
    const insights: string[] = [];
    
    if (healthScore >= 90) {
      insights.push('Mükemmel finansal sağlık - güçlü nakit pozisyonu');
    } else if (healthScore >= 75) {
      insights.push('İyi finansal sağlık - mevcut durumunuzu koruyun');
    } else if (healthScore >= 60) {
      insights.push('Orta seviye finansal sağlık - dikkatli olun');
    } else if (healthScore >= 40) {
      insights.push('Zayıf finansal sağlık - acil önlemler gerekli');
    } else {
      insights.push('Kritik finansal sağlık - derhal müdahale gerekli');
    }

    if (runway.status === 'critical') {
      insights.push('Runway çok kısa - nakit yönetimine odaklanın');
    }
    
    if (cashGap.riskLevel === 'critical' || cashGap.riskLevel === 'high') {
      insights.push('Yüksek nakit akışı riski - alacak tahsilatını hızlandırın');
    }

    const healthSummary = {
      healthScore: Math.round(healthScore),
      healthStatus,
      insights,
      keyMetrics: {
        runwayMonths: runway.runwayMonths,
        runwayStatus: runway.status,
        cashGap: cashGap.cashGap,
        cashGapRisk: cashGap.riskLevel,
        totalCash: runway.currentCash,
        totalAR: cashGap.totalAR,
        totalAP: cashGap.totalAP,
        netPosition: runway.currentCash + cashGap.totalAR - cashGap.totalAP,
      },
      recommendations: [...runway.recommendations, ...cashGap.recommendations],
    };

    res.json({
      success: true,
      data: healthSummary,
    });
  } catch (error) {
    logger.error('Financial health analysis error:', error);
    res.status(500).json({
      error: 'Finansal sağlık analizi yapılırken hata oluştu',
    });
  }
});

export default router;
