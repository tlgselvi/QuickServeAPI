import type { Account, Transaction } from '@shared/schema';

export interface CashBridgeItem {
  category: string;
  description: string;
  amount: number;
  type: 'inflow' | 'outflow';
  date: Date;
  accountId: string;
  accountName: string;
}

export interface CashBridgeReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: number;
  closingBalance: number;
  netCashFlow: number;
  inflows: CashBridgeItem[];
  outflows: CashBridgeItem[];
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netChange: number;
    categories: Record<string, { inflows: number; outflows: number; net: number }>;
  };
}

/**
 * Generate Cash Bridge report
 */
export function generateCashBridgeReport(
  accounts: Account[],
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): CashBridgeReport {
  // Filter transactions by date range
  const periodTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.createdAt);
    return transactionDate >= startDate && transactionDate <= endDate;
  });

  // Calculate opening balance (sum of all account balances at start date)
  const openingBalance = accounts.reduce((sum, account) => {
    return sum + parseFloat(account.balance);
  }, 0);

  // Process transactions into cash bridge items
  const inflows: CashBridgeItem[] = [];
  const outflows: CashBridgeItem[] = [];
  const categories: Record<string, { inflows: number; outflows: number; net: number }> = {};

  periodTransactions.forEach(transaction => {
    const account = accounts.find(acc => acc.id === transaction.accountId);
    const amount = parseFloat(transaction.amount);
    const isInflow = amount > 0;
    
    const item: CashBridgeItem = {
      category: transaction.category || 'Diğer',
      description: transaction.description || '',
      amount: Math.abs(amount),
      type: isInflow ? 'inflow' : 'outflow',
      date: new Date(transaction.createdAt),
      accountId: transaction.accountId,
      accountName: account?.accountName || 'Bilinmeyen Hesap',
    };

    if (isInflow) {
      inflows.push(item);
    } else {
      outflows.push(item);
    }

    // Update category summary
    const category = transaction.category || 'Diğer';
    if (!categories[category]) {
      categories[category] = { inflows: 0, outflows: 0, net: 0 };
    }
    
    if (isInflow) {
      categories[category].inflows += amount;
    } else {
      categories[category].outflows += Math.abs(amount);
    }
    categories[category].net = categories[category].inflows - categories[category].outflows;
  });

  // Sort by date
  inflows.sort((a, b) => a.date.getTime() - b.date.getTime());
  outflows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate totals
  const totalInflows = inflows.reduce((sum, item) => sum + item.amount, 0);
  const totalOutflows = outflows.reduce((sum, item) => sum + item.amount, 0);
  const netChange = totalInflows - totalOutflows;
  const closingBalance = openingBalance + netChange;

  return {
    period: {
      startDate,
      endDate,
    },
    openingBalance,
    closingBalance,
    netCashFlow: netChange,
    inflows,
    outflows,
    summary: {
      totalInflows,
      totalOutflows,
      netChange,
      categories,
    },
  };
}

/**
 * Export Cash Bridge to CSV
 */
export function exportCashBridgeToCSV(
  report: CashBridgeReport,
  locale: 'tr-TR' | 'en-US' = 'tr-TR'
): string {
  const isTurkish = locale === 'tr-TR';
  const separator = isTurkish ? ';' : ',';
  
  let csv = '';
  
  // Add BOM for UTF-8
  if (isTurkish) {
    csv += '\uFEFF';
  }

  // Report header
  const periodTitle = isTurkish ? 'Dönem' : 'Period';
  const openingTitle = isTurkish ? 'Açılış Bakiyesi' : 'Opening Balance';
  const closingTitle = isTurkish ? 'Kapanış Bakiyesi' : 'Closing Balance';
  const netFlowTitle = isTurkish ? 'Net Nakit Akışı' : 'Net Cash Flow';

  csv += `${periodTitle}${separator}${report.period.startDate.toLocaleDateString(locale)} - ${report.period.endDate.toLocaleDateString(locale)}\n`;
  csv += `${openingTitle}${separator}${formatCurrency(report.openingBalance, locale)}\n`;
  csv += `${closingTitle}${separator}${formatCurrency(report.closingBalance, locale)}\n`;
  csv += `${netFlowTitle}${separator}${formatCurrency(report.netCashFlow, locale)}\n\n`;

  // Cash inflows
  const inflowsTitle = isTurkish ? 'Nakit Girişleri' : 'Cash Inflows';
  csv += `${inflowsTitle}\n`;
  
  const inflowHeaders = isTurkish 
    ? ['Tarih', 'Kategori', 'Açıklama', 'Tutar', 'Hesap']
    : ['Date', 'Category', 'Description', 'Amount', 'Account'];
  csv += inflowHeaders.join(separator) + '\n';

  report.inflows.forEach(item => {
    const row = [
      item.date.toLocaleDateString(locale),
      item.category,
      item.description,
      formatCurrency(item.amount, locale),
      item.accountName,
    ];
    csv += row.join(separator) + '\n';
  });

  csv += '\n';

  // Cash outflows
  const outflowsTitle = isTurkish ? 'Nakit Çıkışları' : 'Cash Outflows';
  csv += `${outflowsTitle}\n`;
  
  const outflowHeaders = isTurkish 
    ? ['Tarih', 'Kategori', 'Açıklama', 'Tutar', 'Hesap']
    : ['Date', 'Category', 'Description', 'Amount', 'Account'];
  csv += outflowHeaders.join(separator) + '\n';

  report.outflows.forEach(item => {
    const row = [
      item.date.toLocaleDateString(locale),
      item.category,
      item.description,
      formatCurrency(item.amount, locale),
      item.accountName,
    ];
    csv += row.join(separator) + '\n';
  });

  csv += '\n';

  // Category summary
  const summaryTitle = isTurkish ? 'Kategori Özeti' : 'Category Summary';
  csv += `${summaryTitle}\n`;
  
  const summaryHeaders = isTurkish 
    ? ['Kategori', 'Girişler', 'Çıkışlar', 'Net']
    : ['Category', 'Inflows', 'Outflows', 'Net'];
  csv += summaryHeaders.join(separator) + '\n';

  Object.entries(report.summary.categories).forEach(([category, data]) => {
    const row = [
      category,
      formatCurrency(data.inflows, locale),
      formatCurrency(data.outflows, locale),
      formatCurrency(data.net, locale),
    ];
    csv += row.join(separator) + '\n';
  });

  return csv;
}

/**
 * Format currency for locale
 */
function formatCurrency(amount: number, locale: 'tr-TR' | 'en-US'): string {
  const isTurkish = locale === 'tr-TR';
  
  if (isTurkish) {
    return Math.abs(amount).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).replace('.', ',');
  } else {
    return Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

/**
 * Get Cash Bridge report periods
 */
export function getCashBridgePeriods(): Array<{ label: string; startDate: Date; endDate: Date }> {
  const now = new Date();
  const periods = [];

  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  periods.push({
    label: 'Bu Ay',
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
  });

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  periods.push({
    label: 'Geçen Ay',
    startDate: lastMonthStart,
    endDate: lastMonthEnd,
  });

  // Last 3 months
  const threeMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  periods.push({
    label: 'Son 3 Ay',
    startDate: threeMonthsStart,
    endDate: currentMonthEnd,
  });

  // Last 6 months
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  periods.push({
    label: 'Son 6 Ay',
    startDate: sixMonthsStart,
    endDate: currentMonthEnd,
  });

  // Current year
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  periods.push({
    label: 'Bu Yıl',
    startDate: yearStart,
    endDate: yearEnd,
  });

  return periods;
}

