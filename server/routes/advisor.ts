import { Router } from 'express';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { 
  analyzePortfolio, 
  validatePortfolioInput,
  PortfolioInput,
  RiskProfile 
} from '../src/modules/advisor/rules';

const advisorRouter = (router: Router) => {
  /**
   * POST /api/advisor/portfolio - Portföy analizi ve öneriler
   */
  router.post('/portfolio',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { portfolio, riskProfile, age, investmentHorizon } = req.body;

        // Giriş verilerini doğrula
        const validation = validatePortfolioInput({
          portfolio,
          riskProfile,
          age,
          investmentHorizon
        });

        if (!validation.valid) {
          return res.status(400).json({
            error: 'Geçersiz giriş verileri',
            details: validation.errors
          });
        }

        const input = validation.normalized!;

        // Portföy analizini çalıştır
        const result = analyzePortfolio(input);

        // Sonuçları formatla ve döndür
        const response = {
          riskScore: result.riskScore,
          riskLevel: result.recommendations.riskLevel,
          tips: result.tips.map(tip => ({
            ...tip,
            formattedDescription: `${tip.title}: ${tip.description}`
          })),
          currentAllocation: {
            ...(result.currentAllocation ?? {}),
            formatted: (this as any).formatAllocation?.(result.currentAllocation ?? {}) ?? 'N/A'
          },
          targetAllocation: {
            ...(result.targetAllocation ?? {}),
            formatted: (this as any).formatAllocation?.(result.targetAllocation ?? {}) ?? 'N/A'
          },
          recommendations: {
            ...result.recommendations,
            expectedReturnFormatted: `%${result.recommendations.expectedReturn}/yıl`,
            actionItemsCount: result.recommendations.actionItems.length
          },
          chartData: result.chartData,
          summary: {
            riskScoreText: (this as any).getRiskScoreText?.(result.riskScore ?? 0) ?? 'N/A',
            rebalanceNeeded: result.recommendations?.rebalance ?? false,
            topRecommendation: result.tips[0]?.title || 'Portföy dengeli görünüyor'
          },
          metadata: {
            analyzedAt: new Date().toISOString(),
            userId: req.user!.id,
            riskProfile: input.riskProfile
          }
        };

        res.json(response);

      } catch (error) {
        logger.error('Portfolio analysis error:', error);
        res.status(500).json({
          error: 'Portföy analizi yapılırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  /**
   * GET /api/advisor/risk-profiles - Risk profilleri bilgileri
   */
  router.get('/risk-profiles',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profiles = {
          low: {
            name: 'Düşük Risk',
            description: 'Koruma odaklı, istikrarlı getiri',
            characteristics: [
              'Ana hedef: Sermaye korunması',
              'Volatilite toleransı: Düşük',
              'Zaman ufku: Kısa-orta vadeli',
              'Beklenen getiri: %4-6/yıl'
            ],
            targetAllocation: {
              cash: 20,
              deposits: 40,
              forex: 15,
              stocks: 15,
              bonds: 10,
              crypto: 0,
              commodities: 0,
              realEstate: 0
            },
            suitableFor: [
              'Emeklilik yaklaşanlar',
              'Kısa vadeli hedefler',
              'Risk toleransı düşük yatırımcılar'
            ]
          },
          medium: {
            name: 'Orta Risk',
            description: 'Dengeli büyüme ve koruma',
            characteristics: [
              'Ana hedef: Dengeli büyüme',
              'Volatilite toleransı: Orta',
              'Zaman ufku: Orta-uzun vadeli',
              'Beklenen getiri: %6-9/yıl'
            ],
            targetAllocation: {
              cash: 15,
              deposits: 25,
              forex: 20,
              stocks: 25,
              bonds: 10,
              crypto: 3,
              commodities: 2,
              realEstate: 0
            },
            suitableFor: [
              'Orta yaş yatırımcılar',
              'Uzun vadeli birikim',
              'Risk-ödül dengesi arayanlar'
            ]
          },
          high: {
            name: 'Yüksek Risk',
            description: 'Büyüme odaklı, yüksek getiri potansiyeli',
            characteristics: [
              'Ana hedef: Maksimum büyüme',
              'Volatilite toleransı: Yüksek',
              'Zaman ufku: Uzun vadeli',
              'Beklenen getiri: %9-12/yıl'
            ],
            targetAllocation: {
              cash: 10,
              deposits: 15,
              forex: 20,
              stocks: 35,
              bonds: 5,
              crypto: 10,
              commodities: 3,
              realEstate: 2
            },
            suitableFor: [
              'Genç yatırımcılar',
              'Uzun vadeli emeklilik',
              'Yüksek getiri arayanlar'
            ]
          }
        };

        res.json({ profiles });

      } catch (error) {
        logger.error('Risk profiles error:', error);
        res.status(500).json({
          error: 'Risk profilleri alınırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  /**
   * GET /api/advisor/asset-classes - Varlık sınıfları bilgileri
   */
  router.get('/asset-classes',
    requirePermission(Permission.VIEW_ALL_REPORTS, Permission.VIEW_COMPANY_REPORTS, Permission.VIEW_PERSONAL_REPORTS),
    async (req: AuthenticatedRequest, res) => {
      try {
        const assetClasses = {
          cash: {
            name: 'Nakit',
            risk: 'Çok Düşük',
            expectedReturn: '%2-3/yıl',
            description: 'Anlık likidite, enflasyon riski',
            pros: ['Yüksek likidite', 'Sermaye korunması', 'Düşük volatilite'],
            cons: ['Düşük getiri', 'Enflasyon riski', 'Fırsat maliyeti']
          },
          deposits: {
            name: 'Mevduat',
            risk: 'Düşük',
            expectedReturn: '%4-6/yıl',
            description: 'Bankacılık ürünleri, garantili getiri',
            pros: ['Garantili getiri', 'Düşük risk', 'Kolay erişim'],
            cons: ['Sınırlı getiri', 'Enflasyon riski', 'Düşük likidite']
          },
          forex: {
            name: 'Döviz',
            risk: 'Orta',
            expectedReturn: '%5-8/yıl',
            description: 'Döviz kuru hareketlerinden getiri',
            pros: ['Çeşitlendirme', 'Enflasyon koruması', 'Global erişim'],
            cons: ['Kur riski', 'Volatilite', 'Politik risk']
          },
          stocks: {
            name: 'Hisse Senetleri',
            risk: 'Yüksek',
            expectedReturn: '%8-12/yıl',
            description: 'Şirket hisseleri, büyüme potansiyeli',
            pros: ['Yüksek getiri potansiyeli', 'Likidite', 'Şeffaflık'],
            cons: ['Yüksek volatilite', 'Piyasa riski', 'Düşük getiri riski']
          },
          bonds: {
            name: 'Tahvil',
            risk: 'Düşük-Orta',
            expectedReturn: '%4-7/yıl',
            description: 'Sabit getirili menkul kıymetler',
            pros: ['Sabit getiri', 'Düşük volatilite', 'Çeşitlendirme'],
            cons: ['Faiz riski', 'Düşük getiri', 'Kredi riski']
          },
          crypto: {
            name: 'Kripto Para',
            risk: 'Çok Yüksek',
            expectedReturn: '%10-20/yıl',
            description: 'Dijital varlıklar, yüksek volatilite',
            pros: ['Yüksek getiri potansiyeli', '24/7 işlem', 'Dezentralizasyon'],
            cons: ['Çok yüksek volatilite', 'Regülasyon riski', 'Teknoloji riski']
          },
          commodities: {
            name: 'Emtia',
            risk: 'Yüksek',
            expectedReturn: '%6-10/yıl',
            description: 'Altın, gümüş, petrol gibi emtialar',
            pros: ['Enflasyon koruması', 'Çeşitlendirme', 'Gerçek varlık'],
            cons: ['Yüksek volatilite', 'Depolama maliyeti', 'Spekülasyon riski']
          },
          realEstate: {
            name: 'Gayrimenkul',
            risk: 'Orta-Yüksek',
            expectedReturn: '%6-9/yıl',
            description: 'Gayrimenkul yatırımları',
            pros: ['Enflasyon koruması', 'Kira geliri', 'Gerçek varlık'],
            cons: ['Düşük likidite', 'Yüksek giriş maliyeti', 'Piyasa riski']
          }
        };

        res.json({ assetClasses });

      } catch (error) {
        logger.error('Asset classes error:', error);
        res.status(500).json({
          error: 'Varlık sınıfları alınırken hata oluştu',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }
  );

  return router;
};

// Yardımcı fonksiyonlar
function formatAllocation(allocation: any): Record<string, string> {
  const formatted: Record<string, string> = {};
  Object.entries(allocation).forEach(([key, value]) => {
    formatted[key] = `%${Number(value).toFixed(1)}`;
  });
  return formatted;
}

function getRiskScoreText(score: number): string {
  if (score >= 80) return 'Mükemmel - Portföy risk profiline çok uygun';
  if (score >= 60) return 'İyi - Portföy risk profiline uygun';
  if (score >= 40) return 'Orta - Portföy risk profiline kısmen uygun';
  return 'Düşük - Portföy risk profiline uygun değil';
}

export default advisorRouter;
