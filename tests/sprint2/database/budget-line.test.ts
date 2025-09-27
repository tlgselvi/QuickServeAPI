import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

describe('BudgetLine Migration Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  describe('BudgetLine Table Migration', () => {
    test('BudgetLine tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'budget_line'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('BudgetLine tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'budget_line' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('category');
      expect(columns).toContain('planned_amount');
      expect(columns).toContain('actual_amount');
      expect(columns).toContain('budget_period');
      expect(columns).toContain('created_at');
    });

    test('BudgetLine Jest testi ile kayıt eklenmeli', async () => {
      const testBudgetLine = {
        category: 'office_supplies',
        planned_amount: '5000.00',
        actual_amount: '4500.00',
        budget_period: '2024-01',
        description: 'Test budget line',
        created_at: new Date()
      };

      const [insertedBudgetLine] = await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testBudgetLine.category,
        testBudgetLine.planned_amount,
        testBudgetLine.actual_amount,
        testBudgetLine.budget_period,
        testBudgetLine.description,
        testBudgetLine.created_at
      ]);

      expect(insertedBudgetLine.rows).toBeDefined();
      expect(insertedBudgetLine.rows.length).toBe(1);
      expect(insertedBudgetLine.rows[0].category).toBe(testBudgetLine.category);
      expect(insertedBudgetLine.rows[0].planned_amount).toBe(testBudgetLine.planned_amount);
      expect(insertedBudgetLine.rows[0].actual_amount).toBe(testBudgetLine.actual_amount);
      expect(insertedBudgetLine.rows[0].budget_period).toBe(testBudgetLine.budget_period);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM budget_line WHERE description = $1
      `, [testBudgetLine.description]);
    });

    test('BudgetLine CRUD operasyonları çalışmalı', async () => {
      // Create
      const newBudgetLine = {
        category: 'marketing',
        planned_amount: '10000.00',
        actual_amount: '8500.00',
        budget_period: '2024-02',
        description: 'Test BudgetLine CRUD'
      };

      const [createdBudgetLine] = await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newBudgetLine.category,
        newBudgetLine.planned_amount,
        newBudgetLine.actual_amount,
        newBudgetLine.budget_period,
        newBudgetLine.description
      ]);

      expect(createdBudgetLine.rows[0].id).toBeDefined();
      const budgetLineId = createdBudgetLine.rows[0].id;

      // Read
      const [readBudgetLine] = await db.execute(`
        SELECT * FROM budget_line WHERE id = $1
      `, [budgetLineId]);

      expect(readBudgetLine.rows[0].category).toBe(newBudgetLine.category);

      // Update
      await db.execute(`
        UPDATE budget_line 
        SET actual_amount = $1, description = $2
        WHERE id = $3
      `, ['9000.00', 'Updated BudgetLine', budgetLineId]);

      const [updatedBudgetLine] = await db.execute(`
        SELECT * FROM budget_line WHERE id = $1
      `, [budgetLineId]);

      expect(updatedBudgetLine.rows[0].actual_amount).toBe('9000.00');
      expect(updatedBudgetLine.rows[0].description).toBe('Updated BudgetLine');

      // Delete
      await db.execute(`
        DELETE FROM budget_line WHERE id = $1
      `, [budgetLineId]);

      const [deletedBudgetLine] = await db.execute(`
        SELECT * FROM budget_line WHERE id = $1
      `, [budgetLineId]);

      expect(deletedBudgetLine.rows.length).toBe(0);
    });
  });

  describe('Plan/Gerçek Farkı Hesaplama', () => {
    test('Plan/Gerçek farkı % olarak raporlanmalı', async () => {
      const testBudgetLines = [
        {
          category: 'sales',
          planned_amount: '10000.00',
          actual_amount: '12000.00',
          budget_period: '2024-01',
          description: 'Test sales budget'
        },
        {
          category: 'expenses',
          planned_amount: '8000.00',
          actual_amount: '6000.00',
          budget_period: '2024-01',
          description: 'Test expenses budget'
        },
        {
          category: 'marketing',
          planned_amount: '5000.00',
          actual_amount: '5000.00',
          budget_period: '2024-01',
          description: 'Test marketing budget'
        }
      ];

      // Test verilerini ekle
      for (const budgetLine of testBudgetLines) {
        await db.execute(`
          INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          budgetLine.category,
          budgetLine.planned_amount,
          budgetLine.actual_amount,
          budgetLine.budget_period,
          budgetLine.description
        ]);
      }

      // Plan/Gerçek farkı hesaplama
      const [budgetResults] = await db.execute(`
        SELECT 
          category,
          planned_amount,
          actual_amount,
          CASE 
            WHEN planned_amount = 0 THEN 0
            ELSE ROUND(((actual_amount - planned_amount) / planned_amount) * 100, 2)
          END as variance_percentage
        FROM budget_line 
        WHERE budget_period = '2024-01'
        ORDER BY category
      `);

      expect(budgetResults.rows).toBeDefined();
      expect(budgetResults.rows.length).toBe(3);

      // Sales: 12000 - 10000 = 2000, %20 artış
      expect(parseFloat(budgetResults.rows[0].variance_percentage)).toBeCloseTo(20, 1);
      
      // Expenses: 6000 - 8000 = -2000, %25 azalış
      expect(parseFloat(budgetResults.rows[1].variance_percentage)).toBeCloseTo(-25, 1);
      
      // Marketing: 5000 - 5000 = 0, %0 değişim
      expect(parseFloat(budgetResults.rows[2].variance_percentage)).toBeCloseTo(0, 1);

      // Test verilerini temizle
      await db.execute(`
        DELETE FROM budget_line WHERE budget_period = '2024-01'
      `);
    });

    test('Farklı budget periodları ile hesaplama', async () => {
      const periods = ['2024-01', '2024-02', '2024-03'];
      
      for (const period of periods) {
        const testBudgetLine = {
          category: 'test_category',
          planned_amount: '1000.00',
          actual_amount: (1000 + Math.random() * 500).toFixed(2),
          budget_period: period,
          description: `Test budget ${period}`
        };

        await db.execute(`
          INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          testBudgetLine.category,
          testBudgetLine.planned_amount,
          testBudgetLine.actual_amount,
          testBudgetLine.budget_period,
          testBudgetLine.description
        ]);
      }

      // Her period için variance hesaplama
      for (const period of periods) {
        const [result] = await db.execute(`
          SELECT 
            category,
            planned_amount,
            actual_amount,
            ROUND(((actual_amount - planned_amount) / planned_amount) * 100, 2) as variance_percentage
          FROM budget_line 
          WHERE budget_period = $1
        `, [period]);

        expect(result.rows).toBeDefined();
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].variance_percentage).toBeDefined();
      }

      // Test verilerini temizle
      await db.execute(`
        DELETE FROM budget_line WHERE category = 'test_category'
      `);
    });

    test('Sıfır planned amount durumu', async () => {
      const testBudgetLine = {
        category: 'zero_planned',
        planned_amount: '0.00',
        actual_amount: '1000.00',
        budget_period: '2024-01',
        description: 'Test zero planned amount'
      };

      await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        testBudgetLine.category,
        testBudgetLine.planned_amount,
        testBudgetLine.actual_amount,
        testBudgetLine.budget_period,
        testBudgetLine.description
      ]);

      const [result] = await db.execute(`
        SELECT 
          category,
          planned_amount,
          actual_amount,
          CASE 
            WHEN planned_amount = 0 THEN 0
            ELSE ROUND(((actual_amount - planned_amount) / planned_amount) * 100, 2)
          END as variance_percentage
        FROM budget_line 
        WHERE category = 'zero_planned'
      `);

      expect(result.rows[0].variance_percentage).toBe(0);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM budget_line WHERE category = 'zero_planned'
      `);
    });
  });

  describe('BudgetLine Data Validation', () => {
    test('Amount alanları decimal precision doğru olmalı', async () => {
      const testAmount = '12345.67';
      
      const [result] = await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING planned_amount, actual_amount
      `, ['test', testAmount, testAmount, '2024-01', 'Test amount precision']);

      expect(result.rows[0].planned_amount).toBe(testAmount);
      expect(result.rows[0].actual_amount).toBe(testAmount);

      // Temizle
      await db.execute(`
        DELETE FROM budget_line WHERE category = 'test'
      `);
    });

    test('Budget period formatı doğru olmalı', async () => {
      const validPeriods = ['2024-01', '2024-02', '2024-12', '2025-01'];
      
      for (const period of validPeriods) {
        const [result] = await db.execute(`
          INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING budget_period
        `, ['test_period', '1000.00', '1000.00', period, `Test period ${period}`]);

        expect(result.rows[0].budget_period).toBe(period);

        // Temizle
        await db.execute(`
          DELETE FROM budget_line WHERE budget_period = $1
        `, [period]);
      }
    });

    test('Negatif amount değerleri kabul etmeli', async () => {
      const [result] = await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING planned_amount, actual_amount
      `, ['negative_test', '-1000.00', '-500.00', '2024-01', 'Test negative amounts']);

      expect(result.rows[0].planned_amount).toBe('-1000.00');
      expect(result.rows[0].actual_amount).toBe('-500.00');

      // Temizle
      await db.execute(`
        DELETE FROM budget_line WHERE category = 'negative_test'
      `);
    });
  });

  describe('BudgetLine Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 1000 budget line oluştur
      const budgetLines = Array.from({ length: 1000 }, (_, i) => [
        `category_${i % 10}`,
        (Math.random() * 10000).toFixed(2),
        (Math.random() * 10000).toFixed(2),
        `2024-${String((i % 12) + 1).padStart(2, '0')}`,
        `Test budget line ${i}`
      ]);

      await db.execute(`
        INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
        VALUES ${budgetLines.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      `, budgetLines.flat());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 kayıt 5 saniyeden az sürmeli
      expect(duration).toBeLessThan(5000);

      // Temizle
      await db.execute(`
        DELETE FROM budget_line WHERE description LIKE 'Test budget line %'
      `);
    });

    test('BudgetLine sorgulama performansı', async () => {
      const startTime = Date.now();

      // Tüm budget line'ları getir
      const [result] = await db.execute(`
        SELECT COUNT(*) as count FROM budget_line
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(result.rows[0].count).toBeDefined();
    });

    test('Variance hesaplama performansı', async () => {
      const startTime = Date.now();

      // Variance hesaplama sorgusu
      const [result] = await db.execute(`
        SELECT 
          category,
          planned_amount,
          actual_amount,
          ROUND(((actual_amount - planned_amount) / planned_amount) * 100, 2) as variance_percentage
        FROM budget_line 
        WHERE planned_amount > 0
        ORDER BY variance_percentage DESC
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(result.rows).toBeDefined();
    });
  });

  describe('BudgetLine Reporting', () => {
    test('Kategori bazında budget raporu', async () => {
      // Test verileri oluştur
      const testData = [
        { category: 'sales', planned: 10000, actual: 12000, period: '2024-01' },
        { category: 'sales', planned: 15000, actual: 14000, period: '2024-02' },
        { category: 'expenses', planned: 8000, actual: 7500, period: '2024-01' },
        { category: 'expenses', planned: 9000, actual: 9500, period: '2024-02' }
      ];

      for (const data of testData) {
        await db.execute(`
          INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          data.category,
          data.planned.toString(),
          data.actual.toString(),
          data.period,
          `Test ${data.category} ${data.period}`
        ]);
      }

      // Kategori bazında rapor
      const [result] = await db.execute(`
        SELECT 
          category,
          SUM(planned_amount) as total_planned,
          SUM(actual_amount) as total_actual,
          ROUND(((SUM(actual_amount) - SUM(planned_amount)) / SUM(planned_amount)) * 100, 2) as total_variance
        FROM budget_line 
        WHERE budget_period IN ('2024-01', '2024-02')
        GROUP BY category
        ORDER BY total_variance DESC
      `);

      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBe(2);

      // Sales: 27000 planned, 26000 actual, -3.7% variance
      const salesRow = result.rows.find(row => row.category === 'sales');
      expect(salesRow).toBeDefined();
      expect(parseFloat(salesRow.total_planned)).toBe(25000);
      expect(parseFloat(salesRow.total_actual)).toBe(26000);

      // Expenses: 17000 planned, 17000 actual, 0% variance
      const expensesRow = result.rows.find(row => row.category === 'expenses');
      expect(expensesRow).toBeDefined();
      expect(parseFloat(expensesRow.total_planned)).toBe(17000);
      expect(parseFloat(expensesRow.total_actual)).toBe(17000);

      // Temizle
      await db.execute(`
        DELETE FROM budget_line WHERE description LIKE 'Test %'
      `);
    });

    test('Period bazında budget raporu', async () => {
      // Test verileri oluştur
      const testData = [
        { category: 'sales', planned: 10000, actual: 12000, period: '2024-01' },
        { category: 'expenses', planned: 8000, actual: 7500, period: '2024-01' },
        { category: 'sales', planned: 15000, actual: 14000, period: '2024-02' },
        { category: 'expenses', planned: 9000, actual: 9500, period: '2024-02' }
      ];

      for (const data of testData) {
        await db.execute(`
          INSERT INTO budget_line (category, planned_amount, actual_amount, budget_period, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          data.category,
          data.planned.toString(),
          data.actual.toString(),
          data.period,
          `Test ${data.category} ${data.period}`
        ]);
      }

      // Period bazında rapor
      const [result] = await db.execute(`
        SELECT 
          budget_period,
          SUM(planned_amount) as total_planned,
          SUM(actual_amount) as total_actual,
          ROUND(((SUM(actual_amount) - SUM(planned_amount)) / SUM(planned_amount)) * 100, 2) as total_variance
        FROM budget_line 
        WHERE budget_period IN ('2024-01', '2024-02')
        GROUP BY budget_period
        ORDER BY budget_period
      `);

      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBe(2);

      // 2024-01: 18000 planned, 19500 actual, 8.33% variance
      const janRow = result.rows.find(row => row.budget_period === '2024-01');
      expect(janRow).toBeDefined();
      expect(parseFloat(janRow.total_planned)).toBe(18000);
      expect(parseFloat(janRow.total_actual)).toBe(19500);

      // 2024-02: 24000 planned, 23500 actual, -2.08% variance
      const febRow = result.rows.find(row => row.budget_period === '2024-02');
      expect(febRow).toBeDefined();
      expect(parseFloat(febRow.total_planned)).toBe(24000);
      expect(parseFloat(febRow.total_actual)).toBe(23500);

      // Temizle
      await db.execute(`
        DELETE FROM budget_line WHERE description LIKE 'Test %'
      `);
    });
  });
});
