import { Router } from 'express';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth';
import { Permission } from '@shared/schema';
import { exportToCSV, generateCSVFilename, getCSVExportOptions } from '../modules/export/csv-export';
import { exportToPDF, generatePDFFilename } from '../modules/export/pdf-export';
import { generateCashBridgeReport, exportCashBridgeToCSV, getCashBridgePeriods } from '../modules/export/cash-bridge';
import { db } from '../db';
import { accounts, transactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/export/accounts/csv - Export accounts to CSV
router.get('/accounts/csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const locale = (req.query.locale as string) || 'tr-TR';

    // Fetch user's accounts
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const options = getCSVExportOptions(locale);
    const csvContent = exportToCSV(
      { accounts: userAccounts, type: 'accounts' },
      options
    );

    const filename = generateCSVFilename('accounts', options.locale);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({
      error: 'CSV export hatası',
    });
  }
});

// GET /api/export/transactions/csv - Export transactions to CSV
router.get('/transactions/csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const locale = (req.query.locale as string) || 'tr-TR';
    const limit = parseInt(req.query.limit as string) || 1000;

    // Fetch user's transactions
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .limit(limit);

    const options = getCSVExportOptions(locale);
    const csvContent = exportToCSV(
      { transactions: userTransactions, type: 'transactions' },
      options
    );

    const filename = generateCSVFilename('transactions', options.locale);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({
      error: 'CSV export hatası',
    });
  }
});

// GET /api/export/combined/csv - Export combined data to CSV
router.get('/combined/csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const locale = (req.query.locale as string) || 'tr-TR';
    const limit = parseInt(req.query.limit as string) || 1000;

    // Fetch user's accounts and transactions
    const [userAccounts, userTransactions] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)).limit(limit),
    ]);

    const options = getCSVExportOptions(locale);
    const csvContent = exportToCSV(
      { accounts: userAccounts, transactions: userTransactions, type: 'combined' },
      options
    );

    const filename = generateCSVFilename('combined', options.locale);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({
      error: 'CSV export hatası',
    });
  }
});

// GET /api/export/financial-summary/pdf - Export financial summary to PDF
router.get('/financial-summary/pdf', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const locale = (req.query.locale as string) || 'tr-TR';
    const companyName = req.query.companyName as string;

    // Fetch user's accounts and transactions
    const [userAccounts, userTransactions] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)),
    ]);

    // Calculate summary
    const totalBalance = userAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalAssets = userAccounts.filter(acc => parseFloat(acc.balance) >= 0)
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const totalDebts = Math.abs(userAccounts.filter(acc => parseFloat(acc.balance) < 0)
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0));

    const options = {
      locale: locale as 'tr-TR' | 'en-US',
      currency: 'TRY',
      companyName: companyName || 'FinBot',
      includeCharts: true,
      includeSummary: true
    };
    const pdfBuffer = await exportToPDF(
      {
        accounts: userAccounts,
        transactions: userTransactions.slice(0, 100), // Limit for PDF
        summary: {
          totalBalance,
          totalAssets,
          totalDebts,
          netWorth: totalAssets - totalDebts,
        },
        type: 'financial-summary',
      },
      options
    );

    const filename = generatePDFFilename('financial-summary', options.locale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('PDF export error:', error);
    res.status(500).json({
      error: 'PDF export hatası',
    });
  }
});

// GET /api/export/cash-bridge/csv - Export Cash Bridge report to CSV
router.get('/cash-bridge/csv', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const locale = (req.query.locale as string) || 'tr-TR';
    const period = req.query.period as string || 'current-month';

    // Get period dates
    const periods = getCashBridgePeriods();
    const selectedPeriod = periods.find(p => p.label.toLowerCase().includes(period)) || periods[0];

    // Fetch user's accounts and transactions
    const [userAccounts, userTransactions] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.userId, userId)),
      db.select().from(transactions).where(eq(transactions.userId, userId)),
    ]);

    // Generate Cash Bridge report
    const report = generateCashBridgeReport(
      userAccounts,
      userTransactions,
      selectedPeriod.startDate,
      selectedPeriod.endDate
    );

    // Export to CSV
    const csvContent = exportCashBridgeToCSV(report, locale === 'tr-TR' ? 'tr-TR' : 'en-US');
    const filename = `cash-bridge-${period}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    logger.error('Cash Bridge export error:', error);
    res.status(500).json({
      error: 'Cash Bridge export hatası',
    });
  }
});

// GET /api/export/periods - Get available export periods
router.get('/periods', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const periods = getCashBridgePeriods();
    res.json({
      success: true,
      data: periods,
    });
  } catch (error) {
    logger.error('Periods fetch error:', error);
    res.status(500).json({
      error: 'Dönemler alınırken hata oluştu',
    });
  }
});

export default router;

