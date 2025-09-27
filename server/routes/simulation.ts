import { Router } from 'express';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { storage } from '../storage';
import { db } from '../db';
import { simulationRuns } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { 
  runSimulation, 
  validateSimulationParameters,
  SimulationParameters 
} from '../src/modules/simulation/engine';
import { formatCurrency } from '../lib/utils/formatCurrency';

const simulationRouter = (router: Router) => {
  /**
   * POST /api/simulation/run - Simülasyon çalıştır
   */
  router.post('/run',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { fxDelta, rateDelta, inflationDelta, horizonMonths } = req.body;

        // Parametreleri doğrula
        const validation = validateSimulationParameters({
          fxDelta,
          rateDelta,
          inflationDelta,
          horizonMonths
        });

        if (!validation.valid) {
          return res.status(400).json({
            error: 'Geçersiz parametreler',
            details: validation.errors
          });
        }

        const parameters = validation.normalized!;

        // Kullanıcının mevcut hesaplarını al
        const accounts = await storage.getAccounts();
        const userAccounts = accounts.filter(account => account.userId === req.user!.id);

        if (userAccounts.length === 0) {
          return res.status(404).json({
            error: 'Hesap bulunamadı',
            message: 'Simülasyon için en az bir hesap gereklidir'
          });
        }

        // Nakit ve borç toplamlarını hesapla
        let totalCash = 0;
        let totalDebt = 0;

        userAccounts.forEach(account => {
          const balance = parseFloat(account.balance);
          
          if (account.type === 'checking' || account.type === 'savings' || account.type === 'investment') {
            totalCash += balance;
          } else if (account.type === 'credit' || account.type === 'loan') {
            totalDebt += Math.abs(balance); // Borç pozitif olarak al
          }
        });

        // Simülasyonu çalıştır
        const results = runSimulation(totalCash, totalDebt, parameters);

        // Simülasyon çalıştırmasını veritabanına kaydet
        const simulationRun = {
          userId: req.user!.id,
          parameters: parameters,
          results: results
        };

        const [savedRun] = await db
          .insert(simulationRuns)
          .values(simulationRun)
          .returning();

        // Sonuçları formatla ve döndür
        const response = {
          id: savedRun.id,
          parameters: {
            fxDelta: parameters.fxDelta,
            rateDelta: parameters.rateDelta,
            inflationDelta: parameters.inflationDelta,
            horizonMonths: parameters.horizonMonths
          },
          currentState: {
            cash: totalCash,
            debt: totalDebt,
            netWorth: totalCash - totalDebt,
            formattedCash: formatCurrency(totalCash, 'TRY'),
            formattedDebt: formatCurrency(totalDebt, 'TRY'),
            formattedNetWorth: formatCurrency(totalCash - totalDebt, 'TRY')
          },
          projections: results.projections.map(proj => ({
            month: proj.month,
            cash: proj.cash,
            debt: proj.debt,
            netWorth: proj.netWorth,
            formattedCash: formatCurrency(proj.cash, 'TRY'),
            formattedDebt: formatCurrency(proj.debt, 'TRY'),
            formattedNetWorth: formatCurrency(proj.netWorth, 'TRY')
          })),
          summary: {
            text: results.summary,
            summary: results.summary,
            cashDeficitMonth: results.cashDeficitMonth,
            totalCashChange: results.totalCashChange,
            totalDebtChange: results.totalDebtChange,
            totalNetWorthChange: results.totalNetWorthChange,
            formattedCashChange: formatCurrency(results.totalCashChange, 'TRY'),
            formattedDebtChange: formatCurrency(results.totalDebtChange, 'TRY'),
            formattedNetWorthChange: formatCurrency(results.totalNetWorthChange, 'TRY')
          },
          createdAt: savedRun.createdAt
        };

        res.json(response);

      } catch (error) {
        console.error('Simulation run error:', error);
        res.status(500).json({
          error: 'Simülasyon çalıştırılırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  /**
   * GET /api/simulation/history - Simülasyon geçmişi
   */
  router.get('/history',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { limit = 10, offset = 0 } = req.query;

        const runs = await db
          .select()
          .from(simulationRuns)
          .where(eq(simulationRuns.userId, req.user!.id))
          .orderBy(desc(simulationRuns.createdAt))
          .limit(Number(limit))
          .offset(Number(offset));

        const formattedRuns = runs.map(run => ({
          id: run.id,
          parameters: run.parameters,
          summary: run.results.summary,
          cashDeficitMonth: run.results.cashDeficitMonth,
          createdAt: run.createdAt,
          formattedCreatedAt: new Date(run.createdAt).toLocaleString('tr-TR')
        }));

        res.json({
          runs: formattedRuns,
          total: formattedRuns.length,
          limit: Number(limit),
          offset: Number(offset)
        });

      } catch (error) {
        console.error('Simulation history error:', error);
        res.status(500).json({
          error: 'Simülasyon geçmişi alınırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  /**
   * GET /api/simulation/parameters - Desteklenen parametreler
   */
  router.get('/parameters',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const parameters = {
          fxDelta: {
            name: 'Döviz Kuru Değişimi',
            description: 'USD/TRY kurundaki yıllık değişim oranı',
            unit: '%',
            min: -50,
            max: 50,
            step: 1,
            default: 0,
            examples: [
              { value: -10, description: 'TRL %10 değer kaybı' },
              { value: 0, description: 'Kur sabit kalır' },
              { value: 10, description: 'TRL %10 değer kazancı' }
            ]
          },
          rateDelta: {
            name: 'Faiz Oranı Değişimi',
            description: 'Faiz oranlarındaki yıllık değişim oranı',
            unit: '%',
            min: -20,
            max: 20,
            step: 0.5,
            default: 0,
            examples: [
              { value: -2, description: 'Faizler %2 düşer' },
              { value: 0, description: 'Faizler sabit kalır' },
              { value: 5, description: 'Faizler %5 artar' }
            ]
          },
          inflationDelta: {
            name: 'Enflasyon Değişimi',
            description: 'Enflasyon oranındaki değişim',
            unit: '%',
            min: 0,
            max: 100,
            step: 1,
            default: 0,
            examples: [
              { value: 5, description: 'Enflasyon %5' },
              { value: 15, description: 'Enflasyon %15' },
              { value: 30, description: 'Enflasyon %30' }
            ]
          },
          horizonMonths: {
            name: 'Simülasyon Süresi',
            description: 'Projeksiyon süresi',
            unit: 'ay',
            options: [3, 6, 12],
            default: 6,
            examples: [
              { value: 3, description: '3 aylık projeksiyon' },
              { value: 6, description: '6 aylık projeksiyon' },
              { value: 12, description: '12 aylık projeksiyon' }
            ]
          }
        };

        res.json({ parameters });

      } catch (error) {
        console.error('Simulation parameters error:', error);
        res.status(500).json({
          error: 'Parametreler alınırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  /**
   * GET /api/simulation/run/:id - Belirli simülasyon detayı
   */
  router.get('/run/:id',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;

        const [run] = await db
          .select()
          .from(simulationRuns)
          .where(and(
            eq(simulationRuns.id, id),
            eq(simulationRuns.userId, req.user!.id)
          ))
          .limit(1);

        if (!run) {
          return res.status(404).json({
            error: 'Simülasyon bulunamadı',
            message: 'Belirtilen ID ile simülasyon bulunamadı'
          });
        }

        // Sonuçları formatla
        const response = {
          id: run.id,
          parameters: run.parameters,
          projections: run.results.projections.map(proj => ({
            month: proj.month,
            cash: proj.cash,
            debt: proj.debt,
            netWorth: proj.netWorth,
            formattedCash: formatCurrency(proj.cash, 'TRY'),
            formattedDebt: formatCurrency(proj.debt, 'TRY'),
            formattedNetWorth: formatCurrency(proj.netWorth, 'TRY')
          })),
          summary: {
            text: run.results.summary,
            summary: run.results.summary,
            cashDeficitMonth: run.results.cashDeficitMonth
          },
          createdAt: run.createdAt,
          formattedCreatedAt: new Date(run.createdAt).toLocaleString('tr-TR')
        };

        res.json(response);

      } catch (error) {
        console.error('Simulation detail error:', error);
        res.status(500).json({
          error: 'Simülasyon detayı alınırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  return router;
};

export default simulationRouter;
