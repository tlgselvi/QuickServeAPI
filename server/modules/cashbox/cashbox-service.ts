import { eq, and, desc, sql, isNull, or } from 'drizzle-orm';
import { db } from '../../db';
import { cashboxes, cashboxTransactions, cashboxAuditLogs } from '@shared/schema';
import type { 
  Cashbox, 
  InsertCashbox, 
  UpdateCashbox, 
  CashboxTransaction, 
  InsertCashboxTransaction,
  TransferCashbox,
  CashboxAuditLog 
} from '@shared/schema';

export interface CashboxWithBalance extends Cashbox {
  totalTransactions: number;
  lastTransactionDate?: Date;
}

export interface CashboxTransactionWithDetails extends CashboxTransaction {
  cashbox?: Pick<Cashbox, 'id' | 'name' | 'location'>;
  transferToCashbox?: Pick<Cashbox, 'id' | 'name' | 'location'>;
  transferFromCashbox?: Pick<Cashbox, 'id' | 'name' | 'location'>;
}

export interface CashboxSummary {
  totalCashboxes: number;
  activeCashboxes: number;
  totalBalance: number;
  currency: string;
  lastUpdated: Date;
}

export interface TransferResult {
  fromTransaction: CashboxTransaction;
  toTransaction: CashboxTransaction;
  success: boolean;
}

/**
 * Create a new cashbox
 */
