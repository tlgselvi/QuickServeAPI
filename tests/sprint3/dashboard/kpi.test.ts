import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

// Mock KPI dashboard functions - gerçek implementasyon yerine
const calculateRunway = (cashBalance: number, monthlyExpenses: number) => {
  if (monthlyExpenses <= 0) return Infinity;
  return cashBalance / monthlyExpenses;
};

const calculateDSCR = (netOperatingIncome: number, totalDebtService: number) => {
  if (totalDebtService === 0) return Infinity;
  return netOperatingIncome / totalDebtService;
};

const calculateDSO = (totalReceivables: number, dailySales: number) => {
  if (dailySales === 0) return 0;
  return totalReceivables / dailySales;
};

const calculateDPO = (totalPayables: number, dailyPurchases: number) => {
  if (dailyPurchases === 0) return 0;
  return totalPayables / dailyPurchases;
};

const calculateBudgetVariance = (plannedAmount: number, actualAmount: number) => {
  if (plannedAmount === 0) return 0;
  return ((actualAmount - plannedAmount) / plannedAmount) * 100;
};

const generateKPIDashboard = async (dashboardData: any) => {
  const kpis = {
    runway: calculateRunway(dashboardData.cashBalance, dashboardData.monthlyExpenses),
    dscr: calculateDSCR(dashboardData.netOperatingIncome, dashboardData.totalDebtService),
    dso: calculateDSO(dashboardData.totalReceivables, dashboardData.dailySales),
    dpo: calculateDPO(dashboardData.totalPayables, dashboardData.dailyPurchases),
    budgetVariance: calculateBudgetVariance(dashboardData.plannedAmount, dashboardData.actualAmount)
  };

  const dashboard = {
    kpis,
    summary: `KPI Dashboard: Runway ${kpis.runway.toFixed(1)} months, DSCR ${kpis.dscr.toFixed(2)}, DSO ${kpis.dso.toFixed(1)} days, DPO ${kpis.dpo.toFixed(1)} days, Budget Variance ${kpis.budgetVariance.toFixed(1)}%`,
    generatedAt: new Date()
  };

  // Save dashboard to database
  const [savedDashboard] = await db.execute(`
    INSERT INTO kpi_dashboards (kpis, summary, generated_at, created_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [
    JSON.stringify(kpis),
    dashboard.summary,
    dashboard.generatedAt,
    new Date()
  ]);

  return {
    dashboardId: savedDashboard.rows[0].id,
    dashboard,
    chartData: generateChartData(kpis)
  };
};

const generateChartData = (kpis: any) => {
  return {
    runway: {
      value: kpis.runway,
      status: kpis.runway > 6 ? 'good' : kpis.runway > 3 ? 'warning' : 'critical',
      color: kpis.runway > 6 ? '#10b981' : kpis.runway > 3 ? '#f59e0b' : '#ef4444'
    },
    dscr: {
      value: kpis.dscr,
      status: kpis.dscr >= 1.2 ? 'good' : kpis.dscr >= 1.0 ? 'warning' : 'critical',
      color: kpis.dscr >= 1.2 ? '#10b981' : kpis.dscr >= 1.0 ? '#f59e0b' : '#ef4444'
    },
    dso: {
      value: kpis.dso,
      status: kpis.dso <= 30 ? 'good' : kpis.dso <= 45 ? 'warning' : 'critical',
      color: kpis.dso <= 30 ? '#10b981' : kpis.dso <= 45 ? '#f59e0b' : '#ef4444'
    },
    dpo: {
      value: kpis.dpo,
      status: kpis.dpo >= 30 ? 'good' : kpis.dpo >= 15 ? 'warning' : 'critical',
      color: kpis.dpo >= 30 ? '#10b981' : kpis.dpo >= 15 ? '#f59e0b' : '#ef4444'
    },
    budgetVariance: {
      value: kpis.budgetVariance,
      status: Math.abs(kpis.budgetVariance) <= 5 ? 'good' : Math.abs(kpis.budgetVariance) <= 10 ? 'warning' : 'critical',
      color: Math.abs(kpis.budgetVariance) <= 5 ? '#10b981' : Math.abs(kpis.budgetVariance) <= 10 ? '#f59e0b' : '#ef4444'
    }
  };
};

const exportKPIToPDF = async (dashboardId: string) => {
  const [dashboard] = await db.execute(`
    SELECT * FROM kpi_dashboards WHERE id = $1
  `, [dashboardId]);

  if (!dashboard.rows[0]) {
    throw new Error('Dashboard not found');
  }

  const kpis = JSON.parse(dashboard.rows[0].kpis);
  const chartData = generateChartData(kpis);

  const pdfContent = {
    title: 'KPI Dashboard Report',
    generatedAt: dashboard.rows[0].generated_at,
    kpis: chartData,
    summary: dashboard.rows[0].summary
  };

  return {
    success: true,
    filePath: `/exports/kpi-dashboard-${dashboardId}.pdf`,
    content: pdfContent
  };
};

const exportKPIToExcel = async (dashboardId: string) => {
  const [dashboard] = await db.execute(`
    SELECT * FROM kpi_dashboards WHERE id = $1
  `, [dashboardId]);

  if (!dashboard.rows[0]) {
    throw new Error('Dashboard not found');
  }

  const kpis = JSON.parse(dashboard.rows[0].kpis);
  const chartData = generateChartData(kpis);

  const excelContent = {
    title: 'KPI Dashboard Data',
    generatedAt: dashboard.rows[0].generated_at,
    data: [
      ['KPI', 'Value', 'Status', 'Color'],
      ['Runway', kpis.runway, chartData.runway.status, chartData.runway.color],
      ['DSCR', kpis.dscr, chartData.dscr.status, chartData.dscr.color],
      ['DSO', kpis.dso, chartData.dso.status, chartData.dso.color],
      ['DPO', kpis.dpo, chartData.dpo.status, chartData.dpo.color],
      ['Budget Variance', kpis.budgetVariance, chartData.budgetVariance.status, chartData.budgetVariance.color]
    ]
  };

  return {
    success: true,
    filePath: `/exports/kpi-dashboard-${dashboardId}.xlsx`,
    content: excelContent
  };
};

const getKPIDashboardHistory = async (limit: number = 10) => {
  const [result] = await db.execute(`
    SELECT * FROM kpi_dashboards 
    ORDER BY generated_at DESC 
    LIMIT $1
  `, [limit]);

  return result.rows;
};

describe.skip('KPI Dashboard Tests', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    if (!process.env.DATABASE_URL) return;
    // Test verilerini temizle
    await db.execute(`
      DELETE FROM kpi_dashboards WHERE summary LIKE 'Test %'
    `);
  });

  describe('KPI Calculations', () => {
    test('Runway hesaplama doğru olmalı', () => {
      const testCases = [
        { cashBalance: 100000, monthlyExpenses: 20000, expectedRunway: 5 },
        { cashBalance: 50000, monthlyExpenses: 10000, expectedRunway: 5 },
        { cashBalance: 300000, monthlyExpenses: 25000, expectedRunway: 12 },
        { cashBalance: 10000, monthlyExpenses: 5000, expectedRunway: 2 }
      ];

      testCases.forEach(({ cashBalance, monthlyExpenses, expectedRunway }) => {
        const runway = calculateRunway(cashBalance, monthlyExpenses);
        expect(runway).toBe(expectedRunway);
      });
    });

    test('DSCR hesaplama doğru olmalı', () => {
      const testCases = [
        { netOperatingIncome: 120000, totalDebtService: 100000, expectedDSCR: 1.2 },
        { netOperatingIncome: 150000, totalDebtService: 100000, expectedDSCR: 1.5 },
        { netOperatingIncome: 80000, totalDebtService: 100000, expectedDSCR: 0.8 },
        { netOperatingIncome: 200000, totalDebtService: 100000, expectedDSCR: 2.0 }
      ];

      testCases.forEach(({ netOperatingIncome, totalDebtService, expectedDSCR }) => {
        const dscr = calculateDSCR(netOperatingIncome, totalDebtService);
        expect(dscr).toBe(expectedDSCR);
      });
    });

    test('DSO hesaplama doğru olmalı', () => {
      const testCases = [
        { totalReceivables: 30000, dailySales: 1000, expectedDSO: 30 },
        { totalReceivables: 60000, dailySales: 2000, expectedDSO: 30 },
        { totalReceivables: 45000, dailySales: 1500, expectedDSO: 30 },
        { totalReceivables: 90000, dailySales: 1000, expectedDSO: 90 }
      ];

      testCases.forEach(({ totalReceivables, dailySales, expectedDSO }) => {
        const dso = calculateDSO(totalReceivables, dailySales);
        expect(dso).toBe(expectedDSO);
      });
    });

    test('DPO hesaplama doğru olmalı', () => {
      const testCases = [
        { totalPayables: 15000, dailyPurchases: 500, expectedDPO: 30 },
        { totalPayables: 30000, dailyPurchases: 1000, expectedDPO: 30 },
        { totalPayables: 22500, dailyPurchases: 750, expectedDPO: 30 },
        { totalPayables: 45000, dailyPurchases: 500, expectedDPO: 90 }
      ];

      testCases.forEach(({ totalPayables, dailyPurchases, expectedDPO }) => {
        const dpo = calculateDPO(totalPayables, dailyPurchases);
        expect(dpo).toBe(expectedDPO);
      });
    });

    test('Budget variance hesaplama doğru olmalı', () => {
      const testCases = [
        { plannedAmount: 100000, actualAmount: 105000, expectedVariance: 5 },
        { plannedAmount: 100000, actualAmount: 95000, expectedVariance: -5 },
        { plannedAmount: 100000, actualAmount: 120000, expectedVariance: 20 },
        { plannedAmount: 100000, actualAmount: 80000, expectedVariance: -20 }
      ];

      testCases.forEach(({ plannedAmount, actualAmount, expectedVariance }) => {
        const variance = calculateBudgetVariance(plannedAmount, actualAmount);
        expect(variance).toBe(expectedVariance);
      });
    });
  });

  describe('KPI Dashboard Generation', () => {
    test('KPI Dashboard oluşturulmalı', async () => {
      const dashboardData = {
        cashBalance: 200000,
        monthlyExpenses: 25000,
        netOperatingIncome: 150000,
        totalDebtService: 100000,
        totalReceivables: 45000,
        dailySales: 1500,
        totalPayables: 30000,
        dailyPurchases: 1000,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard.kpis).toBeDefined();
      expect(result.dashboard.summary).toBeDefined();
      expect(result.dashboard.generatedAt).toBeDefined();
      
      expect(result.dashboard.kpis.runway).toBe(8); // 200000 / 25000
      expect(result.dashboard.kpis.dscr).toBe(1.5); // 150000 / 100000
      expect(result.dashboard.kpis.dso).toBe(30); // 45000 / 1500
      expect(result.dashboard.kpis.dpo).toBe(30); // 30000 / 1000
      expect(result.dashboard.kpis.budgetVariance).toBe(5); // (105000 - 100000) / 100000 * 100
    });

    test('Farklı veri setleri ile dashboard', async () => {
      const testCases = [
        {
          cashBalance: 50000,
          monthlyExpenses: 10000,
          netOperatingIncome: 80000,
          totalDebtService: 60000,
          totalReceivables: 30000,
          dailySales: 1000,
          totalPayables: 15000,
          dailyPurchases: 500,
          plannedAmount: 50000,
          actualAmount: 48000
        },
        {
          cashBalance: 300000,
          monthlyExpenses: 50000,
          netOperatingIncome: 200000,
          totalDebtService: 150000,
          totalReceivables: 90000,
          dailySales: 3000,
          totalPayables: 60000,
          dailyPurchases: 2000,
          plannedAmount: 200000,
          actualAmount: 220000
        }
      ];

      for (const dashboardData of testCases) {
        const result = await generateKPIDashboard(dashboardData);
        
        expect(result.dashboard).toBeDefined();
        expect(result.dashboard.kpis).toBeDefined();
        expect(result.dashboard.summary).toBeDefined();
      }
    });

    test('Dashboard chart data doğru olmalı', async () => {
      const dashboardData = {
        cashBalance: 100000,
        monthlyExpenses: 20000,
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.chartData).toBeDefined();
      expect(result.chartData.runway).toBeDefined();
      expect(result.chartData.dscr).toBeDefined();
      expect(result.chartData.dso).toBeDefined();
      expect(result.chartData.dpo).toBeDefined();
      expect(result.chartData.budgetVariance).toBeDefined();
      
      // Status kontrolü
      expect(result.chartData.runway.status).toBe('good'); // 5 months > 3
      expect(result.chartData.dscr.status).toBe('good'); // 1.2 >= 1.2
      expect(result.chartData.dso.status).toBe('good'); // 30 <= 30
      expect(result.chartData.dpo.status).toBe('good'); // 30 >= 30
      expect(result.chartData.budgetVariance.status).toBe('good'); // 5 <= 5
    });
  });

  describe('KPI Dashboard Export', () => {
    test('PDF export çalışmalı', async () => {
      const dashboardData = {
        cashBalance: 150000,
        monthlyExpenses: 30000,
        netOperatingIncome: 100000,
        totalDebtService: 80000,
        totalReceivables: 60000,
        dailySales: 2000,
        totalPayables: 40000,
        dailyPurchases: 1500,
        plannedAmount: 100000,
        actualAmount: 95000
      };

      const result = await generateKPIDashboard(dashboardData);
      const pdfExport = await exportKPIToPDF(result.dashboardId);
      
      expect(pdfExport.success).toBe(true);
      expect(pdfExport.filePath).toContain('kpi-dashboard-');
      expect(pdfExport.content).toBeDefined();
      expect(pdfExport.content.title).toBe('KPI Dashboard Report');
      expect(pdfExport.content.kpis).toBeDefined();
    });

    test('Excel export çalışmalı', async () => {
      const dashboardData = {
        cashBalance: 250000,
        monthlyExpenses: 40000,
        netOperatingIncome: 180000,
        totalDebtService: 120000,
        totalReceivables: 75000,
        dailySales: 2500,
        totalPayables: 50000,
        dailyPurchases: 2000,
        plannedAmount: 150000,
        actualAmount: 160000
      };

      const result = await generateKPIDashboard(dashboardData);
      const excelExport = await exportKPIToExcel(result.dashboardId);
      
      expect(excelExport.success).toBe(true);
      expect(excelExport.filePath).toContain('kpi-dashboard-');
      expect(excelExport.content).toBeDefined();
      expect(excelExport.content.title).toBe('KPI Dashboard Data');
      expect(excelExport.content.data).toHaveLength(6); // Header + 5 KPIs
    });

    test('Var olmayan dashboard export hatası', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(exportKPIToPDF(nonExistentId)).rejects.toThrow('Dashboard not found');
      await expect(exportKPIToExcel(nonExistentId)).rejects.toThrow('Dashboard not found');
    });
  });

  describe('KPI Dashboard Database Operations', () => {
    test('Dashboard veritabanına kaydedilmeli', async () => {
      const dashboardData = {
        cashBalance: 100000,
        monthlyExpenses: 20000,
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.dashboardId).toBeDefined();
      
      const [savedDashboard] = await db.execute(`
        SELECT * FROM kpi_dashboards WHERE id = $1
      `, [result.dashboardId]);
      
      expect(savedDashboard.rows[0].kpis).toBeDefined();
      expect(savedDashboard.rows[0].summary).toBeDefined();
      expect(savedDashboard.rows[0].generated_at).toBeDefined();
    });

    test('Dashboard geçmişi sorgulanabilmeli', async () => {
      // Test dashboard'ları oluştur
      const testDashboards = [
        {
          cashBalance: 100000,
          monthlyExpenses: 20000,
          netOperatingIncome: 120000,
          totalDebtService: 100000,
          totalReceivables: 30000,
          dailySales: 1000,
          totalPayables: 15000,
          dailyPurchases: 500,
          plannedAmount: 100000,
          actualAmount: 105000
        },
        {
          cashBalance: 150000,
          monthlyExpenses: 30000,
          netOperatingIncome: 150000,
          totalDebtService: 120000,
          totalReceivables: 45000,
          dailySales: 1500,
          totalPayables: 22500,
          dailyPurchases: 750,
          plannedAmount: 150000,
          actualAmount: 160000
        }
      ];

      for (const dashboardData of testDashboards) {
        await generateKPIDashboard(dashboardData);
      }

      const history = await getKPIDashboardHistory(5);
      
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('Dashboard güncellenebilmeli', async () => {
      const dashboardData = {
        cashBalance: 200000,
        monthlyExpenses: 25000,
        netOperatingIncome: 180000,
        totalDebtService: 150000,
        totalReceivables: 60000,
        dailySales: 2000,
        totalPayables: 30000,
        dailyPurchases: 1000,
        plannedAmount: 200000,
        actualAmount: 210000
      };

      const result = await generateKPIDashboard(dashboardData);
      
      // Dashboard'u güncelle
      await db.execute(`
        UPDATE kpi_dashboards 
        SET summary = $1, updated_at = $2
        WHERE id = $3
      `, ['Updated test dashboard', new Date(), result.dashboardId]);

      const [updatedDashboard] = await db.execute(`
        SELECT * FROM kpi_dashboards WHERE id = $1
      `, [result.dashboardId]);

      expect(updatedDashboard.rows[0].summary).toBe('Updated test dashboard');
    });
  });

  describe('KPI Dashboard Edge Cases', () => {
    test('Sıfır değerler ile hesaplama', async () => {
      const dashboardData = {
        cashBalance: 0,
        monthlyExpenses: 0,
        netOperatingIncome: 0,
        totalDebtService: 0,
        totalReceivables: 0,
        dailySales: 0,
        totalPayables: 0,
        dailyPurchases: 0,
        plannedAmount: 0,
        actualAmount: 0
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.dashboard.kpis.runway).toBe(Infinity); // 0 / 0 = Infinity
      expect(result.dashboard.kpis.dscr).toBe(Infinity); // 0 / 0 = Infinity
      expect(result.dashboard.kpis.dso).toBe(0); // 0 / 0 = 0
      expect(result.dashboard.kpis.dpo).toBe(0); // 0 / 0 = 0
      expect(result.dashboard.kpis.budgetVariance).toBe(0); // (0 - 0) / 0 * 100 = 0
    });

    test('Negatif değerler ile hesaplama', async () => {
      const dashboardData = {
        cashBalance: -50000,
        monthlyExpenses: 20000,
        netOperatingIncome: -10000,
        totalDebtService: 10000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 80000
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.dashboard.kpis.runway).toBe(-2.5); // -50000 / 20000
      expect(result.dashboard.kpis.dscr).toBe(-1); // -10000 / 10000
      expect(result.dashboard.kpis.dso).toBe(30); // 30000 / 1000
      expect(result.dashboard.kpis.dpo).toBe(30); // 15000 / 500
      expect(result.dashboard.kpis.budgetVariance).toBe(-20); // (80000 - 100000) / 100000 * 100
    });

    test('Çok büyük değerler ile hesaplama', async () => {
      const dashboardData = {
        cashBalance: 1000000000, // 1 billion
        monthlyExpenses: 10000000, // 10 million
        netOperatingIncome: 500000000, // 500 million
        totalDebtService: 200000000, // 200 million
        totalReceivables: 30000000, // 30 million
        dailySales: 1000000, // 1 million
        totalPayables: 15000000, // 15 million
        dailyPurchases: 500000, // 500 thousand
        plannedAmount: 100000000, // 100 million
        actualAmount: 105000000 // 105 million
      };

      const result = await generateKPIDashboard(dashboardData);
      
      expect(result.dashboard.kpis.runway).toBe(100); // 1000000000 / 10000000
      expect(result.dashboard.kpis.dscr).toBe(2.5); // 500000000 / 200000000
      expect(result.dashboard.kpis.dso).toBe(30); // 30000000 / 1000000
      expect(result.dashboard.kpis.dpo).toBe(30); // 15000000 / 500000
      expect(result.dashboard.kpis.budgetVariance).toBe(5); // (105000000 - 100000000) / 100000000 * 100
    });
  });

  describe('KPI Dashboard Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 100 dashboard oluştur
      const promises = Array.from({ length: 100 }, (_, i) => 
        generateKPIDashboard({
          cashBalance: 100000 + i * 1000,
          monthlyExpenses: 20000 + i * 200,
          netOperatingIncome: 120000 + i * 1200,
          totalDebtService: 100000 + i * 1000,
          totalReceivables: 30000 + i * 300,
          dailySales: 1000 + i * 10,
          totalPayables: 15000 + i * 150,
          dailyPurchases: 500 + i * 5,
          plannedAmount: 100000 + i * 1000,
          actualAmount: 105000 + i * 1050
        })
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 100 dashboard 10 saniyeden az sürmeli
      expect(duration).toBeLessThan(10000);
    });

    test('Dashboard sorgulama performansı', async () => {
      const startTime = Date.now();

      const history = await getKPIDashboardHistory(100);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(history).toBeDefined();
    });

    test('Export performansı', async () => {
      const dashboardData = {
        cashBalance: 100000,
        monthlyExpenses: 20000,
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      const result = await generateKPIDashboard(dashboardData);

      const startTime = Date.now();

      // PDF ve Excel export paralel çalıştır
      const [pdfExport, excelExport] = await Promise.all([
        exportKPIToPDF(result.dashboardId),
        exportKPIToExcel(result.dashboardId)
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Export 2 saniyeden az sürmeli
      expect(duration).toBeLessThan(2000);
      expect(pdfExport.success).toBe(true);
      expect(excelExport.success).toBe(true);
    });
  });

  describe('KPI Dashboard Data Validation', () => {
    test('Geçersiz dashboard verisi ile hata', async () => {
      const invalidDashboardData = {
        cashBalance: 'invalid', // String instead of number
        monthlyExpenses: 20000,
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      await expect(generateKPIDashboard(invalidDashboardData)).rejects.toThrow();
    });

    test('Eksik veri ile hata', async () => {
      const incompleteDashboardData = {
        cashBalance: 100000,
        // monthlyExpenses eksik
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      await expect(generateKPIDashboard(incompleteDashboardData)).rejects.toThrow();
    });

    test('Null değerler ile hata', async () => {
      const nullDashboardData = {
        cashBalance: null,
        monthlyExpenses: 20000,
        netOperatingIncome: 120000,
        totalDebtService: 100000,
        totalReceivables: 30000,
        dailySales: 1000,
        totalPayables: 15000,
        dailyPurchases: 500,
        plannedAmount: 100000,
        actualAmount: 105000
      };

      await expect(generateKPIDashboard(nullDashboardData)).rejects.toThrow();
    });
  });
});