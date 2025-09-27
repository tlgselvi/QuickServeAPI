import { openaiService } from "./openaiService";
import { db } from "../../db";
import { investments, accounts } from "../../db/schema";
import { eq } from "drizzle-orm";

export interface SimulationParameter {
  name: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string;
  description: string;
}

export interface SimulationScenario {
  name: string;
  parameters: {
    [key: string]: number;
  };
  results: {
    portfolioValue: number;
    totalGain: number;
    gainPercentage: number;
    riskScore: number;
    monthlyCashFlow: number;
  };
  summary: string;
}

export interface SimulationResult {
  scenarios: SimulationScenario[];
  bestCase: SimulationScenario;
  baseCase: SimulationScenario;
  worstCase: SimulationScenario;
  insights: string[];
  recommendations: string[];
}

export class SimulationAgentService {
  
  /**
   * Get available simulation parameters
   */
  getSimulationParameters(): SimulationParameter[] {
    return [
      {
        name: 'exchange_rate',
        currentValue: 30.5,
        minValue: 25.0,
        maxValue: 35.0,
        step: 0.5,
        unit: 'TRY/USD',
        description: 'USD/TRY döviz kuru'
      },
      {
        name: 'interest_rate',
        currentValue: 45.0,
        minValue: 30.0,
        maxValue: 60.0,
        step: 2.5,
        unit: '%',
        description: 'Faiz oranı'
      },
      {
        name: 'inflation_rate',
        currentValue: 65.0,
        minValue: 40.0,
        maxValue: 80.0,
        step: 5.0,
        unit: '%',
        description: 'Enflasyon oranı'
      },
      {
        name: 'stock_market_return',
        currentValue: 15.0,
        minValue: -20.0,
        maxValue: 30.0,
        step: 5.0,
        unit: '%',
        description: 'Borsa getiri oranı'
      },
      {
        name: 'crypto_volatility',
        currentValue: 60.0,
        minValue: 30.0,
        maxValue: 100.0,
        step: 10.0,
        unit: '%',
        description: 'Kripto para volatilitesi'
      }
    ];
  }

  /**
   * Run Monte Carlo simulation with 2 parameters
   */
  async runSimulation(
    userId: string,
    param1: { name: string; value: number },
    param2: { name: string; value: number },
    timeHorizon: number = 12 // months
  ): Promise<SimulationResult> {
    try {
      // Get user's current portfolio
      const userInvestments = await db
        .select()
        .from(investments)
        .where(eq(investments.userId, userId));

      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, userId));

      // Calculate base case scenario
      const baseCase = this.calculateBaseCase(userInvestments, userAccounts);
      
      // Generate scenarios based on parameter combinations
      const scenarios = this.generateScenarios(
        baseCase,
        param1,
        param2,
        timeHorizon
      );

      // Run AI analysis on scenarios
      const analysis = await this.analyzeScenarios(scenarios, param1, param2);

