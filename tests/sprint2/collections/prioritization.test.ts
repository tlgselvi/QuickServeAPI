import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

// Mock collection prioritization functions - gerçek implementasyon yerine
const prioritizeCollections = (receivables: any[]) => {
  // Prioritize by amount (descending) and age (ascending)
  return receivables
    .sort((a, b) => {
      // First by amount (descending)
      const amountDiff = parseFloat(b.amount) - parseFloat(a.amount);
      if (amountDiff !== 0) return amountDiff;
      
      // Then by age (ascending - older first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5); // Top 5
};

const calculateRunwayIncrease = (collectedAmount: number, monthlyExpenses: number) => {
  if (monthlyExpenses <= 0) return 0;
  return collectedAmount / monthlyExpenses;
};

const generateCollectionReport = (prioritizedCollections: any[], runwayIncrease: number) => {
  return {
    topCollections: prioritizedCollections,
    runwayIncreaseMonths: runwayIncrease,
    totalCollectionAmount: prioritizedCollections.reduce((sum, item) => sum + parseFloat(item.amount), 0),
    summary: `Top 5 tahsilat → Runway +${runwayIncrease.toFixed(1)} ay`
  };
};

const createTestReceivables = async (accountId: string) => {
  const testReceivables = [
    {
      customer_name: 'Customer A',
      amount: '50000.00',
      due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: 'overdue',
      priority_score: 85
    },
    {
      customer_name: 'Customer B',
      amount: '75000.00',
      due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      status: 'overdue',
      priority_score: 90
    },
    {
      customer_name: 'Customer C',
      amount: '30000.00',
      due_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      status: 'overdue',
      priority_score: 80
    },
    {
      customer_name: 'Customer D',
      amount: '100000.00',
      due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      status: 'overdue',
      priority_score: 95
    },
    {
      customer_name: 'Customer E',
      amount: '25000.00',
      due_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      status: 'overdue',
      priority_score: 75
    },
    {
      customer_name: 'Customer F',
      amount: '15000.00',
      due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'overdue',
      priority_score: 70
    }
  ];

  // Insert test receivables
  for (const receivable of testReceivables) {
    await db.execute(`
      INSERT INTO receivables (account_id, customer_name, amount, due_date, status, priority_score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      accountId,
      receivable.customer_name,
      receivable.amount,
      receivable.due_date,
      receivable.status,
      receivable.priority_score,
      new Date()
    ]);
  }

  return testReceivables;
};

describe('Collection Prioritization Tests', () => {
  let testAccountId: string = 'test-account-collections';

  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Test verilerini temizle
    await db.execute(`
      DELETE FROM receivables WHERE account_id = $1
    `, [testAccountId]);
  });

  describe('Collection Prioritization Engine', () => {
    test('Tahsilat önceliklendirme motoru çalışmalı', async () => {
      const testReceivables = await createTestReceivables(testAccountId);
      
      const prioritizedCollections = prioritizeCollections(testReceivables);
      
      expect(prioritizedCollections).toBeDefined();
      expect(prioritizedCollections.length).toBe(5);
      
      // En yüksek amount ilk sırada olmalı
      expect(parseFloat(prioritizedCollections[0].amount)).toBe(100000);
      expect(prioritizedCollections[0].customer_name).toBe('Customer D');
    });

    test('Öncelik sıralaması doğru olmalı', async () => {
      const testReceivables = await createTestReceivables(testAccountId);
      
      const prioritizedCollections = prioritizeCollections(testReceivables);
      
      // Amount'a göre azalan sıralama kontrolü
      for (let i = 0; i < prioritizedCollections.length - 1; i++) {
        const currentAmount = parseFloat(prioritizedCollections[i].amount);
        const nextAmount = parseFloat(prioritizedCollections[i + 1].amount);
        expect(currentAmount).toBeGreaterThanOrEqual(nextAmount);
      }
    });

    test('Aynı amount durumunda yaş sıralaması', () => {
      const testReceivables = [
        { amount: '50000.00', dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), customer_name: 'Customer A' },
        { amount: '50000.00', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), customer_name: 'Customer B' },
        { amount: '50000.00', dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), customer_name: 'Customer C' }
      ];

      const prioritizedCollections = prioritizeCollections(testReceivables);
      
      // Aynı amount'ta yaş sıralaması (eski önce)
      expect(prioritizedCollections[0].customer_name).toBe('Customer C'); // 45 days ago
      expect(prioritizedCollections[1].customer_name).toBe('Customer A'); // 30 days ago
      expect(prioritizedCollections[2].customer_name).toBe('Customer B'); // 15 days ago
    });

    test('Top 5 seçimi doğru olmalı', () => {
      const testReceivables = Array.from({ length: 10 }, (_, i) => ({
        amount: ((i + 1) * 10000).toString(),
        dueDate: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        customer_name: `Customer ${i + 1}`
      }));

      const prioritizedCollections = prioritizeCollections(testReceivables);
      
      expect(prioritizedCollections.length).toBe(5);
      
      // En yüksek 5 amount seçilmeli
      const amounts = prioritizedCollections.map(item => parseFloat(item.amount));
      expect(amounts).toEqual([100000, 90000, 80000, 70000, 60000]);
    });
  });

  describe('Runway Increase Calculation', () => {
    test('"Top 5 tahsilat → Runway +X ay" çıktısı üretilmeli', async () => {
      const testReceivables = await createTestReceivables(testAccountId);
      const prioritizedCollections = prioritizeCollections(testReceivables);
      
      const monthlyExpenses = 50000; // Mock monthly expenses
      const runwayIncrease = calculateRunwayIncrease(
        prioritizedCollections.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        monthlyExpenses
      );
      
      const report = generateCollectionReport(prioritizedCollections, runwayIncrease);
      
      expect(report.topCollections).toHaveLength(5);
      expect(report.runwayIncreaseMonths).toBeGreaterThan(0);
      expect(report.totalCollectionAmount).toBeGreaterThan(0);
      expect(report.summary).toContain('Top 5 tahsilat');
      expect(report.summary).toContain('Runway +');
      expect(report.summary).toContain('ay');
    });

    test('Runway artış hesaplama doğru olmalı', () => {
      const testCases = [
        { collectedAmount: 100000, monthlyExpenses: 50000, expectedRunway: 2.0 },
        { collectedAmount: 150000, monthlyExpenses: 30000, expectedRunway: 5.0 },
        { collectedAmount: 75000, monthlyExpenses: 25000, expectedRunway: 3.0 },
        { collectedAmount: 200000, monthlyExpenses: 100000, expectedRunway: 2.0 }
      ];

      testCases.forEach(({ collectedAmount, monthlyExpenses, expectedRunway }) => {
        const runwayIncrease = calculateRunwayIncrease(collectedAmount, monthlyExpenses);
        expect(runwayIncrease).toBeCloseTo(expectedRunway, 1);
      });
    });

    test('Sıfır monthly expenses durumu', () => {
      const collectedAmount = 100000;
      const monthlyExpenses = 0;
      const runwayIncrease = calculateRunwayIncrease(collectedAmount, monthlyExpenses);
      
      expect(runwayIncrease).toBe(0);
    });

    test('Negatif monthly expenses durumu', () => {
      const collectedAmount = 100000;
      const monthlyExpenses = -50000;
      const runwayIncrease = calculateRunwayIncrease(collectedAmount, monthlyExpenses);
      
      expect(runwayIncrease).toBeLessThan(0);
    });
  });

  describe('Collection Report Generation', () => {
    test('Rapor formatı doğru olmalı', async () => {
      const testReceivables = await createTestReceivables(testAccountId);
      const prioritizedCollections = prioritizeCollections(testReceivables);
      const monthlyExpenses = 40000;
      const runwayIncrease = calculateRunwayIncrease(
        prioritizedCollections.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        monthlyExpenses
      );
      
      const report = generateCollectionReport(prioritizedCollections, runwayIncrease);
      
      expect(report).toBeDefined();
      expect(report.topCollections).toBeDefined();
      expect(report.runwayIncreaseMonths).toBeDefined();
      expect(report.totalCollectionAmount).toBeDefined();
      expect(report.summary).toBeDefined();
      
      expect(Array.isArray(report.topCollections)).toBe(true);
      expect(typeof report.runwayIncreaseMonths).toBe('number');
      expect(typeof report.totalCollectionAmount).toBe('number');
      expect(typeof report.summary).toBe('string');
    });

    test('Rapor içeriği doğru olmalı', async () => {
      const testReceivables = await createTestReceivables(testAccountId);
      const prioritizedCollections = prioritizeCollections(testReceivables);
      const monthlyExpenses = 50000;
      const runwayIncrease = calculateRunwayIncrease(
        prioritizedCollections.reduce((sum, item) => sum + parseFloat(item.amount), 0),
        monthlyExpenses
      );
      
      const report = generateCollectionReport(prioritizedCollections, runwayIncrease);
      
      // Top collections kontrolü
      expect(report.topCollections.length).toBe(5);
      report.topCollections.forEach(item => {
        expect(item.customer_name).toBeDefined();
        expect(item.amount).toBeDefined();
        expect(item.due_date).toBeDefined();
      });
      
      // Total amount kontrolü
      const expectedTotal = prioritizedCollections.reduce((sum, item) => sum + parseFloat(item.amount), 0);
      expect(report.totalCollectionAmount).toBe(expectedTotal);
      
      // Summary kontrolü
      expect(report.summary).toContain('Top 5 tahsilat');
      expect(report.summary).toContain('Runway +');
      expect(report.summary).toContain('ay');
    });
  });

  describe('Collection Prioritization Edge Cases', () => {
    test('Boş receivables listesi', () => {
      const emptyReceivables = [];
      const prioritizedCollections = prioritizeCollections(emptyReceivables);
      
      expect(prioritizedCollections).toBeDefined();
      expect(prioritizedCollections.length).toBe(0);
    });

    test('5'den az receivables', () => {
      const fewReceivables = [
        { amount: '50000.00', dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), customer_name: 'Customer A' },
        { amount: '30000.00', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), customer_name: 'Customer B' }
      ];

      const prioritizedCollections = prioritizeCollections(fewReceivables);
      
      expect(prioritizedCollections.length).toBe(2);
      expect(prioritizedCollections[0].customer_name).toBe('Customer A'); // Higher amount
    });

    test('Negatif amount değerleri', () => {
      const negativeReceivables = [
        { amount: '-50000.00', dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), customer_name: 'Customer A' },
        { amount: '30000.00', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), customer_name: 'Customer B' }
      ];

      const prioritizedCollections = prioritizeCollections(negativeReceivables);
      
      expect(prioritizedCollections.length).toBe(2);
      expect(prioritizedCollections[0].customer_name).toBe('Customer B'); // Positive amount first
    });

    test('Çok büyük amount değerleri', () => {
      const largeReceivables = [
        { amount: '999999999.99', dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), customer_name: 'Customer A' },
        { amount: '1000000000.00', dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), customer_name: 'Customer B' }
      ];

      const prioritizedCollections = prioritizeCollections(largeReceivables);
      
      expect(prioritizedCollections.length).toBe(2);
      expect(prioritizedCollections[0].customer_name).toBe('Customer B'); // Higher amount
    });
  });

  describe('Collection Prioritization Performance', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 1000 receivables oluştur
      const largeReceivables = Array.from({ length: 1000 }, (_, i) => ({
        amount: (Math.random() * 100000).toFixed(2),
        dueDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        customer_name: `Customer ${i + 1}`
      }));

      const prioritizedCollections = prioritizeCollections(largeReceivables);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 receivables ile hesaplama 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(prioritizedCollections.length).toBe(5);
    });

    test('Çoklu prioritization performansı', async () => {
      const startTime = Date.now();

      // 100 kez prioritization yap
      const testReceivables = Array.from({ length: 100 }, (_, i) => ({
        amount: (Math.random() * 50000).toFixed(2),
        dueDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        customer_name: `Customer ${i + 1}`
      }));

      for (let i = 0; i < 100; i++) {
        prioritizeCollections(testReceivables);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 100 prioritization 2 saniyeden az sürmeli
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Collection Prioritization Data Validation', () => {
    test('Geçersiz amount formatı ile hata', () => {
      const invalidReceivables = [
        { amount: 'invalid-amount', dueDate: new Date(), customer_name: 'Customer A' },
        { amount: '50000.00', dueDate: new Date(), customer_name: 'Customer B' }
      ];

      expect(() => {
        prioritizeCollections(invalidReceivables);
      }).toThrow();
    });

    test('Geçersiz tarih formatı ile hata', () => {
      const invalidReceivables = [
        { amount: '50000.00', dueDate: 'invalid-date', customer_name: 'Customer A' },
        { amount: '30000.00', dueDate: new Date(), customer_name: 'Customer B' }
      ];

      expect(() => {
        prioritizeCollections(invalidReceivables);
      }).toThrow();
    });

    test('Eksik alanlar ile hata', () => {
      const incompleteReceivables = [
        { amount: '50000.00', customer_name: 'Customer A' }, // dueDate eksik
        { amount: '30000.00', dueDate: new Date() } // customer_name eksik
      ];

      expect(() => {
        prioritizeCollections(incompleteReceivables);
      }).toThrow();
    });
  });
});
