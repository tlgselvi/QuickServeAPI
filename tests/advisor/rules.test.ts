import { describe, test, expect } from 'vitest';
import { analyzePortfolio, validatePortfolioInput, PortfolioInput } from '../../server/src/modules/advisor/rules';

describe('Advisor Rules', () => {
  describe('analyzePortfolio', () => {
    test('riskProfile=low → nakit/mevduat ağırlıklı öneri', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 50000,
          deposits: 100000,
          forex: 25000,
          stocks: 50000,
          bonds: 25000,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'low'
      };

      const result = analyzePortfolio(input);

      // Risk skoru kontrolü
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);

      // Hedef dağılım kontrolü - düşük risk için nakit ve mevduat ağırlıklı olmalı
      expect(result.targetAllocation.cash).toBe(20);
      expect(result.targetAllocation.deposits).toBe(40);
      expect(result.targetAllocation.crypto).toBe(0);

      // Öneriler kontrolü
      expect(result.tips).toBeInstanceOf(Array);
      expect(result.recommendations.rebalance).toBeDefined();
      expect(result.recommendations.expectedReturn).toBeGreaterThan(0);

      // Grafik verisi kontrolü
      expect(result.chartData.current).toBeInstanceOf(Array);
      expect(result.chartData.target).toBeInstanceOf(Array);
    });

    test('riskProfile=high → hisse/kripto ağırlıklı öneri', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 20000,
          deposits: 30000,
          forex: 40000,
          stocks: 80000,
          bonds: 10000,
          crypto: 20000,
          commodities: 6000,
          realEstate: 4000
        },
        riskProfile: 'high'
      };

      const result = analyzePortfolio(input);

      // Hedef dağılım kontrolü - yüksek risk için hisse ve kripto ağırlıklı olmalı
      expect(result.targetAllocation.stocks).toBe(35);
      expect(result.targetAllocation.crypto).toBe(10);
      expect(result.targetAllocation.cash).toBe(10);
      expect(result.targetAllocation.deposits).toBe(15);

      // Beklenen getiri yüksek risk için daha yüksek olmalı
      expect(result.recommendations.expectedReturn).toBeGreaterThan(8);

      // Risk skoru kontrolü
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('riskProfile=medium → dengeli dağılım', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 30000,
          deposits: 50000,
          forex: 40000,
          stocks: 50000,
          bonds: 20000,
          crypto: 5000,
          commodities: 3000,
          realEstate: 0
        },
        riskProfile: 'medium'
      };

      const result = analyzePortfolio(input);

      // Hedef dağılım kontrolü - orta risk için dengeli dağılım
      expect(result.targetAllocation.cash).toBe(15);
      expect(result.targetAllocation.deposits).toBe(25);
      expect(result.targetAllocation.stocks).toBe(25);
      expect(result.targetAllocation.crypto).toBe(3);

      // Beklenen getiri orta risk için orta seviyede olmalı
      expect(result.recommendations.expectedReturn).toBeGreaterThan(5);
      expect(result.recommendations.expectedReturn).toBeLessThan(12);
    });

    test('portföy normalizasyonu çalışmalı', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 100000,
          deposits: 200000,
          forex: 50000,
          stocks: 150000,
          bonds: 100000,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'medium'
      };

      const result = analyzePortfolio(input);

      // Toplam dağılım %100 olmalı
      const currentTotal = Object.values(result.currentAllocation).reduce((sum, value) => sum + value, 0);
      const targetTotal = Object.values(result.targetAllocation).reduce((sum, value) => sum + value, 0);

      expect(currentTotal).toBeCloseTo(100, 1);
      expect(targetTotal).toBeCloseTo(100, 1);
    });

    test('risk skoru hesaplama doğru olmalı', () => {
      const lowRiskInput: PortfolioInput = {
        portfolio: {
          cash: 40000,
          deposits: 40000,
          forex: 10000,
          stocks: 5000,
          bonds: 5000,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'low'
      };

      const highRiskInput: PortfolioInput = {
        portfolio: {
          cash: 10000,
          deposits: 10000,
          forex: 20000,
          stocks: 30000,
          bonds: 5000,
          crypto: 20000,
          commodities: 5000,
          realEstate: 0
        },
        riskProfile: 'high'
      };

      const lowRiskResult = analyzePortfolio(lowRiskInput);
      const highRiskResult = analyzePortfolio(highRiskInput);

      // Düşük risk portföyü, düşük risk profili ile daha uyumlu olmalı
      expect(lowRiskResult.riskScore).toBeGreaterThanOrEqual(highRiskResult.riskScore - 20);
    });

    test('çeşitlendirme önerileri oluşturulmalı', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 0,
          deposits: 0,
          forex: 0,
          stocks: 100000,
          bonds: 0,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'medium'
      };

      const result = analyzePortfolio(input);

      // Çeşitlendirme önerisi olmalı
      const diversificationTip = result.tips.find(tip => tip.category === 'diversification');
      expect(diversificationTip).toBeDefined();
      expect(diversificationTip?.title).toContain('çeşitlendir');
    });

    test('konsantrasyon riski tespit edilmeli', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 0,
          deposits: 0,
          forex: 0,
          stocks: 0,
          bonds: 0,
          crypto: 0,
          commodities: 0,
          realEstate: 100000 // %100 gayrimenkul
        },
        riskProfile: 'medium'
      };

      const result = analyzePortfolio(input);

      // Konsantrasyon riski önerisi olmalı
      const concentrationTip = result.tips.find(tip => tip.id === 'concentration-risk');
      expect(concentrationTip).toBeDefined();
      expect(concentrationTip?.priority).toBe('high');
    });
  });

  describe('validatePortfolioInput', () => {
    test('geçerli giriş → doğrulama başarılı', () => {
      const validInput = {
        portfolio: {
          cash: 100000,
          deposits: 200000,
          forex: 50000,
          stocks: 150000,
          bonds: 100000,
          crypto: 25000,
          commodities: 15000,
          realEstate: 50000
        },
        riskProfile: 'medium'
      };

      const result = validatePortfolioInput(validInput);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalized).toEqual(validInput);
    });

    test('geçersiz risk profili → hata döndür', () => {
      const invalidInput = {
        portfolio: {
          cash: 100000,
          deposits: 200000,
          forex: 50000,
          stocks: 150000,
          bonds: 100000,
          crypto: 25000,
          commodities: 15000,
          realEstate: 50000
        },
        riskProfile: 'invalid'
      };

      const result = validatePortfolioInput(invalidInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('riskProfile "low", "medium" veya "high" olmalıdır');
    });

    test('eksik portföy alanları → hata döndür', () => {
      const incompleteInput = {
        portfolio: {
          cash: 100000,
          deposits: 200000,
          // forex eksik
          stocks: 150000,
          bonds: 100000,
          crypto: 25000,
          commodities: 15000,
          realEstate: 50000
        },
        riskProfile: 'medium'
      };

      const result = validatePortfolioInput(incompleteInput);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('negatif portföy değerleri → hata döndür', () => {
      const negativeInput = {
        portfolio: {
          cash: -10000, // Negatif
          deposits: 200000,
          forex: 50000,
          stocks: 150000,
          bonds: 100000,
          crypto: 25000,
          commodities: 15000,
          realEstate: 50000
        },
        riskProfile: 'medium'
      };

      const result = validatePortfolioInput(negativeInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cash alanı 0 veya pozitif sayı olmalıdır');
    });

    test('portföy verisi eksik → hata döndür', () => {
      const noPortfolioInput = {
        riskProfile: 'medium'
      };

      const result = validatePortfolioInput(noPortfolioInput);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Portfolio verisi gereklidir');
    });
  });

  describe('edge cases', () => {
    test('sıfır portföy → hata olmamalı', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 0,
          deposits: 0,
          forex: 0,
          stocks: 0,
          bonds: 0,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'low'
      };

      const result = analyzePortfolio(input);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.tips).toBeInstanceOf(Array);
      expect(result.recommendations).toBeDefined();
    });

    test('çok büyük portföy → normal işlem', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 10000000,
          deposits: 20000000,
          forex: 5000000,
          stocks: 15000000,
          bonds: 10000000,
          crypto: 2500000,
          commodities: 1500000,
          realEstate: 5000000
        },
        riskProfile: 'high'
      };

      const result = analyzePortfolio(input);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.recommendations.expectedReturn).toBeGreaterThan(0);
    });

    test('tek varlık sınıfı → çeşitlendirme önerisi', () => {
      const input: PortfolioInput = {
        portfolio: {
          cash: 1000000,
          deposits: 0,
          forex: 0,
          stocks: 0,
          bonds: 0,
          crypto: 0,
          commodities: 0,
          realEstate: 0
        },
        riskProfile: 'medium'
      };

      const result = analyzePortfolio(input);

      const diversificationTip = result.tips.find(tip => tip.category === 'diversification');
      expect(diversificationTip).toBeDefined();
      expect(diversificationTip?.priority).toBe('high');
    });
  });
});
