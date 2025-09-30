import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { accounts, transactions, agingReports } from '@shared/schema';

export interface RunwayAnalysis {
  currentCash: number;
  monthlyExpenses: number;
  runwayMonths: number;
  runwayDays: number;
  status: 'critical' | 'warning' | 'healthy';
  recommendations: string[];
  monthlyBreakdown: Array<{
    month: string;
    projectedCash: number;
    expenses: number;
    netCash: number;
  }>;
}

export interface CashGapAnalysis {
  totalAR: number;
  totalAP: number;
  cashGap: number;
  arDueIn30Days: number;
  apDueIn30Days: number;
  netGap30Days: number;
  arDueIn60Days: number;
  apDueIn60Days: number;
  netGap60Days: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timeline: Array<{
    period: string;
    arAmount: number;
    apAmount: number;
    netCashFlow: number;
    cumulativeCash: number;
  }>;
}

/**
 * Calculate runway analysis
 */
export async function calculateRunway(
  userId: string,
  months: number = 12
): Promise<RunwayAnalysis> {
  // Get current cash position
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const currentCash = userAccounts.reduce((sum, account) => {
    return sum + parseFloat(account.balance);
  }, 0);

  // Calculate monthly expenses from last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, sixMonthsAgo),
      lte(transactions.amount, '0') // Expenses are negative
    ));

  const totalExpenses = Math.abs(recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0));
  const monthlyExpenses = totalExpenses / 6; // Average over 6 months

  // Calculate runway
  const runwayMonths = monthlyExpenses > 0 ? currentCash / monthlyExpenses : Infinity;
  const runwayDays = monthlyExpenses > 0 ? (currentCash / monthlyExpenses) * 30 : Infinity;

  // Determine status
  let status: 'critical' | 'warning' | 'healthy';
  if (runwayMonths < 3) {
    status = 'critical';
  } else if (runwayMonths < 6) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (status === 'critical') {
    recommendations.push('Acil nakit ihtiyacınız var - gelir artırma veya gider azaltma gerekli');
    recommendations.push('Kısa vadeli kredi limitleri değerlendirin');
    recommendations.push('Alacaklarınızı hızlandırma stratejileri uygulayın');
  } else if (status === 'warning') {
    recommendations.push('Nakit pozisyonunuzu yakından takip edin');
    recommendations.push('Gelir artırma fırsatlarını değerlendirin');
    recommendations.push('Gereksiz giderleri gözden geçirin');
  } else {
    recommendations.push('Sağlıklı nakit pozisyonunuz var');
    recommendations.push('Yatırım fırsatlarını değerlendirebilirsiniz');
  }

  // Calculate monthly breakdown
  const monthlyBreakdown: Array<{
    month: string;
    projectedCash: number;
    expenses: number;
    netCash: number;
  }> = [];

  let runningCash = currentCash;
  for (let i = 1; i <= months; i++) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() + i);
    const monthName = monthDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    
    const expenses = monthlyExpenses;
    const netCash = -expenses; // Expenses reduce cash
    runningCash += netCash;
    
    monthlyBreakdown.push({
      month: monthName,
      projectedCash: Math.max(0, runningCash),
      expenses,
      netCash,
    });
  }

  return {
    currentCash,
    monthlyExpenses,
    runwayMonths: Math.round(runwayMonths * 100) / 100,
    runwayDays: Math.round(runwayDays),
    status,
    recommendations,
    monthlyBreakdown,
  };
}

/**
 * Calculate cash gap analysis
 */
