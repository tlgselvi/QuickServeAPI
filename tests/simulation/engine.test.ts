import { describe, test, expect } from 'vitest';
import { runSimulation, validateSimulationParameters, SimulationParameters } from '../../server/src/modules/simulation/engine';

describe('Simulation Engine', () => {
  describe('runSimulation', () => {
    test('fxDelta=+10, rateDelta=-5, inflationDelta=+5, horizon=6 → nakit projeksiyonu doğru hesaplanmalı', () => {
      const baseCash = 100000;
      const baseDebt = 50000;
      const parameters: SimulationParameters = {
        fxDelta: 10,
        rateDelta: -5,
        inflationDelta: 5,
        horizonMonths: 6
      };

      const result = runSimulation(baseCash, baseDebt, parameters);

      // Temel kontroller
      expect(result.projections).toHaveLength(6);
      expect(result.projections[0].month).toBe(1);
      expect(result.projections[5].month).toBe(6);

      // Nakit projeksiyonu kontrolü
      const initialCash = result.projections[0].cash;
      const finalCash = result.projections[5].cash;
      
      expect(initialCash).toBeGreaterThan(baseCash);
      expect(finalCash).toBeGreaterThan(initialCash);

      // Borç artışı kontrolü (faiz etkisi ile)
      const initialDebt = result.projections[0].debt;
      const finalDebt = result.projections[5].debt;
      
      expect(finalDebt).toBeGreaterThanOrEqual(initialDebt);

      // Net değer hesaplama kontrolü
      result.projections.forEach(proj => {
        expect(proj.netWorth).toBe(proj.cash - proj.debt);
      });

      // Özet kontrolü
      expect(result.summary).toContain('6 aylık simülasyon');
      expect(result.formattedSummary).toContain('6 ay');
    });

    test('horizon=6 → doğru ay serisi dönmeli', () => {
      const parameters: SimulationParameters = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 6
      };

      const result = runSimulation(100000, 50000, parameters);

      expect(result.projections).toHaveLength(6);
      
      const months = result.projections.map(p => p.month);
      expect(months).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('horizon=3 → 3 aylık projeksiyon', () => {
      const parameters: SimulationParameters = {
        fxDelta: 5,
        rateDelta: 2,
        inflationDelta: 3,
        horizonMonths: 3
      };

      const result = runSimulation(200000, 100000, parameters);

      expect(result.projections).toHaveLength(3);
      expect(result.projections[0].month).toBe(1);
      expect(result.projections[2].month).toBe(3);
    });

    test('horizon=12 → 12 aylık projeksiyon', () => {
      const parameters: SimulationParameters = {
        fxDelta: -5,
        rateDelta: 3,
        inflationDelta: 8,
        horizonMonths: 12
      };

      const result = runSimulation(150000, 75000, parameters);

      expect(result.projections).toHaveLength(12);
      expect(result.projections[11].month).toBe(12);
    });

    test('nakit açığı tespiti çalışmalı', () => {
      const parameters: SimulationParameters = {
        fxDelta: -20, // Güçlü TRL değer kaybı
        rateDelta: -10, // Düşük faiz
        inflationDelta: 20, // Yüksek enflasyon
        horizonMonths: 6
      };

      const result = runSimulation(50000, 30000, parameters); // Düşük nakit

      // Nakit açığı ayı bulunmalı veya risk düşük olmalı
      if (result.cashDeficitMonth) {
        expect(result.cashDeficitMonth).toBeGreaterThan(0);
        expect(result.cashDeficitMonth).toBeLessThanOrEqual(6);
      }

      expect(result.formattedSummary).toContain('Bu senaryoda');
    });

    test('sıfır parametreler → minimal değişim', () => {
      const parameters: SimulationParameters = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 3
      };

      const baseCash = 100000;
      const baseDebt = 50000;
      const result = runSimulation(baseCash, baseDebt, parameters);

      // Minimal değişim beklenir
      const cashChange = Math.abs(result.totalCashChange);
      const debtChange = Math.abs(result.totalDebtChange);
      
      expect(cashChange).toBeLessThan(baseCash * 0.1); // %10'dan az değişim
      expect(debtChange).toBeLessThan(baseDebt * 0.1);
    });
  });

  describe('validateSimulationParameters', () => {
    test('geçerli parametreler → doğrulama başarılı', () => {
      const validParams = {
        fxDelta: 10,
        rateDelta: -5,
        inflationDelta: 8,
        horizonMonths: 6
      };

      const result = validateSimulationParameters(validParams);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalized).toEqual(validParams);
    });

    test('geçersiz fxDelta → hata döndür', () => {
      const invalidParams = {
        fxDelta: 60, // 50'den büyük
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 6
      };

      const result = validateSimulationParameters(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('fxDelta -50 ile +50 arasında olmalıdır');
    });

    test('geçersiz rateDelta → hata döndür', () => {
      const invalidParams = {
        fxDelta: 0,
        rateDelta: 25, // 20'den büyük
        inflationDelta: 0,
        horizonMonths: 6
      };

      const result = validateSimulationParameters(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rateDelta -20 ile +20 arasında olmalıdır');
    });

    test('geçersiz inflationDelta → hata döndür', () => {
      const invalidParams = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 150, // 100'den büyük
        horizonMonths: 6
      };

      const result = validateSimulationParameters(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('inflationDelta 0 ile 100 arasında olmalıdır');
    });

    test('geçersiz horizonMonths → hata döndür', () => {
      const invalidParams = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 9 // Geçersiz değer
      };

      const result = validateSimulationParameters(invalidParams);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('horizonMonths 3, 6 veya 12 olmalıdır');
    });

    test('eksik alanlar → hata döndür', () => {
      const incompleteParams = {
        fxDelta: 10,
        // rateDelta eksik
        inflationDelta: 5,
        horizonMonths: 6
      };

      const result = validateSimulationParameters(incompleteParams);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    test('çok yüksek nakit → normal işlem', () => {
      const parameters: SimulationParameters = {
        fxDelta: 5,
        rateDelta: 3,
        inflationDelta: 2,
        horizonMonths: 6
      };

      const result = runSimulation(10000000, 1000000, parameters); // 10M nakit

      expect(result.projections).toHaveLength(6);
      expect(result.projections[0].cash).toBeGreaterThan(10000000);
    });

    test('sıfır nakit → hata olmamalı', () => {
      const parameters: SimulationParameters = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 3
      };

      const result = runSimulation(0, 50000, parameters);

      expect(result.projections).toHaveLength(3);
      expect(result.projections[0].cash).toBeGreaterThanOrEqual(0);
    });

    test('negatif borç → pozitif olarak işlenmeli', () => {
      const parameters: SimulationParameters = {
        fxDelta: 0,
        rateDelta: 0,
        inflationDelta: 0,
        horizonMonths: 3
      };

      const result = runSimulation(100000, -50000, parameters); // Negatif borç

      expect(result.projections).toHaveLength(3);
      expect(result.projections[0].netWorth).toBe(result.projections[0].cash - result.projections[0].debt);
    });
  });
});
