import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { agingTable } from '@shared/schema';

export interface AgingBucket {
  bucket: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface AgingSummary {
  totalOutstanding: number;
  totalCount: number;
  buckets: AgingBucket[];
  dso?: number; // Days Sales Outstanding
  dpo?: number; // Days Payable Outstanding
}

export interface CollectionPriority {
  id: string;
  customerSupplier: string;
  amount: number;
  daysOutstanding: number;
  priority: 'high' | 'medium' | 'low';
  recommendedAction: string;
}

/**
 * Calculate aging buckets for receivables or payables
 */
export async function calculateAgingBuckets(
  userId: string,
  type: 'receivable' | 'payable',
  asOfDate?: Date
): Promise<AgingSummary> {
  const date = asOfDate || new Date();
  
  // Get all outstanding items
  const items = await db
    .select()
    .from(agingTable)
    .where(and(
      eq(agingTable.userId, userId),
      eq(agingTable.type, type),
      eq(agingTable.status, 'outstanding')
    ));

  // Calculate days outstanding for each item
  const itemsWithDays = items.map(item => {
    const daysOutstanding = Math.floor((date.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const agingBucket = getAgingBucket(daysOutstanding);
    
    return {
      ...item,
      daysOutstanding,
      agingBucket,
    };
  });

  // Group by aging bucket
  const buckets: Record<string, { amount: number; count: number }> = {};
  let totalOutstanding = 0;
  let totalCount = itemsWithDays.length;

  itemsWithDays.forEach(item => {
    const bucket = item.agingBucket;
    if (!buckets[bucket]) {
      buckets[bucket] = { amount: 0, count: 0 };
    }
    
    buckets[bucket].amount += parseFloat(item.currentAmount);
    buckets[bucket].count += 1;
    totalOutstanding += parseFloat(item.currentAmount);
  });

  // Format buckets with percentages
  const formattedBuckets: AgingBucket[] = Object.entries(buckets).map(([bucket, data]) => ({
    bucket,
    amount: data.amount,
    count: data.count,
    percentage: totalOutstanding > 0 ? (data.amount / totalOutstanding) * 100 : 0,
  }));

  return {
    totalOutstanding,
    totalCount,
    buckets: formattedBuckets,
  };
}

/**
 * Calculate DSO (Days Sales Outstanding)
 */
export async function calculateDSO(
  userId: string,
  periodDays: number = 90
): Promise<number> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get receivables created in the period
  const receivables = await db
    .select()
    .from(agingTable)
    .where(and(
      eq(agingTable.userId, userId),
      eq(agingTable.type, 'receivable'),
      gte(agingTable.invoiceDate, startDate),
      lte(agingTable.invoiceDate, endDate)
    ));

  if (receivables.length === 0) {
    return 0;
  }

  // Calculate average days outstanding
  const totalDays = receivables.reduce((sum, item) => {
    const days = Math.floor((endDate.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return totalDays / receivables.length;
}

/**
 * Calculate DPO (Days Payable Outstanding)
 */
export async function calculateDPO(
  userId: string,
  periodDays: number = 90
): Promise<number> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get payables created in the period
  const payables = await db
    .select()
    .from(agingTable)
    .where(and(
      eq(agingTable.userId, userId),
      eq(agingTable.type, 'payable'),
      gte(agingTable.invoiceDate, startDate),
      lte(agingTable.invoiceDate, endDate)
    ));

  if (payables.length === 0) {
    return 0;
  }

  // Calculate average days outstanding
  const totalDays = payables.reduce((sum, item) => {
    const days = Math.floor((endDate.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);

  return totalDays / payables.length;
}

/**
 * Get collection priority recommendations
 */
export async function getCollectionPriorities(
  userId: string,
  type: 'receivable' | 'payable' = 'receivable'
): Promise<CollectionPriority[]> {
  const items = await db
    .select()
    .from(agingTable)
    .where(and(
      eq(agingTable.userId, userId),
      eq(agingTable.type, type),
      eq(agingTable.status, 'outstanding')
    ));

  const priorities: CollectionPriority[] = items.map(item => {
    const daysOutstanding = Math.floor((new Date().getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const amount = parseFloat(item.currentAmount);
    
    let priority: 'high' | 'medium' | 'low';
    let recommendedAction: string;

    if (daysOutstanding > 90 || amount > 100000) {
      priority = 'high';
      recommendedAction = 'Immediate legal action or collection agency';
    } else if (daysOutstanding > 60 || amount > 50000) {
      priority = 'medium';
      recommendedAction = 'Send formal demand letter and follow up calls';
    } else {
      priority = 'low';
      recommendedAction = 'Standard collection procedures';
    }

    return {
      id: item.id,
      customerSupplier: item.customerSupplier,
      amount,
      daysOutstanding,
      priority,
      recommendedAction,
    };
  });

  // Sort by priority and amount
  return priorities.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.amount - a.amount;
  });
}

/**
 * Helper function to determine aging bucket
 */
function getAgingBucket(daysOutstanding: number): string {
  if (daysOutstanding <= 30) return '0-30';
  if (daysOutstanding <= 60) return '31-60';
  if (daysOutstanding <= 90) return '61-90';
  return '90+';
}

/**
 * Update aging data for all items
 */
export async function updateAgingData(userId: string): Promise<void> {
  const items = await db
    .select()
    .from(agingTable)
    .where(eq(agingTable.userId, userId));

  const now = new Date();
  
  for (const item of items) {
    const daysOutstanding = Math.floor((now.getTime() - item.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const agingBucket = getAgingBucket(daysOutstanding);
    const status = daysOutstanding > 0 ? 'overdue' : 'outstanding';

    await db
      .update(agingTable)
      .set({
        daysOutstanding,
        agingBucket,
        status,
        updatedAt: now,
      })
      .where(eq(agingTable.id, item.id));
  }
}