export async function calculateCashGap(
  userId: string,
  months: number = 6
): Promise<CashGapAnalysis> {
  // Get AR and AP data
  const arReports = await db
    .select()
    .from(agingReports)
    .where(and(
      eq(agingReports.userId, userId),
      eq(agingReports.reportType, 'ar')
    ));

  const apReports = await db
    .select()
    .from(agingReports)
    .where(and(
      eq(agingReports.userId, userId),
      eq(agingReports.reportType, 'ap')
    ));

  // Calculate totals
  const totalAR = arReports.reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);
  const totalAP = apReports.reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);
  const cashGap = totalAR - totalAP;

  // Calculate due amounts by period
  const arDueIn30Days = arReports
    .filter(report => report.agingDays <= 30)
    .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

  const apDueIn30Days = apReports
    .filter(report => report.agingDays <= 30)
    .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

  const netGap30Days = arDueIn30Days - apDueIn30Days;

  const arDueIn60Days = arReports
    .filter(report => report.agingDays <= 60)
    .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

  const apDueIn60Days = apReports
    .filter(report => report.agingDays <= 60)
    .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

  const netGap60Days = arDueIn60Days - apDueIn60Days;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  const gapRatio = totalAP > 0 ? Math.abs(cashGap) / totalAP : 0;
  
  if (gapRatio > 0.5) {
    riskLevel = 'critical';
  } else if (gapRatio > 0.3) {
    riskLevel = 'high';
  } else if (gapRatio > 0.1) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (cashGap < 0) {
    recommendations.push('Borçlarınız alacaklarınızdan fazla - nakit akışı riski var');
    recommendations.push('Alacak tahsilat süreçlerinizi hızlandırın');
    recommendations.push('Borç ödeme planlarını gözden geçirin');
  } else {
    recommendations.push('Pozitif nakit akışı pozisyonunuz var');
    recommendations.push('Alacaklarınızı zamanında tahsil etmeye devam edin');
  }

  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('Nakit akışı yönetimini öncelik haline getirin');
    recommendations.push('Kısa vadeli finansman seçeneklerini değerlendirin');
  }

  // Create timeline
  const timeline: Array<{
    period: string;
    arAmount: number;
    apAmount: number;
    netCashFlow: number;
    cumulativeCash: number;
  }> = [];

  let cumulativeCash = 0;
  for (let i = 0; i < months; i++) {
    const periodStart = i * 30;
    const periodEnd = (i + 1) * 30;
    
    const arInPeriod = arReports
      .filter(report => report.agingDays > periodStart && report.agingDays <= periodEnd)
      .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

    const apInPeriod = apReports
      .filter(report => report.agingDays > periodStart && report.agingDays <= periodEnd)
      .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

    const netCashFlow = arInPeriod - apInPeriod;
    cumulativeCash += netCashFlow;

    timeline.push({
      period: `${periodStart + 1}-${periodEnd} gün`,
      arAmount: arInPeriod,
      apAmount: apInPeriod,
      netCashFlow,
      cumulativeCash,
    });
  }

  return {
    totalAR,
    totalAP,
    cashGap,
    arDueIn30Days,
    apDueIn30Days,
    netGap30Days,
    arDueIn60Days,
    apDueIn60Days,
    netGap60Days,
    riskLevel,
    recommendations,
    timeline,
  };
}

/**
 * Get combined dashboard data
 */
export async function getDashboardRunwayCashGap(
  userId: string
): Promise<{
  runway: RunwayAnalysis;
  cashGap: CashGapAnalysis;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: {
    totalCash: number;
    totalAR: number;
    totalAP: number;
    netPosition: number;
    runwayStatus: string;
    cashGapStatus: string;
  };
}> {
  const [runway, cashGap] = await Promise.all([
    calculateRunway(userId),
    calculateCashGap(userId),
  ]);

  // Calculate overall risk
  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (runway.status === 'critical' || cashGap.riskLevel === 'critical') {
    overallRisk = 'critical';
  } else if (runway.status === 'warning' || cashGap.riskLevel === 'high') {
    overallRisk = 'high';
  } else if (cashGap.riskLevel === 'medium') {
    overallRisk = 'medium';
  }

  const summary = {
    totalCash: runway.currentCash,
    totalAR: cashGap.totalAR,
    totalAP: cashGap.totalAP,
    netPosition: runway.currentCash + cashGap.totalAR - cashGap.totalAP,
    runwayStatus: runway.status,
    cashGapStatus: cashGap.riskLevel,
  };

  return {
    runway,
    cashGap,
    overallRisk,
    summary,
  };
}

/**
 * Get cash flow forecast
 */
export async function getCashFlowForecast(
  userId: string,
  months: number = 12
): Promise<Array<{
  month: string;
  openingCash: number;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  closingCash: number;
  confidence: 'low' | 'medium' | 'high';
}>> {
  const runway = await calculateRunway(userId, months);
  const cashGap = await calculateCashGap(userId, months);
  
  const forecast: Array<{
    month: string;
    openingCash: number;
    projectedInflows: number;
    projectedOutflows: number;
    netCashFlow: number;
    closingCash: number;
    confidence: 'low' | 'medium' | 'high';
  }> = [];

  let openingCash = runway.currentCash;
  
  for (let i = 0; i < months; i++) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() + i);
    const monthName = monthDate.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
    
    // Estimate inflows from AR aging
    const projectedInflows = i < cashGap.timeline.length ? cashGap.timeline[i].arAmount : 0;
    
    // Estimate outflows from expenses and AP
    const projectedOutflows = runway.monthlyExpenses + (i < cashGap.timeline.length ? cashGap.timeline[i].apAmount : 0);
    
    const netCashFlow = projectedInflows - projectedOutflows;
    const closingCash = openingCash + netCashFlow;
    
    // Determine confidence based on data quality
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (i < 3) confidence = 'high';
    else if (i < 6) confidence = 'medium';
    
    forecast.push({
      month: monthName,
      openingCash,
      projectedInflows,
      projectedOutflows,
      netCashFlow,
      closingCash: Math.max(0, closingCash),
      confidence,
    });
    
    openingCash = closingCash;
  }

  return forecast;
}
