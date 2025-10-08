import { openaiService } from './openaiService';
import { financialAnalysisService } from './financial-analysis-service';
import { db } from '../../db';
import { users, accounts, transactions } from '../../../shared/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { eventBus, publishDashboardEvent } from '../realtime/eventBus';

export interface NotificationRule {
  id: string;
  userId: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'milestone' | 'custom';
  condition: string;
  threshold?: number;
  enabled: boolean;
  channels: ('dashboard' | 'email' | 'push')[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes between notifications
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'financial' | 'security' | 'system' | 'recommendation';
  data?: any;
  createdAt: Date;
  read: boolean;
  channels: string[];
  actionUrl?: string;
  actionText?: string;
}

export interface AnomalyDetection {
  type: 'expense_spike' | 'income_drop' | 'unusual_transaction' | 'balance_alert';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  confidence: number;
  data: any;
}

export interface TrendAlert {
  type: 'positive' | 'negative' | 'neutral';
  metric: string;
  change: number;
  period: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
}

export class SmartNotificationService {
  private notificationRules: Map<string, NotificationRule[]> = new Map();
  private lastNotificationTimes: Map<string, Date> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  /**
   * Check for anomalies and generate notifications
   */
  async checkForAnomalies(userId: string): Promise<AnomalyDetection[]> {
    try {
      const anomalies: AnomalyDetection[] = [];

      // Get recent transactions
      const recentTransactions = await this.getRecentTransactions(userId, 7); // Last 7 days
      const historicalData = await this.getHistoricalData(userId, 30); // Last 30 days

      // Check for expense spikes
      const expenseAnomalies = await this.detectExpenseSpikes(recentTransactions, historicalData);
      anomalies.push(...expenseAnomalies);

      // Check for income drops
      const incomeAnomalies = await this.detectIncomeDrops(recentTransactions, historicalData);
      anomalies.push(...incomeAnomalies);

      // Check for unusual transactions
      const transactionAnomalies = await this.detectUnusualTransactions(recentTransactions);
      anomalies.push(...transactionAnomalies);

      // Check for balance alerts
      const balanceAnomalies = await this.detectBalanceAlerts(userId);
      anomalies.push(...balanceAnomalies);

      return anomalies;
    } catch (error) {
      logger.error('Anomaly detection error:', error);
      return [];
    }
  }

  /**
   * Check for trend changes
   */
  async checkForTrends(userId: string): Promise<TrendAlert[]> {
    try {
      const trends: TrendAlert[] = [];

      // Get financial data for trend analysis
      const currentData = await this.getCurrentFinancialData(userId);
      const historicalData = await this.getHistoricalData(userId, 90); // Last 90 days

      // Analyze spending trends
      const spendingTrend = await this.analyzeSpendingTrend(currentData, historicalData);
      if (spendingTrend) trends.push(spendingTrend);

      // Analyze savings trends
      const savingsTrend = await this.analyzeSavingsTrend(currentData, historicalData);
      if (savingsTrend) trends.push(savingsTrend);

      // Analyze income trends
      const incomeTrend = await this.analyzeIncomeTrend(currentData, historicalData);
      if (incomeTrend) trends.push(incomeTrend);

      return trends;
    } catch (error) {
      logger.error('Trend analysis error:', error);
      return [];
    }
  }

  /**
   * Generate smart notifications based on analysis
   */
  async generateSmartNotifications(userId: string): Promise<Notification[]> {
    try {
      const notifications: Notification[] = [];

      // Check for anomalies
      const anomalies = await this.checkForAnomalies(userId);
      for (const anomaly of anomalies) {
        if (anomaly.severity !== 'low') {
          const notification = await this.createAnomalyNotification(userId, anomaly);
          notifications.push(notification);
        }
      }

      // Check for trends
      const trends = await this.checkForTrends(userId);
      for (const trend of trends) {
        if (trend.significance !== 'low') {
          const notification = await this.createTrendNotification(userId, trend);
          notifications.push(notification);
        }
      }

      // Check for milestones
      const milestones = await this.checkForMilestones(userId);
      notifications.push(...milestones);

      // Check custom rules
      const customNotifications = await this.checkCustomRules(userId);
      notifications.push(...customNotifications);

      // Send notifications
      for (const notification of notifications) {
        await this.sendNotification(notification);
      }

      return notifications;
    } catch (error) {
      logger.error('Smart notification generation error:', error);
      return [];
    }
  }

