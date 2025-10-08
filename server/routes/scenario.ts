import { Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import {
  runScenarioAnalysis,
  compareScenarios,
  getScenarioRecommendations,
  SCENARIO_HORIZONS,
} from '../modules/scenario/engine';
import type { ScenarioParameters } from '../modules/scenario/engine';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/scenario/horizons - Get available scenario horizons
router.get('/horizons', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      data: SCENARIO_HORIZONS,
    });
  } catch (error) {
    logger.error('Scenario horizons error:', error);
    res.status(500).json({
      error: 'Senaryo dönemleri alınırken hata oluştu',
    });
  }
});

// POST /api/scenario/run - Run scenario analysis
router.post('/run', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { parameters, horizon } = req.body;

    // Validate parameters
    const scenarioParams: ScenarioParameters = {
      fxDelta: parameters?.fxDelta,
      rateDelta: parameters?.rateDelta,
      opexDelta: parameters?.opexDelta,
      revenueDelta: parameters?.revenueDelta,
      investmentDelta: parameters?.investmentDelta,
      inflationDelta: parameters?.inflationDelta,
    };

    // Validate horizon
    const validHorizons = [3, 6, 12];
    const scenarioHorizon = horizon && validHorizons.includes(horizon) ? horizon : 12;

    // Run scenario analysis
    const result = await runScenarioAnalysis(userId, scenarioParams, scenarioHorizon);

    res.json({
      success: true,
      data: result,
      message: 'Senaryo analizi başarıyla tamamlandı',
    });
  } catch (error) {
    logger.error('Scenario run error:', error);
    res.status(500).json({
      error: 'Senaryo analizi çalıştırılırken hata oluştu',
    });
  }
});

// POST /api/scenario/compare - Compare multiple scenarios
router.post('/compare', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { scenarios } = req.body;

    if (!Array.isArray(scenarios) || scenarios.length < 2) {
      return res.status(400).json({
        error: 'En az 2 senaryo karşılaştırılmalıdır',
      });
    }

    if (scenarios.length > 5) {
      return res.status(400).json({
        error: 'Maksimum 5 senaryo karşılaştırılabilir',
      });
    }

    // Validate scenarios
    const validScenarios = scenarios.map((scenario: any) => {
      if (!scenario.name || typeof scenario.name !== 'string') {
        throw new Error('Her senaryo için geçerli bir isim gerekli');
      }

      const validHorizons = [3, 6, 12];
      const horizon = scenario.horizon && validHorizons.includes(scenario.horizon) 
        ? scenario.horizon 
        : 12;

      return {
        name: scenario.name,
        parameters: scenario.parameters || {},
        horizon,
      };
    });

    const comparison = await compareScenarios(userId, validScenarios);

    res.json({
      success: true,
      data: comparison,
      message: `${validScenarios.length} senaryo başarıyla karşılaştırıldı`,
    });
  } catch (error) {
    logger.error('Scenario comparison error:', error);
    if (error instanceof Error) {
      return res.status(400).json({
        error: error.message,
      });
    }
    res.status(500).json({
      error: 'Senaryo karşılaştırması yapılırken hata oluştu',
    });
  }
});

// GET /api/scenario/recommendations - Get scenario recommendations
router.get('/recommendations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { baseParameters } = req.query;

    let baseParams: ScenarioParameters = {};
    
    if (baseParameters && typeof baseParameters === 'string') {
      try {
        baseParams = JSON.parse(baseParameters);
      } catch (error) {
        return res.status(400).json({
          error: 'Geçersiz baseParameters formatı',
        });
      }
    }

    const recommendations = await getScenarioRecommendations(userId, baseParams);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Scenario recommendations error:', error);
    res.status(500).json({
      error: 'Senaryo önerileri alınırken hata oluştu',
    });
  }
});

// POST /api/scenario/quick - Quick scenario analysis with predefined parameters
router.post('/quick', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { scenarioType, horizon } = req.body;

    // Predefined scenario parameters
    const scenarioPresets: Record<string, ScenarioParameters> = {
      'conservative': {
        revenueDelta: 2,
        opexDelta: -5,
        investmentDelta: 1,
        rateDelta: 0,
        inflationDelta: 2,
      },
      'moderate': {
        revenueDelta: 0,
        opexDelta: 0,
        investmentDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
      },
      'aggressive': {
        revenueDelta: -5,
        opexDelta: 10,
        investmentDelta: 3,
        rateDelta: 1,
        inflationDelta: 3,
      },
      'recession': {
        revenueDelta: -15,
        opexDelta: 5,
        investmentDelta: -2,
        rateDelta: 2,
        inflationDelta: 4,
      },
      'growth': {
        revenueDelta: 10,
        opexDelta: 5,
        investmentDelta: 2,
        rateDelta: -0.5,
        inflationDelta: 1,
      },
    };

    if (!scenarioType || !scenarioPresets[scenarioType]) {
      return res.status(400).json({
        error: 'Geçerli bir senaryo tipi seçin: conservative, moderate, aggressive, recession, growth',
      });
    }

    const validHorizons = [3, 6, 12];
    const scenarioHorizon = horizon && validHorizons.includes(horizon) ? horizon : 12;

    const parameters = scenarioPresets[scenarioType];
    const result = await runScenarioAnalysis(userId, parameters, scenarioHorizon);

    res.json({
      success: true,
      data: {
        scenarioType,
        parameters,
        horizon: scenarioHorizon,
        result,
      },
      message: `${scenarioType} senaryo analizi tamamlandı`,
    });
  } catch (error) {
    logger.error('Quick scenario error:', error);
    res.status(500).json({
      error: 'Hızlı senaryo analizi çalıştırılırken hata oluştu',
    });
  }
});

// GET /api/scenario/presets - Get available scenario presets
router.get('/presets', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const presets = {
      'conservative': {
        name: 'Muhafazakar',
        description: 'Düşük risk, istikrarlı büyüme',
        parameters: {
          revenueDelta: 2,
          opexDelta: -5,
          investmentDelta: 1,
          rateDelta: 0,
          inflationDelta: 2,
        },
      },
      'moderate': {
        name: 'Orta Seviye',
        description: 'Dengeli risk-getiri profili',
        parameters: {
          revenueDelta: 0,
          opexDelta: 0,
          investmentDelta: 0,
          rateDelta: 0,
          inflationDelta: 0,
        },
      },
      'aggressive': {
        name: 'Agresif',
        description: 'Yüksek risk, potansiyel yüksek getiri',
        parameters: {
          revenueDelta: -5,
          opexDelta: 10,
          investmentDelta: 3,
          rateDelta: 1,
          inflationDelta: 3,
        },
      },
      'recession': {
        name: 'Durgunluk',
        description: 'Ekonomik durgunluk senaryosu',
        parameters: {
          revenueDelta: -15,
          opexDelta: 5,
          investmentDelta: -2,
          rateDelta: 2,
          inflationDelta: 4,
        },
      },
      'growth': {
        name: 'Büyüme',
        description: 'Güçlü ekonomik büyüme senaryosu',
        parameters: {
          revenueDelta: 10,
          opexDelta: 5,
          investmentDelta: 2,
          rateDelta: -0.5,
          inflationDelta: 1,
        },
      },
    };

    res.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    logger.error('Scenario presets error:', error);
    res.status(500).json({
      error: 'Senaryo şablonları alınırken hata oluştu',
    });
  }
});

export default router;
