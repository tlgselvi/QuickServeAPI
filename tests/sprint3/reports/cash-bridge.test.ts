import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

// Mock cash bridge report functions - gerçek implementasyon yerine
const calculateEBITDA = (revenue: number, operatingExpenses: number) => {
  return revenue - operatingExpenses;
};

const calculateNetCash = (ebitda: number, depreciation: number, interest: number, taxes: number, workingCapitalChange: number, capex: number) => {
  return ebitda + depreciation - interest - taxes - workingCapitalChange - capex;
};

const generateCashBridgeReport = async (reportData: any) => {
  const ebitda = calculateEBITDA(reportData.revenue, reportData.operatingExpenses);
  const netCash = calculateNetCash(
    ebitda,
    reportData.depreciation,
    reportData.interest,
    reportData.taxes,
    reportData.workingCapitalChange,
    reportData.capex
  );

  const cashBridge = {
    ebitda: ebitda,
    depreciation: reportData.depreciation,
    interest: reportData.interest,
    taxes: reportData.taxes,
    workingCapitalChange: reportData.workingCapitalChange,
    capex: reportData.capex,
    netCash: netCash,
    summary: `EBITDA: ${ebitda.toFixed(2)} → Net Cash: ${netCash.toFixed(2)}`
  };

  // Save report to database
  const [savedReport] = await db.execute(`
    INSERT INTO cash_bridge_reports (report_date, ebitda, depreciation, interest, taxes, working_capital_change, capex, net_cash, summary, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    reportData.reportDate,
    ebitda,
    reportData.depreciation,
    reportData.interest,
    reportData.taxes,
    reportData.workingCapitalChange,
    reportData.capex,
    netCash,
    cashBridge.summary,
    new Date()
  ]);

  return {
    reportId: savedReport.rows[0].id,
    cashBridge,
    chartData: generateChartData(cashBridge)
  };
};

const generateChartData = (cashBridge: any) => {
  return {
    labels: ['EBITDA', 'Depreciation', 'Interest', 'Taxes', 'Working Capital', 'CAPEX', 'Net Cash'],
    values: [
      cashBridge.ebitda,
      cashBridge.depreciation,
      -cashBridge.interest, // Negative for chart
      -cashBridge.taxes, // Negative for chart
      -cashBridge.workingCapitalChange, // Negative for chart
      -cashBridge.capex, // Negative for chart
      cashBridge.netCash
    ],
    colors: ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981']
  };
};

const getCashBridgeHistory = async (limit: number = 10) => {
  const [result] = await db.execute(`
    SELECT * FROM cash_bridge_reports 
    ORDER BY report_date DESC 
    LIMIT $1
  `, [limit]);

  return result.rows;
};

const calculateCashBridgeMetrics = (reports: any[]) => {
  if (reports.length === 0) return null;

  const ebitdaValues = reports.map(r => r.ebitda);
  const netCashValues = reports.map(r => r.net_cash);

  return {
    averageEBITDA: ebitdaValues.reduce((sum, val) => sum + val, 0) / ebitdaValues.length,
    averageNetCash: netCashValues.reduce((sum, val) => sum + val, 0) / netCashValues.length,
    ebitdaGrowth: ebitdaValues.length > 1 ? 
      ((ebitdaValues[0] - ebitdaValues[ebitdaValues.length - 1]) / ebitdaValues[ebitdaValues.length - 1]) * 100 : 0,
    netCashGrowth: netCashValues.length > 1 ? 
      ((netCashValues[0] - netCashValues[netCashValues.length - 1]) / netCashValues[netCashValues.length - 1]) * 100 : 0,
    totalReports: reports.length
  };
};

describe('Cash Bridge Report Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Test verilerini temizle
    await db.execute(`
      DELETE FROM cash_bridge_reports WHERE summary LIKE 'Test %'
    `);
  });

  describe('Cash Bridge Calculation', () => {
    test('EBITDA → Net Nakit köprüsü grafikte çıkmalı', async () => {
      const reportData = {
        reportDate: new Date('2024-01-31'),
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(300000); // 1000000 - 700000
      expect(result.cashBridge.netCash).toBe(180000); // 300000 + 50000 - 30000 - 40000 - 20000 - 80000
      expect(result.cashBridge.summary).toContain('EBITDA: 300000.00');
      expect(result.cashBridge.summary).toContain('Net Cash: 180000.00');
    });

    test('Farklı veri setleri ile hesaplama', async () => {
      const testCases = [
        {
          revenue: 500000,
          operatingExpenses: 350000,
          depreciation: 25000,
          interest: 15000,
          taxes: 20000,
          workingCapitalChange: 10000,
          capex: 40000,
          expectedEBITDA: 150000,
          expectedNetCash: 90000
        },
        {
          revenue: 2000000,
          operatingExpenses: 1200000,
          depreciation: 100000,
          interest: 60000,
          taxes: 80000,
          workingCapitalChange: 40000,
          capex: 160000,
          expectedEBITDA: 800000,
          expectedNetCash: 500000
        },
        {
          revenue: 750000,
          operatingExpenses: 600000,
          depreciation: 30000,
          interest: 20000,
          taxes: 25000,
          workingCapitalChange: 15000,
          capex: 60000,
          expectedEBITDA: 150000,
          expectedNetCash: 60000
        }
      ];

      for (const testCase of testCases) {
        const reportData = {
          reportDate: new Date(),
          ...testCase
        };

        const result = await generateCashBridgeReport(reportData);
        
        expect(result.cashBridge.ebitda).toBe(testCase.expectedEBITDA);
        expect(result.cashBridge.netCash).toBe(testCase.expectedNetCash);
      }
    });

    test('Negatif EBITDA durumu', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 500000,
        operatingExpenses: 600000, // Higher than revenue
        depreciation: 25000,
        interest: 15000,
        taxes: 20000,
        workingCapitalChange: 10000,
        capex: 40000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(-100000); // 500000 - 600000
      expect(result.cashBridge.netCash).toBe(-160000); // -100000 + 25000 - 15000 - 20000 - 10000 - 40000
    });

    test('Sıfır değerler ile hesaplama', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 0,
        operatingExpenses: 0,
        depreciation: 0,
        interest: 0,
        taxes: 0,
        workingCapitalChange: 0,
        capex: 0
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(0);
      expect(result.cashBridge.netCash).toBe(0);
    });
  });

  describe('Cash Bridge Chart Data', () => {
    test('Grafik verisi doğru format olmalı', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.chartData).toBeDefined();
      expect(result.chartData.labels).toHaveLength(7);
      expect(result.chartData.values).toHaveLength(7);
      expect(result.chartData.colors).toHaveLength(7);
      
      expect(result.chartData.labels).toEqual([
        'EBITDA', 'Depreciation', 'Interest', 'Taxes', 'Working Capital', 'CAPEX', 'Net Cash'
      ]);
    });

    test('Grafik değerleri doğru hesaplanmalı', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.chartData.values[0]).toBe(300000); // EBITDA
      expect(result.chartData.values[1]).toBe(50000); // Depreciation
      expect(result.chartData.values[2]).toBe(-30000); // Interest (negative)
      expect(result.chartData.values[3]).toBe(-40000); // Taxes (negative)
      expect(result.chartData.values[4]).toBe(-20000); // Working Capital (negative)
      expect(result.chartData.values[5]).toBe(-80000); // CAPEX (negative)
      expect(result.chartData.values[6]).toBe(180000); // Net Cash
    });

    test('Grafik renkleri doğru olmalı', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.chartData.colors[0]).toBe('#22c55e'); // EBITDA - Green
      expect(result.chartData.colors[1]).toBe('#3b82f6'); // Depreciation - Blue
      expect(result.chartData.colors[2]).toBe('#ef4444'); // Interest - Red
      expect(result.chartData.colors[3]).toBe('#f59e0b'); // Taxes - Orange
      expect(result.chartData.colors[4]).toBe('#8b5cf6'); // Working Capital - Purple
      expect(result.chartData.colors[5]).toBe('#06b6d4'); // CAPEX - Cyan
      expect(result.chartData.colors[6]).toBe('#10b981'); // Net Cash - Green
    });
  });

  describe('Cash Bridge Database Operations', () => {
    test('Rapor veritabanına kaydedilmeli', async () => {
      const reportData = {
        reportDate: new Date('2024-02-29'),
        revenue: 1200000,
        operatingExpenses: 800000,
        depreciation: 60000,
        interest: 40000,
        taxes: 50000,
        workingCapitalChange: 25000,
        capex: 100000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.reportId).toBeDefined();
      
      const [savedReport] = await db.execute(`
        SELECT * FROM cash_bridge_reports WHERE id = $1
      `, [result.reportId]);
      
      expect(savedReport.rows[0].ebitda).toBe(400000);
      expect(savedReport.rows[0].net_cash).toBe(245000);
      expect(savedReport.rows[0].summary).toContain('EBITDA: 400000.00');
    });

    test('Rapor geçmişi sorgulanabilmeli', async () => {
      // Test raporları oluştur
      const testReports = [
        {
          reportDate: new Date('2024-01-31'),
          revenue: 1000000,
          operatingExpenses: 700000,
          depreciation: 50000,
          interest: 30000,
          taxes: 40000,
          workingCapitalChange: 20000,
          capex: 80000
        },
        {
          reportDate: new Date('2024-02-29'),
          revenue: 1100000,
          operatingExpenses: 750000,
          depreciation: 55000,
          interest: 35000,
          taxes: 45000,
          workingCapitalChange: 25000,
          capex: 90000
        }
      ];

      for (const reportData of testReports) {
        await generateCashBridgeReport(reportData);
      }

      const history = await getCashBridgeHistory(5);
      
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('Rapor güncellenebilmeli', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 800000,
        operatingExpenses: 500000,
        depreciation: 40000,
        interest: 25000,
        taxes: 30000,
        workingCapitalChange: 15000,
        capex: 60000
      };

      const result = await generateCashBridgeReport(reportData);
      
      // Raporu güncelle
      await db.execute(`
        UPDATE cash_bridge_reports 
        SET summary = $1, updated_at = $2
        WHERE id = $3
      `, ['Updated test report', new Date(), result.reportId]);

      const [updatedReport] = await db.execute(`
        SELECT * FROM cash_bridge_reports WHERE id = $1
      `, [result.reportId]);

      expect(updatedReport.rows[0].summary).toBe('Updated test report');
    });
  });

  describe('Cash Bridge Metrics', () => {
    test('Metrik hesaplamaları doğru olmalı', async () => {
      // Test raporları oluştur
      const testReports = [
        {
          reportDate: new Date('2024-01-31'),
          revenue: 1000000,
          operatingExpenses: 700000,
          depreciation: 50000,
          interest: 30000,
          taxes: 40000,
          workingCapitalChange: 20000,
          capex: 80000
        },
        {
          reportDate: new Date('2024-02-29'),
          revenue: 1100000,
          operatingExpenses: 750000,
          depreciation: 55000,
          interest: 35000,
          taxes: 45000,
          workingCapitalChange: 25000,
          capex: 90000
        },
        {
          reportDate: new Date('2024-03-31'),
          revenue: 1200000,
          operatingExpenses: 800000,
          depreciation: 60000,
          interest: 40000,
          taxes: 50000,
          workingCapitalChange: 30000,
          capex: 100000
        }
      ];

      for (const reportData of testReports) {
        await generateCashBridgeReport(reportData);
      }

      const history = await getCashBridgeHistory(10);
      const metrics = calculateCashBridgeMetrics(history);
      
      expect(metrics).toBeDefined();
      expect(metrics.totalReports).toBeGreaterThanOrEqual(3);
      expect(metrics.averageEBITDA).toBeGreaterThan(0);
      expect(metrics.averageNetCash).toBeGreaterThan(0);
    });

    test('Tek rapor ile metrik hesaplama', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      await generateCashBridgeReport(reportData);
      const history = await getCashBridgeHistory(1);
      const metrics = calculateCashBridgeMetrics(history);
      
      expect(metrics).toBeDefined();
      expect(metrics.totalReports).toBe(1);
      expect(metrics.averageEBITDA).toBe(300000);
      expect(metrics.averageNetCash).toBe(180000);
      expect(metrics.ebitdaGrowth).toBe(0);
      expect(metrics.netCashGrowth).toBe(0);
    });

    test('Boş rapor listesi ile metrik hesaplama', async () => {
      const metrics = calculateCashBridgeMetrics([]);
      
      expect(metrics).toBeNull();
    });
  });

  describe('Cash Bridge Edge Cases', () => {
    test('Çok büyük değerler ile hesaplama', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000000, // 1 billion
        operatingExpenses: 700000000,
        depreciation: 50000000,
        interest: 30000000,
        taxes: 40000000,
        workingCapitalChange: 20000000,
        capex: 80000000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(300000000);
      expect(result.cashBridge.netCash).toBe(180000000);
    });

    test('Negatif değerler ile hesaplama', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 500000,
        operatingExpenses: 600000, // Higher than revenue
        depreciation: -10000, // Negative depreciation
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: -5000, // Negative working capital change
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(-100000);
      expect(result.cashBridge.netCash).toBe(-155000); // -100000 + (-10000) - 30000 - 40000 - (-5000) - 80000
    });

    test('Ondalık değerler ile hesaplama', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000.50,
        operatingExpenses: 700000.25,
        depreciation: 50000.75,
        interest: 30000.10,
        taxes: 40000.90,
        workingCapitalChange: 20000.30,
        capex: 80000.60
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBeCloseTo(300000.25, 2);
      expect(result.cashBridge.netCash).toBeCloseTo(180000.00, 2);
    });
  });

  describe('Cash Bridge Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 100 rapor oluştur
      const promises = Array.from({ length: 100 }, (_, i) => 
        generateCashBridgeReport({
          reportDate: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          revenue: 1000000 + i * 10000,
          operatingExpenses: 700000 + i * 7000,
          depreciation: 50000 + i * 500,
          interest: 30000 + i * 300,
          taxes: 40000 + i * 400,
          workingCapitalChange: 20000 + i * 200,
          capex: 80000 + i * 800
        })
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 100 rapor 10 saniyeden az sürmeli
      expect(duration).toBeLessThan(10000);
    });

    test('Rapor sorgulama performansı', async () => {
      const startTime = Date.now();

      const history = await getCashBridgeHistory(100);
      const metrics = calculateCashBridgeMetrics(history);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(history).toBeDefined();
      expect(metrics).toBeDefined();
    });
  });

  describe('Cash Bridge Data Validation', () => {
    test('Geçersiz rapor tarihi ile hata', async () => {
      const reportData = {
        reportDate: 'invalid-date',
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      await expect(generateCashBridgeReport(reportData)).rejects.toThrow();
    });

    test('Eksik veri ile hata', async () => {
      const reportData = {
        reportDate: new Date(),
        revenue: 1000000,
        // operatingExpenses eksik
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      await expect(generateCashBridgeReport(reportData)).rejects.toThrow();
    });

    test('Negatif rapor tarihi ile çalışma', async () => {
      const reportData = {
        reportDate: new Date('1900-01-01'), // Very old date
        revenue: 1000000,
        operatingExpenses: 700000,
        depreciation: 50000,
        interest: 30000,
        taxes: 40000,
        workingCapitalChange: 20000,
        capex: 80000
      };

      const result = await generateCashBridgeReport(reportData);
      
      expect(result.cashBridge.ebitda).toBe(300000);
      expect(result.cashBridge.netCash).toBe(180000);
    });
  });
});
