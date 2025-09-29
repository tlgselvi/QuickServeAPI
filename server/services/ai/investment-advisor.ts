import { openaiService } from './openaiService';
import { db } from '../../db';
import { investments, accounts } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export interface RiskAssessment {
  riskScore: number; // 1-10
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
  recommendations: string[];
}

export interface PortfolioRecommendation {
  strategy: 'conservative' | 'balanced' | 'aggressive';
  allocation: {
    stocks: number;
    bonds: number;
    crypto: number;
    funds: number;
    realEstate: number;
  };
  reasoning: string;
  expectedReturn: number;
  expectedVolatility: number;
}

export class InvestmentAdvisorService {
  /**
   * Calculate risk score based on portfolio composition and user profile
   */
  async calculateRiskScore (userId: string): Promise<RiskAssessment> {
    try {
      // Get user's current investments
      const userInvestments = await db
        .select()
        .from(investments)
        .where(eq(investments.userId, userId));

      // Get user's account information
      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId));

      // Calculate portfolio metrics
      const portfolioMetrics = this.calculatePortfolioMetrics(userInvestments);

      // Generate AI-powered risk assessment
      const riskPrompt = `
        Analyze the following portfolio and provide a risk assessment:

        Portfolio Composition:
        - Total Investments: ${userInvestments.length}
        - Investment Types: ${userInvestments.map(i => i.type).join(', ')}
        - Risk Levels: ${userInvestments.map(i => i.riskLevel).join(', ')}
        - Total Value: ${portfolioMetrics.totalValue}
        - Diversification Score: ${portfolioMetrics.diversificationScore}

        Account Information:
        - Total Accounts: ${userAccounts.length}
        - Account Types: ${userAccounts.map(a => a.type).join(', ')}

        Please provide:
        1. Risk Score (1-10, where 1 is very low risk, 10 is very high risk)
        2. Risk Level (low/medium/high)
        3. Main Risk Factors (array of strings)
        4. Recommendations (array of strings)

        Respond in JSON format.
      `;

      const response = await openaiService.generateResponse(riskPrompt, {
        temperature: 0.3,
        max_tokens: 500,
      });

      if (!response.success) {
        throw new Error(response.error || 'Risk assessment failed');
      }

      const riskAssessment = JSON.parse(response.response);

