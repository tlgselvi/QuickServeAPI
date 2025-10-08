import { openaiService } from './openaiService';
import { db } from '../../db';
import { accounts, transactions, investments } from '../../../shared/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';

export interface FinancialAnalysisRequest {
  userId: string;
  analysisType: 'trend' | 'risk' | 'recommendation' | 'health' | 'forecast';
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  includeInvestments?: boolean;
  customPrompt?: string;
}

export interface TrendAnalysis {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  trends: {
    income: 'increasing' | 'decreasing' | 'stable';
    expenses: 'increasing' | 'decreasing' | 'stable';
    savings: 'increasing' | 'decreasing' | 'stable';
  };
  insights: string[];
  recommendations: string[];
  confidence: number;
}

export interface RiskAssessment {
  riskScore: number; // 1-10
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  mitigationStrategies: string[];
  liquidityRisk: number;
  creditRisk: number;
  marketRisk: number;
  operationalRisk: number;
}

export interface FinancialRecommendation {
  category: 'investment' | 'savings' | 'expense_reduction' | 'income_optimization' | 'debt_management';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  potentialImpact: string;
  estimatedSavings?: number;
  estimatedReturn?: number;
  timeframe: string;
  actionItems: string[];
}

export interface FinancialHealth {
  overallScore: number; // 0-100
  healthLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  components: {
    liquidity: number;
    solvency: number;
    profitability: number;
    efficiency: number;
  };
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
}

export interface FinancialForecast {
  timeframe: string;
  scenarios: {
    optimistic: {
      netWorth: number;
      cashFlow: number;
      confidence: number;
    };
    realistic: {
      netWorth: number;
      cashFlow: number;
      confidence: number;
    };
    pessimistic: {
      netWorth: number;
      cashFlow: number;
      confidence: number;
    };
  };
  assumptions: string[];
  risks: string[];
  recommendations: string[];
}

export class FinancialAnalysisService {
  /**
   * Perform comprehensive financial analysis
   */
  async analyzeFinancials(request: FinancialAnalysisRequest): Promise<any> {
    try {
      // Get user's financial data
      const financialData = await this.getFinancialData(request.userId, request.timeframe);
      
      // Generate AI-powered analysis based on type
      switch (request.analysisType) {
        case 'trend':
          return await this.analyzeTrends(financialData, request);
        case 'risk':
          return await this.assessRisk(financialData, request);
        case 'recommendation':
          return await this.generateRecommendations(financialData, request);
        case 'health':
          return await this.calculateFinancialHealth(financialData, request);
        case 'forecast':
          return await this.generateForecast(financialData, request);
        default:
          throw new Error(`Unsupported analysis type: ${request.analysisType}`);
      }
    } catch (error) {
      logger.error('Financial analysis error:', error);
      throw error;
    }
  }