      return {
        scenarios,
        bestCase: scenarios.reduce((best, current) => 
          current.results.gainPercentage > best.results.gainPercentage ? current : best
        ),
        baseCase: scenarios.find(s => s.name === 'Base Case') || scenarios[0],
        worstCase: scenarios.reduce((worst, current) => 
          current.results.gainPercentage < worst.results.gainPercentage ? current : worst
        ),
        insights: analysis.insights,
        recommendations: analysis.recommendations
      };

    } catch (error) {
      console.error('Simulation error:', error);
      throw new Error('Simülasyon çalıştırılırken hata oluştu');
    }
  }

  /**
   * Calculate base case scenario
   */
  private calculateBaseCase(investments: any[], accounts: any[]) {
    const totalInvested = investments.reduce((sum, inv) => 
      sum + (inv.quantity * inv.purchasePrice), 0
    );

    const totalCurrentValue = investments.reduce((sum, inv) => 
      sum + (inv.quantity * (inv.currentPrice || inv.purchasePrice)), 0
    );

    const totalGain = totalCurrentValue - totalInvested;
    const gainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Calculate monthly cash flow from accounts
    const monthlyCashFlow = accounts.reduce((sum, acc) => {
      if (acc.type === 'checking' || acc.type === 'savings') {
        return sum + (acc.balance * 0.005); // Assume 0.5% monthly return
      }
      return sum;
    }, 0);

    return {
      portfolioValue: totalCurrentValue,
      totalGain,
      gainPercentage,
      riskScore: this.calculateRiskScore(investments),
      monthlyCashFlow
    };
  }

  /**
   * Generate different scenarios based on parameter changes
   */
  private generateScenarios(
    baseCase: any,
    param1: { name: string; value: number },
    param2: { name: string; value: number },
    timeHorizon: number
  ): SimulationScenario[] {
    const scenarios: SimulationScenario[] = [];

    // Base case
    scenarios.push({
      name: 'Base Case',
      parameters: {
        [param1.name]: param1.value,
        [param2.name]: param2.value
      },
      results: { ...baseCase },
      summary: 'Mevcut koşullar altında portföy performansı'
    });

    // Parameter 1 variations
    scenarios.push({
      name: `${param1.name} +10%`,
      parameters: {
        [param1.name]: param1.value * 1.1,
        [param2.name]: param2.value
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 1.1, param2.name, 1.0),
      summary: `${param1.name} parametresinin %10 artışı senaryosu`
    });

    scenarios.push({
      name: `${param1.name} -10%`,
      parameters: {
        [param1.name]: param1.value * 0.9,
        [param2.name]: param2.value
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 0.9, param2.name, 1.0),
      summary: `${param1.name} parametresinin %10 azalışı senaryosu`
    });

    // Parameter 2 variations
    scenarios.push({
      name: `${param2.name} +10%`,
      parameters: {
        [param1.name]: param1.value,
        [param2.name]: param2.value * 1.1
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 1.0, param2.name, 1.1),
      summary: `${param2.name} parametresinin %10 artışı senaryosu`
    });

    scenarios.push({
      name: `${param2.name} -10%`,
      parameters: {
        [param1.name]: param1.value,
        [param2.name]: param2.value * 0.9
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 1.0, param2.name, 0.9),
      summary: `${param2.name} parametresinin %10 azalışı senaryosu`
    });

    // Combined scenarios
    scenarios.push({
      name: 'Best Case',
      parameters: {
        [param1.name]: param1.value * 1.1,
        [param2.name]: param2.value * 1.1
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 1.1, param2.name, 1.1),
      summary: 'Her iki parametrenin olumlu yönde değişimi'
    });

    scenarios.push({
      name: 'Worst Case',
      parameters: {
        [param1.name]: param1.value * 0.9,
        [param2.name]: param2.value * 0.9
      },
      results: this.calculateScenarioResults(baseCase, param1.name, 0.9, param2.name, 0.9),
      summary: 'Her iki parametrenin olumsuz yönde değişimi'
    });

    return scenarios;
  }

  /**
   * Calculate scenario results based on parameter changes
   */
  private calculateScenarioResults(
    baseCase: any,
    param1Name: string,
    param1Multiplier: number,
    param2Name: string,
    param2Multiplier: number
  ) {
    let portfolioValue = baseCase.portfolioValue;
    let monthlyCashFlow = baseCase.monthlyCashFlow;
    let riskScore = baseCase.riskScore;

    // Apply parameter effects
    if (param1Name === 'exchange_rate') {
      // USD denominated investments affected
      portfolioValue *= (1 + (param1Multiplier - 1) * 0.3);
    } else if (param1Name === 'interest_rate') {
      // Bond investments and cash flow affected
      monthlyCashFlow *= param1Multiplier;
      portfolioValue *= (1 + (param1Multiplier - 1) * 0.2);
    } else if (param1Name === 'inflation_rate') {
      // All investments affected by inflation
      portfolioValue *= (1 - (param1Multiplier - 1) * 0.1);
    } else if (param1Name === 'stock_market_return') {
      // Stock investments affected
      portfolioValue *= (1 + (param1Multiplier - 1) * 0.4);
    } else if (param1Name === 'crypto_volatility') {
      // Crypto investments affected
      portfolioValue *= (1 + (param1Multiplier - 1) * 0.2);
      riskScore += (param1Multiplier - 1) * 2;
    }

    // Apply second parameter effects
    if (param2Name === 'exchange_rate') {
      portfolioValue *= (1 + (param2Multiplier - 1) * 0.2);
    } else if (param2Name === 'interest_rate') {
      monthlyCashFlow *= param2Multiplier;
      portfolioValue *= (1 + (param2Multiplier - 1) * 0.15);
    } else if (param2Name === 'inflation_rate') {
      portfolioValue *= (1 - (param2Multiplier - 1) * 0.08);
    } else if (param2Name === 'stock_market_return') {
      portfolioValue *= (1 + (param2Multiplier - 1) * 0.3);
    } else if (param2Name === 'crypto_volatility') {
      portfolioValue *= (1 + (param2Multiplier - 1) * 0.15);
      riskScore += (param2Multiplier - 1) * 1.5;
    }

    const totalInvested = baseCase.portfolioValue - baseCase.totalGain;
    const totalGain = portfolioValue - totalInvested;
    const gainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return {
      portfolioValue: Math.round(portfolioValue),
      totalGain: Math.round(totalGain),
      gainPercentage: Math.round(gainPercentage * 100) / 100,
      riskScore: Math.max(1, Math.min(10, Math.round(riskScore))),
      monthlyCashFlow: Math.round(monthlyCashFlow)
    };
  }

  /**
   * Calculate risk score based on portfolio composition
   */
  private calculateRiskScore(investments: any[]): number {
    if (investments.length === 0) return 5;

    const cryptoRatio = investments.filter(i => i.type === 'crypto').length / investments.length;
    const stockRatio = investments.filter(i => i.type === 'stock').length / investments.length;
    const bondRatio = investments.filter(i => i.type === 'bond').length / investments.length;

    let riskScore = 5;
    riskScore += cryptoRatio * 3; // Crypto adds risk
    riskScore += stockRatio * 1; // Stocks add moderate risk
    riskScore -= bondRatio * 1; // Bonds reduce risk

    return Math.max(1, Math.min(10, Math.round(riskScore)));
  }

  /**
   * AI analysis of simulation scenarios
   */
  private async analyzeScenarios(
    scenarios: SimulationScenario[],
    param1: { name: string; value: number },
    param2: { name: string; value: number }
  ) {
    try {
      const scenarioSummary = scenarios.map(s => 
        `${s.name}: ${s.results.gainPercentage}% getiri, ${s.results.riskScore}/10 risk`
      ).join('\n');

      const analysisPrompt = `
        Analyze the following portfolio simulation results and provide insights:

        Parameters Analyzed:
        - ${param1.name}: ${param1.value}
        - ${param2.name}: ${param2.value}

        Scenario Results:
        ${scenarioSummary}

        Please provide:
        1. Key insights about how these parameters affect the portfolio
        2. 3-5 actionable recommendations based on the simulation

        Respond in JSON format with "insights" and "recommendations" arrays.
      `;

      const response = await openaiService.generateResponse(analysisPrompt, {
        temperature: 0.4,
        max_tokens: 400
      });

      return JSON.parse(response);

    } catch (error) {
      console.error('Scenario analysis error:', error);
      
      // Fallback analysis
      return {
        insights: [
          `${param1.name} ve ${param2.name} parametreleri portföy performansını etkiliyor`,
          'Farklı senaryolar arasında önemli performans farklılıkları var',
          'Risk-ödül dengesi değişken'
        ],
        recommendations: [
          'Portföyü çeşitlendirin',
          'Risk yönetimi stratejisi geliştirin',
          'Parametre değişikliklerini düzenli takip edin'
        ]
      };
    }
  }
}

export const simulationAgentService = new SimulationAgentService();
