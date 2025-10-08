import { Router } from 'express';
import { db } from '../db';
import { investments, accounts } from '../db/schema';
import { eq, and, sum, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/portfolio/summary - Get portfolio summary
router.get('/summary', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    // Get all user investments
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId));

    // Calculate portfolio summary
    let totalValue = 0;
    let totalInvested = 0;
    let totalGain = 0;

    const assetAllocation: { [key: string]: { value: number; count: number } } = {};
    const riskDistribution: { [key: string]: { value: number; count: number } } = {};

    for (const investment of userInvestments) {
      const qty = parseFloat(String((investment as any).quantity || '0'));
      const buy = parseFloat(String((investment as any).purchasePrice || '0'));
      const cur = (investment as any).currentPrice != null ? parseFloat(String((investment as any).currentPrice)) : undefined;
      const investedAmount = qty * buy;
      const currentValue = cur != null ? qty * cur : investedAmount; // Use invested amount if no current price

      totalInvested += investedAmount;
      totalValue += currentValue;
      totalGain += (currentValue - investedAmount);

      // Asset allocation by type
      const { type } = investment;
      if (!assetAllocation[type]) {
        assetAllocation[type] = { value: 0, count: 0 };
      }
      assetAllocation[type].value += currentValue;
      assetAllocation[type].count += 1;

      // Risk distribution
      const risk = investment.riskLevel;
      if (!riskDistribution[risk]) {
        riskDistribution[risk] = { value: 0, count: 0 };
      }
      riskDistribution[risk].value += currentValue;
      riskDistribution[risk].count += 1;
    }

    const totalGainPercentage = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Format asset allocation
    const formattedAssetAllocation = Object.entries(assetAllocation).map(([type, data]) => ({
      type,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));

    // Format risk distribution
    const formattedRiskDistribution = Object.entries(riskDistribution).map(([level, data]) => ({
      level,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));

    const summary = {
      totalValue,
      totalGain,
      totalGainPercentage,
      totalInvested,
      assetAllocation: formattedAssetAllocation,
      riskDistribution: formattedRiskDistribution,
      investmentCount: userInvestments.length,
      lastUpdated: new Date(),
    };

    res.json(summary);
  } catch (error) {
    logger.error('Portfolio summary error:', error);
    res.status(500).json({ error: 'Portföy özeti alınırken hata oluştu' });
  }
});

// GET /api/portfolio/performance - Get portfolio performance over time
router.get('/performance', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { period = '30' } = req.query; // days

    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    // This would typically fetch historical data
    // For now, return mock performance data
    const performanceData = {
      period: `${period} days`,
      data: [
        { date: '2024-01-01', value: 100000 },
        { date: '2024-01-02', value: 101500 },
        { date: '2024-01-03', value: 99000 },
        { date: '2024-01-04', value: 102000 },
        { date: '2024-01-05', value: 103500 },
      ],
      metrics: {
        totalReturn: 3.5,
        annualizedReturn: 12.8,
        volatility: 8.2,
        sharpeRatio: 1.56,
        maxDrawdown: -5.2,
      },
    };

    res.json(performanceData);
  } catch (error) {
    logger.error('Portfolio performance error:', error);
    res.status(500).json({ error: 'Portföy performansı alınırken hata oluştu' });
  }
});

// GET /api/portfolio/rebalance - Get rebalancing suggestions
router.get('/rebalance', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Kullanıcı kimlik doğrulaması gerekli' });
    }

    // Get current portfolio allocation
    const userInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.userId, userId));

    // Calculate current allocation
    const currentAllocation: { [key: string]: number } = {};
    let totalValue = 0;

    for (const investment of userInvestments) {
      const qty2 = parseFloat(String((investment as any).quantity || '0'));
      const buy2 = parseFloat(String((investment as any).purchasePrice || '0'));
      const cur2 = (investment as any).currentPrice != null ? parseFloat(String((investment as any).currentPrice)) : undefined;
      const currentValue = cur2 != null ? qty2 * cur2 : qty2 * buy2;

      totalValue += currentValue;
      currentAllocation[investment.type] = (currentAllocation[investment.type] || 0) + currentValue;
    }

    // Target allocation (can be customized based on user profile)
    const targetAllocation = {
      stock: 60,
      bond: 25,
      crypto: 10,
      fund: 5,
    };

    // Calculate rebalancing suggestions
    const suggestions = Object.entries(targetAllocation).map(([type, targetPercentage]) => {
      const currentValue = currentAllocation[type] || 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetValue = (totalValue * targetPercentage) / 100;
      const difference = targetValue - currentValue;

      return {
        type,
        currentPercentage: Math.round(currentPercentage * 100) / 100,
        targetPercentage,
        currentValue: Math.round(currentValue * 100) / 100,
        targetValue: Math.round(targetValue * 100) / 100,
        action: difference > 0 ? 'buy' : difference < 0 ? 'sell' : 'hold',
        amount: Math.round(Math.abs(difference) * 100) / 100,
      };
    });

    res.json({
      totalValue,
      suggestions,
      lastCalculated: new Date(),
    });
  } catch (error) {
    logger.error('Portfolio rebalance error:', error);
    res.status(500).json({ error: 'Rebalancing önerileri alınırken hata oluştu' });
  }
});

export default router;