export async function createCashbox(
  userId: string,
  data: InsertCashbox,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<Cashbox> {
  const [cashbox] = await db
    .insert(cashboxes)
    .values({
      ...data,
      userId,
    })
    .returning();

  // Log audit
  await logAuditEvent({
    userId,
    cashboxId: cashbox.id,
    action: 'create',
    entityType: 'cashbox',
    entityId: cashbox.id,
    newValues: cashbox,
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return cashbox;
}

/**
 * Get cashboxes for a user
 */
export async function getCashboxes(
  userId: string,
  includeDeleted: boolean = false
): Promise<CashboxWithBalance[]> {
  const whereConditions = [
    eq(cashboxes.userId, userId),
    includeDeleted ? sql`1=1` : eq(cashboxes.isDeleted, false)
  ];

  const result = await db
    .select({
      ...cashboxes,
      totalTransactions: sql<number>`(
        SELECT COUNT(*) 
        FROM ${cashboxTransactions} 
        WHERE ${cashboxTransactions.cashboxId} = ${cashboxes.id}
      )`,
      lastTransactionDate: sql<Date | null>`(
        SELECT MAX(${cashboxTransactions.createdAt})
        FROM ${cashboxTransactions}
        WHERE ${cashboxTransactions.cashboxId} = ${cashboxes.id}
      )`,
    })
    .from(cashboxes)
    .where(and(...whereConditions))
    .orderBy(desc(cashboxes.createdAt));

  return result;
}

/**
 * Get cashbox by ID
 */
export async function getCashboxById(
  userId: string,
  cashboxId: string
): Promise<CashboxWithBalance | null> {
  const [result] = await db
    .select({
      ...cashboxes,
      totalTransactions: sql<number>`(
        SELECT COUNT(*) 
        FROM ${cashboxTransactions} 
        WHERE ${cashboxTransactions.cashboxId} = ${cashboxes.id}
      )`,
      lastTransactionDate: sql<Date | null>`(
        SELECT MAX(${cashboxTransactions.createdAt})
        FROM ${cashboxTransactions}
        WHERE ${cashboxTransactions.cashboxId} = ${cashboxes.id}
      )`,
    })
    .from(cashboxes)
    .where(and(
      eq(cashboxes.id, cashboxId),
      eq(cashboxes.userId, userId)
    ))
    .limit(1);

  return result || null;
}

/**
 * Update cashbox
 */
export async function updateCashbox(
  userId: string,
  cashboxId: string,
  data: UpdateCashbox,
  auditContext?: { ipAddress?: string; userAgent?: string; reason?: string }
): Promise<Cashbox | null> {
  // Get current values for audit
  const currentCashbox = await getCashboxById(userId, cashboxId);
  if (!currentCashbox) {
    return null;
  }

  const [updatedCashbox] = await db
    .update(cashboxes)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(
      eq(cashboxes.id, cashboxId),
      eq(cashboxes.userId, userId),
      eq(cashboxes.isDeleted, false)
    ))
    .returning();

  if (updatedCashbox) {
    // Log audit
    await logAuditEvent({
      userId,
      cashboxId: cashboxId,
      action: 'update',
      entityType: 'cashbox',
      entityId: cashboxId,
      oldValues: currentCashbox,
      newValues: updatedCashbox,
      changes: getChanges(currentCashbox, updatedCashbox),
      reason: auditContext?.reason,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });
  }

  return updatedCashbox || null;
}

/**
 * Soft delete cashbox
 */
export async function deleteCashbox(
  userId: string,
  cashboxId: string,
  auditContext?: { ipAddress?: string; userAgent?: string; reason?: string }
): Promise<boolean> {
  // Get current values for audit
  const currentCashbox = await getCashboxById(userId, cashboxId);
  if (!currentCashbox) {
    return false;
  }

  const [deletedCashbox] = await db
    .update(cashboxes)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(
      eq(cashboxes.id, cashboxId),
      eq(cashboxes.userId, userId),
      eq(cashboxes.isDeleted, false)
    ))
    .returning();

  if (deletedCashbox) {
    // Log audit
    await logAuditEvent({
      userId,
      cashboxId: cashboxId,
      action: 'delete',
      entityType: 'cashbox',
      entityId: cashboxId,
      oldValues: currentCashbox,
      newValues: deletedCashbox,
      changes: { isDeleted: true, deletedAt: deletedCashbox.deletedAt },
      reason: auditContext?.reason,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });
  }

  return !!deletedCashbox;
}

/**
 * Restore deleted cashbox
 */
export async function restoreCashbox(
  userId: string,
  cashboxId: string,
  auditContext?: { ipAddress?: string; userAgent?: string; reason?: string }
): Promise<boolean> {
  // Get current values for audit
  const currentCashbox = await getCashboxById(userId, cashboxId);
  if (!currentCashbox) {
    return false;
  }

  const [restoredCashbox] = await db
    .update(cashboxes)
    .set({
      isDeleted: false,
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(cashboxes.id, cashboxId),
      eq(cashboxes.userId, userId),
      eq(cashboxes.isDeleted, true)
    ))
    .returning();

  if (restoredCashbox) {
    // Log audit
    await logAuditEvent({
      userId,
      cashboxId: cashboxId,
      action: 'restore',
      entityType: 'cashbox',
      entityId: cashboxId,
      oldValues: currentCashbox,
      newValues: restoredCashbox,
      changes: { isDeleted: false, deletedAt: null },
      reason: auditContext?.reason,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });
  }

  return !!restoredCashbox;
}

/**
 * Create cashbox transaction
 */
export async function createCashboxTransaction(
  userId: string,
  data: InsertCashboxTransaction,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<CashboxTransaction | null> {
  // Verify cashbox exists and belongs to user
  const cashbox = await getCashboxById(userId, data.cashboxId);
  if (!cashbox) {
    throw new Error('Kasa bulunamadı veya erişim yetkiniz yok');
  }

  // Calculate new balance
  let newBalance = parseFloat(cashbox.currentBalance);
  if (data.type === 'deposit' || data.type === 'transfer_in') {
    newBalance += data.amount;
  } else if (data.type === 'withdrawal' || data.type === 'transfer_out') {
    newBalance -= data.amount;
    if (newBalance < 0) {
      throw new Error('Yetersiz bakiye');
    }
  }

  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Create transaction record
    const [transaction] = await tx
      .insert(cashboxTransactions)
      .values({
        ...data,
        userId,
        balanceAfter: newBalance.toString(),
      })
      .returning();

    // Update cashbox balance
    await tx
      .update(cashboxes)
      .set({
        currentBalance: newBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(cashboxes.id, data.cashboxId));

    return transaction;
  });

  // Log audit
  await logAuditEvent({
    userId,
    cashboxId: data.cashboxId,
    transactionId: result.id,
    action: 'create',
    entityType: 'transaction',
    entityId: result.id,
    newValues: result,
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return result;
}

/**
 * Transfer between cashboxes
 */
export async function transferBetweenCashboxes(
  userId: string,
  transferData: TransferCashbox,
  auditContext?: { ipAddress?: string; userAgent?: string }
): Promise<TransferResult> {
  // Verify both cashboxes exist and belong to user
  const fromCashbox = await getCashboxById(userId, transferData.fromCashboxId);
  const toCashbox = await getCashboxById(userId, transferData.toCashboxId);

  if (!fromCashbox || !toCashbox) {
    throw new Error('Kasa bulunamadı veya erişim yetkiniz yok');
  }

  if (fromCashbox.currency !== toCashbox.currency) {
    throw new Error('Para birimleri farklı kasalar arasında transfer edilemez');
  }

  // Check sufficient balance
  const fromBalance = parseFloat(fromCashbox.currentBalance);
  if (fromBalance < transferData.amount) {
    throw new Error('Yetersiz bakiye');
  }

  // Start transaction
  const result = await db.transaction(async (tx) => {
    // Create withdrawal transaction
    const [fromTransaction] = await tx
      .insert(cashboxTransactions)
      .values({
        userId,
        cashboxId: transferData.fromCashboxId,
        type: 'transfer_out',
        amount: transferData.amount,
        currency: transferData.currency,
        description: transferData.description || `Transfer to ${toCashbox.name}`,
        reference: transferData.reference,
        transferToCashboxId: transferData.toCashboxId,
        balanceAfter: (fromBalance - transferData.amount).toString(),
        metadata: transferData.metadata,
      })
      .returning();

    // Create deposit transaction
    const toBalance = parseFloat(toCashbox.currentBalance);
    const [toTransaction] = await tx
      .insert(cashboxTransactions)
      .values({
        userId,
        cashboxId: transferData.toCashboxId,
        type: 'transfer_in',
        amount: transferData.amount,
        currency: transferData.currency,
        description: transferData.description || `Transfer from ${fromCashbox.name}`,
        reference: transferData.reference,
        transferFromCashboxId: transferData.fromCashboxId,
        balanceAfter: (toBalance + transferData.amount).toString(),
        metadata: transferData.metadata,
      })
      .returning();

    // Update cashbox balances
    await tx
      .update(cashboxes)
      .set({
        currentBalance: (fromBalance - transferData.amount).toString(),
        updatedAt: new Date(),
      })
      .where(eq(cashboxes.id, transferData.fromCashboxId));

    await tx
      .update(cashboxes)
      .set({
        currentBalance: (toBalance + transferData.amount).toString(),
        updatedAt: new Date(),
      })
      .where(eq(cashboxes.id, transferData.toCashboxId));

    return { fromTransaction, toTransaction };
  });

  // Log audit for transfer
  await logAuditEvent({
    userId,
    cashboxId: transferData.fromCashboxId,
    transactionId: result.fromTransaction.id,
    action: 'transfer',
    entityType: 'transaction',
    entityId: result.fromTransaction.id,
    newValues: {
      fromTransaction: result.fromTransaction,
      toTransaction: result.toTransaction,
    },
    ipAddress: auditContext?.ipAddress,
    userAgent: auditContext?.userAgent,
  });

  return {
    ...result,
    success: true,
  };
}

/**
 * Get cashbox transactions
 */
export async function getCashboxTransactions(
  userId: string,
  cashboxId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<CashboxTransactionWithDetails[]> {
  const { limit = 50, offset = 0, type, startDate, endDate } = options;

  const whereConditions = [
    eq(cashboxTransactions.userId, userId),
    eq(cashboxTransactions.cashboxId, cashboxId)
  ];

  if (type) {
    whereConditions.push(eq(cashboxTransactions.type, type));
  }

  if (startDate) {
    whereConditions.push(sql`${cashboxTransactions.createdAt} >= ${startDate}`);
  }

  if (endDate) {
    whereConditions.push(sql`${cashboxTransactions.createdAt} <= ${endDate}`);
  }

  const result = await db
    .select({
      ...cashboxTransactions,
      cashbox: {
        id: cashboxes.id,
        name: cashboxes.name,
        location: cashboxes.location,
      },
    })
    .from(cashboxTransactions)
    .leftJoin(cashboxes, eq(cashboxTransactions.cashboxId, cashboxes.id))
    .where(and(...whereConditions))
    .orderBy(desc(cashboxTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Get cashbox summary
 */
export async function getCashboxSummary(userId: string): Promise<CashboxSummary> {
  const result = await db
    .select({
      totalCashboxes: sql<number>`COUNT(*)`,
      activeCashboxes: sql<number>`COUNT(CASE WHEN is_deleted = false THEN 1 END)`,
      totalBalance: sql<number>`SUM(CASE WHEN is_deleted = false THEN current_balance ELSE 0 END)`,
      currency: sql<string>`currency`,
      lastUpdated: sql<Date>`MAX(updated_at)`,
    })
    .from(cashboxes)
    .where(eq(cashboxes.userId, userId))
    .groupBy(cashboxes.currency);

  const summary = result[0] || {
    totalCashboxes: 0,
    activeCashboxes: 0,
    totalBalance: 0,
    currency: 'TRY',
    lastUpdated: new Date(),
  };

  return {
    totalCashboxes: summary.totalCashboxes,
    activeCashboxes: summary.activeCashboxes,
    totalBalance: summary.totalBalance || 0,
    currency: summary.currency,
    lastUpdated: summary.lastUpdated,
  };
}

/**
 * Get audit logs for cashbox
 */
export async function getCashboxAuditLogs(
  userId: string,
  cashboxId?: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<CashboxAuditLog[]> {
  const { limit = 50, offset = 0, action, startDate, endDate } = options;

  const whereConditions = [eq(cashboxAuditLogs.userId, userId)];

  if (cashboxId) {
    whereConditions.push(eq(cashboxAuditLogs.cashboxId, cashboxId));
  }

  if (action) {
    whereConditions.push(eq(cashboxAuditLogs.action, action));
  }

  if (startDate) {
    whereConditions.push(sql`${cashboxAuditLogs.createdAt} >= ${startDate}`);
  }

  if (endDate) {
    whereConditions.push(sql`${cashboxAuditLogs.createdAt} <= ${endDate}`);
  }

  const result = await db
    .select()
    .from(cashboxAuditLogs)
    .where(and(...whereConditions))
    .orderBy(desc(cashboxAuditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

/**
 * Log audit event
 */
async function logAuditEvent(data: {
  userId: string;
  cashboxId?: string;
  transactionId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  changes?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await db.insert(cashboxAuditLogs).values({
    userId: data.userId,
    cashboxId: data.cashboxId,
    transactionId: data.transactionId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    oldValues: data.oldValues,
    newValues: data.newValues,
    changes: data.changes,
    reason: data.reason,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

/**
 * Get changes between old and new values
 */
function getChanges(oldValues: any, newValues: any): any {
  const changes: any = {};
  
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changes[key] = {
        from: oldValues[key],
        to: newValues[key],
      };
    }
  }
  
  return changes;
}