  /**
   * Create notification rule
   */
  async createNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<NotificationRule> {
    const newRule: NotificationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.notificationRules.has(rule.userId)) {
      this.notificationRules.set(rule.userId, []);
    }
    this.notificationRules.get(rule.userId)!.push(newRule);

    logger.info(`Created notification rule ${newRule.id} for user ${rule.userId}`);
    return newRule;
  }

  /**
   * Detect expense spikes using AI
   */
  private async detectExpenseSpikes(recent: any[], historical: any[]): Promise<AnomalyDetection[]> {
    const recentExpenses = recent.filter(t => t.type === 'expense');
    const historicalExpenses = historical.filter(t => t.type === 'expense');

    const recentTotal = recentExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const historicalAverage = historicalExpenses.reduce((sum, t) => sum + parseFloat(t.amount), 0) / 30;

    if (recentTotal > historicalAverage * 1.5) {
      const prompt = `
        Analyze this expense spike anomaly:
        
        Recent 7-day expenses: $${recentTotal.toFixed(2)}
        Historical 30-day average: $${historicalAverage.toFixed(2)}
        Increase: ${((recentTotal / historicalAverage - 1) * 100).toFixed(1)}%
        
        Recent expense categories: ${JSON.stringify(recentExpenses.map(t => t.category))}
        
        Provide severity assessment (low/medium/high) and explanation.
        Respond in JSON format:
        {
          "severity": "medium",
          "description": "Expense spike detected",
          "impact": "Budget may be at risk",
          "confidence": 85
        }
      `;

      const response = await openaiService.generateResponse(prompt, {
        temperature: 0.2,
        max_tokens: 200,
      });

      if (response.success) {
        const analysis = JSON.parse(response.response);
        return [{
          type: 'expense_spike',
          severity: analysis.severity,
          description: analysis.description,
          impact: analysis.impact,
          confidence: analysis.confidence,
          data: {
            recentTotal,
            historicalAverage,
            increase: (recentTotal / historicalAverage - 1) * 100,
            categories: recentExpenses.map(t => t.category)
          }
        }];
      }
    }

    return [];
  }

  /**
   * Detect income drops using AI
   */
  private async detectIncomeDrops(recent: any[], historical: any[]): Promise<AnomalyDetection[]> {
    const recentIncome = recent.filter(t => t.type === 'income');
    const historicalIncome = historical.filter(t => t.type === 'income');

    const recentTotal = recentIncome.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const historicalAverage = historicalIncome.reduce((sum, t) => sum + parseFloat(t.amount), 0) / 30;

    if (recentTotal < historicalAverage * 0.7) {
      const prompt = `
        Analyze this income drop anomaly:
        
        Recent 7-day income: $${recentTotal.toFixed(2)}
        Historical 30-day average: $${historicalAverage.toFixed(2)}
        Decrease: ${((1 - recentTotal / historicalAverage) * 100).toFixed(1)}%
        
        Provide severity assessment and explanation.
        Respond in JSON format:
        {
          "severity": "high",
          "description": "Significant income drop detected",
          "impact": "Cash flow may be affected",
          "confidence": 90
        }
      `;

      const response = await openaiService.generateResponse(prompt, {
        temperature: 0.2,
        max_tokens: 200,
      });

      if (response.success) {
        const analysis = JSON.parse(response.response);
        return [{
          type: 'income_drop',
          severity: analysis.severity,
          description: analysis.description,
          impact: analysis.impact,
          confidence: analysis.confidence,
          data: {
            recentTotal,
            historicalAverage,
            decrease: (1 - recentTotal / historicalAverage) * 100
          }
        }];
      }
    }

    return [];
  }

  /**
   * Detect unusual transactions using AI
   */
  private async detectUnusualTransactions(recent: any[]): Promise<AnomalyDetection[]> {
    const unusualTransactions: AnomalyDetection[] = [];

    for (const transaction of recent) {
      // Check for unusually large amounts
      const amount = parseFloat(transaction.amount);
      if (amount > 1000) { // Threshold for "large" transactions
        const prompt = `
          Analyze this potentially unusual transaction:
          
          Amount: $${amount}
          Category: ${transaction.category}
          Description: ${transaction.description}
          Date: ${transaction.date}
          
          Is this transaction unusual? Consider amount, category, and timing.
          Respond in JSON format:
          {
            "unusual": true,
            "severity": "medium",
            "description": "Large transaction detected",
            "confidence": 75
          }
        `;

        const response = await openaiService.generateResponse(prompt, {
          temperature: 0.3,
          max_tokens: 150,
        });

        if (response.success) {
          const analysis = JSON.parse(response.response);
          if (analysis.unusual) {
            unusualTransactions.push({
              type: 'unusual_transaction',
              severity: analysis.severity,
              description: analysis.description,
              impact: 'Review recommended',
              confidence: analysis.confidence,
              data: transaction
            });
          }
        }
      }
    }

    return unusualTransactions;
  }

