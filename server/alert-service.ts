import { storage } from './storage';
import type { InsertSystemAlert, Transaction } from '@shared/schema';
import { logger } from './utils/logger.ts';

export class AlertService {
  /**
   * Check for low balance alerts
   */
  async checkLowBalanceAlerts (threshold: number = 100): Promise<void> {
    try {
      const accounts = await storage.getAccounts();
      const existingAlerts = await storage.getSystemAlertsByType('low_balance');

      for (const account of accounts) {
        const balance = parseFloat(account.balance);
        const hasExistingAlert = existingAlerts.some(
          alert => alert.accountId === account.id && alert.isActive && !alert.isDismissed,
        );

        // Create alert if balance is low and no existing alert
        if (balance < threshold && !hasExistingAlert) {
          const alertData: InsertSystemAlert = {
            type: 'low_balance',
            title: 'Düşük Bakiye Uyarısı',
            description: `${account.bankName} - ${account.accountName} hesabınızın bakiyesi düşük (${balance.toLocaleString('tr-TR')} ${account.currency})`,
            severity: balance < 50 ? 'high' : 'medium',
            isActive: true,
            isDismissed: false,
            accountId: account.id,
            metadata: JSON.stringify({ threshold, currentBalance: balance }),
          };

          await storage.createSystemAlert(alertData);
          logger.info(`Low balance alert created for account ${account.accountName}`);
        }

        // Dismiss alerts if balance is now sufficient
        if (balance >= threshold && hasExistingAlert) {
          const activeAlert = existingAlerts.find(
            alert => alert.accountId === account.id && alert.isActive && !alert.isDismissed,
          );
          if (activeAlert) {
            await storage.dismissSystemAlert(activeAlert.id);
            logger.info(`Low balance alert dismissed for account ${account.accountName}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking low balance alerts:', error);
    }
  }

  /**
   * Check for recurring payment reminders based on transaction patterns
   */
  async checkRecurringPaymentReminders (): Promise<void> {
    try {
      const transactions = await storage.getTransactions();
      const existingAlerts = await storage.getSystemAlertsByType('recurring_payment');

      // Group recurring transactions by description and amount
      const recurringPatterns = new Map<string, Transaction[]>();

      transactions.filter(t => t.type === 'expense').forEach(transaction => {
        const key = `${transaction.description.toLowerCase()}-${transaction.amount}`;
        if (!recurringPatterns.has(key)) {
          recurringPatterns.set(key, []);
        }
        recurringPatterns.get(key)!.push(transaction);
      });

      // Find patterns that occur monthly
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      for (const [key, transactionList] of Array.from(recurringPatterns.entries())) {
        if (transactionList.length < 2) {
          continue;
        } // Need at least 2 transactions for pattern

        // Sort by date
        transactionList.sort((a: Transaction, b: Transaction) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Check if it's a monthly pattern
        const recentTransactions = transactionList.filter(
          (t: Transaction) => new Date(t.date) >= thirtyDaysAgo,
        );

        if (recentTransactions.length === 0) {
          // No recent transactions for this pattern, might be due
          const lastTransaction = transactionList[transactionList.length - 1];
          const daysSinceLastPayment = Math.floor(
            (now.getTime() - new Date(lastTransaction.date).getTime()) / (24 * 60 * 60 * 1000),
          );

          // If it's been 25-35 days, create reminder
          if (daysSinceLastPayment >= 25 && daysSinceLastPayment <= 35) {
            const hasExistingAlert = existingAlerts.some(
              alert => alert.description.includes(lastTransaction.description) &&
                      alert.isActive && !alert.isDismissed,
            );

            if (!hasExistingAlert) {
              const alertData: InsertSystemAlert = {
                type: 'recurring_payment',
                title: 'Tekrar Eden Ödeme Hatırlatması',
                description: `"${lastTransaction.description}" ödemesi yaklaşık ${daysSinceLastPayment} gün önce yapıldı. Yeni ödeme zamanı yaklaşıyor olabilir.`,
                severity: 'medium',
                triggerDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                isActive: true,
                isDismissed: false,
                transactionId: lastTransaction.id,
                metadata: JSON.stringify({
                  pattern: key,
                  daysSinceLastPayment,
                  amount: lastTransaction.amount,
                }),
              };

              await storage.createSystemAlert(alertData);
              logger.info(`Recurring payment reminder created for: ${lastTransaction.description}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error checking recurring payment reminders:', error);
    }
  }

  /**
   * Check for budget exceeded alerts based on category spending
   */
  async checkBudgetAlerts (): Promise<void> {
    try {
      const transactions = await storage.getTransactions();
      const existingAlerts = await storage.getSystemAlertsByType('budget_exceeded');

      // Monthly spending by category (simple budget check)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlySpending = new Map<string, { amount: number; count: number }>();

      transactions.filter(t =>
        t.type === 'expense' &&
        new Date(t.date) >= startOfMonth &&
        t.category,
      ).forEach(transaction => {
        const category = transaction.category!;
        if (!monthlySpending.has(category)) {
          monthlySpending.set(category, { amount: 0, count: 0 });
        }
        const spending = monthlySpending.get(category)!;
        spending.amount += parseFloat(transaction.amount);
        spending.count++;
      });

      // Simple budget thresholds (could be configurable)
      const budgetLimits = {
        food: 2000,
        transportation: 800,
        shopping: 1500,
        entertainment: 1000,
        utilities: 1200,
      };

      for (const [category, spending] of Array.from(monthlySpending.entries())) {
        const limit = budgetLimits[category as keyof typeof budgetLimits];
        if (!limit) {
          continue;
        }

        const percentage = (spending.amount / limit) * 100;

        if (percentage >= 90) {
          const hasExistingAlert = existingAlerts.some(
            alert => alert.metadata?.includes(category) &&
                    alert.isActive && !alert.isDismissed,
          );

          if (!hasExistingAlert) {
            const alertData: InsertSystemAlert = {
              type: 'budget_exceeded',
              title: percentage >= 100 ? 'Bütçe Aşıldı!' : 'Bütçe Uyarısı',
              description: `${category} kategorisinde bu ay ${spending.amount.toLocaleString('tr-TR')} TL harcama yaptınız (Bütçe: ${limit.toLocaleString('tr-TR')} TL, %${percentage.toFixed(0)})`,
              severity: percentage >= 100 ? 'high' : 'medium',
              isActive: true,
              isDismissed: false,
              metadata: JSON.stringify({
                category,
                spent: spending.amount,
                limit,
                percentage: percentage.toFixed(2),
                transactionCount: spending.count,
              }),
            };

            await storage.createSystemAlert(alertData);
            logger.info(`Budget alert created for category: ${category}`);
          }
        }
      }
    } catch (error) {
      logger.error('Error checking budget alerts:', error);
    }
  }

  /**
   * Generate end-of-month financial summary alert
   */
  async createMonthlyFinancialSummary (): Promise<void> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Check if we're in the last 3 days of the month
      const daysUntilEndOfMonth = Math.ceil((endOfMonth.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntilEndOfMonth <= 3) {
        const existingAlerts = await storage.getSystemAlertsByType('monthly_summary');
        const hasThisMonthSummary = existingAlerts.some(
          alert => new Date(alert.createdAt).getMonth() === now.getMonth() &&
                   new Date(alert.createdAt).getFullYear() === now.getFullYear() &&
                   alert.isActive,
        );

        if (!hasThisMonthSummary) {
          const transactions = await storage.getTransactions();
          const monthlyTransactions = transactions.filter(
            t => new Date(t.date) >= startOfMonth,
          );

          const totalIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          const totalExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

          const netAmount = totalIncome - totalExpenses;

          const alertData: InsertSystemAlert = {
            type: 'monthly_summary',
            title: `${now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} Ayı Finansal Özeti`,
            description: `Gelir: ${totalIncome.toLocaleString('tr-TR')} TL, Gider: ${totalExpenses.toLocaleString('tr-TR')} TL, Net: ${netAmount.toLocaleString('tr-TR')} TL`,
            severity: netAmount < 0 ? 'medium' : 'low',
            isActive: true,
            isDismissed: false,
            metadata: JSON.stringify({
              income: totalIncome,
              expenses: totalExpenses,
              net: netAmount,
              transactionCount: monthlyTransactions.length,
              month: now.getMonth(),
              year: now.getFullYear(),
            }),
          };

          await storage.createSystemAlert(alertData);
          logger.info('Monthly financial summary alert created');
        }
      }
    } catch (error) {
      logger.error('Error creating monthly financial summary:', error);
    }
  }

  /**
   * Run all alert checks
   */
  async runAllChecks (): Promise<void> {
    logger.info('Running system alert checks...');

    await Promise.all([
      this.checkLowBalanceAlerts(),
      this.checkRecurringPaymentReminders(),
      this.checkBudgetAlerts(),
      this.createMonthlyFinancialSummary(),
    ]);

    logger.info('System alert checks completed');
  }
}

// Export singleton instance
export const alertService = new AlertService();
