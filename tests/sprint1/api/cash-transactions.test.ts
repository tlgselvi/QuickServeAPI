import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../../server/db';
import { accounts, transactions } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { app } from '../../../server/index';

describe('CashTx CRUD API Tests', () => {
  let testAccountId: string;
  let testUserId: string = 'test-user-api';

  beforeAll(async () => {
    // Test account oluştur
    const testAccount = {
      userId: testUserId,
      type: 'cash',
      bankName: 'Test Bank API',
      accountName: 'Test Cash Account API',
      balance: '10000.00',
      currency: 'TRY'
    };

    const [insertedAccount] = await db.insert(accounts).values(testAccount).returning();
    testAccountId = insertedAccount.id;
  });

  afterAll(async () => {
    // Test verilerini temizle
    await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
    await db.delete(accounts).where(eq(accounts.id, testAccountId));
  });

  beforeEach(async () => {
    // Her test öncesi transaction verilerini temizle
    await db.delete(transactions).where(eq(transactions.accountId, testAccountId));
  });

  describe('POST /cash/tx - Transaction Creation', () => {
    test('Tahsilat (income) transaction oluşturma', async () => {
      const transactionData = {
        accountId: testAccountId,
        type: 'income',
        amount: '5000.00',
        description: 'Test tahsilat',
        category: 'salary'
      };

      const response = await request(app)
        .post('/cash/tx')
        .send(transactionData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.type).toBe('income');
      expect(response.body.amount).toBe('5000.00');
      expect(response.body.description).toBe('Test tahsilat');
      expect(response.body.category).toBe('salary');

      // DB'de kayıt kontrolü
      const [dbTransaction] = await db.select().from(transactions).where(eq(transactions.id, response.body.id));
      expect(dbTransaction).toBeDefined();
      expect(dbTransaction.type).toBe('income');
    });

    test('Ödeme (expense) transaction oluşturma', async () => {
      const transactionData = {
        accountId: testAccountId,
        type: 'expense',
        amount: '1500.00',
        description: 'Test ödeme',
        category: 'food'
      };

      const response = await request(app)
        .post('/cash/tx')
        .send(transactionData)
        .expect(200);

      expect(response.body.type).toBe('expense');
      expect(response.body.amount).toBe('1500.00');

      // DB'de kayıt kontrolü
      const [dbTransaction] = await db.select().from(transactions).where(eq(transactions.id, response.body.id));
      expect(dbTransaction.type).toBe('expense');
    });

    test('Transfer (transfer_in) transaction oluşturma', async () => {
      const transactionData = {
        accountId: testAccountId,
        type: 'transfer_in',
        amount: '2000.00',
        description: 'Test transfer girişi',
        category: 'transfer'
      };

      const response = await request(app)
        .post('/cash/tx')
        .send(transactionData)
        .expect(200);

      expect(response.body.type).toBe('transfer_in');
      expect(response.body.amount).toBe('2000.00');

      // DB'de kayıt kontrolü
      const [dbTransaction] = await db.select().from(transactions).where(eq(transactions.id, response.body.id));
      expect(dbTransaction.type).toBe('transfer_in');
    });

    test('Transfer (transfer_out) transaction oluşturma', async () => {
      const transactionData = {
        accountId: testAccountId,
        type: 'transfer_out',
        amount: '1000.00',
        description: 'Test transfer çıkışı',
        category: 'transfer'
      };

      const response = await request(app)
        .post('/cash/tx')
        .send(transactionData)
        .expect(200);

      expect(response.body.type).toBe('transfer_out');
      expect(response.body.amount).toBe('1000.00');

      // DB'de kayıt kontrolü
      const [dbTransaction] = await db.select().from(transactions).where(eq(transactions.id, response.body.id));
      expect(dbTransaction.type).toBe('transfer_out');
    });

    test('Virman pair ID ile transfer çifti oluşturma', async () => {
      const virmanPairId = 'test-virman-pair-123';
      
      const transferOutData = {
        accountId: testAccountId,
        type: 'transfer_out',
        amount: '3000.00',
        description: 'Test virman çıkışı',
        category: 'transfer',
        virmanPairId: virmanPairId
      };

      const transferInData = {
        accountId: testAccountId,
        type: 'transfer_in',
        amount: '3000.00',
        description: 'Test virman girişi',
        category: 'transfer',
        virmanPairId: virmanPairId
      };

      const responseOut = await request(app)
        .post('/cash/tx')
        .send(transferOutData)
        .expect(200);

      const responseIn = await request(app)
        .post('/cash/tx')
        .send(transferInData)
        .expect(200);

      expect(responseOut.body.virmanPairId).toBe(virmanPairId);
      expect(responseIn.body.virmanPairId).toBe(virmanPairId);

      // DB'de virman çifti kontrolü
      const virmanTransactions = await db.select()
        .from(transactions)
        .where(eq(transactions.virmanPairId, virmanPairId));
      
      expect(virmanTransactions).toHaveLength(2);
      expect(virmanTransactions[0].type).toBe('transfer_out');
      expect(virmanTransactions[1].type).toBe('transfer_in');
    });
  });

  describe('GET /cash/tx - Transaction Retrieval', () => {
    beforeEach(async () => {
      // Test verilerini hazırla
      const testTransactions = [
        {
          accountId: testAccountId,
          type: 'income',
          amount: '5000.00',
          description: 'Test income 1',
          category: 'salary'
        },
        {
          accountId: testAccountId,
          type: 'expense',
          amount: '1000.00',
          description: 'Test expense 1',
          category: 'food'
        },
        {
          accountId: testAccountId,
          type: 'income',
          amount: '3000.00',
          description: 'Test income 2',
          category: 'freelance'
        },
        {
          accountId: testAccountId,
          type: 'expense',
          amount: '500.00',
          description: 'Test expense 2',
          category: 'transportation'
        }
      ];

      await db.insert(transactions).values(testTransactions);
    });

    test('Tüm transactionları getirme', async () => {
      const response = await request(app)
        .get('/cash/tx')
        .query({ accountId: testAccountId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(4);
    });

    test('Type filtresi ile transaction getirme', async () => {
      const response = await request(app)
        .get('/cash/tx')
        .query({ accountId: testAccountId, type: 'income' })
        .expect(200);

      expect(response.body.length).toBe(2);
      response.body.forEach((tx: any) => {
        expect(tx.type).toBe('income');
      });
    });

    test('Category filtresi ile transaction getirme', async () => {
      const response = await request(app)
        .get('/cash/tx')
        .query({ accountId: testAccountId, category: 'food' })
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].category).toBe('food');
    });

    test('Tarih aralığı filtresi ile transaction getirme', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/cash/tx')
        .query({ 
          accountId: testAccountId,
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString()
        })
        .expect(200);

      expect(response.body.length).toBe(4);
    });

    test('Pagination ile transaction getirme', async () => {
      const response = await request(app)
        .get('/cash/tx')
        .query({ 
          accountId: testAccountId,
          page: 1,
          limit: 2
        })
        .expect(200);

      expect(response.body.length).toBe(2);
    });

    test('Sorting ile transaction getirme', async () => {
      const response = await request(app)
        .get('/cash/tx')
        .query({ 
          accountId: testAccountId,
          sortBy: 'amount',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.length).toBe(4);
      // Amount'a göre azalan sıralama kontrolü
      for (let i = 0; i < response.body.length - 1; i++) {
        expect(parseFloat(response.body[i].amount)).toBeGreaterThanOrEqual(
          parseFloat(response.body[i + 1].amount)
        );
      }
    });
  });

  describe('PUT /cash/tx/:id - Transaction Update', () => {
    let testTransactionId: string;

    beforeEach(async () => {
      const testTransaction = {
        accountId: testAccountId,
        type: 'income',
        amount: '2000.00',
        description: 'Test update transaction',
        category: 'salary'
      };

      const [insertedTransaction] = await db.insert(transactions).values(testTransaction).returning();
      testTransactionId = insertedTransaction.id;
    });

    test('Transaction güncelleme', async () => {
      const updateData = {
        amount: '3000.00',
        description: 'Updated transaction',
        category: 'bonus'
      };

      const response = await request(app)
        .put(`/cash/tx/${testTransactionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.amount).toBe('3000.00');
      expect(response.body.description).toBe('Updated transaction');
      expect(response.body.category).toBe('bonus');

      // DB'de güncelleme kontrolü
      const [updatedTransaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, testTransactionId));
      
      expect(updatedTransaction.amount).toBe('3000.00');
      expect(updatedTransaction.description).toBe('Updated transaction');
    });

    test('Sadece amount güncelleme', async () => {
      const updateData = {
        amount: '4000.00'
      };

      const response = await request(app)
        .put(`/cash/tx/${testTransactionId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.amount).toBe('4000.00');
      expect(response.body.description).toBe('Test update transaction'); // Değişmemeli
    });
  });

  describe('DELETE /cash/tx/:id - Transaction Deletion', () => {
    let testTransactionId: string;

    beforeEach(async () => {
      const testTransaction = {
        accountId: testAccountId,
        type: 'expense',
        amount: '500.00',
        description: 'Test delete transaction',
        category: 'food'
      };

      const [insertedTransaction] = await db.insert(transactions).values(testTransaction).returning();
      testTransactionId = insertedTransaction.id;
    });

    test('Transaction silme', async () => {
      const response = await request(app)
        .delete(`/cash/tx/${testTransactionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // DB'de silme kontrolü
      const [deletedTransaction] = await db.select()
        .from(transactions)
        .where(eq(transactions.id, testTransactionId));
      
      expect(deletedTransaction).toBeUndefined();
    });

    test('Var olmayan transaction silme', async () => {
      const nonExistentId = 'non-existent-id';
      
      await request(app)
        .delete(`/cash/tx/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('API Validation', () => {
    test('Geçersiz transaction type ile hata', async () => {
      const invalidData = {
        accountId: testAccountId,
        type: 'invalid_type',
        amount: '1000.00',
        description: 'Test invalid type'
      };

      await request(app)
        .post('/cash/tx')
        .send(invalidData)
        .expect(400);
    });

    test('Negatif amount ile hata', async () => {
      const invalidData = {
        accountId: testAccountId,
        type: 'income',
        amount: '-1000.00',
        description: 'Test negative amount'
      };

      await request(app)
        .post('/cash/tx')
        .send(invalidData)
        .expect(400);
    });

    test('Eksik zorunlu alanlar ile hata', async () => {
      const invalidData = {
        accountId: testAccountId,
        type: 'income'
        // amount ve description eksik
      };

      await request(app)
        .post('/cash/tx')
        .send(invalidData)
        .expect(400);
    });

    test('Geçersiz account ID ile hata', async () => {
      const invalidData = {
        accountId: 'invalid-account-id',
        type: 'income',
        amount: '1000.00',
        description: 'Test invalid account'
      };

      await request(app)
        .post('/cash/tx')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('API Performance', () => {
    test('Büyük veri seti ile performans testi', async () => {
      const startTime = Date.now();
      
      // 100 transaction oluştur
      const transactionsToInsert = Array.from({ length: 100 }, (_, i) => ({
        accountId: testAccountId,
        type: i % 2 === 0 ? 'income' : 'expense',
        amount: (i * 100).toString(),
        description: `Test transaction ${i}`,
        category: i % 2 === 0 ? 'salary' : 'food'
      }));

      await db.insert(transactions).values(transactionsToInsert);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 100 kayıt 2 saniyeden az sürmeli
      expect(duration).toBeLessThan(2000);
    });

    test('API response time testi', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/cash/tx')
        .query({ accountId: testAccountId });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // API response 200ms'den az sürmeli
      expect(duration).toBeLessThan(200);
      expect(response.status).toBe(200);
    });
  });
});