  /**
   * Analyze financial trends
   */
  private async analyzeTrends(data: any, request: FinancialAnalysisRequest): Promise<TrendAnalysis> {
    const prompt = `
      Analyze the following financial data and provide trend analysis:

      Financial Data:
      - Total Income (${request.timeframe}): ${data.totalIncome}
      - Total Expenses (${request.timeframe}): ${data.totalExpenses}
      - Net Cash Flow: ${data.netCashFlow}
      - Previous Period Income: ${data.previousIncome}
      - Previous Period Expenses: ${data.previousExpenses}
      - Account Balances: ${JSON.stringify(data.accountBalances)}
      - Transaction Categories: ${JSON.stringify(data.categories)}

      Please provide:
      1. Trend analysis for income, expenses, and savings
      2. Key insights about financial patterns
      3. Actionable recommendations
      4. Confidence score (0-100)

      Respond in JSON format with the following structure:
      {
        "period": "${request.timeframe}",
        "totalIncome": ${data.totalIncome},
        "totalExpenses": ${data.totalExpenses},
        "netCashFlow": ${data.netCashFlow},
        "trends": {
          "income": "increasing|decreasing|stable",
          "expenses": "increasing|decreasing|stable", 
          "savings": "increasing|decreasing|stable"
        },
        "insights": ["insight1", "insight2"],
        "recommendations": ["rec1", "rec2"],
        "confidence": 85
      }
    `;

    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.3,
      max_tokens: 1000,
    });

    if (!response.success) {
      throw new Error(response.error || 'Trend analysis failed');
    }

    return JSON.parse(response.response);
  }

  /**
   * Assess financial risk
   */
  private async assessRisk(data: any, request: FinancialAnalysisRequest): Promise<RiskAssessment> {
    const prompt = `
      Assess the financial risk for the following data:

      Financial Position:
      - Total Assets: ${data.totalAssets}
      - Total Liabilities: ${data.totalLiabilities}
      - Net Worth: ${data.netWorth}
      - Monthly Income: ${data.monthlyIncome}
      - Monthly Expenses: ${data.monthlyExpenses}
      - Emergency Fund: ${data.emergencyFund}
      - Debt-to-Income Ratio: ${data.debtToIncomeRatio}
      - Liquidity Ratio: ${data.liquidityRatio}
      - Investment Portfolio: ${JSON.stringify(data.investments)}

      Risk Factors to Consider:
      - Liquidity risk (ability to meet short-term obligations)
      - Credit risk (debt management)
      - Market risk (investment exposure)
      - Operational risk (income stability)

      Provide a comprehensive risk assessment in JSON format:
      {
        "riskScore": 7,
        "riskLevel": "medium",
        "riskFactors": ["factor1", "factor2"],
        "mitigationStrategies": ["strategy1", "strategy2"],
        "liquidityRisk": 6,
        "creditRisk": 8,
        "marketRisk": 5,
        "operationalRisk": 4
      }
    `;

    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.2,
      max_tokens: 800,
    });

    if (!response.success) {
      throw new Error(response.error || 'Risk assessment failed');
    }

    return JSON.parse(response.response);
  }

  /**
   * Generate financial recommendations
   */
  private async generateRecommendations(data: any, request: FinancialAnalysisRequest): Promise<FinancialRecommendation[]> {
    const prompt = `
      Generate personalized financial recommendations based on:

      Current Financial Situation:
      - Income: ${data.monthlyIncome}
      - Expenses: ${data.monthlyExpenses}
      - Savings Rate: ${data.savingsRate}%
      - Debt: ${data.totalDebt}
      - Investments: ${data.investmentValue}
      - Age: ${data.userAge || 'Not specified'}
      - Financial Goals: ${data.goals || 'Not specified'}

      Provide actionable recommendations in JSON format:
      [
        {
          "category": "investment|savings|expense_reduction|income_optimization|debt_management",
          "priority": "low|medium|high|urgent",
          "title": "Recommendation Title",
          "description": "Detailed description",
          "potentialImpact": "Expected impact",
          "estimatedSavings": 1000,
          "estimatedReturn": 500,
          "timeframe": "1-3 months",
          "actionItems": ["action1", "action2"]
        }
      ]
    `;

    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.4,
      max_tokens: 1200,
    });

    if (!response.success) {
      throw new Error(response.error || 'Recommendation generation failed');
    }

    return JSON.parse(response.response);
  }

  /**
   * Calculate financial health score
   */
  private async calculateFinancialHealth(data: any, request: FinancialAnalysisRequest): Promise<FinancialHealth> {
    const prompt = `
      Calculate a comprehensive financial health score for:

      Financial Metrics:
      - Net Worth: ${data.netWorth}
      - Monthly Income: ${data.monthlyIncome}
      - Monthly Expenses: ${data.monthlyExpenses}
      - Savings Rate: ${data.savingsRate}%
      - Emergency Fund: ${data.emergencyFund}
      - Debt-to-Income: ${data.debtToIncomeRatio}%
      - Credit Score: ${data.creditScore || 'Not available'}
      - Investment Diversification: ${data.diversificationScore || 'Not calculated'}

      Calculate health score (0-100) and provide analysis in JSON:
      {
        "overallScore": 75,
        "healthLevel": "good",
        "components": {
          "liquidity": 80,
          "solvency": 70,
          "profitability": 85,
          "efficiency": 65
        },
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "improvementAreas": ["area1", "area2"]
      }
    `;

    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.2,
      max_tokens: 600,
    });

    if (!response.success) {
      throw new Error(response.error || 'Financial health calculation failed');
    }

    return JSON.parse(response.response);
  }

  /**
   * Generate financial forecast
   */
  private async generateForecast(data: any, request: FinancialAnalysisRequest): Promise<FinancialForecast> {
    const prompt = `
      Generate a financial forecast based on current data:

      Current Financial Position:
      - Net Worth: ${data.netWorth}
      - Monthly Income: ${data.monthlyIncome}
      - Monthly Expenses: ${data.monthlyExpenses}
      - Growth Rate: ${data.historicalGrowthRate || 'Not available'}
      - Investment Portfolio: ${JSON.stringify(data.investments)}
      - Economic Outlook: ${data.economicOutlook || 'Moderate growth expected'}

      Create scenarios for the next 12 months in JSON format:
      {
        "timeframe": "12 months",
        "scenarios": {
          "optimistic": {
            "netWorth": 150000,
            "cashFlow": 5000,
            "confidence": 75
          },
          "realistic": {
            "netWorth": 140000,
            "cashFlow": 3000,
            "confidence": 85
          },
          "pessimistic": {
            "netWorth": 120000,
            "cashFlow": 1000,
            "confidence": 70
          }
        },
        "assumptions": ["assumption1", "assumption2"],
        "risks": ["risk1", "risk2"],
        "recommendations": ["rec1", "rec2"]
      }
    `;

    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.3,
      max_tokens: 800,
    });

    if (!response.success) {
      throw new Error(response.error || 'Forecast generation failed');
    }

    return JSON.parse(response.response);
  }

  /**
   * Get user's financial data for analysis
   */
  private async getFinancialData(userId: string, timeframe?: string) {
    const now = new Date();
    const timeframes = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };

    const days = timeframe ? timeframes[timeframe] || 30 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get accounts
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));

    // Get transactions
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate),
          lte(transactions.date, now)
        )
      )
      .orderBy(desc(transactions.date));

    // Get investments
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId));

    // Calculate financial metrics
    const totalIncome = userTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = userTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const totalAssets = userAccounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const investmentValue = userInvestments.reduce((sum, i) => sum + parseFloat(i.currentValue), 0);

    return {
      totalIncome,
      totalExpenses,
      netCashFlow,
      totalAssets,
      investmentValue,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      netWorth: totalAssets + investmentValue,
      accountBalances: userAccounts.map(a => ({ id: a.id, name: a.name, balance: a.balance })),
      categories: this.categorizeTransactions(userTransactions),
      investments: userInvestments.map(i => ({ type: i.type, value: i.currentValue, risk: i.riskLevel })),
      savingsRate: totalIncome > 0 ? ((netCashFlow / totalIncome) * 100) : 0,
      debtToIncomeRatio: 0, // Would need debt data
      liquidityRatio: totalAssets / Math.max(totalExpenses, 1),
      emergencyFund: 0, // Would need emergency fund data
      previousIncome: totalIncome * 0.9, // Mock previous period
      previousExpenses: totalExpenses * 1.1, // Mock previous period
    };
  }

  /**
   * Categorize transactions for analysis
   */
  private categorizeTransactions(transactions: any[]) {
    const categories: Record<string, number> = {};
    
    transactions.forEach(t => {
      const category = t.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + parseFloat(t.amount);
    });

    return categories;
  }
}

// Export singleton instance
export const financialAnalysisService = new FinancialAnalysisService();
export default financialAnalysisService;
