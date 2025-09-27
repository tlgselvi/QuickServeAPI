import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../../server/db';
import { accounts } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Account Migration Tests', () => {
  beforeAll(async () => {
    // Test veritabanı bağlantısını kontrol et
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Test verilerini temizle
    await db.delete(accounts);
  });

  describe('Account Table Structure', () => {
    test('Account tablosu oluşturulmalı - type: cash, bank, pos', async () => {
      // Tablo yapısını kontrol et
      const result = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'accounts' 
        ORDER BY ordinal_position
      `);
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      // Temel alanların varlığını kontrol et
      const columns = result.rows.map((row: any) => row.column_name);
      expect(columns).toContain('id');
      expect(columns).toContain('user_id');
      expect(columns).toContain('type');
      expect(columns).toContain('bank_name');
      expect(columns).toContain('account_name');
      expect(columns).toContain('balance');
      expect(columns).toContain('currency');
    });

    test('Account type alanı cash, bank, pos değerlerini kabul etmeli', async () => {
      // Test verisi ekle
      const testAccount = {
        userId: 'test-user-1',
        type: 'cash',
        bankName: 'Test Bank',
        accountName: 'Test Cash Account',
        balance: '1000.00',
        currency: 'TRY'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      expect(insertedAccount).toBeDefined();
      expect(insertedAccount.type).toBe('cash');

      // Bank account test
      const bankAccount = {
        userId: 'test-user-2',
        type: 'bank',
        bankName: 'Test Bank 2',
        accountName: 'Test Bank Account',
        balance: '5000.00',
        currency: 'TRY'
      };

      const [insertedBankAccount] = await db.insert(accounts).values(bankAccount).returning();
      expect(insertedBankAccount.type).toBe('bank');

      // POS account test
      const posAccount = {
        userId: 'test-user-3',
        type: 'pos',
        bankName: 'Test Bank 3',
        accountName: 'Test POS Account',
        balance: '0.00',
        currency: 'TRY'
      };

      const [insertedPosAccount] = await db.insert(accounts).values(posAccount).returning();
      expect(insertedPosAccount.type).toBe('pos');
    });

    test('Balance alanı decimal precision doğru olmalı', async () => {
      const testAccount = {
        userId: 'test-user-4',
        type: 'cash',
        bankName: 'Test Bank',
        accountName: 'Precision Test Account',
        balance: '123456789012345.1234', // 19,4 precision test
        currency: 'TRY'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      expect(insertedAccount.balance).toBe('123456789012345.1234');
    });

    test('Currency alanı TRY, EUR, USD değerlerini kabul etmeli', async () => {
      const currencies = ['TRY', 'EUR', 'USD'];
      
      for (const currency of currencies) {
        const testAccount = {
          userId: `test-user-${currency}`,
          type: 'cash',
          bankName: 'Test Bank',
          accountName: `Test ${currency} Account`,
          balance: '1000.00',
          currency: currency
        };

        const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
        expect(insertedAccount.currency).toBe(currency);
      }
    });
  });

  describe('Account CRUD Operations', () => {
    test('Account oluşturma çalışmalı', async () => {
      const newAccount = {
        userId: 'test-user-crud',
        type: 'cash',
        bankName: 'Test Bank CRUD',
        accountName: 'Test CRUD Account',
        balance: '2500.00',
        currency: 'TRY'
      };

      const [insertedAccount] = await db.insert(accounts).values(newAccount).returning();
      
      expect(insertedAccount).toBeDefined();
      expect(insertedAccount.id).toBeDefined();
      expect(insertedAccount.userId).toBe(newAccount.userId);
      expect(insertedAccount.type).toBe(newAccount.type);
      expect(insertedAccount.bankName).toBe(newAccount.bankName);
      expect(insertedAccount.accountName).toBe(newAccount.accountName);
      expect(insertedAccount.balance).toBe(newAccount.balance);
      expect(insertedAccount.currency).toBe(newAccount.currency);
    });

    test('Account okuma çalışmalı', async () => {
      const testAccount = {
        userId: 'test-user-read',
        type: 'bank',
        bankName: 'Test Bank Read',
        accountName: 'Test Read Account',
        balance: '5000.00',
        currency: 'EUR'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      
      const [foundAccount] = await db.select().from(accounts).where(eq(accounts.id, insertedAccount.id));
      
      expect(foundAccount).toBeDefined();
      expect(foundAccount.id).toBe(insertedAccount.id);
      expect(foundAccount.userId).toBe(testAccount.userId);
    });

    test('Account güncelleme çalışmalı', async () => {
      const testAccount = {
        userId: 'test-user-update',
        type: 'cash',
        bankName: 'Test Bank Update',
        accountName: 'Test Update Account',
        balance: '1000.00',
        currency: 'TRY'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      
      // Balance güncelle
      await db.update(accounts)
        .set({ balance: '2000.00' })
        .where(eq(accounts.id, insertedAccount.id));
      
      const [updatedAccount] = await db.select().from(accounts).where(eq(accounts.id, insertedAccount.id));
      expect(updatedAccount.balance).toBe('2000.00');
    });

    test('Account silme çalışmalı', async () => {
      const testAccount = {
        userId: 'test-user-delete',
        type: 'pos',
        bankName: 'Test Bank Delete',
        accountName: 'Test Delete Account',
        balance: '0.00',
        currency: 'USD'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      
      await db.delete(accounts).where(eq(accounts.id, insertedAccount.id));
      
      const [deletedAccount] = await db.select().from(accounts).where(eq(accounts.id, insertedAccount.id));
      expect(deletedAccount).toBeUndefined();
    });
  });

  describe('Account Constraints', () => {
    test('User ID zorunlu olmalı', async () => {
      const invalidAccount = {
        type: 'cash',
        bankName: 'Test Bank',
        accountName: 'Test Account',
        balance: '1000.00',
        currency: 'TRY'
      };

      await expect(
        db.insert(accounts).values(invalidAccount as any)
      ).rejects.toThrow();
    });

    test('Type alanı zorunlu olmalı', async () => {
      const invalidAccount = {
        userId: 'test-user',
        bankName: 'Test Bank',
        accountName: 'Test Account',
        balance: '1000.00',
        currency: 'TRY'
      };

      await expect(
        db.insert(accounts).values(invalidAccount as any)
      ).rejects.toThrow();
    });

    test('Bank name zorunlu olmalı', async () => {
      const invalidAccount = {
        userId: 'test-user',
        type: 'cash',
        accountName: 'Test Account',
        balance: '1000.00',
        currency: 'TRY'
      };

      await expect(
        db.insert(accounts).values(invalidAccount as any)
      ).rejects.toThrow();
    });

    test('Account name zorunlu olmalı', async () => {
      const invalidAccount = {
        userId: 'test-user',
        type: 'cash',
        bankName: 'Test Bank',
        balance: '1000.00',
        currency: 'TRY'
      };

      await expect(
        db.insert(accounts).values(invalidAccount as any)
      ).rejects.toThrow();
    });
  });

  describe('Account Default Values', () => {
    test('Balance default değeri 0 olmalı', async () => {
      const testAccount = {
        userId: 'test-user-default',
        type: 'cash',
        bankName: 'Test Bank',
        accountName: 'Test Default Account',
        currency: 'TRY'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      expect(insertedAccount.balance).toBe('0');
    });

    test('Currency default değeri TRY olmalı', async () => {
      const testAccount = {
        userId: 'test-user-default-currency',
        type: 'cash',
        bankName: 'Test Bank',
        accountName: 'Test Default Currency Account'
      };

      const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
      expect(insertedAccount.currency).toBe('TRY');
    });
  });

  describe('Account Performance', () => {
    test('Büyük veri seti ile performans testi', async () => {
      const startTime = Date.now();
      
      // 1000 account oluştur
      const accountsToInsert = Array.from({ length: 1000 }, (_, i) => ({
        userId: `test-user-perf-${i}`,
        type: i % 3 === 0 ? 'cash' : i % 3 === 1 ? 'bank' : 'pos',
        bankName: `Test Bank ${i % 10}`,
        accountName: `Test Account ${i}`,
        balance: (i * 100).toString(),
        currency: i % 3 === 0 ? 'TRY' : i % 3 === 1 ? 'EUR' : 'USD'
      }));

      await db.insert(accounts).values(accountsToInsert);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000 kayıt 5 saniyeden az sürmeli
      expect(duration).toBeLessThan(5000);
    });

    test('Account sorgulama performansı', async () => {
      const startTime = Date.now();
      
      // Tüm accountları getir
      const allAccounts = await db.select().from(accounts);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Sorgu 1 saniyeden az sürmeli
      expect(duration).toBeLessThan(1000);
      expect(allAccounts.length).toBeGreaterThan(0);
    });
  });
});
