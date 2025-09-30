import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { queryOptimizer, createPerformanceMiddleware } from '../modules/performance/query-optimizer';

const router = Router();

// Apply performance monitoring to all routes
router.use(createPerformanceMiddleware());

// GET /api/performance/metrics - Get query performance metrics
router.get('/metrics', requireAuth, requirePermission(Permission.VIEW_SETTINGS), async (req: AuthenticatedRequest, res) => {
  try {
    const { queryId } = req.query;
    
    const metrics = queryOptimizer.getQueryMetrics(queryId as string);
    
    res.json({
      success: true,
      data: {
        metrics: metrics,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      error: 'Performans metrikleri alınırken hata oluştu',
    });
  }
});

// GET /api/performance/suggestions - Get optimization suggestions
router.get('/suggestions', requireAuth, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthenticatedRequest, res) => {
  try {
    const suggestions = queryOptimizer.getOptimizationSuggestions();
    
    res.json({
      success: true,
      data: {
        suggestions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance suggestions error:', error);
    res.status(500).json({
      error: 'Optimizasyon önerileri alınırken hata oluştu',
    });
  }
});

// GET /api/performance/cache/stats - Get cache statistics
router.get('/cache/stats', requireAuth, requirePermission(Permission.VIEW_SETTINGS), async (req: AuthenticatedRequest, res) => {
  try {
    const stats = queryOptimizer.getCacheStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: 'Cache istatistikleri alınırken hata oluştu',
    });
  }
});

// POST /api/performance/cache/clear - Clear cache
router.post('/cache/clear', requireAuth, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthenticatedRequest, res) => {
  try {
    const { pattern } = req.body;
    
    queryOptimizer.clearCache(pattern);
    
    res.json({
      success: true,
      message: pattern ? `Cache cleared for pattern: ${pattern}` : 'Cache cleared',
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Cache temizlenirken hata oluştu',
    });
  }
});

// GET /api/performance/health - Performance health check
router.get('/health', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const stats = queryOptimizer.getCacheStats();
    const suggestions = queryOptimizer.getOptimizationSuggestions();
    
    // Calculate health score
    const cacheHitRate = stats.hitRate;
    const slowQueries = suggestions.filter(s => s.impact === 'high').length;
    
    let healthScore = 100;
    
    if (cacheHitRate < 50) healthScore -= 20;
    if (slowQueries > 3) healthScore -= 30;
    if (stats.size > 1000) healthScore -= 10; // Cache too large
    
    const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';
    
    res.json({
      success: true,
      data: {
        status,
        healthScore,
        cacheHitRate,
        slowQueries,
        cacheSize: stats.size,
        totalRequests: stats.totalRequests,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance health error:', error);
    res.status(500).json({
      error: 'Performans sağlık kontrolü yapılırken hata oluştu',
    });
  }
});

// POST /api/performance/test - Performance test endpoint
router.post('/test', requireAuth, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthenticatedRequest, res) => {
  try {
    const { testType = 'query', iterations = 10 } = req.body;
    const userId = req.user!.id;
    
    const results: any[] = [];
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();
      
      switch (testType) {
        case 'query':
          await queryOptimizer.getAgingReportsOptimized(userId, 'ar', { limit: 100 });
          break;
        case 'cache':
          await queryOptimizer.getDashboardDataOptimized(userId);
          break;
        case 'summary':
          await queryOptimizer.getAgingSummaryOptimized(userId, 'ar');
          break;
        default:
          throw new Error('Invalid test type');
      }
      
      const iterationTime = performance.now() - iterationStart;
      results.push({
        iteration: i + 1,
        executionTime: iterationTime,
      });
    }
    
    const totalTime = performance.now() - startTime;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const minTime = Math.min(...results.map(r => r.executionTime));
    const maxTime = Math.max(...results.map(r => r.executionTime));
    
    res.json({
      success: true,
      data: {
        testType,
        iterations,
        results: {
          totalTime,
          averageTime: avgTime,
          minTime,
          maxTime,
          iterations: results,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Performance test error:', error);
    res.status(500).json({
      error: 'Performans testi yapılırken hata oluştu',
    });
  }
});

export default router;
