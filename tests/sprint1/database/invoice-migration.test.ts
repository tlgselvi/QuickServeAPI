import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';

describe.skip('Invoice Migration Tests', () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL) return;
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  describe('InvoiceAR Table Migration', () => {
    test('InvoiceAR tablosu oluşturulmalı', async () => {
      // Tablo varlığını kontrol et
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'invoice_ar'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('InvoiceAR tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'invoice_ar' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Temel alanların varlığını kontrol et
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('customer_name');
      expect(columns).toContain('invoice_number');
      expect(columns).toContain('amount');
      expect(columns).toContain('due_date');
      expect(columns).toContain('status');
    });

    test('InvoiceAR test query çalışmalı', async () => {
      // Test verisi ekle
      const testInvoiceAR = {
        customer_name: 'Test Customer AR',
        invoice_number: 'INV-AR-001',
        amount: '5000.00',
        due_date: new Date('2024-12-31'),
        status: 'pending',
        created_at: new Date()
      };

      const [insertedInvoice] = await db.execute(`
        INSERT INTO invoice_ar (customer_name, invoice_number, amount, due_date, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testInvoiceAR.customer_name,
        testInvoiceAR.invoice_number,
        testInvoiceAR.amount,
        testInvoiceAR.due_date,
        testInvoiceAR.status,
        testInvoiceAR.created_at
      ]);

      expect(insertedInvoice.rows).toBeDefined();
      expect(insertedInvoice.rows.length).toBe(1);
      expect(insertedInvoice.rows[0].customer_name).toBe(testInvoiceAR.customer_name);
      expect(insertedInvoice.rows[0].invoice_number).toBe(testInvoiceAR.invoice_number);
      expect(insertedInvoice.rows[0].amount).toBe(testInvoiceAR.amount);

      // Test query çalıştır
      const queryResult = await db.execute(`
        SELECT * FROM invoice_ar 
        WHERE customer_name = $1
      `, [testInvoiceAR.customer_name]);

      expect(queryResult.rows).toBeDefined();
      expect(queryResult.rows.length).toBe(1);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM invoice_ar 
        WHERE customer_name = $1
      `, [testInvoiceAR.customer_name]);
    });

    test('InvoiceAR CRUD operasyonları çalışmalı', async () => {
      // Create
      const newInvoice = {
        customer_name: 'Test Customer CRUD',
        invoice_number: 'INV-AR-CRUD-001',
        amount: '7500.00',
        due_date: new Date('2024-12-31'),
        status: 'pending'
      };

      const [createdInvoice] = await db.execute(`
        INSERT INTO invoice_ar (customer_name, invoice_number, amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newInvoice.customer_name,
        newInvoice.invoice_number,
        newInvoice.amount,
        newInvoice.due_date,
        newInvoice.status
      ]);

      expect(createdInvoice.rows[0].id).toBeDefined();
      const invoiceId = createdInvoice.rows[0].id;

      // Read
      const [readInvoice] = await db.execute(`
        SELECT * FROM invoice_ar WHERE id = $1
      `, [invoiceId]);

      expect(readInvoice.rows[0].customer_name).toBe(newInvoice.customer_name);

      // Update
      await db.execute(`
        UPDATE invoice_ar 
        SET status = $1, amount = $2
        WHERE id = $3
      `, ['paid', '8000.00', invoiceId]);

      const [updatedInvoice] = await db.execute(`
        SELECT * FROM invoice_ar WHERE id = $1
      `, [invoiceId]);

      expect(updatedInvoice.rows[0].status).toBe('paid');
      expect(updatedInvoice.rows[0].amount).toBe('8000.00');

      // Delete
      await db.execute(`
        DELETE FROM invoice_ar WHERE id = $1
      `, [invoiceId]);

      const [deletedInvoice] = await db.execute(`
        SELECT * FROM invoice_ar WHERE id = $1
      `, [invoiceId]);

      expect(deletedInvoice.rows.length).toBe(0);
    });
  });

  describe('InvoiceAP Table Migration', () => {
    test('InvoiceAP tablosu oluşturulmalı', async () => {
      // Tablo varlığını kontrol et
      const result = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'invoice_ap'
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('InvoiceAP tablo yapısı doğru olmalı', async () => {
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'invoice_ap' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Temel alanların varlığını kontrol et
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('supplier_name');
      expect(columns).toContain('invoice_number');
      expect(columns).toContain('amount');
      expect(columns).toContain('due_date');
      expect(columns).toContain('status');
    });

    test('InvoiceAP test query çalışmalı', async () => {
      // Test verisi ekle
      const testInvoiceAP = {
        supplier_name: 'Test Supplier AP',
        invoice_number: 'INV-AP-001',
        amount: '3000.00',
        due_date: new Date('2024-12-31'),
        status: 'pending',
        created_at: new Date()
      };

      const [insertedInvoice] = await db.execute(`
        INSERT INTO invoice_ap (supplier_name, invoice_number, amount, due_date, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        testInvoiceAP.supplier_name,
        testInvoiceAP.invoice_number,
        testInvoiceAP.amount,
        testInvoiceAP.due_date,
        testInvoiceAP.status,
        testInvoiceAP.created_at
      ]);

      expect(insertedInvoice.rows).toBeDefined();
      expect(insertedInvoice.rows.length).toBe(1);
      expect(insertedInvoice.rows[0].supplier_name).toBe(testInvoiceAP.supplier_name);
      expect(insertedInvoice.rows[0].invoice_number).toBe(testInvoiceAP.invoice_number);
      expect(insertedInvoice.rows[0].amount).toBe(testInvoiceAP.amount);

      // Test query çalıştır
      const queryResult = await db.execute(`
        SELECT * FROM invoice_ap 
        WHERE supplier_name = $1
      `, [testInvoiceAP.supplier_name]);

      expect(queryResult.rows).toBeDefined();
      expect(queryResult.rows.length).toBe(1);

      // Test verisini temizle
      await db.execute(`
        DELETE FROM invoice_ap 
        WHERE supplier_name = $1
      `, [testInvoiceAP.supplier_name]);
    });

    test('InvoiceAP CRUD operasyonları çalışmalı', async () => {
      // Create
      const newInvoice = {
        supplier_name: 'Test Supplier CRUD',
        invoice_number: 'INV-AP-CRUD-001',
        amount: '4500.00',
        due_date: new Date('2024-12-31'),
        status: 'pending'
      };

      const [createdInvoice] = await db.execute(`
        INSERT INTO invoice_ap (supplier_name, invoice_number, amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        newInvoice.supplier_name,
        newInvoice.invoice_number,
        newInvoice.amount,
        newInvoice.due_date,
        newInvoice.status
      ]);

      expect(createdInvoice.rows[0].id).toBeDefined();
      const invoiceId = createdInvoice.rows[0].id;

      // Read
      const [readInvoice] = await db.execute(`
        SELECT * FROM invoice_ap WHERE id = $1
      `, [invoiceId]);

      expect(readInvoice.rows[0].supplier_name).toBe(newInvoice.supplier_name);

      // Update
      await db.execute(`
        UPDATE invoice_ap 
        SET status = $1, amount = $2
        WHERE id = $3
      `, ['paid', '5000.00', invoiceId]);

      const [updatedInvoice] = await db.execute(`
        SELECT * FROM invoice_ap WHERE id = $1
      `, [invoiceId]);

      expect(updatedInvoice.rows[0].status).toBe('paid');
      expect(updatedInvoice.rows[0].amount).toBe('5000.00');

      // Delete
      await db.execute(`
        DELETE FROM invoice_ap WHERE id = $1
      `, [invoiceId]);

      const [deletedInvoice] = await db.execute(`
        SELECT * FROM invoice_ap WHERE id = $1
      `, [invoiceId]);

      expect(deletedInvoice.rows.length).toBe(0);
    });
  });

  describe('Invoice Table Relationships', () => {
    test('InvoiceAR ve InvoiceAP tabloları arasında ilişki yok', async () => {
      // Her iki tablo da bağımsız olmalı
      const arResult = await db.execute(`
        SELECT COUNT(*) as count FROM invoice_ar
      `);
      
      const apResult = await db.execute(`
        SELECT COUNT(*) as count FROM invoice_ap
      `);

      expect(arResult.rows[0].count).toBeDefined();
      expect(apResult.rows[0].count).toBeDefined();
    });

    test('Invoice tabloları accounts tablosu ile ilişkili olabilir', async () => {
      // Eğer account_id alanı varsa test et
      const arColumns = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'invoice_ar' AND column_name = 'account_id'
      `);

      const apColumns = await db.execute(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'invoice_ap' AND column_name = 'account_id'
      `);

      // Account_id alanı varsa foreign key kontrolü yap
      if (arColumns.rows.length > 0) {
        const fkResult = await db.execute(`
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints 
          WHERE table_name = 'invoice_ar' AND constraint_type = 'FOREIGN KEY'
        `);
        expect(fkResult.rows).toBeDefined();
      }

      if (apColumns.rows.length > 0) {
        const fkResult = await db.execute(`
          SELECT constraint_name, constraint_type
          FROM information_schema.table_constraints 
          WHERE table_name = 'invoice_ap' AND constraint_type = 'FOREIGN KEY'
        `);
        expect(fkResult.rows).toBeDefined();
      }
    });
  });

  describe('Invoice Data Validation', () => {
    test('InvoiceAR amount alanı decimal olmalı', async () => {
      const testAmount = '12345.67';
      
      const [result] = await db.execute(`
        INSERT INTO invoice_ar (customer_name, invoice_number, amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING amount
      `, ['Test Customer', 'INV-001', testAmount, new Date(), 'pending']);

      expect(result.rows[0].amount).toBe(testAmount);

      // Temizle
      await db.execute(`
        DELETE FROM invoice_ar WHERE customer_name = 'Test Customer'
      `);
    });

    test('InvoiceAP amount alanı decimal olmalı', async () => {
      const testAmount = '9876.54';
      
      const [result] = await db.execute(`
        INSERT INTO invoice_ap (supplier_name, invoice_number, amount, due_date, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING amount
      `, ['Test Supplier', 'INV-AP-001', testAmount, new Date(), 'pending']);

      expect(result.rows[0].amount).toBe(testAmount);

      // Temizle
      await db.execute(`
        DELETE FROM invoice_ap WHERE supplier_name = 'Test Supplier'
      `);
    });

    test('Invoice status alanı geçerli değerler kabul etmeli', async () => {
      const validStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
      
      for (const status of validStatuses) {
        const [result] = await db.execute(`
          INSERT INTO invoice_ar (customer_name, invoice_number, amount, due_date, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING status
        `, [`Test Customer ${status}`, `INV-${status}`, '1000.00', new Date(), status]);

        expect(result.rows[0].status).toBe(status);

        // Temizle
        await db.execute(`
          DELETE FROM invoice_ar WHERE customer_name = $1
        `, [`Test Customer ${status}`]);
      }
    });
  });

  describe('Invoice Performance Tests', () => {
    test('Büyük veri seti ile performans', async () => {
      const startTime = Date.now();

      // 1000 InvoiceAR kaydı oluştur
      const arInvoices = Array.from({ length: 1000 }, (_, i) => [
        `Customer AR ${i}`,
        `INV-AR-${i.toString().padStart(4, '0')}`,
        (Math.random() * 10000).toFixed(2),
        new Date(),
        'pending'
      ]);

      await db.execute(`
        INSERT INTO invoice_ar (customer_name, invoice_number, amount, due_date, status)
        VALUES ${arInvoices.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      `, arInvoices.flat());

      // 1000 InvoiceAP kaydı oluştur
      const apInvoices = Array.from({ length: 1000 }, (_, i) => [
        `Supplier AP ${i}`,
        `INV-AP-${i.toString().padStart(4, '0')}`,
        (Math.random() * 10000).toFixed(2),
        new Date(),
        'pending'
      ]);

      await db.execute(`
        INSERT INTO invoice_ap (supplier_name, invoice_number, amount, due_date, status)
        VALUES ${apInvoices.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      `, apInvoices.flat());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 2000 kayıt 10 saniyeden az sürmeli
      expect(duration).toBeLessThan(10000);

      // Temizle
      await db.execute(`DELETE FROM invoice_ar WHERE customer_name LIKE 'Customer AR %'`);
      await db.execute(`DELETE FROM invoice_ap WHERE supplier_name LIKE 'Supplier AP %'`);
    });

    test('Invoice sorgulama performansı', async () => {
      const startTime = Date.now();

      // Tüm invoice'ları getir
      const [arResult] = await db.execute(`SELECT COUNT(*) as count FROM invoice_ar`);
      const [apResult] = await db.execute(`SELECT COUNT(*) as count FROM invoice_ap`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(arResult.rows[0].count).toBeDefined();
      expect(apResult.rows[0].count).toBeDefined();
    });
  });
});
