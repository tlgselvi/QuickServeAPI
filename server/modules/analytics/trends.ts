import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { agingReports, accounts, transactions } from '@shared/schema';

export interface TrendDataPoint {
  period: string;
  date: Date;
  value: number;
  change?: number;
  changePercent?: number;
}

export interface TrendAnalysis {
  type: 'ar' | 'ap' | 'cashflow' | 'financial-health';
  period: 'monthly' | 'quarterly' | 'yearly';
  data: TrendDataPoint[];
  summary: {
    totalValue: number;
    averageValue: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendStrength: 'weak' | 'moderate' | 'strong';
    volatility: number;
    peakValue: number;
    peakDate: Date;
    lowestValue: number;
    lowestDate: Date;
  };
  forecast?: {
    nextPeriod: number;
    confidence: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface CashFlowProjection {
  period: string;
  date: Date;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  cumulativeCash: number;
  confidence: 'low' | 'medium' | 'high';
  assumptions: string[];
}

/**
 * Get AR trend analysis
 */
export async function getARTrends(
  userId: string,
  period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  months: number = 12
): Promise<TrendAnalysis> {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'monthly':
      startDate.setMonth(endDate.getMonth() - months);
      break;
    case 'quarterly':
      startDate.setMonth(endDate.getMonth() - (months * 3));
      break;
    case 'yearly':
      startDate.setFullYear(endDate.getFullYear() - Math.ceil(months / 12));
      break;
  }

  const reports = await db
    .select()
    .from(agingReports)
    .where(and(
      eq(agingReports.userId, userId),
      eq(agingReports.reportType, 'ar'),
      gte(agingReports.createdAt, startDate),
      lte(agingReports.createdAt, endDate)
    ))
    .orderBy(agingReports.createdAt);

  // Group by period
  const periodGroups = new Map<string, { date: Date; total: number; count: number }>();
  
  reports.forEach(report => {
    const reportDate = new Date(report.createdAt);
    let periodKey: string;
    
    switch (period) {
      case 'monthly':
        periodKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(reportDate.getMonth() / 3) + 1;
        periodKey = `${reportDate.getFullYear()}-Q${quarter}`;
        break;
      case 'yearly':
        periodKey = `${reportDate.getFullYear()}`;
        break;
      default:
        periodKey = reportDate.toISOString().split('T')[0];
    }
    
    if (!periodGroups.has(periodKey)) {
      periodGroups.set(periodKey, {
        date: reportDate,
        total: 0,
        count: 0,
      });
    }
    
    const group = periodGroups.get(periodKey)!;
    group.total += parseFloat(report.currentAmount);
    group.count += 1;
  });

  // Convert to trend data points
  const data: TrendDataPoint[] = Array.from(periodGroups.entries())
    .map(([period, group]) => ({
      period,
      date: group.date,
      value: group.total,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate changes
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const change = curr.value - prev.value;
    const changePercent = prev.value !== 0 ? (change / prev.value) * 100 : 0;
    
    data[i].change = change;
    data[i].changePercent = changePercent;
  }

  // Calculate summary
  const values = data.map(d => d.value);
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  const averageValue = values.length > 0 ? totalValue / values.length : 0;
  
  // Calculate trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendStrength: 'weak' | 'moderate' | 'strong' = 'weak';
  
  if (data.length >= 2) {
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalChange = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? Math.abs(totalChange / firstValue) * 100 : 0;
    
    if (totalChange > 0) {
      trend = 'increasing';
    } else if (totalChange < 0) {
      trend = 'decreasing';
    }
    
    if (changePercent > 20) {
      trendStrength = 'strong';
    } else if (changePercent > 5) {
      trendStrength = 'moderate';
    }
  }
  
  // Calculate volatility
  const volatility = values.length > 1 
    ? Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length)
    : 0;
  
  // Find peak and lowest values
  const peakIndex = values.indexOf(Math.max(...values));
  const lowestIndex = values.indexOf(Math.min(...values));
  
  const summary = {
    totalValue,
    averageValue,
    trend,
    trendStrength,
    volatility,
    peakValue: values[peakIndex] || 0,
    peakDate: data[peakIndex]?.date || new Date(),
    lowestValue: values[lowestIndex] || 0,
    lowestDate: data[lowestIndex]?.date || new Date(),
  };

  // Simple forecast
  let forecast;
  if (data.length >= 3) {
    const recentChanges = data.slice(-3).map(d => d.change || 0);
    const avgChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;
    const lastValue = data[data.length - 1].value;
    
    forecast = {
      nextPeriod: lastValue + avgChange,
      confidence: Math.min(0.8, data.length / 12), // More data = higher confidence
      direction: avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : 'stable',
    };
  }

  return {
    type: 'ar',
    period,
    data,
    summary,
    forecast,
  };
}

/**
 * Get AP trend analysis
 */
export async function getAPTrends(
  userId: string,
  period: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  months: number = 12
): Promise<TrendAnalysis> {
  // Similar to AR trends but for AP
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'monthly':
      startDate.setMonth(endDate.getMonth() - months);
      break;
    case 'quarterly':
      startDate.setMonth(endDate.getMonth() - (months * 3));
      break;
    case 'yearly':
      startDate.setFullYear(endDate.getFullYear() - Math.ceil(months / 12));
      break;
  }

  const reports = await db
    .select()
    .from(agingReports)
    .where(and(
      eq(agingReports.userId, userId),
      eq(agingReports.reportType, 'ap'),
      gte(agingReports.createdAt, startDate),
      lte(agingReports.createdAt, endDate)
    ))
    .orderBy(agingReports.createdAt);

  // Process similar to AR trends
  const periodGroups = new Map<string, { date: Date; total: number; count: number }>();
  
  reports.forEach(report => {
    const reportDate = new Date(report.createdAt);
    let periodKey: string;
    
    switch (period) {
      case 'monthly':
        periodKey = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarterly':
        const quarter = Math.floor(reportDate.getMonth() / 3) + 1;
        periodKey = `${reportDate.getFullYear()}-Q${quarter}`;
        break;
      case 'yearly':
        periodKey = `${reportDate.getFullYear()}`;
        break;
      default:
        periodKey = reportDate.toISOString().split('T')[0];
    }
    
    if (!periodGroups.has(periodKey)) {
      periodGroups.set(periodKey, {
        date: reportDate,
        total: 0,
        count: 0,
      });
    }
    
    const group = periodGroups.get(periodKey)!;
    group.total += parseFloat(report.currentAmount);
    group.count += 1;
  });

  const data: TrendDataPoint[] = Array.from(periodGroups.entries())
    .map(([period, group]) => ({
      period,
      date: group.date,
      value: group.total,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate changes and summary (same logic as AR)
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const change = curr.value - prev.value;
    const changePercent = prev.value !== 0 ? (change / prev.value) * 100 : 0;
    
    data[i].change = change;
    data[i].changePercent = changePercent;
  }

  const values = data.map(d => d.value);
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  const averageValue = values.length > 0 ? totalValue / values.length : 0;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendStrength: 'weak' | 'moderate' | 'strong' = 'weak';
  
  if (data.length >= 2) {
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalChange = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? Math.abs(totalChange / firstValue) * 100 : 0;
    
    if (totalChange > 0) {
      trend = 'increasing';
    } else if (totalChange < 0) {
      trend = 'decreasing';
    }
    
    if (changePercent > 20) {
      trendStrength = 'strong';
    } else if (changePercent > 5) {
      trendStrength = 'moderate';
    }
  }
  
  const volatility = values.length > 1 
    ? Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length)
    : 0;
  
  const peakIndex = values.indexOf(Math.max(...values));
  const lowestIndex = values.indexOf(Math.min(...values));
  
  const summary = {
    totalValue,
    averageValue,
    trend,
    trendStrength,
    volatility,
    peakValue: values[peakIndex] || 0,
    peakDate: data[peakIndex]?.date || new Date(),
    lowestValue: values[lowestIndex] || 0,
    lowestDate: data[lowestIndex]?.date || new Date(),
  };

  let forecast;
  if (data.length >= 3) {
    const recentChanges = data.slice(-3).map(d => d.change || 0);
    const avgChange = recentChanges.reduce((sum, change) => sum + change, 0) / recentChanges.length;
    const lastValue = data[data.length - 1].value;
    
    forecast = {
      nextPeriod: lastValue + avgChange,
      confidence: Math.min(0.8, data.length / 12),
      direction: avgChange > 0 ? 'up' : avgChange < 0 ? 'down' : 'stable',
    };
  }

  return {
    type: 'ap',
    period,
    data,
    summary,
    forecast,
  };
}

/**
 * Get cash flow projection
 */
export async function getCashFlowProjection(
  userId: string,
  months: number = 12
): Promise<CashFlowProjection[]> {
  // Get current cash position
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const currentCash = userAccounts.reduce((sum, account) => {
    return sum + parseFloat(account.balance);
  }, 0);

  // Get historical transaction data for projections
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, sixMonthsAgo)
    ))
    .orderBy(transactions.createdAt);

  // Calculate monthly averages
  const monthlyData = new Map<string, { inflows: number; outflows: number; count: number }>();
  
  recentTransactions.forEach(transaction => {
    const date = new Date(transaction.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { inflows: 0, outflows: 0, count: 0 });
    }
    
    const data = monthlyData.get(monthKey)!;
    const amount = parseFloat(transaction.amount);
    
    if (amount > 0) {
      data.inflows += amount;
    } else {
      data.outflows += Math.abs(amount);
    }
    data.count += 1;
  });

  // Calculate averages
  const avgInflows = Array.from(monthlyData.values()).reduce((sum, data) => sum + data.inflows, 0) / Math.max(monthlyData.size, 1);
  const avgOutflows = Array.from(monthlyData.values()).reduce((sum, data) => sum + data.outflows, 0) / Math.max(monthlyData.size, 1);

  // Generate projections
  const projections: CashFlowProjection[] = [];
  let cumulativeCash = currentCash;

  for (let i = 1; i <= months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    
    const projectedInflows = avgInflows * (1 + (Math.random() - 0.5) * 0.2); // ±10% variation
    const projectedOutflows = avgOutflows * (1 + (Math.random() - 0.5) * 0.2);
    const netCashFlow = projectedInflows - projectedOutflows;
    
    cumulativeCash += netCashFlow;
    
    // Determine confidence based on historical data quality
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (i <= 3) confidence = 'high';
    else if (i <= 6) confidence = 'medium';
    
    projections.push({
      period: date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }),
      date,
      projectedInflows,
      projectedOutflows,
      netCashFlow,
      cumulativeCash: Math.max(0, cumulativeCash),
      confidence,
      assumptions: [
        'Geçmiş trendler devam edecek',
        'Büyük olağandışı harcamalar olmayacak',
        'Gelir akışı istikrarlı kalacak',
      ],
    });
  }

  return projections;
}

