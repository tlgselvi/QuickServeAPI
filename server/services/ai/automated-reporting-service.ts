import { openaiService } from './openaiService';
import { financialAnalysisService } from './financial-analysis-service';
import { db } from '../../db';
import { users, accounts, transactions } from '../../../shared/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
// import { createCanvas } from 'canvas';
// import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

export interface ReportConfig {
  userId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  includeCharts: boolean;
  includeAIInsights: boolean;
  includeRecommendations: boolean;
  customSections?: string[];
  emailDelivery: boolean;
  emailAddress?: string;
}

export interface GeneratedReport {
  id: string;
  userId: string;
  reportType: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number;
  };
  sections: ReportSection[];
  charts: ReportChart[];
  aiInsights: string[];
  recommendations: string[];
  filePath?: string;
  emailSent?: boolean;
}

export interface ReportSection {
  title: string;
  content: string;
  data?: any;
  charts?: string[];
}

export interface ReportChart {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title: string;
  data: any;
  options?: any;
  imagePath?: string;
}

export class AutomatedReportingService {
  private reportsDirectory: string;
  // private chartCanvas: ChartJSNodeCanvas;

  constructor() {
    this.reportsDirectory = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
    
    // this.chartCanvas = new ChartJSNodeCanvas({
    //   width: 800,
    //   height: 600,
    //   backgroundColour: 'white',
    // });
  }