  /**
   * Detect balance alerts
   */
  private async detectBalanceAlerts(userId: string): Promise<AnomalyDetection[]> {
    const accounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const alerts: AnomalyDetection[] = [];

    for (const account of accounts) {
      const balance = parseFloat(account.balance);
      
      // Low balance alert
      if (balance < 100) {
        alerts.push({
          type: 'balance_alert',
          severity: 'high',
          description: `Low balance in ${account.name}`,
          impact: 'Account may become overdrawn',
          confidence: 95,
          data: { account, balance }
        });
      }
    }

    return alerts;
  }

  /**
   * Analyze spending trend
   */
  private async analyzeSpendingTrend(current: any, historical: any[]): Promise<TrendAlert | null> {
    const currentSpending = current.totalExpenses;
    const historicalSpending = historical.reduce((sum, t) => sum + (t.type === 'expense' ? parseFloat(t.amount) : 0), 0) / historical.length;

    const change = ((currentSpending - historicalSpending) / historicalSpending) * 100;

    if (Math.abs(change) > 10) { // Significant change threshold
      return {
        type: change > 0 ? 'negative' : 'positive',
        metric: 'spending',
        change: Math.abs(change),
        period: '30 days',
        description: `Spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
        significance: Math.abs(change) > 20 ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * Analyze savings trend
   */
  private async analyzeSavingsTrend(current: any, historical: any[]): Promise<TrendAlert | null> {
    const currentSavings = current.netCashFlow;
    const historicalSavings = historical.reduce((sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : 0) - (t.type === 'expense' ? parseFloat(t.amount) : 0), 0) / historical.length;

    const change = ((currentSavings - historicalSavings) / Math.max(historicalSavings, 1)) * 100;

    if (Math.abs(change) > 15) {
      return {
        type: change > 0 ? 'positive' : 'negative',
        metric: 'savings',
        change: Math.abs(change),
        period: '30 days',
        description: `Savings rate ${change > 0 ? 'improved' : 'declined'} by ${Math.abs(change).toFixed(1)}%`,
        significance: Math.abs(change) > 25 ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * Analyze income trend
   */
  private async analyzeIncomeTrend(current: any, historical: any[]): Promise<TrendAlert | null> {
    const currentIncome = current.totalIncome;
    const historicalIncome = historical.reduce((sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : 0), 0) / historical.length;

    const change = ((currentIncome - historicalIncome) / Math.max(historicalIncome, 1)) * 100;

    if (Math.abs(change) > 10) {
      return {
        type: change > 0 ? 'positive' : 'negative',
        metric: 'income',
        change: Math.abs(change),
        period: '30 days',
        description: `Income ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
        significance: Math.abs(change) > 20 ? 'high' : 'medium'
      };
    }

    return null;
  }

  /**
   * Check for financial milestones
   */
  private async checkForMilestones(userId: string): Promise<Notification[]> {
    const milestones: Notification[] = [];
    const accounts = await db.select().from(accounts).where(eq(accounts.userId, userId));

    // Check for savings milestones
    const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0);
    
    if (totalBalance >= 10000 && totalBalance < 10050) { // Just crossed $10k
      milestones.push({
        id: `milestone_${Date.now()}`,
        userId,
        type: 'milestone',
        title: '🎉 Savings Milestone!',
        message: 'Congratulations! You\'ve reached $10,000 in savings.',
        priority: 'medium',
        category: 'financial',
        createdAt: new Date(),
        read: false,
        channels: ['dashboard'],
        actionUrl: '/dashboard',
        actionText: 'View Dashboard'
      });
    }

