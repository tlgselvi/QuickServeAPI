import { eq, and, desc, sql, isNull, or, like } from 'drizzle-orm';
import { db } from '../../db';
import { 
  bankIntegrations, 
  bankTransactions, 
  importBatches, 
  reconciliationLogs,
  transactions,
  accounts 
} from '@shared/schema';
import type { 
  BankIntegration, 
  InsertBankIntegration, 
  UpdateBankIntegration, 
  BankTransaction,
  ImportBatch,
  ReconciliationLog,
  Reconciliation
} from '@shared/schema';

export interface BankIntegrationWithStats extends BankIntegration {
  totalTransactions: number;
  lastTransactionDate?: Date;
  balance?: number;
}

export interface ImportResult {
  batchId: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  validationErrors: any[];
}

export interface ReconciliationResult {
  matched: number;
  unmatched: number;
  disputed: number;
  totalProcessed: number;
}

export interface BankApiCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  token?: string;
}

/**
 * Create bank integration
 */
export async function createBankIntegration(
  userId: string,
  data: InsertBankIntegration
): Promise<BankIntegration> {
  const [integration] = await db
    .insert(bankIntegrations)
    .values({
      ...data,
      userId,
    })
    .returning();

  return integration;
}

/**
 * Get bank integrations for user
 */
export async function getBankIntegrations(
  userId: string,
  includeInactive: boolean = false
): Promise<BankIntegrationWithStats[]> {
  const whereConditions = [
    eq(bankIntegrations.userId, userId),
    includeInactive ? sql`1=1` : eq(bankIntegrations.isActive, true)
  ];

  const result = await db
    .select({
      ...bankIntegrations,
      totalTransactions: sql<number>`(
        SELECT COUNT(*) 
        FROM ${bankTransactions} 
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
      )`,
      lastTransactionDate: sql<Date | null>`(
        SELECT MAX(${bankTransactions.date})
        FROM ${bankTransactions}
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
      )`,
      balance: sql<number | null>`(
        SELECT ${bankTransactions.balance}
        FROM ${bankTransactions}
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
        ORDER BY ${bankTransactions.date} DESC
        LIMIT 1
      )`,
    })
    .from(bankIntegrations)
    .where(and(...whereConditions))
    .orderBy(desc(bankIntegrations.createdAt));

  return result;
}

/**
 * Get bank integration by ID
 */
export async function getBankIntegrationById(
  userId: string,
  integrationId: string
): Promise<BankIntegrationWithStats | null> {
  const [result] = await db
    .select({
      ...bankIntegrations,
      totalTransactions: sql<number>`(
        SELECT COUNT(*) 
        FROM ${bankTransactions} 
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
      )`,
      lastTransactionDate: sql<Date | null>`(
        SELECT MAX(${bankTransactions.date})
        FROM ${bankTransactions}
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
      )`,
      balance: sql<number | null>`(
        SELECT ${bankTransactions.balance}
        FROM ${bankTransactions}
        WHERE ${bankTransactions.bankIntegrationId} = ${bankIntegrations.id}
        ORDER BY ${bankTransactions.date} DESC
        LIMIT 1
      )`,
    })
    .from(bankIntegrations)
    .where(and(
      eq(bankIntegrations.id, integrationId),
      eq(bankIntegrations.userId, userId)
    ))
    .limit(1);

  return result || null;
}

/**
 * Update bank integration
 */
export async function updateBankIntegration(
  userId: string,
  integrationId: string,
  data: UpdateBankIntegration
): Promise<BankIntegration | null> {
  const [updatedIntegration] = await db
    .update(bankIntegrations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(bankIntegrations.id, integrationId),
      eq(bankIntegrations.userId, userId)
    ))
    .returning();

  return updatedIntegration || null;
}

/**
 * Delete bank integration
 */
export async function deleteBankIntegration(
  userId: string,
  integrationId: string
): Promise<boolean> {
  const [deletedIntegration] = await db
    .update(bankIntegrations)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(and(
      eq(bankIntegrations.id, integrationId),
      eq(bankIntegrations.userId, userId)
    ))
    .returning();

  return !!deletedIntegration;
}

/**
 * Sync bank data via API
 */
