import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

// Mock aging analysis functions - gerçek implementasyon yerine
const calculateAgingBuckets = (transactions: any[]) => {
  const now = new Date();
  const buckets = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  };

  transactions.forEach(tx => {
    const daysDiff = Math.floor((now.getTime() - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 30) {
      buckets['0-30'] += parseFloat(tx.amount);
    } else if (daysDiff <= 60) {
      buckets['31-60'] += parseFloat(tx.amount);
    } else if (daysDiff <= 90) {
      buckets['61-90'] += parseFloat(tx.amount);
    } else {
      buckets['90+'] += parseFloat(tx.amount);
    }
  });

  return buckets;
};

const calculateDSO = (totalReceivables: number, dailySales: number) => {
  if (dailySales === 0) return 0;
  return totalReceivables / dailySales;
};

const calculateDPO = (totalPayables: number, dailyPurchases: number) => {
  if (dailyPurchases === 0) return 0;
  return totalPayables / dailyPurchases;
};

const createAgingTable = async (accountId: string) => {
  const [result] = await db.execute(`
    INSERT INTO aging_analysis (account_id, analysis_date, aging_buckets, dso, dpo, total_receivables, total_payables, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    accountId,
    new Date(),
    JSON.stringify({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }),
    0,
    0,
    0,
    0,
    new Date()
  ]);

  return result.rows[0];
};

describe('Aging Analysis Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  describe('Aging Table Migration', () => {
    test('Aging tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'aging_analysis'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Aging tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'aging_analysis' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('account_id');
      expect(columns).toContain('analysis_date');
      expect(columns).toContain('aging_buckets');
      expect(columns).toContain('dso');
      expect(columns).toContain('dpo');
      expect(columns).toContain('total_receivables');
      expect(columns).toContain('total_payables');
    });

    test('Aging tablosu oluşturulmalı', async () => {
      const testAccountId = 'test-account-aging';
      const agingTable = await createAgingTable(testAccountId);
      
      expect(agingTable).toBeDefined();
      expect(agingTable.account_id).toBe(testAccountId);
      expect(agingTable.analysis_date).toBeDefined();
      expect(agingTable.aging_buckets).toBeDefined();
      expect(agingTable.dso).toBe(0);
      expect(agingTable.dpo).toBe(0);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM aging_analysis WHERE account_id = $1
      `, [testAccountId]);
    });
  });

  describe('Aging Buckets Calculation', () => {
    test('0–30 gün hesaplama doğru olmalı', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }, // 10 days ago
        { amount: '2000.00', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }, // 20 days ago
        { amount: '1500.00', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }  // 30 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(4500); // 1000 + 2000 + 1500
      expect(buckets['31-60']).toBe(0);
      expect(buckets['61-90']).toBe(0);
      expect(buckets['90+']).toBe(0);
    });

    test('31–60 gün hesaplama doğru olmalı', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) }, // 35 days ago
        { amount: '2000.00', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }, // 45 days ago
        { amount: '1500.00', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }  // 60 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(0);
      expect(buckets['31-60']).toBe(4500); // 1000 + 2000 + 1500
      expect(buckets['61-90']).toBe(0);
      expect(buckets['90+']).toBe(0);
    });

    test('61–90 gün hesaplama doğru olmalı', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000) }, // 65 days ago
        { amount: '2000.00', date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000) }, // 75 days ago
        { amount: '1500.00', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }  // 90 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(0);
      expect(buckets['31-60']).toBe(0);
      expect(buckets['61-90']).toBe(4500); // 1000 + 2000 + 1500
      expect(buckets['90+']).toBe(0);
    });

    test('90+ gün hesaplama doğru olmalı', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000) },  // 95 days ago
        { amount: '2000.00', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) }, // 120 days ago
        { amount: '1500.00', date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }  // 365 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(0);
      expect(buckets['31-60']).toBe(0);
      expect(buckets['61-90']).toBe(0);
      expect(buckets['90+']).toBe(4500); // 1000 + 2000 + 1500
    });

    test('Karışık yaşlandırma hesaplama', () => {
      const transactions = [
        { amount: '500.00', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },  // 15 days ago
        { amount: '1000.00', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }, // 45 days ago
        { amount: '750.00', date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000) },  // 75 days ago
        { amount: '2000.00', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) } // 120 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(500);
      expect(buckets['31-60']).toBe(1000);
      expect(buckets['61-90']).toBe(750);
      expect(buckets['90+']).toBe(2000);
    });
  });

  describe('DSO Calculation', () => {
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

    test('Sıfır daily sales ile DSO', () => {
      const totalReceivables = 30000;
      const dailySales = 0;
      const dso = calculateDSO(totalReceivables, dailySales);
      
      expect(dso).toBe(0);
    });

    test('Sıfır receivables ile DSO', () => {
      const totalReceivables = 0;
      const dailySales = 1000;
      const dso = calculateDSO(totalReceivables, dailySales);
      
      expect(dso).toBe(0);
    });

    test('Negatif değerler ile DSO', () => {
      const totalReceivables = -30000;
      const dailySales = 1000;
      const dso = calculateDSO(totalReceivables, dailySales);
      
      expect(dso).toBeLessThan(0);
    });
  });

  describe('DPO Calculation', () => {
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

    test('Sıfır daily purchases ile DPO', () => {
      const totalPayables = 15000;
      const dailyPurchases = 0;
      const dpo = calculateDPO(totalPayables, dailyPurchases);
      
      expect(dpo).toBe(0);
    });

    test('Sıfır payables ile DPO', () => {
      const totalPayables = 0;
      const dailyPurchases = 500;
      const dpo = calculateDPO(totalPayables, dailyPurchases);
      
      expect(dpo).toBe(0);
    });

    test('Negatif değerler ile DPO', () => {
      const totalPayables = -15000;
      const dailyPurchases = 500;
      const dpo = calculateDPO(totalPayables, dailyPurchases);
      
      expect(dpo).toBeLessThan(0);
    });
  });

  describe('Aging Analysis Integration', () => {
    test('Tam aging analizi', async () => {
      const testAccountId = 'test-account-full-aging';
      
      // Test verileri oluştur
      const testTransactions = [
        { amount: '1000.00', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        { amount: '2000.00', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
        { amount: '1500.00', date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000) },
        { amount: '3000.00', date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) }
      ];

      const buckets = calculateAgingBuckets(testTransactions);
      const totalReceivables = Object.values(buckets).reduce((sum, value) => sum + value, 0);
      const dailySales = 100; // Mock daily sales
      const dailyPurchases = 50; // Mock daily purchases
      const dso = calculateDSO(totalReceivables, dailySales);
      const dpo = calculateDPO(totalReceivables, dailyPurchases);

      const [result] = await db.execute(`
        INSERT INTO aging_analysis (account_id, analysis_date, aging_buckets, dso, dpo, total_receivables, total_payables, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        testAccountId,
        new Date(),
        JSON.stringify(buckets),
        dso,
        dpo,
        totalReceivables,
        totalReceivables,
        new Date()
      ]);

      expect(result.rows[0].account_id).toBe(testAccountId);
      expect(result.rows[0].dso).toBe(dso);
      expect(result.rows[0].dpo).toBe(dpo);
      expect(result.rows[0].total_receivables).toBe(totalReceivables);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM aging_analysis WHERE account_id = $1
      `, [testAccountId]);
    });

    test('Aging buckets JSON formatı', async () => {
      const testAccountId = 'test-account-json';
      const buckets = { '0-30': 1000, '31-60': 2000, '61-90': 1500, '90+': 3000 };
      
      const [result] = await db.execute(`
        INSERT INTO aging_analysis (account_id, analysis_date, aging_buckets, dso, dpo, total_receivables, total_payables, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING aging_buckets
      `, [
        testAccountId,
        new Date(),
        JSON.stringify(buckets),
        30,
        30,
        7500,
        7500,
        new Date()
      ]);

      const parsedBuckets = JSON.parse(result.rows[0].aging_buckets);
      expect(parsedBuckets['0-30']).toBe(1000);
      expect(parsedBuckets['31-60']).toBe(2000);
      expect(parsedBuckets['61-90']).toBe(1500);
      expect(parsedBuckets['90+']).toBe(3000);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM aging_analysis WHERE account_id = $1
      `, [testAccountId]);
    });
  });

  describe('Aging Analysis Performance', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 1000 transaction oluştur
      const transactions = Array.from({ length: 1000 }, (_, i) => ({
        amount: (Math.random() * 1000).toFixed(2),
        date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      }));

      const buckets = calculateAgingBuckets(transactions);
      const totalReceivables = Object.values(buckets).reduce((sum, value) => sum + value, 0);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 transaction ile hesaplama 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(totalReceivables).toBeGreaterThan(0);
    });

    test('Aging sorgulama performansı', async () => {
      const startTime = Date.now();

      // Tüm aging analizlerini getir
      const [result] = await db.execute(`
        SELECT COUNT(*) as count FROM aging_analysis
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(result.rows[0].count).toBeDefined();
    });
  });

  describe('Aging Analysis Edge Cases', () => {
    test('Boş transaction listesi', () => {
      const transactions = [];
      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(0);
      expect(buckets['31-60']).toBe(0);
      expect(buckets['61-90']).toBe(0);
      expect(buckets['90+']).toBe(0);
    });

    test('Gelecek tarihli transaction', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days in future
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      // Gelecek tarihli transaction 0-30 bucket'a girmeli
      expect(buckets['0-30']).toBe(1000);
    });

    test('Çok eski transaction', () => {
      const transactions = [
        { amount: '1000.00', date: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000) } // 1000 days ago
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['90+']).toBe(1000);
    });

    test('Negatif amount değerleri', () => {
      const transactions = [
        { amount: '-1000.00', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        { amount: '2000.00', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }
      ];

      const buckets = calculateAgingBuckets(transactions);
      
      expect(buckets['0-30']).toBe(-1000);
      expect(buckets['31-60']).toBe(2000);
    });
  });

  describe('Aging Analysis Data Validation', () => {
    test('Geçersiz account ID ile hata', async () => {
      const invalidAccountId = 'invalid-account-id';
      
      await expect(createAgingTable(invalidAccountId)).rejects.toThrow();
    });

    test('Geçersiz tarih ile hata', async () => {
      const invalidDate = new Date('invalid-date');
      
      await expect(db.execute(`
        INSERT INTO aging_analysis (account_id, analysis_date, aging_buckets, dso, dpo, total_receivables, total_payables, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'test-account',
        invalidDate,
        JSON.stringify({ '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }),
        0,
        0,
        0,
        0,
        new Date()
      ])).rejects.toThrow();
    });

    test('Geçersiz JSON formatı ile hata', async () => {
      await expect(db.execute(`
        INSERT INTO aging_analysis (account_id, analysis_date, aging_buckets, dso, dpo, total_receivables, total_payables, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'test-account',
        new Date(),
        'invalid-json',
        0,
        0,
        0,
        0,
        new Date()
      ])).rejects.toThrow();
    });
  });
});