    return milestones;
  }

  /**
   * Check custom notification rules
   */
  private async checkCustomRules(userId: string): Promise<Notification[]> {
    const rules = this.notificationRules.get(userId) || [];
    const notifications: Notification[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastNotification = this.lastNotificationTimes.get(`${userId}_${rule.id}`);
      if (lastNotification && Date.now() - lastNotification.getTime() < rule.cooldown * 60 * 1000) {
        continue;
      }

      // Evaluate rule condition
      const conditionMet = await this.evaluateRuleCondition(rule, userId);
      if (conditionMet) {
        const notification = await this.createRuleNotification(userId, rule);
        notifications.push(notification);
        this.lastNotificationTimes.set(`${userId}_${rule.id}`, new Date());
      }
    }

    return notifications;
  }

  /**
   * Create anomaly notification
   */
  private async createAnomalyNotification(userId: string, anomaly: AnomalyDetection): Promise<Notification> {
    const priorityMap = {
      low: 'low' as const,
      medium: 'medium' as const,
      high: 'high' as const,
      critical: 'critical' as const
    };

    return {
      id: `anomaly_${Date.now()}`,
      userId,
      type: 'anomaly',
      title: `🚨 ${anomaly.type.replace('_', ' ').toUpperCase()}`,
      message: `${anomaly.description}. ${anomaly.impact}`,
      priority: priorityMap[anomaly.severity],
      category: 'financial',
      data: anomaly,
      createdAt: new Date(),
      read: false,
      channels: ['dashboard'],
      actionUrl: '/transactions',
      actionText: 'Review Transactions'
    };
  }

  /**
   * Create trend notification
   */
  private async createTrendNotification(userId: string, trend: TrendAlert): Promise<Notification> {
    const emoji = trend.type === 'positive' ? '📈' : trend.type === 'negative' ? '📉' : '📊';
    
    return {
      id: `trend_${Date.now()}`,
      userId,
      type: 'trend',
      title: `${emoji} ${trend.metric.charAt(0).toUpperCase() + trend.metric.slice(1)} Trend`,
      message: trend.description,
      priority: trend.significance,
      category: 'financial',
      data: trend,
      createdAt: new Date(),
      read: false,
      channels: ['dashboard'],
      actionUrl: '/analytics',
      actionText: 'View Analytics'
    };
  }

  /**
   * Create rule-based notification
   */
  private async createRuleNotification(userId: string, rule: NotificationRule): Promise<Notification> {
    return {
      id: `rule_${rule.id}_${Date.now()}`,
      userId,
      type: rule.type,
      title: 'Custom Alert',
      message: `Rule triggered: ${rule.condition}`,
      priority: rule.priority,
      category: 'financial',
      data: rule,
      createdAt: new Date(),
      read: false,
      channels: rule.channels,
      actionUrl: '/dashboard',
      actionText: 'View Details'
    };
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      // Send to dashboard via real-time events
      if (notification.channels.includes('dashboard')) {
        publishDashboardEvent(
          notification.userId,
          'notification',
          notification,
          { priority: notification.priority, category: notification.category }
        );
      }

      // Send email if configured
      if (notification.channels.includes('email')) {
        await this.sendEmailNotification(notification);
      }

      // Send push notification if configured
      if (notification.channels.includes('push')) {
        await this.sendPushNotification(notification);
      }

      logger.info(`Sent notification ${notification.id} to user ${notification.userId}`);
    } catch (error) {
      logger.error(`Failed to send notification ${notification.id}:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    // Email sending implementation would go here
    logger.info(`Email notification sent for ${notification.id}`);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    // Push notification implementation would go here
    logger.info(`Push notification sent for ${notification.id}`);
  }

  /**
   * Evaluate rule condition
   */
  private async evaluateRuleCondition(rule: NotificationRule, userId: string): Promise<boolean> {
    // Rule evaluation logic would go here
    // For now, return false as a placeholder
    return false;
  }

  /**
   * Initialize default notification rules
   */
  private initializeDefaultRules(): void {
    // Default rules would be initialized here
    logger.info('Initialized default notification rules');
  }

  /**
   * Start monitoring process
   */
  private startMonitoring(): void {
    // Run monitoring every 15 minutes
    setInterval(async () => {
      try {
        const users = await db.select().from(users).where(eq(users.isActive, true));
        
        for (const user of users) {
          await this.generateSmartNotifications(user.id);
        }
      } catch (error) {
        logger.error('Monitoring process error:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    logger.info('Started smart notification monitoring');
  }

  /**
   * Helper methods
   */
  private async getRecentTransactions(userId: string, days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate)
        )
      );
  }

  private async getHistoricalData(userId: string, days: number): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, startDate)
        )
      );
  }

  private async getCurrentFinancialData(userId: string): Promise<any> {
    const recentTransactions = await this.getRecentTransactions(userId, 30);
    
    const totalIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses
    };
  }
}

// Export singleton instance
export const smartNotificationService = new SmartNotificationService();
export default smartNotificationService;