      return {
        riskScore: Math.max(1, Math.min(10, riskAssessment.riskScore || 5)),
        riskLevel: riskAssessment.riskLevel || 'medium',
        riskFactors: riskAssessment.riskFactors || [],
        recommendations: riskAssessment.recommendations || [],
      };
    } catch (error) {
      console.error('Risk assessment error:', error);

      // Fallback to basic calculation
      return this.calculateBasicRiskScore([]);
    }
  }

  /**
   * Generate portfolio recommendations based on risk profile
   */
  async generatePortfolioRecommendation (userId: string, riskTolerance?: 'conservative' | 'balanced' | 'aggressive'): Promise<PortfolioRecommendation> {
    try {
      // Get risk assessment
      const riskAssessment = await this.calculateRiskScore(userId);

      // Determine strategy based on risk score
      let strategy: 'conservative' | 'balanced' | 'aggressive';
      if (!riskTolerance) {
        if (riskAssessment.riskScore <= 3) {
          strategy = 'conservative';
        } else if (riskAssessment.riskScore <= 7) {
          strategy = 'balanced';
        } else {
          strategy = 'aggressive';
        }
      } else {
        strategy = riskTolerance;
      }

      // Generate AI-powered recommendation
      const recommendationPrompt = `
        Based on the following risk assessment, provide a portfolio allocation recommendation:

        Risk Score: ${riskAssessment.riskScore}/10
        Risk Level: ${riskAssessment.riskLevel}
        Strategy: ${strategy}

        Please provide an optimal asset allocation for this risk profile:
        - Stocks (%)
        - Bonds (%)
        - Crypto (%)
        - Funds (%)
        - Real Estate (%)

        Also include:
        - Reasoning for the allocation
        - Expected annual return (%)
        - Expected volatility (%)

        Respond in JSON format.
      `;

      const response = await openaiService.generateResponse(recommendationPrompt, {
        temperature: 0.4,
        max_tokens: 400,
      });

      if (!response.success) {
        throw new Error(response.error || 'Recommendation generation failed');
      }

      const recommendation = JSON.parse(response.response);

      return {
        strategy,
        allocation: {
          stocks: recommendation.stocks || 0,
          bonds: recommendation.bonds || 0,
          crypto: recommendation.crypto || 0,
          funds: recommendation.funds || 0,
          realEstate: recommendation.realEstate || 0,
        },
        reasoning: recommendation.reasoning || '',
        expectedReturn: recommendation.expectedReturn || 0,
        expectedVolatility: recommendation.expectedVolatility || 0,
      };
    } catch (error) {
      console.error('Portfolio recommendation error:', error);

      // Fallback to predefined allocations
      return this.getFallbackRecommendation('balanced');
    }
  }

  /**
   * Get investment suggestions based on current portfolio
   */
  async getInvestmentSuggestions (userId: string): Promise<{
    suggestions: Array<{
      type: string;
      symbol?: string;
      reason: string;
      expectedReturn: number;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      const riskAssessment = await this.calculateRiskScore(userId);

      const suggestionPrompt = `
        Based on the current portfolio risk assessment, suggest 3-5 specific investment opportunities:

        Current Risk Score: ${riskAssessment.riskScore}/10
        Risk Level: ${riskAssessment.riskLevel}
        Risk Factors: ${riskAssessment.riskFactors.join(', ')}

        Provide specific investment suggestions including:
        - Investment type (stock, crypto, bond, fund, real_estate)
        - Symbol (if applicable)
        - Reason for recommendation
        - Expected return (%)
        - Risk level

        Focus on:
        - Diversification opportunities
        - Risk mitigation
        - Growth potential

        Respond in JSON format with a "suggestions" array.
      `;

      const response = await openaiService.generateResponse(suggestionPrompt, {
        temperature: 0.5,
        max_tokens: 600,
      });

      if (!response.success) {
        throw new Error(response.error || 'Suggestion generation failed');
      }

      return JSON.parse(response.response);
    } catch (error) {
      console.error('Investment suggestions error:', error);

      return {
        suggestions: this.getFallbackSuggestions('medium'),
      };
    }
  }

  /**
   * Calculate basic portfolio metrics
   */
  private calculatePortfolioMetrics (investments: any[]) {
    const totalValue = investments.reduce((sum, inv) => {
      const value = inv.currentPrice ? inv.quantity * inv.currentPrice : inv.quantity * inv.purchasePrice;
      return sum + value;
    }, 0);

    const typeDistribution = investments.reduce((acc, inv) => {
      acc[inv.type] = (acc[inv.type] || 0) + 1;
      return acc;
    }, {});

    const diversificationScore = Object.keys(typeDistribution).length;

    return {
      totalValue,
      diversificationScore,
      typeDistribution,
    };
  }

  /**
   * Fallback risk calculation
   */
  private calculateBasicRiskScore (investments: any[]): RiskAssessment {
    if (investments.length === 0) {
      return {
        riskScore: 5,
        riskLevel: 'medium',
        riskFactors: ['Portföy boş'],
        recommendations: ['Yatırım yapmaya başlayın'],
      };
    }

    const cryptoCount = investments.filter(i => i.type === 'crypto').length;
    const stockCount = investments.filter(i => i.type === 'stock').length;
    const bondCount = investments.filter(i => i.type === 'bond').length;

    let riskScore = 5;
    const riskFactors = [];
    const recommendations = [];

    // Adjust risk score based on portfolio composition
    if (cryptoCount > stockCount) {
      riskScore += 2;
      riskFactors.push('Yüksek kripto para oranı');
      recommendations.push('Kripto para riskini azaltın');
    }

    if (bondCount === 0) {
      riskScore += 1;
      riskFactors.push('Tahvil yatırımı yok');
      recommendations.push('Tahvil ekleyerek riski azaltın');
    }

    if (investments.length < 3) {
      riskScore += 1;
      riskFactors.push('Yetersiz çeşitlendirme');
      recommendations.push('Portföyü çeşitlendirin');
    }

    riskScore = Math.max(1, Math.min(10, riskScore));

    return {
      riskScore,
      riskLevel: riskScore <= 3 ? 'low' : riskScore <= 7 ? 'medium' : 'high',
      riskFactors,
      recommendations,
    };
  }

  /**
   * Fallback portfolio recommendations
   */
  private getFallbackRecommendation (strategy: string): PortfolioRecommendation {
    const allocations = {
      conservative: {
        stocks: 30, bonds: 50, crypto: 5, funds: 10, realEstate: 5,
        expectedReturn: 6, expectedVolatility: 8,
      },
      balanced: {
        stocks: 50, bonds: 30, crypto: 10, funds: 5, realEstate: 5,
        expectedReturn: 9, expectedVolatility: 12,
      },
      aggressive: {
        stocks: 60, bonds: 15, crypto: 15, funds: 5, realEstate: 5,
        expectedReturn: 12, expectedVolatility: 18,
      },
    };

    const allocation = allocations[strategy as keyof typeof allocations] || allocations.balanced;

    return {
      strategy: strategy as any,
      allocation,
      reasoning: `${strategy} stratejisi için optimize edilmiş portföy dağılımı`,
      expectedReturn: allocation.expectedReturn,
      expectedVolatility: allocation.expectedVolatility,
    };
  }

  /**
   * Fallback investment suggestions
   */
  private getFallbackSuggestions (riskLevel: string) {
    const suggestions = {
      low: [
        { type: 'bond', reason: 'Düşük riskli tahvil yatırımı', expectedReturn: 5, riskLevel: 'low' as const },
        { type: 'fund', reason: 'Dengeli fon yatırımı', expectedReturn: 7, riskLevel: 'low' as const },
      ],
      medium: [
        { type: 'stock', symbol: 'AAPL', reason: 'Teknoloji hissesi', expectedReturn: 10, riskLevel: 'medium' as const },
        { type: 'bond', reason: 'Kurumsal tahvil', expectedReturn: 6, riskLevel: 'low' as const },
        { type: 'crypto', symbol: 'BTC', reason: 'Kripto para çeşitlendirmesi', expectedReturn: 15, riskLevel: 'high' as const },
      ],
      high: [
        { type: 'crypto', symbol: 'ETH', reason: 'Ethereum yatırımı', expectedReturn: 20, riskLevel: 'high' as const },
        { type: 'stock', symbol: 'TSLA', reason: 'Büyüme hissesi', expectedReturn: 18, riskLevel: 'high' as const },
      ],
    };

    return suggestions[riskLevel as keyof typeof suggestions] || suggestions.medium;
  }
}

export const investmentAdvisorService = new InvestmentAdvisorService();
