/**
 * Bank Integration Service Integration Tests
 * Tests the bank integration service with proper mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../utils/mock-factory.js';
import * as BankIntegrationService from '../../server/modules/bank/bank-integration-service.js';

describe('Bank Integration Service', () => {
  let mockDb: any;
  let mockProvider: any;
  const mockUserId = 'test-user-id';
  const mockIntegrationId = 'test-integration-id';

  beforeEach(() => {
    MockFactory.resetAllMocks();
    
    // Create mocks
    mockDb = MockFactory.createMockDatabase();
    mockProvider = MockFactory.createMockBankProvider();
    
    // Mock the provider factory
    vi.doMock('../../server/services/bank/bank-provider-factory.js', () => ({
      BankProviderFactory: {
        createProvider: vi.fn(() => Promise.resolve(mockProvider)),
        getSupportedProviders: vi.fn(() => [
          {
            type: 'mock',
            name: 'Mock Provider',
            features: ['accounts', 'transactions'],
            supportedCurrencies: ['TRY'],
            supportedAccountTypes: ['checking']
          }
        ])
      }
    }));
  });

  describe('createBankIntegration', () => {
    it('should create a new bank integration', async () => {
      const integrationData = {
        bankName: 'Test Bank',
        accountName: 'Test Account',
        credentials: { username: 'test', password: 'test' },
        isActive: true
      };

      const mockIntegration = MockFactory.createMockBankIntegration({
        id: mockIntegrationId,
        userId: mockUserId,
        ...integrationData
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([mockIntegration])
      });

      const result = await BankIntegrationService.createBankIntegration(mockUserId, integrationData);

      expect(result).toEqual(mockIntegration);
      expect(mockDb.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          ...integrationData
        })
      );
    });

    it('should handle database errors when creating integration', async () => {
      const integrationData = {
        bankName: 'Test Bank',
        accountName: 'Test Account',
        credentials: { username: 'test', password: 'test' },
        isActive: true
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(
        BankIntegrationService.createBankIntegration(mockUserId, integrationData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getBankIntegrations', () => {
    it('should get all bank integrations for a user', async () => {
      const mockIntegrations = [
        MockFactory.createMockBankIntegration({
          id: 'integration-1',
          userId: mockUserId,
          bankName: 'Bank 1'
        }),
        MockFactory.createMockBankIntegration({
          id: 'integration-2',
          userId: mockUserId,
          bankName: 'Bank 2'
        })
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockIntegrations)
          })
        })
      });

      const result = await BankIntegrationService.getBankIntegrations(mockUserId);

      expect(result).toEqual(mockIntegrations);
      expect(result).toHaveLength(2);
    });

    it('should include only active integrations by default', async () => {
      const mockIntegrations = [
        MockFactory.createMockBankIntegration({
          id: 'integration-1',
          userId: mockUserId,
          isActive: true
        })
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockIntegrations)
          })
        })
      });

      await BankIntegrationService.getBankIntegrations(mockUserId);

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should include inactive integrations when requested', async () => {
      const mockIntegrations = [
        MockFactory.createMockBankIntegration({
          id: 'integration-1',
          userId: mockUserId,
          isActive: false
        })
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockIntegrations)
          })
        })
      });

      await BankIntegrationService.getBankIntegrations(mockUserId, true);

      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getBankIntegrationById', () => {
    it('should get a specific bank integration', async () => {
      const mockIntegration = MockFactory.createMockBankIntegration({
        id: mockIntegrationId,
        userId: mockUserId
      });

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockIntegration])
          })
        })
      });

      const result = await BankIntegrationService.getBankIntegrationById(mockUserId, mockIntegrationId);

      expect(result).toEqual(mockIntegration);
    });

    it('should return null for non-existent integration', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await BankIntegrationService.getBankIntegrationById(mockUserId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateBankIntegration', () => {
    it('should update an existing bank integration', async () => {
      const updateData = {
        bankName: 'Updated Bank Name',
        isActive: false
      };

      const updatedIntegration = MockFactory.createMockBankIntegration({
        id: mockIntegrationId,
        userId: mockUserId,
        ...updateData
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedIntegration])
          })
        })
      });

      const result = await BankIntegrationService.updateBankIntegration(
        mockUserId,
        mockIntegrationId,
        updateData
      );

      expect(result).toEqual(updatedIntegration);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should return null for non-existent integration', async () => {
      const updateData = { bankName: 'Updated Name' };

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await BankIntegrationService.updateBankIntegration(
        mockUserId,
        'non-existent',
        updateData
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteBankIntegration', () => {
    it('should soft delete a bank integration', async () => {
      const deletedIntegration = MockFactory.createMockBankIntegration({
        id: mockIntegrationId,
        userId: mockUserId,
        isActive: false
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([deletedIntegration])
          })
        })
      });

      const result = await BankIntegrationService.deleteBankIntegration(mockUserId, mockIntegrationId);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          updatedAt: expect.any(Date)
        })
      );
    });

    it('should return false for non-existent integration', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await BankIntegrationService.deleteBankIntegration(mockUserId, 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('syncBankData', () => {
    it('should sync bank data successfully', async () => {
      const credentials = {
        username: 'test',
        password: 'test'
      };

      const mockTransactions = [
        MockFactory.createMockTransaction({
          id: 'txn-1',
          amount: 100.00,
          description: 'Test Transaction 1'
        }),
        MockFactory.createMockTransaction({
          id: 'txn-2',
          amount: 200.00,
          description: 'Test Transaction 2'
        })
      ];

      // Mock provider responses
      mockProvider.syncData.mockResolvedValue({
        success: true,
        data: {
          success: true,
          accountsUpdated: 2,
          transactionsCount: 2,
          lastSyncDate: new Date()
        }
      });

      mockProvider.getAccounts.mockResolvedValue({
        success: true,
        data: [
          MockFactory.createMockBankAccount({ id: 'acc-1' }),
          MockFactory.createMockBankAccount({ id: 'acc-2' })
        ]
      });

      mockProvider.getTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });

      // Mock database operations
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      });

      const result = await BankIntegrationService.syncBankData(
        mockUserId,
        mockIntegrationId,
        credentials
      );

      expect(result.success).toBe(true);
      expect(result.transactionsCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle sync errors gracefully', async () => {
      const credentials = {
        username: 'test',
        password: 'test'
      };

      // Mock provider failure
      mockProvider.syncData.mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      });

      // Mock database update for error status
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const result = await BankIntegrationService.syncBankData(
        mockUserId,
        mockIntegrationId,
        credentials
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
      expect(result.transactionsCount).toBe(0);
    });

    it('should update sync status during sync process', async () => {
      const credentials = {
        username: 'test',
        password: 'test'
      };

      // Mock successful sync
      mockProvider.syncData.mockResolvedValue({
        success: true,
        data: {
          success: true,
          accountsUpdated: 1,
          transactionsCount: 5,
          lastSyncDate: new Date()
        }
      });

      mockProvider.getAccounts.mockResolvedValue({
        success: true,
        data: [MockFactory.createMockBankAccount({ id: 'acc-1' })]
      });

      mockProvider.getTransactions.mockResolvedValue({
        success: true,
        data: [MockFactory.createMockTransaction()]
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      });

      await BankIntegrationService.syncBankData(
        mockUserId,
        mockIntegrationId,
        credentials
      );

      // Verify sync status updates
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'syncing',
          syncError: null,
          updatedAt: expect.any(Date)
        })
      );

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          syncStatus: 'success',
          lastSyncAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('importTransactionsFromFile', () => {
    it('should import transactions from CSV file', async () => {
      const csvData = 'date,amount,description,type\n2024-01-01,100.00,Test Transaction,debit';
      const fileType = 'csv' as const;

      const mockBatch = {
        id: 'batch-1',
        userId: mockUserId,
        bankIntegrationId: mockIntegrationId,
        fileName: 'test.csv',
        fileType,
        fileSize: csvData.length,
        status: 'processing'
      };

      // Mock batch creation
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([mockBatch])
      });

      // Mock batch update
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Mock transaction insertion
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      });

      // Mock duplicate check (no duplicates)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      });

      const result = await BankIntegrationService.importTransactionsFromFile(
        mockUserId,
        mockIntegrationId,
        csvData,
        fileType,
        {
          fileName: 'test.csv',
          autoReconcile: false,
          duplicateHandling: 'skip'
        }
      );

      expect(result.batchId).toBe('batch-1');
      expect(result.totalRecords).toBe(1);
      expect(result.successfulRecords).toBe(1);
      expect(result.failedRecords).toBe(0);
    });

    it('should handle import errors gracefully', async () => {
      const invalidData = 'invalid,csv,data';
      const fileType = 'csv' as const;

      const mockBatch = {
        id: 'batch-1',
        userId: mockUserId,
        bankIntegrationId: mockIntegrationId,
        fileName: 'test.csv',
        fileType,
        fileSize: invalidData.length,
        status: 'processing'
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([mockBatch])
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const result = await BankIntegrationService.importTransactionsFromFile(
        mockUserId,
        mockIntegrationId,
        invalidData,
        fileType
      );

      expect(result.batchId).toBe('batch-1');
      expect(result.totalRecords).toBe(0);
      expect(result.successfulRecords).toBe(0);
      expect(result.failedRecords).toBe(0);
    });
  });

  describe('getBankTransactions', () => {
    it('should get bank transactions with filters', async () => {
      const mockTransactions = [
        MockFactory.createMockTransaction({
          id: 'txn-1',
          amount: 100.00,
          type: 'debit'
        }),
        MockFactory.createMockTransaction({
          id: 'txn-2',
          amount: 200.00,
          type: 'credit'
        })
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockTransactions)
              })
            })
          })
        })
      });

      const options = {
        limit: 10,
        offset: 0,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        transactionType: 'debit' as const,
        search: 'test'
      };

      const result = await BankIntegrationService.getBankTransactions(
        mockUserId,
        mockIntegrationId,
        options
      );

      expect(result).toEqual(mockTransactions);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should get bank transactions without filters', async () => {
      const mockTransactions = [MockFactory.createMockTransaction()];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockTransactions)
              })
            })
          })
        })
      });

      const result = await BankIntegrationService.getBankTransactions(
        mockUserId,
        mockIntegrationId
      );

      expect(result).toEqual(mockTransactions);
    });
  });

  describe('reconcileTransactions', () => {
    it('should reconcile transactions successfully', async () => {
      const reconciliationData = {
        bankTransactionId: 'bank-txn-1',
        systemTransactionId: 'sys-txn-1',
        matchType: 'exact' as const,
        matchScore: 100,
        reason: 'Exact match',
        metadata: {}
      };

      const mockLog = {
        id: 'log-1',
        userId: mockUserId,
        bankIntegrationId: mockIntegrationId,
        bankTransactionId: reconciliationData.bankTransactionId,
        systemTransactionId: reconciliationData.systemTransactionId,
        matchType: reconciliationData.matchType,
        matchScore: reconciliationData.matchScore,
        status: 'matched',
        reason: reconciliationData.reason,
        metadata: reconciliationData.metadata
      };

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockLog])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const result = await BankIntegrationService.reconcileTransactions(
        mockUserId,
        reconciliationData
      );

      expect(result).toEqual(mockLog);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalledTimes(2); // Update bank transaction and system transaction
    });
  });

  describe('getReconciliationSummary', () => {
    it('should get reconciliation summary', async () => {
      const mockSummary = [
        { status: 'matched', count: 100 },
        { status: 'unmatched', count: 25 },
        { status: 'disputed', count: 5 }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockSummary)
          })
        })
      });

      const result = await BankIntegrationService.getReconciliationSummary(mockUserId);

      expect(result.matched).toBe(100);
      expect(result.unmatched).toBe(25);
      expect(result.disputed).toBe(5);
      expect(result.totalProcessed).toBe(130);
    });

    it('should get reconciliation summary for specific integration', async () => {
      const mockSummary = [
        { status: 'matched', count: 50 },
        { status: 'unmatched', count: 10 }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockSummary)
          })
        })
      });

      const result = await BankIntegrationService.getReconciliationSummary(
        mockUserId,
        mockIntegrationId
      );

      expect(result.matched).toBe(50);
      expect(result.unmatched).toBe(10);
      expect(result.totalProcessed).toBe(60);
    });
  });

  describe('getImportBatches', () => {
    it('should get import batches for user', async () => {
      const mockBatches = [
        {
          id: 'batch-1',
          userId: mockUserId,
          bankIntegrationId: mockIntegrationId,
          fileName: 'test1.csv',
          fileType: 'csv',
          status: 'completed',
          totalRecords: 100,
          successfulRecords: 95,
          failedRecords: 5
        },
        {
          id: 'batch-2',
          userId: mockUserId,
          bankIntegrationId: mockIntegrationId,
          fileName: 'test2.csv',
          fileType: 'csv',
          status: 'processing',
          totalRecords: 50,
          successfulRecords: 0,
          failedRecords: 0
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockBatches)
              })
            })
          })
        })
      });

      const result = await BankIntegrationService.getImportBatches(mockUserId);

      expect(result).toEqual(mockBatches);
      expect(result).toHaveLength(2);
    });

    it('should filter import batches by status', async () => {
      const mockBatches = [
        {
          id: 'batch-1',
          userId: mockUserId,
          bankIntegrationId: mockIntegrationId,
          fileName: 'test1.csv',
          fileType: 'csv',
          status: 'completed'
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockBatches)
              })
            })
          })
        })
      });

      const result = await BankIntegrationService.getImportBatches(
        mockUserId,
        mockIntegrationId,
        { status: 'completed' }
      );

      expect(result).toEqual(mockBatches);
    });
  });
});
