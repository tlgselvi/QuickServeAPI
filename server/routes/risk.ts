import type { Router } from 'express';
import { requireAuth, requirePermission, logAccess } from '../middleware/auth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { formatCurrency } from '../lib/utils/formatCurrency';
import { logger } from '../utils/logger';

export default function riskRouter(router: Router) {
  // Risk analysis endpoint
  router.get('/analysis',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    logAccess('VIEW_RISK_ANALYSIS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { 
          analyzeRiskScenarios, 
          getRiskLevel, 
          generateRiskRecommendations
        } = await import('../src/modules/risk/engine');
        
        // Query parametrelerinden risk parametrelerini al (default: 0)
        const fxDelta = parseFloat(req.query.fxDelta as string) || 0;
        const rateDelta = parseFloat(req.query.rateDelta as string) || 0;
        const inflationDelta = parseFloat(req.query.inflationDelta as string) || 0;
        const liquidityGap = parseFloat(req.query.liquidityGap as string) || 0;

        // Dashboard verilerinden nakit miktarını al
        const { storage } = await import('../storage');
        const dashboardData = await storage.getDashboardStats();
        const baseCash = dashboardData.totalCash || 100000; // Varsayılan değer

        const parameters = {
          fxDelta,
          rateDelta,
          inflationDelta,
          liquidityGap
        };

        const result = analyzeRiskScenarios(baseCash, parameters);
        const riskLevel = getRiskLevel(result.base.score);
        const recommendations = generateRiskRecommendations(result);

        res.json({
          best: {
            cash: result.best.cash,
            score: result.best.score,
            formattedCash: formatCurrency(result.best.cash, 'TRY'),
            factors: result.best.factors
          },
          base: {
            cash: result.base.cash,
            score: result.base.score,
            formattedCash: formatCurrency(result.base.cash, 'TRY'),
            factors: result.base.factors
          },
          worst: {
            cash: result.worst.cash,
            score: result.worst.score,
            formattedCash: formatCurrency(result.worst.cash, 'TRY'),
            factors: result.worst.factors
          },
          factors: result.factors,
          riskLevel,
          recommendations,
          parameters,
          baseCash: {
            amount: baseCash,
            formatted: formatCurrency(baseCash, 'TRY')
          },
          metadata: {
            timestamp: new Date().toISOString(),
            userId: req.user?.id,
            userRole: req.user?.role
          }
        });
      } catch (error) {
        logger.error('Risk analysis error:', error);
        res.status(500).json({ 
          error: 'Risk analizi hesaplanırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata',
          code: 'RISK_ANALYSIS_ERROR'
        });
      }
    },
  );

  // Risk parameters validation endpoint
  router.get('/parameters/validate',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    logAccess('VALIDATE_RISK_PARAMETERS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const fxDelta = parseFloat(req.query.fxDelta as string) || 0;
        const rateDelta = parseFloat(req.query.rateDelta as string) || 0;
        const inflationDelta = parseFloat(req.query.inflationDelta as string) || 0;
        const liquidityGap = parseFloat(req.query.liquidityGap as string) || 0;

        // Parametre sınırları
        const limits = {
          fxDelta: { min: -50, max: 50 },
          rateDelta: { min: -20, max: 20 },
          inflationDelta: { min: -10, max: 100 },
          liquidityGap: { min: 0, max: 100 }
        };

        const validation = {
          fxDelta: {
            value: fxDelta,
            valid: fxDelta >= limits.fxDelta.min && fxDelta <= limits.fxDelta.max,
            message: fxDelta < limits.fxDelta.min || fxDelta > limits.fxDelta.max 
              ? `Döviz kuru değişimi ${limits.fxDelta.min}% ile ${limits.fxDelta.max}% arasında olmalıdır`
              : 'Geçerli'
          },
          rateDelta: {
            value: rateDelta,
            valid: rateDelta >= limits.rateDelta.min && rateDelta <= limits.rateDelta.max,
            message: rateDelta < limits.rateDelta.min || rateDelta > limits.rateDelta.max
              ? `Faiz oranı değişimi ${limits.rateDelta.min}% ile ${limits.rateDelta.max}% arasında olmalıdır`
              : 'Geçerli'
          },
          inflationDelta: {
            value: inflationDelta,
            valid: inflationDelta >= limits.inflationDelta.min && inflationDelta <= limits.inflationDelta.max,
            message: inflationDelta < limits.inflationDelta.min || inflationDelta > limits.inflationDelta.max
              ? `Enflasyon ${limits.inflationDelta.min}% ile ${limits.inflationDelta.max}% arasında olmalıdır`
              : 'Geçerli'
          },
          liquidityGap: {
            value: liquidityGap,
            valid: liquidityGap >= limits.liquidityGap.min && liquidityGap <= limits.liquidityGap.max,
            message: liquidityGap < limits.liquidityGap.min || liquidityGap > limits.liquidityGap.max
              ? `Likidite açığı ${limits.liquidityGap.min}% ile ${limits.liquidityGap.max}% arasında olmalıdır`
              : 'Geçerli'
          }
        };

        const isValid = Object.values(validation).every(param => param.valid);

        res.json({
          valid: isValid,
          validation,
          limits,
          parameters: {
            fxDelta,
            rateDelta,
            inflationDelta,
            liquidityGap
          }
        });
      } catch (error) {
        logger.error('Risk parameters validation error:', error);
        res.status(500).json({
          error: 'Parametre doğrulaması sırasında hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  // Risk scenarios comparison endpoint
  router.post('/scenarios/compare',
    requireAuth,
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    logAccess('COMPARE_RISK_SCENARIOS'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { scenarios } = req.body;
        
        if (!Array.isArray(scenarios) || scenarios.length === 0) {
          return res.status(400).json({
            error: 'En az bir senaryo gerekli',
            code: 'INVALID_SCENARIOS'
          });
        }

        const { analyzeRiskScenarios } = await import('../src/modules/risk/engine');
        const { storage } = await import('../storage');
        
        const dashboardData = await storage.getDashboardStats();
        const baseCash = dashboardData.totalCash || 100000;

        const results = scenarios.map((scenario, index) => {
          try {
            const result = analyzeRiskScenarios(baseCash, {
              fxDelta: parseFloat(scenario.fxDelta) || 0,
              rateDelta: parseFloat(scenario.rateDelta) || 0,
              inflationDelta: parseFloat(scenario.inflationDelta) || 0,
              liquidityGap: parseFloat(scenario.liquidityGap) || 0
            });

            return {
              index,
              name: scenario.name || `Senaryo ${index + 1}`,
              parameters: scenario,
              best: {
                cash: result.best.cash,
                score: result.best.score,
                formattedCash: formatCurrency(result.best.cash, 'TRY')
              },
              base: {
                cash: result.base.cash,
                score: result.base.score,
                formattedCash: formatCurrency(result.base.cash, 'TRY')
              },
              worst: {
                cash: result.worst.cash,
                score: result.worst.score,
                formattedCash: formatCurrency(result.worst.cash, 'TRY')
              },
              factors: result.factors
            };
          } catch (error) {
            return {
              index,
              name: scenario.name || `Senaryo ${index + 1}`,
              error: 'Senaryo hesaplanırken hata oluştu',
              details: error instanceof Error ? error.message : 'Bilinmeyen hata'
            };
          }
        });

        // En iyi ve en kötü senaryoları belirle
        const validResults = results.filter(r => !r.error && r.base);
        if (validResults.length === 0) {
          return res.status(400).json({
            error: 'Geçerli senaryo bulunamadı',
            code: 'NO_VALID_SCENARIOS'
          });
        }
        
        const bestScenario = validResults.reduce((best, current) => 
          (current.base?.score ?? 0) > (best.base?.score ?? 0) ? current : best
        );
        const worstScenario = validResults.reduce((worst, current) => 
          (current.base?.score ?? 100) < (worst.base?.score ?? 100) ? current : worst
        );

        res.json({
          scenarios: results,
          comparison: {
            best: bestScenario,
            worst: worstScenario,
            count: validResults.length
          },
          metadata: {
            timestamp: new Date().toISOString(),
            userId: req.user?.id,
            baseCash: formatCurrency(baseCash, 'TRY')
          }
        });
      } catch (error) {
        logger.error('Risk scenarios comparison error:', error);
        res.status(500).json({
          error: 'Senaryo karşılaştırması sırasında hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  return router;
}
