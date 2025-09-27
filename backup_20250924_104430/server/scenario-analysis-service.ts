import { Transaction, Account, FixedExpense, Credit, Forecast, InsertForecast } from '@shared/schema';
import { storage } from './storage';
import { ForecastingService } from './forecasting-service';

interface ScenarioParameters {
  incomeMultiplier: number; // e.g., 0.9 for 10% decrease, 1.1 for 10% increase
  expenseMultiplier: number;
  fixedExpenseMultiplier: number;
  creditPaymentMultiplier: number;
  monthsToProject: number;
}

interface ScenarioResult {
  scenario: string;
  parameters: ScenarioParameters;
  projectedBalance: number;
  monthlyProjections: Array<{
    month: number;
    income: number;
    expenses: number;
    fixedExpenses: number;
    creditPayments: number;
    netCashFlow: number;
    cumulativeBalance: number;
  }>;
  riskAssessment: {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    recommendations: string[];
  };
  forecast: Forecast;
}

class ScenarioAnalysisService {
  /**
   * Analyzes a "what-if" scenario by manipulating income/expense parameters
   * @param scenarioName The name of the scenario (e.g., "Income Drop 10%")
   * @param parameters The scenario parameters to apply
   * @returns Detailed scenario analysis results
   */
  static async analyzeScenario(
    scenarioName: string, 
    parameters: ScenarioParameters
  ): Promise<ScenarioResult> {
    try {
      // Get current financial data
      const [accounts, transactions, fixedExpenses, credits] = await Promise.all([
        storage.getAccounts(),
        storage.getTransactions(),
        storage.getFixedExpenses(),
        storage.getCredits()
      ]);

      // Calculate current total balance
      const currentBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

      // Get historical data for trend analysis (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const recentTransactions = transactions.filter(t => 
        new Date(t.date) >= sixMonthsAgo
      );

      // Calculate average monthly income and expenses
      const monthlyData = this.calculateMonthlyAverages(recentTransactions);
      
      // Project future cash flows
      const monthlyProjections = this.projectMonthlyCashFlows(
        monthlyData,
        fixedExpenses,
        credits,
        parameters
      );

      // Calculate projected balance
      const projectedBalance = currentBalance + 
        monthlyProjections.reduce((sum, projection) => sum + projection.netCashFlow, 0);

      // Assess risk
      const riskAssessment = this.assessRisk(parameters, monthlyProjections, projectedBalance);

      // Create forecast record
      const forecastData: InsertForecast = {
        title: scenarioName,
        description: `Scenario analysis: ${scenarioName}`,
        type: 'scenario',
        scenario: scenarioName.toLowerCase().replace(/\s+/g, '_'),
        forecastDate: new Date(),
        targetDate: new Date(Date.now() + parameters.monthsToProject * 30 * 24 * 60 * 60 * 1000),
        predictedValue: projectedBalance.toString(),
        confidenceInterval: 85, // Scenario analysis confidence
        lowerBound: (projectedBalance * 0.85).toString(),
        upperBound: (projectedBalance * 1.15).toString(),
        currency: 'TRY',
        category: 'balance',
        parameters: JSON.stringify(parameters),
        isActive: true
      };

      const forecast = await storage.createForecast(forecastData);

      return {
        scenario: scenarioName,
        parameters,
        projectedBalance,
        monthlyProjections,
        riskAssessment,
        forecast
      };

    } catch (error) {
      console.error('Scenario analysis error:', error);
      throw new Error('Senaryo analizi yapılırken hata oluştu');
    }
  }

  /**
   * Calculates average monthly income and expenses from transaction history
   */
  private static calculateMonthlyAverages(transactions: Transaction[]) {
    const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach(transaction => {
      const monthKey = new Date(transaction.date).toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
      }

      if (transaction.type === 'income') {
        monthlyTotals[monthKey].income += transaction.amount;
      } else {
        monthlyTotals[monthKey].expenses += transaction.amount;
      }
    });

    const months = Object.keys(monthlyTotals);
    const avgIncome = months.length > 0 ? 
      months.reduce((sum, month) => sum + monthlyTotals[month].income, 0) / months.length : 0;
    const avgExpenses = months.length > 0 ? 
      months.reduce((sum, month) => sum + monthlyTotals[month].expenses, 0) / months.length : 0;

    return {
      avgMonthlyIncome: avgIncome,
      avgMonthlyExpenses: avgExpenses,
      totalMonths: months.length
    };
  }

  /**
   * Projects monthly cash flows based on scenario parameters
   */
  private static projectMonthlyCashFlows(
    monthlyData: { avgMonthlyIncome: number; avgMonthlyExpenses: number; totalMonths: number },
    fixedExpenses: FixedExpense[],
    credits: Credit[],
    parameters: ScenarioParameters
  ) {
    const projections = [];

    for (let month = 1; month <= parameters.monthsToProject; month++) {
      // Apply multipliers to base amounts
      const projectedIncome = monthlyData.avgMonthlyIncome * parameters.incomeMultiplier;
      const projectedExpenses = monthlyData.avgMonthlyExpenses * parameters.expenseMultiplier;
      
      // Calculate fixed expenses for the month
      const monthlyFixedExpenses = fixedExpenses
        .filter(expense => expense.isActive && expense.type === 'expense')
        .reduce((sum, expense) => {
          // Simplified: assume monthly fixed expenses
          return sum + (expense.recurrence === 'monthly' ? parseFloat(expense.amount) : 0);
        }, 0) * parameters.fixedExpenseMultiplier;

      // Calculate credit payments for the month
      const monthlyCreditPayments = credits
        .filter(credit => credit.isActive && credit.status === 'active')
        .reduce((sum, credit) => {
          return sum + (credit.minimumPayment ? parseFloat(credit.minimumPayment) : 0);
        }, 0) * parameters.creditPaymentMultiplier;

      const netCashFlow = projectedIncome - projectedExpenses - monthlyFixedExpenses - monthlyCreditPayments;
      
      projections.push({
        month,
        income: projectedIncome,
        expenses: projectedExpenses,
        fixedExpenses: monthlyFixedExpenses,
        creditPayments: monthlyCreditPayments,
        netCashFlow,
        cumulativeBalance: projections.length > 0 ? 
          projections[projections.length - 1].cumulativeBalance + netCashFlow : netCashFlow
      });
    }

    return projections;
  }

  /**
   * Assesses the risk level of the scenario
   */
  private static assessRisk(
    parameters: ScenarioParameters,
    monthlyProjections: any[],
    projectedBalance: number
  ): { riskLevel: 'low' | 'medium' | 'high'; riskFactors: string[]; recommendations: string[] } {
    const riskFactors: string[] = [];
    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    // Check for negative cash flows
    const negativeMonths = monthlyProjections.filter(p => p.netCashFlow < 0).length;
    if (negativeMonths > 0) {
      riskFactors.push(`${negativeMonths} ay boyunca negatif nakit akışı`);
      riskLevel = 'medium';
    }

    // Check for significant income reduction
    if (parameters.incomeMultiplier < 0.8) {
      riskFactors.push('Gelirde %20+ azalma');
      riskLevel = 'high';
      recommendations.push('Gelir artırıcı önlemler alın');
    }

    // Check for significant expense increase
    if (parameters.expenseMultiplier > 1.2) {
      riskFactors.push('Giderlerde %20+ artış');
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      recommendations.push('Gider kontrolü yapın');
    }

    // Check for projected negative balance
    if (projectedBalance < 0) {
      riskFactors.push('Projeksiyonda negatif bakiye');
      riskLevel = 'high';
      recommendations.push('Acil nakit akışı planlaması yapın');
    }

    // Check for high fixed expense ratio
    const avgFixedExpenses = monthlyProjections.reduce((sum, p) => sum + p.fixedExpenses, 0) / monthlyProjections.length;
    const avgIncome = monthlyProjections.reduce((sum, p) => sum + p.income, 0) / monthlyProjections.length;
    const fixedExpenseRatio = avgIncome > 0 ? avgFixedExpenses / avgIncome : 0;

    if (fixedExpenseRatio > 0.7) {
      riskFactors.push('Sabit giderlerin gelire oranı %70+');
      recommendations.push('Sabit giderleri gözden geçirin');
    }

    // Add general recommendations based on risk level
    if (riskLevel === 'high') {
      recommendations.push('Kriz yönetim planı hazırlayın');
      recommendations.push('Alternatif gelir kaynakları araştırın');
    } else if (riskLevel === 'medium') {
      recommendations.push('Düzenli nakit akışı takibi yapın');
      recommendations.push('Acil durum fonu oluşturun');
    } else {
      recommendations.push('Mevcut durumu koruyun');
      recommendations.push('Fırsatları değerlendirin');
    }

    return {
      riskLevel,
      riskFactors,
      recommendations
    };
  }

  /**
   * Generates predefined scenarios for common "what-if" analyses
   */
  static getPredefinedScenarios(): Array<{ name: string; description: string; parameters: ScenarioParameters }> {
    return [
      {
        name: 'Gelir %10 Azalması',
        description: 'Gelirlerde %10 azalma durumunda finansal durum analizi',
        parameters: {
          incomeMultiplier: 0.9,
          expenseMultiplier: 1.0,
          fixedExpenseMultiplier: 1.0,
          creditPaymentMultiplier: 1.0,
          monthsToProject: 12
        }
      },
      {
        name: 'Gelir %20 Azalması',
        description: 'Gelirlerde %20 azalma durumunda finansal durum analizi',
        parameters: {
          incomeMultiplier: 0.8,
          expenseMultiplier: 1.0,
          fixedExpenseMultiplier: 1.0,
          creditPaymentMultiplier: 1.0,
          monthsToProject: 12
        }
      },
      {
        name: 'Giderler %15 Artması',
        description: 'Giderlerde %15 artış durumunda finansal durum analizi',
        parameters: {
          incomeMultiplier: 1.0,
          expenseMultiplier: 1.15,
          fixedExpenseMultiplier: 1.0,
          creditPaymentMultiplier: 1.0,
          monthsToProject: 12
        }
      },
      {
        name: 'Kredi Ödemeleri Artması',
        description: 'Kredi ödemelerinde %25 artış durumunda finansal durum analizi',
        parameters: {
          incomeMultiplier: 1.0,
          expenseMultiplier: 1.0,
          fixedExpenseMultiplier: 1.0,
          creditPaymentMultiplier: 1.25,
          monthsToProject: 12
        }
      },
      {
        name: 'En Kötü Senaryo',
        description: 'Gelir azalması ve gider artışı birlikte',
        parameters: {
          incomeMultiplier: 0.8,
          expenseMultiplier: 1.2,
          fixedExpenseMultiplier: 1.1,
          creditPaymentMultiplier: 1.3,
          monthsToProject: 12
        }
      },
      {
        name: 'En İyi Senaryo',
        description: 'Gelir artışı ve gider kontrolü',
        parameters: {
          incomeMultiplier: 1.15,
          expenseMultiplier: 0.9,
          fixedExpenseMultiplier: 0.95,
          creditPaymentMultiplier: 0.8,
          monthsToProject: 12
        }
      }
    ];
  }
}

export { ScenarioAnalysisService };
