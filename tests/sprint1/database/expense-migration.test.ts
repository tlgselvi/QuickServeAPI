import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

describe('Expense Tables Migration Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  describe('OPEX Table Migration', () => {
    test('OPEX tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'opex'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('OPEX tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'opex' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('category');
      expect(columns).toContain('amount');
      expect(columns).toContain('description');
      expect(columns).toContain('date');
    });

    test('OPEX Jest testi ile kayıt eklenmeli', async () => {
      const testOpex = {
        category: 'office_supplies',
        amount: '500.00',
        description: 'Test OPEX expense',
        date: new Date('2024-01-15'),
        created_at: new Date()
      };

      const [insertedOpex] = await db.execute(`
        INSERT INTO opex (category, amount, description, date, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        testOpex.category,
        testOpex.amount,
        testOpex.description,
        testOpex.date,
        testOpex.created_at
      ]);

      expect(insertedOpex.rows).toBeDefined();
      expect(insertedOpex.rows.length).toBe(1);
      expect(insertedOpex.rows[0].category).toBe(testOpex.category);
      expect(insertedOpex.rows[0].amount).toBe(testOpex.amount);
      expect(insertedOpex.rows[0].description).toBe(testOpex.description);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM opex WHERE description = $1
      `, [testOpex.description]);
    });

    test('OPEX CRUD operasyonları çalışmalı', async () => {
      // Create
      const newOpex = {
        category: 'utilities',
        amount: '1200.00',
        description: 'Test OPEX CRUD',
        date: new Date('2024-01-20')
      };

      const [createdOpex] = await db.execute(`
        INSERT INTO opex (category, amount, description, date)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [
        newOpex.category,
        newOpex.amount,
        newOpex.description,
        newOpex.date
      ]);

      expect(createdOpex.rows[0].id).toBeDefined();
      const opexId = createdOpex.rows[0].id;

      // Read
      const [readOpex] = await db.execute(`
        SELECT * FROM opex WHERE id = $1
      `, [opexId]);

      expect(readOpex.rows[0].category).toBe(newOpex.category);

      // Update
      await db.execute(`
        UPDATE opex 
        SET amount = $1, description = $2
        WHERE id = $3
      `, ['1500.00', 'Updated OPEX', opexId]);

      const [updatedOpex] = await db.execute(`
        SELECT * FROM opex WHERE id = $1
      `, [opexId]);

      expect(updatedOpex.rows[0].amount).toBe('1500.00');
      expect(updatedOpex.rows[0].description).toBe('Updated OPEX');

      // Delete
      await db.execute(`
        DELETE FROM opex WHERE id = $1
      `, [opexId]);

      const [deletedOpex] = await db.execute(`
        SELECT * FROM opex WHERE id = $1
      `, [opexId]);

      expect(deletedOpex.rows.length).toBe(0);
    });
  });

  describe('CAPEX Table Migration', () => {
    test('CAPEX tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'capex'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('CAPEX tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'capex' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('asset_name');
      expect(columns).toContain('amount');
      expect(columns).toContain('purchase_date');
      expect(columns).toContain('depreciation_method');
    });

    test('CAPEX Jest testi ile kayıt eklenmeli', async () => {
      const testCapex = {
        asset_name: 'Test Computer',
        amount: '5000.00',
        purchase_date: new Date('2024-01-01'),
        depreciation_method: 'straight_line',
        description: 'Test CAPEX asset',
        created_at: new Date()
      };

      const [insertedCapex] = await db.execute(`
        INSERT INTO capex (asset_name, amount, purchase_date, depreciation_method, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testCapex.asset_name,
        testCapex.amount,
        testCapex.purchase_date,
        testCapex.depreciation_method,
        testCapex.description,
        testCapex.created_at
      ]);

      expect(insertedCapex.rows).toBeDefined();
      expect(insertedCapex.rows.length).toBe(1);
      expect(insertedCapex.rows[0].asset_name).toBe(testCapex.asset_name);
      expect(insertedCapex.rows[0].amount).toBe(testCapex.amount);
      expect(insertedCapex.rows[0].depreciation_method).toBe(testCapex.depreciation_method);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM capex WHERE description = $1
      `, [testCapex.description]);
    });

    test('CAPEX CRUD operasyonları çalışmalı', async () => {
      // Create
      const newCapex = {
        asset_name: 'Test Equipment',
        amount: '10000.00',
        purchase_date: new Date('2024-02-01'),
        depreciation_method: 'declining_balance',
        description: 'Test CAPEX CRUD'
      };

      const [createdCapex] = await db.execute(`
        INSERT INTO capex (asset_name, amount, purchase_date, depreciation_method, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newCapex.asset_name,
        newCapex.amount,
        newCapex.purchase_date,
        newCapex.depreciation_method,
        newCapex.description
      ]);

      expect(createdCapex.rows[0].id).toBeDefined();
      const capexId = createdCapex.rows[0].id;

      // Read
      const [readCapex] = await db.execute(`
        SELECT * FROM capex WHERE id = $1
      `, [capexId]);

      expect(readCapex.rows[0].asset_name).toBe(newCapex.asset_name);

      // Update
      await db.execute(`
        UPDATE capex 
        SET amount = $1, description = $2
        WHERE id = $3
      `, ['12000.00', 'Updated CAPEX', capexId]);

      const [updatedCapex] = await db.execute(`
        SELECT * FROM capex WHERE id = $1
      `, [capexId]);

      expect(updatedCapex.rows[0].amount).toBe('12000.00');
      expect(updatedCapex.rows[0].description).toBe('Updated CAPEX');

      // Delete
      await db.execute(`
        DELETE FROM capex WHERE id = $1
      `, [capexId]);

      const [deletedCapex] = await db.execute(`
        SELECT * FROM capex WHERE id = $1
      `, [capexId]);

      expect(deletedCapex.rows.length).toBe(0);
    });
  });

  describe('Payroll Table Migration', () => {
    test('Payroll tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'payroll'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('Payroll tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'payroll' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('employee_name');
      expect(columns).toContain('salary');
      expect(columns).toContain('pay_period');
      expect(columns).toContain('pay_date');
    });

    test('Payroll Jest testi ile kayıt eklenmeli', async () => {
      const testPayroll = {
        employee_name: 'Test Employee',
        salary: '8000.00',
        pay_period: 'monthly',
        pay_date: new Date('2024-01-31'),
        department: 'IT',
        created_at: new Date()
      };

      const [insertedPayroll] = await db.execute(`
        INSERT INTO payroll (employee_name, salary, pay_period, pay_date, department, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testPayroll.employee_name,
        testPayroll.salary,
        testPayroll.pay_period,
        testPayroll.pay_date,
        testPayroll.department,
        testPayroll.created_at
      ]);

      expect(insertedPayroll.rows).toBeDefined();
      expect(insertedPayroll.rows.length).toBe(1);
      expect(insertedPayroll.rows[0].employee_name).toBe(testPayroll.employee_name);
      expect(insertedPayroll.rows[0].salary).toBe(testPayroll.salary);
      expect(insertedPayroll.rows[0].pay_period).toBe(testPayroll.pay_period);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM payroll WHERE employee_name = $1
      `, [testPayroll.employee_name]);
    });

    test('Payroll CRUD operasyonları çalışmalı', async () => {
      // Create
      const newPayroll = {
        employee_name: 'Test Employee CRUD',
        salary: '6000.00',
        pay_period: 'monthly',
        pay_date: new Date('2024-02-29'),
        department: 'Finance'
      };

      const [createdPayroll] = await db.execute(`
        INSERT INTO payroll (employee_name, salary, pay_period, pay_date, department)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newPayroll.employee_name,
        newPayroll.salary,
        newPayroll.pay_period,
        newPayroll.pay_date,
        newPayroll.department
      ]);

      expect(createdPayroll.rows[0].id).toBeDefined();
      const payrollId = createdPayroll.rows[0].id;

      // Read
      const [readPayroll] = await db.execute(`
        SELECT * FROM payroll WHERE id = $1
      `, [payrollId]);

      expect(readPayroll.rows[0].employee_name).toBe(newPayroll.employee_name);

      // Update
      await db.execute(`
        UPDATE payroll 
        SET salary = $1, department = $2
        WHERE id = $3
      `, ['7000.00', 'Updated Department', payrollId]);

      const [updatedPayroll] = await db.execute(`
        SELECT * FROM payroll WHERE id = $1
      `, [payrollId]);

      expect(updatedPayroll.rows[0].salary).toBe('7000.00');
      expect(updatedPayroll.rows[0].department).toBe('Updated Department');

      // Delete
      await db.execute(`
        DELETE FROM payroll WHERE id = $1
      `, [payrollId]);

      const [deletedPayroll] = await db.execute(`
        SELECT * FROM payroll WHERE id = $1
      `, [payrollId]);

      expect(deletedPayroll.rows.length).toBe(0);
    });
  });

  describe('TaxAccrual Table Migration', () => {
    test('TaxAccrual tablosu oluşturulmalı', async () => {
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'tax_accrual'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('TaxAccrual tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'tax_accrual' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('tax_type');
      expect(columns).toContain('amount');
      expect(columns).toContain('accrual_date');
      expect(columns).toContain('due_date');
    });

    test('TaxAccrual Jest testi ile kayıt eklenmeli', async () => {
      const testTaxAccrual = {
        tax_type: 'income_tax',
        amount: '2000.00',
        accrual_date: new Date('2024-01-31'),
        due_date: new Date('2024-02-15'),
        description: 'Test tax accrual',
        created_at: new Date()
      };

      const [insertedTaxAccrual] = await db.execute(`
        INSERT INTO tax_accrual (tax_type, amount, accrual_date, due_date, description, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testTaxAccrual.tax_type,
        testTaxAccrual.amount,
        testTaxAccrual.accrual_date,
        testTaxAccrual.due_date,
        testTaxAccrual.description,
        testTaxAccrual.created_at
      ]);

      expect(insertedTaxAccrual.rows).toBeDefined();
      expect(insertedTaxAccrual.rows.length).toBe(1);
      expect(insertedTaxAccrual.rows[0].tax_type).toBe(testTaxAccrual.tax_type);
      expect(insertedTaxAccrual.rows[0].amount).toBe(testTaxAccrual.amount);
      expect(insertedTaxAccrual.rows[0].due_date).toBeDefined();

      // Test verisini temizle
      await db.execute(`
        DELETE FROM tax_accrual WHERE description = $1
      `, [testTaxAccrual.description]);
    });

    test('TaxAccrual CRUD operasyonları çalışmalı', async () => {
      // Create
      const newTaxAccrual = {
        tax_type: 'vat',
        amount: '1500.00',
        accrual_date: new Date('2024-02-29'),
        due_date: new Date('2024-03-15'),
        description: 'Test TaxAccrual CRUD'
      };

      const [createdTaxAccrual] = await db.execute(`
        INSERT INTO tax_accrual (tax_type, amount, accrual_date, due_date, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newTaxAccrual.tax_type,
        newTaxAccrual.amount,
        newTaxAccrual.accrual_date,
        newTaxAccrual.due_date,
        newTaxAccrual.description
      ]);

      expect(createdTaxAccrual.rows[0].id).toBeDefined();
      const taxAccrualId = createdTaxAccrual.rows[0].id;

      // Read
      const [readTaxAccrual] = await db.execute(`
        SELECT * FROM tax_accrual WHERE id = $1
      `, [taxAccrualId]);

      expect(readTaxAccrual.rows[0].tax_type).toBe(newTaxAccrual.tax_type);

      // Update
      await db.execute(`
        UPDATE tax_accrual 
        SET amount = $1, description = $2
        WHERE id = $3
      `, ['1800.00', 'Updated TaxAccrual', taxAccrualId]);

      const [updatedTaxAccrual] = await db.execute(`
        SELECT * FROM tax_accrual WHERE id = $1
      `, [taxAccrualId]);

      expect(updatedTaxAccrual.rows[0].amount).toBe('1800.00');
      expect(updatedTaxAccrual.rows[0].description).toBe('Updated TaxAccrual');

      // Delete
      await db.execute(`
        DELETE FROM tax_accrual WHERE id = $1
      `, [taxAccrualId]);

      const [deletedTaxAccrual] = await db.execute(`
        SELECT * FROM tax_accrual WHERE id = $1
      `, [taxAccrualId]);

      expect(deletedTaxAccrual.rows.length).toBe(0);
    });
  });

  describe('Expense Tables Data Validation', () => {
    test('Amount alanları decimal precision doğru olmalı', async () => {
      const testAmount = '12345.67';
      
      // OPEX amount test
      const [opexResult] = await db.execute(`
        INSERT INTO opex (category, amount, description, date)
        VALUES ($1, $2, $3, $4)
        RETURNING amount
      `, ['test', testAmount, 'Test amount', new Date()]);

      expect(opexResult.rows[0].amount).toBe(testAmount);

      // CAPEX amount test
      const [capexResult] = await db.execute(`
        INSERT INTO capex (asset_name, amount, purchase_date, depreciation_method)
        VALUES ($1, $2, $3, $4)
        RETURNING amount
      `, ['Test Asset', testAmount, new Date(), 'straight_line']);

      expect(capexResult.rows[0].amount).toBe(testAmount);

      // Temizle
      await db.execute(`DELETE FROM opex WHERE description = 'Test amount'`);
      await db.execute(`DELETE FROM capex WHERE asset_name = 'Test Asset'`);
    });

    test('Tarih alanları doğru format kabul etmeli', async () => {
      const testDate = new Date('2024-12-31');
      
      // OPEX date test
      const [opexResult] = await db.execute(`
        INSERT INTO opex (category, amount, description, date)
        VALUES ($1, $2, $3, $4)
        RETURNING date
      `, ['test', '1000.00', 'Test date', testDate]);

      expect(new Date(opexResult.rows[0].date)).toEqual(testDate);

      // Temizle
      await db.execute(`DELETE FROM opex WHERE description = 'Test date'`);
    });
  });

  describe('Expense Tables Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 500 OPEX kaydı oluştur
      const opexData = Array.from({ length: 500 }, (_, i) => [
        `category_${i % 10}`,
        (Math.random() * 1000).toFixed(2),
        `Test OPEX ${i}`,
        new Date()
      ]);

      await db.execute(`
        INSERT INTO opex (category, amount, description, date)
        VALUES ${opexData.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      `, opexData.flat());

      // 500 CAPEX kaydı oluştur
      const capexData = Array.from({ length: 500 }, (_, i) => [
        `Asset ${i}`,
        (Math.random() * 10000).toFixed(2),
        new Date(),
        'straight_line'
      ]);

      await db.execute(`
        INSERT INTO capex (asset_name, amount, purchase_date, depreciation_method)
        VALUES ${capexData.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      `, capexData.flat());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000 kayıt 5 saniyeden az sürmeli
      expect(duration).toBeLessThan(5000);

      // Temizle
      await db.execute(`DELETE FROM opex WHERE description LIKE 'Test OPEX %'`);
      await db.execute(`DELETE FROM capex WHERE asset_name LIKE 'Asset %'`);
    });

    test('Expense tabloları sorgulama performansı', async () => {
      const startTime = Date.now();

      // Tüm expense tablolarını sorgula
      const [opexCount] = await db.execute(`SELECT COUNT(*) as count FROM opex`);
      const [capexCount] = await db.execute(`SELECT COUNT(*) as count FROM capex`);
      const [payrollCount] = await db.execute(`SELECT COUNT(*) as count FROM payroll`);
      const [taxAccrualCount] = await db.execute(`SELECT COUNT(*) as count FROM tax_accrual`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(opexCount.rows[0].count).toBeDefined();
      expect(capexCount.rows[0].count).toBeDefined();
      expect(payrollCount.rows[0].count).toBeDefined();
      expect(taxAccrualCount.rows[0].count).toBeDefined();
    });
  });
});