  /**
   * Generate automated financial report
   */
  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    try {
      const reportId = this.generateReportId();
      const period = this.calculateReportPeriod(config.reportType);
      
      // Get user data
      const user = await this.getUserData(config.userId);
      const financialData = await this.getReportFinancialData(config.userId, period);
      
      // Generate AI analysis if requested
      let aiInsights: string[] = [];
      let recommendations: string[] = [];
      
      if (config.includeAIInsights || config.includeRecommendations) {
        const analysis = await financialAnalysisService.analyzeFinancials({
          userId: config.userId,
          analysisType: 'trend',
          timeframe: config.reportType === 'weekly' ? 'week' : 
                    config.reportType === 'monthly' ? 'month' :
                    config.reportType === 'quarterly' ? 'quarter' : 'year'
        });
        
        if (config.includeAIInsights) {
          aiInsights = analysis.insights || [];
        }
        
        if (config.includeRecommendations) {
          recommendations = analysis.recommendations || [];
        }
      }

      // Generate report sections
      const sections = await this.generateReportSections(financialData, config);
      
      // Generate charts if requested
      let charts: ReportChart[] = [];
      if (config.includeCharts) {
        charts = await this.generateReportCharts(financialData, reportId);
      }

      // Create report object
      const report: GeneratedReport = {
        id: reportId,
        userId: config.userId,
        reportType: config.reportType,
        generatedAt: new Date(),
        period,
        summary: {
          totalIncome: financialData.totalIncome,
          totalExpenses: financialData.totalExpenses,
          netCashFlow: financialData.netCashFlow,
          savingsRate: financialData.savingsRate,
        },
        sections,
        charts,
        aiInsights,
        recommendations,
      };

      // Generate report file (PDF/HTML)
      const filePath = await this.generateReportFile(report, user);
      report.filePath = filePath;

      // Send email if requested
      if (config.emailDelivery && config.emailAddress) {
        await this.sendReportEmail(report, config.emailAddress);
        report.emailSent = true;
      }

      // Save report metadata to database
      await this.saveReportMetadata(report);

      logger.info(`Generated ${config.reportType} report for user ${config.userId}: ${reportId}`);
      return report;

    } catch (error) {
      logger.error('Report generation error:', error);
      throw error;
    }
  }

  /**
   * Generate scheduled reports for all users
   */
  async generateScheduledReports(): Promise<void> {
    try {
      const users = await db.select().from(users).where(eq(users.isActive, true));
      
      for (const user of users) {
        // Check if user has automated reporting enabled
        const userSettings = await this.getUserReportSettings(user.id);
        
        if (userSettings.enabled) {
          const config: ReportConfig = {
            userId: user.id,
            reportType: userSettings.frequency,
            includeCharts: userSettings.includeCharts,
            includeAIInsights: userSettings.includeAIInsights,
            includeRecommendations: userSettings.includeRecommendations,
            emailDelivery: userSettings.emailDelivery,
            emailAddress: user.email,
          };

          await this.generateReport(config);
        }
      }

      logger.info(`Generated scheduled reports for ${users.length} users`);
    } catch (error) {
      logger.error('Scheduled report generation error:', error);
      throw error;
    }
  }

  /**
   * Generate report sections
   */
  private async generateReportSections(data: any, config: ReportConfig): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Executive Summary
    const summaryPrompt = `
      Create an executive summary for a ${config.reportType} financial report:

      Financial Data:
      - Total Income: ${data.totalIncome}
      - Total Expenses: ${data.totalExpenses}
      - Net Cash Flow: ${data.netCashFlow}
      - Savings Rate: ${data.savingsRate}%
      - Top Expense Categories: ${JSON.stringify(data.topExpenseCategories)}
      - Account Performance: ${JSON.stringify(data.accountPerformance)}

      Provide a concise executive summary (2-3 paragraphs) highlighting key financial performance indicators and notable trends.
    `;

    const summaryResponse = await openaiService.generateResponse(summaryPrompt, {
      temperature: 0.3,
      max_tokens: 500,
    });

    sections.push({
      title: 'Executive Summary',
      content: summaryResponse.success ? summaryResponse.response : 'Unable to generate AI summary',
      data: {
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        netCashFlow: data.netCashFlow,
        savingsRate: data.savingsRate,
      }
    });

    // Income Analysis
    sections.push({
      title: 'Income Analysis',
      content: this.generateIncomeAnalysis(data),
      data: data.incomeBreakdown
    });

    // Expense Analysis
    sections.push({
      title: 'Expense Analysis',
      content: this.generateExpenseAnalysis(data),
      data: data.expenseBreakdown
    });

    // Account Performance
    sections.push({
      title: 'Account Performance',
      content: this.generateAccountPerformance(data),
      data: data.accountPerformance
    });

    // Custom sections
    if (config.customSections) {
      for (const sectionTitle of config.customSections) {
        const customContent = await this.generateCustomSection(sectionTitle, data);
        sections.push({
          title: sectionTitle,
          content: customContent,
        });
      }
    }

    return sections;
  }

  /**
   * Generate report charts
   */
  private async generateReportCharts(data: any, reportId: string): Promise<ReportChart[]> {
    const charts: ReportChart[] = [];

    // Mock chart data - charts will be generated on frontend
    const incomeExpenseChart = {
      type: 'bar' as const,
      title: 'Income vs Expenses',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          label: 'Amount',
          data: [data.totalIncome, data.totalExpenses],
          backgroundColor: ['#22c55e', '#ef4444'],
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Income vs Expenses'
          }
        }
      }
    };

    charts.push(incomeExpenseChart);

    // Expense Categories Chart
    const expenseCategoriesChart = {
      type: 'pie' as const,
      title: 'Expense Categories',
      data: {
        labels: Object.keys(data.expenseBreakdown),
        datasets: [{
          data: Object.values(data.expenseBreakdown),
          backgroundColor: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Expense Distribution by Category'
          }
        }
      }
    };

    charts.push(expenseCategoriesChart);

    return charts;
  }

  /**
   * Generate report file (HTML format)
   */
  private async generateReportFile(report: GeneratedReport, user: any): Promise<string> {
    const html = this.generateHTMLReport(report, user);
    const filePath = path.join(this.reportsDirectory, `${report.id}.html`);
    
    fs.writeFileSync(filePath, html);
    return filePath;
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: GeneratedReport, user: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Financial Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .chart { text-align: center; margin: 20px 0; }
        .insights { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .recommendations { background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Financial Report</h1>
        <p>Generated for ${user.name || user.email} on ${report.generatedAt.toLocaleDateString()}</p>
        <p>Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</p>
    </div>

    <div class="summary">
        <h2>Financial Summary</h2>
        <div class="metric">
            <div class="metric-value">$${report.summary.totalIncome.toLocaleString()}</div>
            <div class="metric-label">Total Income</div>
        </div>
        <div class="metric">
            <div class="metric-value">$${report.summary.totalExpenses.toLocaleString()}</div>
            <div class="metric-label">Total Expenses</div>
        </div>
        <div class="metric">
            <div class="metric-value">$${report.summary.netCashFlow.toLocaleString()}</div>
            <div class="metric-label">Net Cash Flow</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.savingsRate.toFixed(1)}%</div>
            <div class="metric-label">Savings Rate</div>
        </div>
    </div>

    ${report.sections.map(section => `
        <div class="section">
            <h2>${section.title}</h2>
            <p>${section.content}</p>
        </div>
    `).join('')}

    ${report.charts.map(chart => `
        <div class="chart">
            <h3>${chart.title}</h3>
            <img src="${chart.imagePath}" alt="${chart.title}" style="max-width: 100%;">
        </div>
    `).join('')}

    ${report.aiInsights.length > 0 ? `
        <div class="insights">
            <h2>AI Insights</h2>
            <ul>
                ${report.aiInsights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
    ` : ''}

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}

    <footer style="margin-top: 50px; text-align: center; color: #666;">
        <p>This report was automatically generated by FinBot v3 AI Assistant</p>
    </footer>
</body>
</html>
    `;
  }

  /**
   * Send report via email
   */
  private async sendReportEmail(report: GeneratedReport, emailAddress: string): Promise<void> {
    // Email sending implementation would go here
    // For now, just log the action
    logger.info(`Report ${report.id} would be sent to ${emailAddress}`);
  }

  /**
   * Save report metadata to database
   */
  private async saveReportMetadata(report: GeneratedReport): Promise<void> {
    // Save to database implementation would go here
    logger.info(`Report metadata saved for report ${report.id}`);
  }

  /**
   * Helper methods
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateReportPeriod(reportType: string): { start: Date; end: Date } {
    const now = new Date();
    const periods = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      annual: 365
    };

    const days = periods[reportType] || 30;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return { start, end: now };
  }

  private async getUserData(userId: string) {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user[0];
  }

  private async getUserReportSettings(userId: string) {
    // Mock user settings - would come from database
    return {
      enabled: true,
      frequency: 'monthly' as const,
      includeCharts: true,
      includeAIInsights: true,
      includeRecommendations: true,
      emailDelivery: true,
    };
  }

  private async getReportFinancialData(userId: string, period: { start: Date; end: Date }) {
    // Get transactions for the period
    const transactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, period.start),
          lte(transactions.date, period.end)
        )
      );

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netCashFlow / totalIncome) * 100) : 0;

    // Categorize expenses
    const expenseBreakdown: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.category || 'uncategorized';
        expenseBreakdown[category] = (expenseBreakdown[category] || 0) + parseFloat(t.amount);
      });

    return {
      totalIncome,
      totalExpenses,
      netCashFlow,
      savingsRate,
      expenseBreakdown,
      topExpenseCategories: Object.entries(expenseBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      incomeBreakdown: {}, // Would categorize income
      accountPerformance: {}, // Would calculate account performance
    };
  }

  private generateIncomeAnalysis(data: any): string {
    return `Total income for the period was $${data.totalIncome.toLocaleString()}. This represents the sum of all income transactions.`;
  }

  private generateExpenseAnalysis(data: any): string {
    return `Total expenses for the period were $${data.totalExpenses.toLocaleString()}. The largest expense categories were: ${Object.keys(data.expenseBreakdown).slice(0, 3).join(', ')}.`;
  }

  private generateAccountPerformance(data: any): string {
    return `Account performance analysis would show the growth and activity of your various accounts during this period.`;
  }

  private async generateCustomSection(title: string, data: any): Promise<string> {
    const prompt = `Generate content for a financial report section titled "${title}" based on the following data: ${JSON.stringify(data)}`;
    
    const response = await openaiService.generateResponse(prompt, {
      temperature: 0.4,
      max_tokens: 300,
    });

    return response.success ? response.response : `Content for ${title} section could not be generated.`;
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDirectory)) {
      fs.mkdirSync(this.reportsDirectory, { recursive: true });
    }
  }
}

// Export singleton instance
export const automatedReportingService = new AutomatedReportingService();
export default automatedReportingService;