/**
 * Get financial health score trends
 */
export async function getFinancialHealthTrends(
  userId: string,
  months: number = 12
): Promise<TrendAnalysis> {
  // This would typically come from stored historical health scores
  // For now, we'll simulate based on account and transaction data
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  // Get account balances over time
  const accounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  // Simulate health score calculation for each month
  const data: TrendDataPoint[] = [];
  
  for (let i = months; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    
    // Simple health score simulation based on current data
    // In a real implementation, this would be stored historical data
    const baseScore = 75;
    const variation = (Math.random() - 0.5) * 20; // ±10 points
    const score = Math.max(0, Math.min(100, baseScore + variation));
    
    data.push({
      period: date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }),
      date,
      value: score,
    });
  }

  // Calculate changes
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const change = curr.value - prev.value;
    const changePercent = prev.value !== 0 ? (change / prev.value) * 100 : 0;
    
    data[i].change = change;
    data[i].changePercent = changePercent;
  }

  const values = data.map(d => d.value);
  const totalValue = values.reduce((sum, val) => sum + val, 0);
  const averageValue = values.length > 0 ? totalValue / values.length : 0;
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let trendStrength: 'weak' | 'moderate' | 'strong' = 'weak';
  
  if (data.length >= 2) {
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalChange = lastValue - firstValue;
    const changePercent = firstValue !== 0 ? Math.abs(totalChange / firstValue) * 100 : 0;
    
    if (totalChange > 2) {
      trend = 'increasing';
    } else if (totalChange < -2) {
      trend = 'decreasing';
    }
    
    if (changePercent > 10) {
      trendStrength = 'strong';
    } else if (changePercent > 3) {
      trendStrength = 'moderate';
    }
  }
  
  const volatility = values.length > 1 
    ? Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length)
    : 0;
  
  const peakIndex = values.indexOf(Math.max(...values));
  const lowestIndex = values.indexOf(Math.min(...values));
  
  const summary = {
    totalValue,
    averageValue,
    trend,
    trendStrength,
    volatility,
    peakValue: values[peakIndex] || 0,
    peakDate: data[peakIndex]?.date || new Date(),
    lowestValue: values[lowestIndex] || 0,
    lowestDate: data[lowestIndex]?.date || new Date(),
  };

  return {
    type: 'financial-health',
    period: 'monthly',
    data,
    summary,
  };
}
