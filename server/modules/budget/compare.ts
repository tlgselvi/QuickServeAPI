import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { budgetLines, transactions, accounts } from '@shared/schema';

export interface BudgetComparisonItem {
  category: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'on-budget' | 'over-budget' | 'under-budget';
  transactionCount: number;
}

export interface BudgetComparisonSummary {
  month: string;
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  totalVariancePercentage: number;
  categories: BudgetComparisonItem[];
  topOverBudget: BudgetComparisonItem[];
  topUnderBudget: BudgetComparisonItem[];
  overallStatus: 'on-budget' | 'over-budget' | 'under-budget';
}

export interface MonthlyTrend {
  month: string;
  plannedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
}

/**
 * Compare budget vs actual for a specific month
 */
export async function compareBudgetVsActual(
  userId: string,
  month: string // YYYY-MM format
): Promise<BudgetComparisonSummary> {
  const startDate = new Date(`${month}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of the month

  // Get budget lines for the month
  const budgetLinesList = await db
    .select()
    .from(budgetLines)
    .where(and(
      eq(budgetLines.userId, userId),
      gte(budgetLines.month, startDate),
      lte(budgetLines.month, endDate)
    ));

  // Get actual transactions for the month
  const actualTransactions = await db
    .select({
      category: transactions.category,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, startDate),
      lte(transactions.createdAt, endDate)
    ));

  // Create category map from budget lines
  const budgetMap = new Map<string, { planned: number; actual: number }>();
  
  budgetLinesList.forEach(budgetLine => {
    const category = budgetLine.category;
    if (!budgetMap.has(category)) {
      budgetMap.set(category, { planned: 0, actual: 0 });
    }
    budgetMap.get(category)!.planned += parseFloat(budgetLine.plannedAmount);
    budgetMap.get(category)!.actual += parseFloat(budgetLine.actualAmount || '0');
  });

  // Add actual transactions to the map
  actualTransactions.forEach(transaction => {
    const category = transaction.category || 'Diğer';
    if (!budgetMap.has(category)) {
      budgetMap.set(category, { planned: 0, actual: 0 });
    }
    budgetMap.get(category)!.actual += parseFloat(transaction.amount);
  });

  // Convert to comparison items
  const categories: BudgetComparisonItem[] = Array.from(budgetMap.entries()).map(([category, data]) => {
    const variance = data.planned - data.actual;
    const variancePercentage = data.planned > 0 ? (variance / data.planned) * 100 : 0;
    
    let status: 'on-budget' | 'over-budget' | 'under-budget';
    if (Math.abs(variancePercentage) <= 5) {
      status = 'on-budget';
    } else if (variancePercentage > 5) {
      status = 'under-budget';
    } else {
      status = 'over-budget';
    }

    const transactionCount = actualTransactions.filter(t => (t.category || 'Diğer') === category).length;

    return {
      category,
      plannedAmount: data.planned,
      actualAmount: data.actual,
      variance,
      variancePercentage,
      status,
      transactionCount,
    };
  });

  // Calculate totals
  const totalPlanned = categories.reduce((sum, cat) => sum + cat.plannedAmount, 0);
  const totalActual = categories.reduce((sum, cat) => sum + cat.actualAmount, 0);
  const totalVariance = totalPlanned - totalActual;
  const totalVariancePercentage = totalPlanned > 0 ? (totalVariance / totalPlanned) * 100 : 0;

  // Determine overall status
  let overallStatus: 'on-budget' | 'over-budget' | 'under-budget';
  if (Math.abs(totalVariancePercentage) <= 5) {
    overallStatus = 'on-budget';
  } else if (totalVariancePercentage > 5) {
    overallStatus = 'under-budget';
  } else {
    overallStatus = 'over-budget';
  }

  // Sort categories by variance (highest over-budget first)
  const sortedCategories = categories.sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage));

  const topOverBudget = sortedCategories.filter(cat => cat.status === 'over-budget').slice(0, 5);
  const topUnderBudget = sortedCategories.filter(cat => cat.status === 'under-budget').slice(0, 5);

  return {
    month,
    totalPlanned,
    totalActual,
    totalVariance,
    totalVariancePercentage,
    categories: sortedCategories,
    topOverBudget,
    topUnderBudget,
    overallStatus,
  };
}

/**
 * Get budget comparison trends for multiple months
 */
export async function getBudgetComparisonTrends(
  userId: string,
  months: number = 6
): Promise<MonthlyTrend[]> {
  const trends: MonthlyTrend[] = [];
  const currentDate = new Date();
  
  for (let i = months - 1; i >= 0; i--) {
    const targetDate = new Date(currentDate);
    targetDate.setMonth(targetDate.getMonth() - i);
    
    const month = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const comparison = await compareBudgetVsActual(userId, month);
    
    trends.push({
      month,
      plannedAmount: comparison.totalPlanned,
      actualAmount: comparison.totalActual,
      variance: comparison.totalVariance,
      variancePercentage: comparison.totalVariancePercentage,
    });
  }

  return trends;
}

/**
 * Get budget performance insights
 */
export async function getBudgetPerformanceInsights(
  userId: string,
  month: string
): Promise<{
  insights: string[];
  recommendations: string[];
  riskAreas: string[];
}> {
  const comparison = await compareBudgetVsActual(userId, month);
  const insights: string[] = [];
  const recommendations: string[] = [];
  const riskAreas: string[] = [];

  // Overall performance insights
  if (comparison.overallStatus === 'on-budget') {
    insights.push('Bütçe performansınız hedeflere uygun seviyede.');
  } else if (comparison.overallStatus === 'over-budget') {
    insights.push(`Toplam harcama bütçeyi %${Math.abs(comparison.totalVariancePercentage).toFixed(1)} aştı.`);
    riskAreas.push('Genel bütçe aşımı');
  } else {
    insights.push(`Toplam harcama bütçenin %${comparison.totalVariancePercentage.toFixed(1)} altında kaldı.`);
  }

  // Category-specific insights
  comparison.topOverBudget.forEach(category => {
    insights.push(`${category.category} kategorisinde %${Math.abs(category.variancePercentage).toFixed(1)} bütçe aşımı var.`);
    riskAreas.push(category.category);
  });

  // Generate recommendations
  if (comparison.overallStatus === 'over-budget') {
    recommendations.push('Harcama kalemlerinizi gözden geçirin ve gereksiz giderleri azaltın.');
    
    if (comparison.topOverBudget.length > 0) {
      const topCategory = comparison.topOverBudget[0];
      recommendations.push(`${topCategory.category} kategorisindeki harcamalarınızı kontrol altına alın.`);
    }
  }

  if (comparison.topUnderBudget.length > 0) {
    recommendations.push('Bazı kategorilerde bütçeniz altında kalıyorsunuz. Bu fonları tasarruf olarak değerlendirebilirsiniz.');
  }

  // Risk assessment
  if (comparison.totalVariancePercentage < -20) {
    riskAreas.push('Yüksek bütçe aşımı riski');
    recommendations.push('Acil durum fonu oluşturmayı düşünün.');
  }

  if (comparison.topOverBudget.length >= 3) {
    riskAreas.push('Çoklu kategori aşımı');
    recommendations.push('Harcama alışkanlıklarınızı gözden geçirin.');
  }

  return {
    insights,
    recommendations,
    riskAreas,
  };
}

/**
 * Get budget categories with highest variance
 */
export async function getBudgetVarianceAnalysis(
  userId: string,
  month: string,
  limit: number = 10
): Promise<{
  highestOverBudget: BudgetComparisonItem[];
  highestUnderBudget: BudgetComparisonItem[];
  mostVolatile: BudgetComparisonItem[];
}> {
  const comparison = await compareBudgetVsActual(userId, month);

  const highestOverBudget = comparison.categories
    .filter(cat => cat.status === 'over-budget')
    .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
    .slice(0, limit);

  const highestUnderBudget = comparison.categories
    .filter(cat => cat.status === 'under-budget')
    .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
    .slice(0, limit);

  const mostVolatile = comparison.categories
    .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
    .slice(0, limit);

  return {
    highestOverBudget,
    highestUnderBudget,
    mostVolatile,
  };
}

/**
 * Calculate budget efficiency score
 */
export async function calculateBudgetEfficiencyScore(
  userId: string,
  month: string
): Promise<{
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    overallAccuracy: number;
    categoryConsistency: number;
    trendStability: number;
  };
}> {
  const comparison = await compareBudgetVsActual(userId, month);
  
  // Overall accuracy (how close actual is to planned)
  const overallAccuracy = Math.max(0, 100 - Math.abs(comparison.totalVariancePercentage));
  
  // Category consistency (how many categories are on-budget)
  const onBudgetCategories = comparison.categories.filter(cat => cat.status === 'on-budget').length;
  const categoryConsistency = comparison.categories.length > 0 
    ? (onBudgetCategories / comparison.categories.length) * 100 
    : 100;
  
  // Trend stability (based on variance distribution)
  const varianceStdDev = calculateStandardDeviation(comparison.categories.map(cat => cat.variancePercentage));
  const trendStability = Math.max(0, 100 - varianceStdDev);
  
  // Weighted score
  const score = (overallAccuracy * 0.4) + (categoryConsistency * 0.4) + (trendStability * 0.2);
  
  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return {
    score: Math.round(score),
    grade,
    factors: {
      overallAccuracy: Math.round(overallAccuracy),
      categoryConsistency: Math.round(categoryConsistency),
      trendStability: Math.round(trendStability),
    },
  };
}

/**
 * Helper function to calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
  
  return Math.sqrt(avgSquaredDiff);
}