export async function syncBankData(
  userId: string,
  integrationId: string,
  credentials: BankApiCredentials
): Promise<{ success: boolean; transactionsCount: number; error?: string }> {
  try {
    // Update sync status
    await db
      .update(bankIntegrations)
      .set({
        syncStatus: 'syncing',
        syncError: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(bankIntegrations.id, integrationId),
        eq(bankIntegrations.userId, userId)
      ));

    // Mock API call - in real implementation, this would call actual bank API
    const mockTransactions = await mockBankApiCall(credentials);
    
    // Process transactions
    let transactionsCount = 0;
    for (const transactionData of mockTransactions) {
      await db.insert(bankTransactions).values({
        userId,
        bankIntegrationId: integrationId,
        externalTransactionId: transactionData.id,
        date: transactionData.date,
        amount: transactionData.amount,
        currency: transactionData.currency,
        description: transactionData.description,
        reference: transactionData.reference,
        category: transactionData.category,
        balance: transactionData.balance,
        transactionType: transactionData.type,
        importSource: 'api',
        metadata: transactionData.metadata,
      });
      transactionsCount++;
    }

    // Update sync status
    await db
      .update(bankIntegrations)
      .set({
        syncStatus: 'success',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bankIntegrations.id, integrationId));

    return { success: true, transactionsCount };
  } catch (error) {
    // Update sync status with error
    await db
      .update(bankIntegrations)
      .set({
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(bankIntegrations.id, integrationId));

    return { 
      success: false, 
      transactionsCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Import transactions from file
 */
export async function importTransactionsFromFile(
  userId: string,
  integrationId: string,
  fileData: string,
  fileType: 'csv' | 'ofx' | 'xml',
  options: {
    fileName?: string;
    autoReconcile?: boolean;
    duplicateHandling?: 'skip' | 'update' | 'create';
  } = {}
): Promise<ImportResult> {
  const { fileName, autoReconcile = false, duplicateHandling = 'skip' } = options;

  // Create import batch
  const [batch] = await db
    .insert(importBatches)
    .values({
      userId,
      bankIntegrationId: integrationId,
      fileName,
      fileType,
      fileSize: Buffer.byteLength(fileData, 'utf8'),
      status: 'processing',
    })
    .returning();

  try {
    // Parse file based on type
    const transactions = await parseTransactionFile(fileData, fileType);
    
    let successfulRecords = 0;
    let failedRecords = 0;
    let duplicateRecords = 0;
    const validationErrors: any[] = [];

    // Process each transaction
    for (const transactionData of transactions) {
      try {
        // Validate transaction data
        const validation = validateTransactionData(transactionData);
        if (!validation.valid) {
          validationErrors.push({
            transaction: transactionData,
            errors: validation.errors,
          });
          failedRecords++;
          continue;
        }

        // Check for duplicates
        const existingTransaction = await db
          .select()
          .from(bankTransactions)
          .where(and(
            eq(bankTransactions.bankIntegrationId, integrationId),
            eq(bankTransactions.externalTransactionId, transactionData.id)
          ))
          .limit(1);

        if (existingTransaction.length > 0) {
          if (duplicateHandling === 'update') {
            await db
              .update(bankTransactions)
              .set({
                amount: transactionData.amount,
                description: transactionData.description,
                category: transactionData.category,
                balance: transactionData.balance,
                updatedAt: new Date(),
              })
              .where(eq(bankTransactions.id, existingTransaction[0].id));
            successfulRecords++;
          } else {
            duplicateRecords++;
          }
          continue;
        }

        // Insert new transaction
        await db.insert(bankTransactions).values({
          userId,
          bankIntegrationId: integrationId,
          externalTransactionId: transactionData.id,
          date: transactionData.date,
          amount: transactionData.amount,
          currency: transactionData.currency,
          description: transactionData.description,
          reference: transactionData.reference,
          category: transactionData.category,
          balance: transactionData.balance,
          transactionType: transactionData.type,
          isImported: true,
          importSource: fileType,
          importBatchId: batch.id,
          metadata: transactionData.metadata,
        });

        successfulRecords++;

        // Auto-reconcile if enabled
        if (autoReconcile) {
          await attemptAutoReconciliation(userId, integrationId, transactionData);
        }
      } catch (error) {
        validationErrors.push({
          transaction: transactionData,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedRecords++;
      }
    }

    // Update batch status
    await db
      .update(importBatches)
      .set({
        status: 'completed',
        totalRecords: transactions.length,
        processedRecords: transactions.length,
        successfulRecords,
        failedRecords,
        validationErrors,
        duplicateRecords: duplicateRecords > 0 ? { count: duplicateRecords } : null,
        updatedAt: new Date(),
      })
      .where(eq(importBatches.id, batch.id));

    return {
      batchId: batch.id,
      totalRecords: transactions.length,
      successfulRecords,
      failedRecords,
      duplicateRecords,
      validationErrors,
    };
  } catch (error) {
    // Update batch status with error
    await db
      .update(importBatches)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(importBatches.id, batch.id));

    throw error;
  }
}

/**
 * Get bank transactions
 */
export async function getBankTransactions(
  userId: string,
  integrationId: string,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    transactionType?: 'debit' | 'credit';
    isReconciled?: boolean;
    search?: string;
  } = {}
): Promise<BankTransaction[]> {
  const { 
    limit = 50, 
    offset = 0, 
    startDate, 
    endDate, 
    transactionType, 
    isReconciled,
    search 
  } = options;

  const whereConditions = [
    eq(bankTransactions.userId, userId),
    eq(bankTransactions.bankIntegrationId, integrationId)
  ];

  if (startDate) {
    whereConditions.push(sql`${bankTransactions.date} >= ${startDate}`);
  }

  if (endDate) {
    whereConditions.push(sql`${bankTransactions.date} <= ${endDate}`);
  }

  if (transactionType) {
    whereConditions.push(eq(bankTransactions.transactionType, transactionType));
  }

  if (isReconciled !== undefined) {
    whereConditions.push(eq(bankTransactions.isReconciled, isReconciled));
  }

  if (search) {
    whereConditions.push(
      or(
        like(bankTransactions.description, `%${search}%`),
        like(bankTransactions.reference, `%${search}%`)
      )
    );
  }

  const result = await db
    .select()
    .from(bankTransactions)
    .where(and(...whereConditions))
    .orderBy(desc(bankTransactions.date))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Reconcile transactions
 */
export async function reconcileTransactions(
  userId: string,
  reconciliationData: Reconciliation
): Promise<ReconciliationLog> {
  const [log] = await db
    .insert(reconciliationLogs)
    .values({
      userId,
      bankIntegrationId: reconciliationData.bankTransactionId,
      bankTransactionId: reconciliationData.bankTransactionId,
      systemTransactionId: reconciliationData.systemTransactionId,
      matchType: reconciliationData.matchType,
      matchScore: reconciliationData.matchScore,
      status: 'matched',
      reason: reconciliationData.reason,
      metadata: reconciliationData.metadata,
    })
    .returning();

  // Update bank transaction as reconciled
  await db
    .update(bankTransactions)
    .set({
      isReconciled: true,
      reconciledAt: new Date(),
      reconciledBy: userId,
    })
    .where(eq(bankTransactions.id, reconciliationData.bankTransactionId));

  // Update system transaction as reconciled
  await db
    .update(transactions)
    .set({
      // Add reconciled flag to system transactions if needed
    })
    .where(eq(transactions.id, reconciliationData.systemTransactionId));

  return log;
}

/**
 * Get reconciliation summary
 */
export async function getReconciliationSummary(
  userId: string,
  integrationId?: string
): Promise<ReconciliationResult> {
  const whereConditions = [eq(reconciliationLogs.userId, userId)];

  if (integrationId) {
    whereConditions.push(eq(reconciliationLogs.bankIntegrationId, integrationId));
  }

  const result = await db
    .select({
      status: reconciliationLogs.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(reconciliationLogs)
    .where(and(...whereConditions))
    .groupBy(reconciliationLogs.status);

  const summary: ReconciliationResult = {
    matched: 0,
    unmatched: 0,
    disputed: 0,
    totalProcessed: 0,
  };

  result.forEach(row => {
    summary[row.status as keyof ReconciliationResult] = row.count;
    summary.totalProcessed += row.count;
  });

  return summary;
}

/**
 * Get import batches
 */
export async function getImportBatches(
  userId: string,
  integrationId?: string,
  options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}
): Promise<ImportBatch[]> {
  const { limit = 50, offset = 0, status } = options;

  const whereConditions = [eq(importBatches.userId, userId)];

  if (integrationId) {
    whereConditions.push(eq(importBatches.bankIntegrationId, integrationId));
  }

  if (status) {
    whereConditions.push(eq(importBatches.status, status));
  }

  const result = await db
    .select()
    .from(importBatches)
    .where(and(...whereConditions))
    .orderBy(desc(importBatches.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Mock bank API call (replace with real implementation)
 */
async function mockBankApiCall(credentials: BankApiCredentials): Promise<any[]> {
  // Mock implementation - replace with actual bank API calls
  return [
    {
      id: 'txn_001',
      date: new Date(),
      amount: '100.00',
      currency: 'TRY',
      description: 'Test transaction 1',
      reference: 'REF001',
      category: 'Income',
      balance: '1000.00',
      type: 'credit',
      metadata: { source: 'mock_api' },
    },
    {
      id: 'txn_002',
      date: new Date(),
      amount: '50.00',
      currency: 'TRY',
      description: 'Test transaction 2',
      reference: 'REF002',
      category: 'Expense',
      balance: '950.00',
      type: 'debit',
      metadata: { source: 'mock_api' },
    },
  ];
}

/**
 * Parse transaction file based on type
 */
async function parseTransactionFile(
  fileData: string, 
  fileType: 'csv' | 'ofx' | 'xml'
): Promise<any[]> {
  switch (fileType) {
    case 'csv':
      return parseCSVTransactions(fileData);
    case 'ofx':
      return parseOFXTransactions(fileData);
    case 'xml':
      return parseXMLTransactions(fileData);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Parse CSV transactions
 */
function parseCSVTransactions(csvData: string): any[] {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const transactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const transaction: any = {};
      headers.forEach((header, index) => {
        transaction[header.toLowerCase()] = values[index];
      });
      transactions.push(transaction);
    }
  }

  return transactions;
}

/**
 * Parse OFX transactions
 */
function parseOFXTransactions(ofxData: string): any[] {
  // Mock OFX parsing - implement actual OFX parser
  return [
    {
      id: 'ofx_001',
      date: new Date(),
      amount: '200.00',
      currency: 'TRY',
      description: 'OFX Transaction 1',
      reference: 'OFX001',
      category: 'Transfer',
      balance: '1200.00',
      type: 'credit',
      metadata: { source: 'ofx' },
    },
  ];
}

/**
 * Parse XML transactions
 */
function parseXMLTransactions(xmlData: string): any[] {
  // Mock XML parsing - implement actual XML parser
  return [
    {
      id: 'xml_001',
      date: new Date(),
      amount: '150.00',
      currency: 'TRY',
      description: 'XML Transaction 1',
      reference: 'XML001',
      category: 'Payment',
      balance: '1350.00',
      type: 'debit',
      metadata: { source: 'xml' },
    },
  ];
}

/**
 * Validate transaction data
 */
function validateTransactionData(transaction: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!transaction.id) errors.push('Transaction ID is required');
  if (!transaction.date) errors.push('Transaction date is required');
  if (!transaction.amount) errors.push('Transaction amount is required');
  if (!transaction.type) errors.push('Transaction type is required');
  if (!['debit', 'credit'].includes(transaction.type)) {
    errors.push('Transaction type must be debit or credit');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Attempt auto-reconciliation
 */
async function attemptAutoReconciliation(
  userId: string,
  integrationId: string,
  bankTransaction: any
): Promise<void> {
  // Find matching system transactions
  const matchingTransactions = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.amount, bankTransaction.amount),
      sql`DATE(${transactions.createdAt}) = DATE(${bankTransaction.date})`
    ))
    .limit(1);

  if (matchingTransactions.length > 0) {
    await reconcileTransactions(userId, {
      bankTransactionId: bankTransaction.id,
      systemTransactionId: matchingTransactions[0].id,
      matchType: 'exact',
      matchScore: 100,
      reason: 'Auto-reconciled by amount and date match',
    });
  }
}
