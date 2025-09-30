import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from '../../server/db';
import { cashboxes, cashboxTransactions, cashboxAuditLogs } from '@shared/schema';
import {
  createCashbox,
  getCashboxes,
  getCashboxById,
  updateCashbox,
  deleteCashbox,
  restoreCashbox,
  createCashboxTransaction,
  transferBetweenCashboxes,
  getCashboxTransactions,
  getCashboxSummary,
  getCashboxAuditLogs,
} from '../../server/modules/cashbox/cashbox-service';

describe('Cashbox Service', () => {
  const testUserId = 'test-user-123';
  let testCashboxId: string;
  let testCashbox2Id: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(cashboxAuditLogs);
    await db.delete(cashboxTransactions);
    await db.delete(cashboxes);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(cashboxAuditLogs);
    await db.delete(cashboxTransactions);
    await db.delete(cashboxes);
  });

  describe('createCashbox', () => {
    it('should create a new cashbox successfully', async () => {
      const cashboxData = {
        name: 'Test Cashbox',
        description: 'Test description',
        location: 'Office',
        currency: 'TRY',
      };

      const result = await createCashbox(testUserId, cashboxData);

      expect(result).toBeDefined();
      expect(result.name).toBe(cashboxData.name);
      expect(result.description).toBe(cashboxData.description);
      expect(result.location).toBe(cashboxData.location);
      expect(result.currency).toBe(cashboxData.currency);
      expect(result.userId).toBe(testUserId);
      expect(result.currentBalance).toBe('0');
      expect(result.isActive).toBe(true);
      expect(result.isDeleted).toBe(false);

      testCashboxId = result.id;
    });

    it('should create audit log when creating cashbox', async () => {
      const cashboxData = {
        name: 'Test Cashbox',
        currency: 'TRY',
      };

      const result = await createCashbox(testUserId, cashboxData, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      });

      const auditLogs = await db
        .select()
        .from(cashboxAuditLogs)
        .where(eq(cashboxAuditLogs.userId, testUserId));

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('create');
      expect(auditLogs[0].entityType).toBe('cashbox');
      expect(auditLogs[0].entityId).toBe(result.id);
      expect(auditLogs[0].ipAddress).toBe('127.0.0.1');
      expect(auditLogs[0].userAgent).toBe('Test Agent');
    });
  });

  describe('getCashboxes', () => {
    beforeEach(async () => {
      // Create test cashboxes
      const [cashbox1] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Cashbox 1',
          currency: 'TRY',
        })
        .returning();

      const [cashbox2] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Cashbox 2',
          currency: 'TRY',
          isDeleted: true,
          deletedAt: new Date(),
        })
        .returning();

      testCashboxId = cashbox1.id;
      testCashbox2Id = cashbox2.id;
    });

    it('should get all active cashboxes by default', async () => {
      const result = await getCashboxes(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cashbox 1');
      expect(result[0].isDeleted).toBe(false);
    });

    it('should include deleted cashboxes when requested', async () => {
      const result = await getCashboxes(testUserId, true);

      expect(result).toHaveLength(2);
      expect(result.some(cb => cb.isDeleted)).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const result = await getCashboxes('non-existent-user');

      expect(result).toHaveLength(0);
    });
  });

  describe('getCashboxById', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
        })
        .returning();

      testCashboxId = cashbox.id;
    });

    it('should get cashbox by ID', async () => {
      const result = await getCashboxById(testUserId, testCashboxId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(testCashboxId);
      expect(result!.name).toBe('Test Cashbox');
    });

    it('should return null for non-existent cashbox', async () => {
      const result = await getCashboxById(testUserId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null for cashbox belonging to different user', async () => {
      const result = await getCashboxById('different-user', testCashboxId);

      expect(result).toBeNull();
    });
  });

  describe('updateCashbox', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Original Name',
          description: 'Original Description',
          currency: 'TRY',
        })
        .returning();

      testCashboxId = cashbox.id;
    });

    it('should update cashbox successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated Description',
        location: 'New Location',
      };

      const result = await updateCashbox(testUserId, testCashboxId, updateData);

      expect(result).toBeDefined();
      expect(result!.name).toBe(updateData.name);
      expect(result!.description).toBe(updateData.description);
      expect(result!.location).toBe(updateData.location);
    });

    it('should create audit log when updating cashbox', async () => {
      const updateData = { name: 'Updated Name' };

      await updateCashbox(testUserId, testCashboxId, updateData, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        reason: 'Test update',
      });

      const auditLogs = await db
        .select()
        .from(cashboxAuditLogs)
        .where(eq(cashboxAuditLogs.userId, testUserId));

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('update');
      expect(auditLogs[0].reason).toBe('Test update');
      expect(auditLogs[0].changes).toBeDefined();
    });

    it('should return null for non-existent cashbox', async () => {
      const result = await updateCashbox(testUserId, 'non-existent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteCashbox', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
        })
        .returning();

      testCashboxId = cashbox.id;
    });

    it('should soft delete cashbox successfully', async () => {
      const result = await deleteCashbox(testUserId, testCashboxId);

      expect(result).toBe(true);

      const cashbox = await getCashboxById(testUserId, testCashboxId);
      expect(cashbox).toBeDefined();
      expect(cashbox!.isDeleted).toBe(true);
      expect(cashbox!.deletedAt).toBeDefined();
    });

    it('should create audit log when deleting cashbox', async () => {
      await deleteCashbox(testUserId, testCashboxId, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        reason: 'Test deletion',
      });

      const auditLogs = await db
        .select()
        .from(cashboxAuditLogs)
        .where(eq(cashboxAuditLogs.userId, testUserId));

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('delete');
      expect(auditLogs[0].reason).toBe('Test deletion');
    });

    it('should return false for non-existent cashbox', async () => {
      const result = await deleteCashbox(testUserId, 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('restoreCashbox', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
          isDeleted: true,
          deletedAt: new Date(),
        })
        .returning();

      testCashboxId = cashbox.id;
    });

    it('should restore deleted cashbox successfully', async () => {
      const result = await restoreCashbox(testUserId, testCashboxId);

      expect(result).toBe(true);

      const cashbox = await getCashboxById(testUserId, testCashboxId);
      expect(cashbox).toBeDefined();
      expect(cashbox!.isDeleted).toBe(false);
      expect(cashbox!.deletedAt).toBeNull();
    });

    it('should create audit log when restoring cashbox', async () => {
      await restoreCashbox(testUserId, testCashboxId, {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        reason: 'Test restoration',
      });

      const auditLogs = await db
        .select()
        .from(cashboxAuditLogs)
        .where(eq(cashboxAuditLogs.userId, testUserId));

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('restore');
      expect(auditLogs[0].reason).toBe('Test restoration');
    });
  });

  describe('createCashboxTransaction', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
          currentBalance: '1000',
        })
        .returning();

      testCashboxId = cashbox.id;
    });

    it('should create deposit transaction successfully', async () => {
      const transactionData = {
        cashboxId: testCashboxId,
        type: 'deposit' as const,
        amount: 500,
        currency: 'TRY',
        description: 'Test deposit',
      };

      const result = await createCashboxTransaction(testUserId, transactionData);

      expect(result).toBeDefined();
      expect(result!.type).toBe('deposit');
      expect(result!.amount).toBe('500');
      expect(result!.balanceAfter).toBe('1500');

      // Check if cashbox balance was updated
      const cashbox = await getCashboxById(testUserId, testCashboxId);
      expect(cashbox!.currentBalance).toBe('1500');
    });

    it('should create withdrawal transaction successfully', async () => {
      const transactionData = {
        cashboxId: testCashboxId,
        type: 'withdrawal' as const,
        amount: 300,
        currency: 'TRY',
        description: 'Test withdrawal',
      };

      const result = await createCashboxTransaction(testUserId, transactionData);

      expect(result).toBeDefined();
      expect(result!.type).toBe('withdrawal');
      expect(result!.amount).toBe('300');
      expect(result!.balanceAfter).toBe('700');

      // Check if cashbox balance was updated
      const cashbox = await getCashboxById(testUserId, testCashboxId);
      expect(cashbox!.currentBalance).toBe('700');
    });

    it('should throw error for insufficient balance', async () => {
      const transactionData = {
        cashboxId: testCashboxId,
        type: 'withdrawal' as const,
        amount: 1500,
        currency: 'TRY',
        description: 'Test withdrawal',
      };

      await expect(createCashboxTransaction(testUserId, transactionData))
        .rejects.toThrow('Yetersiz bakiye');
    });

    it('should throw error for non-existent cashbox', async () => {
      const transactionData = {
        cashboxId: 'non-existent-id',
        type: 'deposit' as const,
        amount: 500,
        currency: 'TRY',
      };

      await expect(createCashboxTransaction(testUserId, transactionData))
        .rejects.toThrow('Kasa bulunamadı veya erişim yetkiniz yok');
    });
  });

  describe('transferBetweenCashboxes', () => {
    beforeEach(async () => {
      const [cashbox1] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Cashbox 1',
          currency: 'TRY',
          currentBalance: '1000',
        })
        .returning();

      const [cashbox2] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Cashbox 2',
          currency: 'TRY',
          currentBalance: '500',
        })
        .returning();

      testCashboxId = cashbox1.id;
      testCashbox2Id = cashbox2.id;
    });

    it('should transfer between cashboxes successfully', async () => {
      const transferData = {
        fromCashboxId: testCashboxId,
        toCashboxId: testCashbox2Id,
        amount: 300,
        currency: 'TRY',
        description: 'Test transfer',
      };

      const result = await transferBetweenCashboxes(testUserId, transferData);

      expect(result.success).toBe(true);
      expect(result.fromTransaction.type).toBe('transfer_out');
      expect(result.toTransaction.type).toBe('transfer_in');

      // Check balances
      const fromCashbox = await getCashboxById(testUserId, testCashboxId);
      const toCashbox = await getCashboxById(testUserId, testCashbox2Id);

      expect(fromCashbox!.currentBalance).toBe('700');
      expect(toCashbox!.currentBalance).toBe('800');
    });

    it('should throw error for insufficient balance', async () => {
      const transferData = {
        fromCashboxId: testCashboxId,
        toCashboxId: testCashbox2Id,
        amount: 1500,
        currency: 'TRY',
      };

      await expect(transferBetweenCashboxes(testUserId, transferData))
        .rejects.toThrow('Yetersiz bakiye');
    });

    it('should throw error for same cashbox', async () => {
      const transferData = {
        fromCashboxId: testCashboxId,
        toCashboxId: testCashboxId,
        amount: 100,
        currency: 'TRY',
      };

      await expect(transferBetweenCashboxes(testUserId, transferData))
        .rejects.toThrow('Kaynak ve hedef kasa aynı olamaz');
    });

    it('should throw error for different currencies', async () => {
      // Update second cashbox to USD
      await db
        .update(cashboxes)
        .set({ currency: 'USD' })
        .where(eq(cashboxes.id, testCashbox2Id));

      const transferData = {
        fromCashboxId: testCashboxId,
        toCashboxId: testCashbox2Id,
        amount: 100,
        currency: 'TRY',
      };

      await expect(transferBetweenCashboxes(testUserId, transferData))
        .rejects.toThrow('Para birimleri farklı kasalar arasında transfer edilemez');
    });
  });

  describe('getCashboxTransactions', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
        })
        .returning();

      testCashboxId = cashbox.id;

      // Create test transactions
      await db.insert(cashboxTransactions).values([
        {
          userId: testUserId,
          cashboxId: testCashboxId,
          type: 'deposit',
          amount: '500',
          currency: 'TRY',
          balanceAfter: '500',
        },
        {
          userId: testUserId,
          cashboxId: testCashboxId,
          type: 'withdrawal',
          amount: '200',
          currency: 'TRY',
          balanceAfter: '300',
        },
      ]);
    });

    it('should get cashbox transactions', async () => {
      const result = await getCashboxTransactions(testUserId, testCashboxId);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('withdrawal'); // Should be ordered by date desc
      expect(result[1].type).toBe('deposit');
    });

    it('should filter transactions by type', async () => {
      const result = await getCashboxTransactions(testUserId, testCashboxId, {
        type: 'deposit',
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('deposit');
    });

    it('should limit and offset transactions', async () => {
      const result = await getCashboxTransactions(testUserId, testCashboxId, {
        limit: 1,
        offset: 0,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('getCashboxSummary', () => {
    beforeEach(async () => {
      await db.insert(cashboxes).values([
        {
          userId: testUserId,
          name: 'Cashbox 1',
          currency: 'TRY',
          currentBalance: '1000',
          isDeleted: false,
        },
        {
          userId: testUserId,
          name: 'Cashbox 2',
          currency: 'TRY',
          currentBalance: '500',
          isDeleted: false,
        },
        {
          userId: testUserId,
          name: 'Cashbox 3',
          currency: 'TRY',
          currentBalance: '300',
          isDeleted: true,
        },
      ]);
    });

    it('should get cashbox summary', async () => {
      const result = await getCashboxSummary(testUserId);

      expect(result.totalCashboxes).toBe(3);
      expect(result.activeCashboxes).toBe(2);
      expect(result.totalBalance).toBe(1500);
      expect(result.currency).toBe('TRY');
    });

    it('should return zero values for non-existent user', async () => {
      const result = await getCashboxSummary('non-existent-user');

      expect(result.totalCashboxes).toBe(0);
      expect(result.activeCashboxes).toBe(0);
      expect(result.totalBalance).toBe(0);
    });
  });

  describe('getCashboxAuditLogs', () => {
    beforeEach(async () => {
      const [cashbox] = await db
        .insert(cashboxes)
        .values({
          userId: testUserId,
          name: 'Test Cashbox',
          currency: 'TRY',
        })
        .returning();

      testCashboxId = cashbox.id;

      // Create test audit logs
      await db.insert(cashboxAuditLogs).values([
        {
          userId: testUserId,
          cashboxId: testCashboxId,
          action: 'create',
          entityType: 'cashbox',
          entityId: testCashboxId,
          newValues: { name: 'Test Cashbox' },
        },
        {
          userId: testUserId,
          cashboxId: testCashboxId,
          action: 'update',
          entityType: 'cashbox',
          entityId: testCashboxId,
          oldValues: { name: 'Test Cashbox' },
          newValues: { name: 'Updated Cashbox' },
        },
      ]);
    });

    it('should get audit logs for specific cashbox', async () => {
      const result = await getCashboxAuditLogs(testUserId, testCashboxId);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('update'); // Should be ordered by date desc
      expect(result[1].action).toBe('create');
    });

    it('should filter audit logs by action', async () => {
      const result = await getCashboxAuditLogs(testUserId, testCashboxId, {
        action: 'create',
      });

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('create');
    });

    it('should get all audit logs for user', async () => {
      const result = await getCashboxAuditLogs(testUserId);

      expect(result).toHaveLength(2);
    });
  });
});
