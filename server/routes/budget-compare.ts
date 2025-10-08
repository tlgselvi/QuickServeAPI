import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  compareBudgetVsActual,
  getBudgetComparisonTrends,
  getBudgetPerformanceInsights,
  getBudgetVarianceAnalysis,
  calculateBudgetEfficiencyScore,
} from '../modules/budget/compare';

const router = Router();

// GET /api/budget/compare - Compare budget vs actual for a month
router.get('/compare', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { month } = req.query;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        error: 'Month parameter is required (YYYY-MM format)',
      });
    }

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM format.',
      });
    }

    const comparison = await compareBudgetVsActual(userId, month);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logger.error('Budget comparison error:', error);
    res.status(500).json({
      error: 'Bütçe karşılaştırması yapılırken hata oluştu',
    });
  }
});

// GET /api/budget/compare/trends - Get budget comparison trends
router.get('/compare/trends', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { months } = req.query;

    const monthsCount = months ? parseInt(months as string) : 6;
    
    if (isNaN(monthsCount) || monthsCount < 1 || monthsCount > 24) {
      return res.status(400).json({
        error: 'Months must be a number between 1 and 24',
      });
    }

    const trends = await getBudgetComparisonTrends(userId, monthsCount);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logger.error('Budget trends error:', error);
    res.status(500).json({
      error: 'Bütçe trendleri alınırken hata oluştu',
    });
  }
});

// GET /api/budget/compare/insights - Get budget performance insights
router.get('/compare/insights', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { month } = req.query;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        error: 'Month parameter is required (YYYY-MM format)',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM format.',
      });
    }

    const insights = await getBudgetPerformanceInsights(userId, month);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    logger.error('Budget insights error:', error);
    res.status(500).json({
      error: 'Bütçe öngörüleri alınırken hata oluştu',
    });
  }
});

// GET /api/budget/compare/variance - Get budget variance analysis
router.get('/compare/variance', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { month, limit } = req.query;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        error: 'Month parameter is required (YYYY-MM format)',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM format.',
      });
    }

    const limitCount = limit ? parseInt(limit as string) : 10;
    
    if (isNaN(limitCount) || limitCount < 1 || limitCount > 50) {
      return res.status(400).json({
        error: 'Limit must be a number between 1 and 50',
      });
    }

    const varianceAnalysis = await getBudgetVarianceAnalysis(userId, month, limitCount);

    res.json({
      success: true,
      data: varianceAnalysis,
    });
  } catch (error) {
    logger.error('Budget variance analysis error:', error);
    res.status(500).json({
      error: 'Bütçe varyans analizi yapılırken hata oluştu',
    });
  }
});

// GET /api/budget/compare/score - Get budget efficiency score
router.get('/compare/score', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { month } = req.query;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        error: 'Month parameter is required (YYYY-MM format)',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM format.',
      });
    }

    const efficiencyScore = await calculateBudgetEfficiencyScore(userId, month);

    res.json({
      success: true,
      data: efficiencyScore,
    });
  } catch (error) {
    logger.error('Budget efficiency score error:', error);
    res.status(500).json({
      error: 'Bütçe verimlilik skoru hesaplanırken hata oluştu',
    });
  }
});

// GET /api/budget/compare/summary - Get comprehensive budget comparison summary
router.get('/compare/summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { month } = req.query;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        error: 'Month parameter is required (YYYY-MM format)',
      });
    }

    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Use YYYY-MM format.',
      });
    }

    // Get all comparison data in parallel
    const [comparison, insights, varianceAnalysis, efficiencyScore] = await Promise.all([
      compareBudgetVsActual(userId, month),
      getBudgetPerformanceInsights(userId, month),
      getBudgetVarianceAnalysis(userId, month, 5),
      calculateBudgetEfficiencyScore(userId, month),
    ]);

    const summary = {
      month,
      comparison,
      insights,
      varianceAnalysis,
      efficiencyScore,
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Budget comparison summary error:', error);
    res.status(500).json({
      error: 'Bütçe karşılaştırma özeti oluşturulurken hata oluştu',
    });
  }
});

export default router;
