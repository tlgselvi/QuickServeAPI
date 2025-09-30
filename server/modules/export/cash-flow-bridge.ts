import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { db } from '../../db';
import { agingReports, accounts, transactions } from '@shared/schema';

export interface CashFlowBridgeData {
  period: string;
  date: Date;
  openingBalance: number;
  cashInflows: {
    operating: number;
    investing: number;
    financing: number;
    total: number;
  };
  cashOutflows: {
    operating: number;
    investing: number;
    financing: number;
    total: number;
  };
  netCashFlow: number;
  closingBalance: number;
  variance: number;
  variancePercent: number;
}

export interface CashFlowBridgeReport {
  title: string;
  companyName: string;
  period: string;
  currency: string;
  generatedAt: Date;
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    openingBalance: number;
    closingBalance: number;
    variance: number;
    variancePercent: number;
  };
  data: CashFlowBridgeData[];
  assumptions: string[];
  methodology: string;
}

/**
 * Generate Cash Flow Bridge Report
 */
export async function generateCashFlowBridgeReport(
  userId: string,
  options: {
    startDate: Date;
    endDate: Date;
    period: 'daily' | 'weekly' | 'monthly';
    currency?: string;
    companyName?: string;
  }
): Promise<CashFlowBridgeReport> {
  const { startDate, endDate, period, currency = 'TRY', companyName = 'FinBot Company' } = options;

  // Get account balances
  const accounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const openingBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);

  // Get transactions for the period
  const transactionsData = await db
    .select()
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.createdAt, startDate),
      lte(transactions.createdAt, endDate)
    ))
    .orderBy(transactions.createdAt);

  // Get aging reports for AR/AP analysis
  const agingData = await db
    .select()
    .from(agingReports)
    .where(and(
      eq(agingReports.userId, userId),
      gte(agingReports.createdAt, startDate),
      lte(agingReports.createdAt, endDate)
    ));

  // Group data by period
  const periodData = groupDataByPeriod(transactionsData, agingData, period, startDate, endDate);

  // Calculate cash flow bridge data
  const bridgeData = calculateCashFlowBridge(periodData, openingBalance, currency);

  // Calculate summary
  const summary = calculateSummary(bridgeData);

  return {
    title: 'Cash Flow Bridge Report',
    companyName,
    period: `${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`,
    currency,
    generatedAt: new Date(),
    summary,
    data: bridgeData,
    assumptions: [
      'Tüm işlemler nakit bazlı hesaplanmıştır',
      'Alacak ve borçlar vade tarihlerine göre gruplandırılmıştır',
      'Faiz ve komisyonlar dahil edilmiştir',
      'Kur farkları cari kur ile hesaplanmıştır',
    ],
    methodology: 'Cash Flow Bridge metodu ile nakit akışı analizi yapılmıştır. İşlemler operasyonel, yatırım ve finansman faaliyetleri olarak sınıflandırılmıştır.',
  };
}

/**
 * Group transactions and aging data by period
 */
function groupDataByPeriod(
  transactions: any[],
  agingData: any[],
  period: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  endDate: Date
): Map<string, { transactions: any[]; aging: any[] }> {
  const periodMap = new Map<string, { transactions: any[]; aging: any[] }>();

  // Group transactions
  transactions.forEach(transaction => {
    const date = new Date(transaction.createdAt);
    const periodKey = getPeriodKey(date, period);
    
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { transactions: [], aging: [] });
    }
    
    periodMap.get(periodKey)!.transactions.push(transaction);
  });

  // Group aging data
  agingData.forEach(aging => {
    const date = new Date(aging.createdAt);
    const periodKey = getPeriodKey(date, period);
    
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { transactions: [], aging: [] });
    }
    
    periodMap.get(periodKey)!.aging.push(aging);
  });

  // Fill missing periods
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const periodKey = getPeriodKey(currentDate, period);
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, { transactions: [], aging: [] });
    }
    
    // Increment date
    switch (period) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }

  return periodMap;
}

/**
 * Get period key for grouping
 */
function getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
  switch (period) {
    case 'daily':
      return date.toISOString().split('T')[0];
    case 'weekly':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Calculate cash flow bridge data
 */
function calculateCashFlowBridge(
  periodData: Map<string, { transactions: any[]; aging: any[] }>,
  openingBalance: number,
  currency: string
): CashFlowBridgeData[] {
  const bridgeData: CashFlowBridgeData[] = [];
  let currentBalance = openingBalance;

  // Sort periods
  const sortedPeriods = Array.from(periodData.keys()).sort();

  sortedPeriods.forEach(periodKey => {
    const data = periodData.get(periodKey)!;
    const periodDate = new Date(periodKey);
    
    // Calculate cash flows
    const inflows = calculateCashFlows(data.transactions, 'inflow');
    const outflows = calculateCashFlows(data.transactions, 'outflow');
    
    // Calculate AR/AP impact
    const arImpact = calculateARAPImpact(data.aging, 'ar');
    const apImpact = calculateARAPImpact(data.aging, 'ap');
    
    // Adjust flows with AR/AP
    inflows.operating += arImpact;
    outflows.operating += apImpact;
    
    // Recalculate totals
    inflows.total = inflows.operating + inflows.investing + inflows.financing;
    outflows.total = outflows.operating + outflows.investing + outflows.financing;
    
    const netCashFlow = inflows.total - outflows.total;
    const closingBalance = currentBalance + netCashFlow;
    
    // Calculate variance
    const variance = closingBalance - currentBalance;
    const variancePercent = currentBalance !== 0 ? (variance / currentBalance) * 100 : 0;
    
    bridgeData.push({
      period: periodKey,
      date: periodDate,
      openingBalance: currentBalance,
      cashInflows: inflows,
      cashOutflows: outflows,
      netCashFlow,
      closingBalance,
      variance,
      variancePercent,
    });
    
    currentBalance = closingBalance;
  });

  return bridgeData;
}

/**
 * Calculate cash flows by category
 */
function calculateCashFlows(transactions: any[], type: 'inflow' | 'outflow'): {
  operating: number;
  investing: number;
  financing: number;
  total: number;
} {
  let operating = 0;
  let investing = 0;
  let financing = 0;

  transactions.forEach(transaction => {
    const amount = parseFloat(transaction.amount);
    const category = transaction.category || 'operating';
    
    if (type === 'inflow' && amount > 0) {
      switch (category.toLowerCase()) {
        case 'operating':
        case 'operasyonel':
          operating += amount;
          break;
        case 'investing':
        case 'yatırım':
          investing += amount;
          break;
        case 'financing':
        case 'finansman':
          financing += amount;
          break;
        default:
          operating += amount;
      }
    } else if (type === 'outflow' && amount < 0) {
      const absAmount = Math.abs(amount);
      switch (category.toLowerCase()) {
        case 'operating':
        case 'operasyonel':
          operating += absAmount;
          break;
        case 'investing':
        case 'yatırım':
          investing += absAmount;
          break;
        case 'financing':
        case 'finansman':
          financing += absAmount;
          break;
        default:
          operating += absAmount;
      }
    }
  });

  return {
    operating,
    investing,
    financing,
    total: operating + investing + financing,
  };
}

/**
 * Calculate AR/AP impact on cash flow
 */
function calculateARAPImpact(agingData: any[], type: 'ar' | 'ap'): number {
  return agingData
    .filter(item => item.reportType === type)
    .reduce((sum, item) => {
      const amount = parseFloat(item.currentAmount);
      return type === 'ar' ? sum + amount : sum - amount;
    }, 0);
}

/**
 * Calculate summary statistics
 */
function calculateSummary(data: CashFlowBridgeData[]): {
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  variance: number;
  variancePercent: number;
} {
  if (data.length === 0) {
    return {
      totalInflows: 0,
      totalOutflows: 0,
      netCashFlow: 0,
      openingBalance: 0,
      closingBalance: 0,
      variance: 0,
      variancePercent: 0,
    };
  }

  const totalInflows = data.reduce((sum, item) => sum + item.cashInflows.total, 0);
  const totalOutflows = data.reduce((sum, item) => sum + item.cashOutflows.total, 0);
  const netCashFlow = totalInflows - totalOutflows;
  
  const openingBalance = data[0].openingBalance;
  const closingBalance = data[data.length - 1].closingBalance;
  const variance = closingBalance - openingBalance;
  const variancePercent = openingBalance !== 0 ? (variance / openingBalance) * 100 : 0;

  return {
    totalInflows,
    totalOutflows,
    netCashFlow,
    openingBalance,
    closingBalance,
    variance,
    variancePercent,
  };
}

/**
 * Export Cash Flow Bridge to CSV
 */
export function exportCashFlowBridgeToCSV(report: CashFlowBridgeReport): string {
  const headers = [
    'Period',
    'Date',
    'Opening Balance',
    'Operating Inflows',
    'Investing Inflows',
    'Financing Inflows',
    'Total Inflows',
    'Operating Outflows',
    'Investing Outflows',
    'Financing Outflows',
    'Total Outflows',
    'Net Cash Flow',
    'Closing Balance',
    'Variance',
    'Variance %',
  ];

  const rows = report.data.map(item => [
    item.period,
    item.date.toISOString().split('T')[0],
    item.openingBalance.toFixed(2),
    item.cashInflows.operating.toFixed(2),
    item.cashInflows.investing.toFixed(2),
    item.cashInflows.financing.toFixed(2),
    item.cashInflows.total.toFixed(2),
    item.cashOutflows.operating.toFixed(2),
    item.cashOutflows.investing.toFixed(2),
    item.cashOutflows.financing.toFixed(2),
    item.cashOutflows.total.toFixed(2),
    item.netCashFlow.toFixed(2),
    item.closingBalance.toFixed(2),
    item.variance.toFixed(2),
    item.variancePercent.toFixed(2),
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate Cash Flow Bridge PDF content (HTML template)
 */
export function generateCashFlowBridgePDF(report: CashFlowBridgeReport): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .report-title { font-size: 20px; color: #333; margin-bottom: 5px; }
        .period { font-size: 14px; color: #666; }
        .summary { background: #f5f5f5; padding: 20px; margin-bottom: 30px; border-radius: 5px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 12px; color: #666; margin-bottom: 5px; }
        .summary-value { font-size: 18px; font-weight: bold; color: #333; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: right; }
        .table th { background-color: #f2f2f2; font-weight: bold; }
        .table td:first-child, .table th:first-child { text-align: left; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
        .assumptions { margin-top: 20px; }
        .assumptions h3 { font-size: 14px; margin-bottom: 10px; }
        .assumptions ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${report.companyName}</div>
        <div class="report-title">${report.title}</div>
        <div class="period">Dönem: ${report.period}</div>
        <div class="period">Para Birimi: ${report.currency}</div>
        <div class="period">Oluşturulma: ${report.generatedAt.toLocaleDateString('tr-TR')}</div>
    </div>

    <div class="summary">
        <h3>Özet</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">Toplam Giriş</div>
                <div class="summary-value positive">${report.summary.totalInflows.toLocaleString('tr-TR')} ${report.currency}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Toplam Çıkış</div>
                <div class="summary-value negative">${report.summary.totalOutflows.toLocaleString('tr-TR')} ${report.currency}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Net Nakit Akışı</div>
                <div class="summary-value ${report.summary.netCashFlow >= 0 ? 'positive' : 'negative'}">${report.summary.netCashFlow.toLocaleString('tr-TR')} ${report.currency}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Açılış Bakiyesi</div>
                <div class="summary-value">${report.summary.openingBalance.toLocaleString('tr-TR')} ${report.currency}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Kapanış Bakiyesi</div>
                <div class="summary-value">${report.summary.closingBalance.toLocaleString('tr-TR')} ${report.currency}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Değişim</div>
                <div class="summary-value ${report.summary.variance >= 0 ? 'positive' : 'negative'}">${report.summary.variance.toLocaleString('tr-TR')} ${report.currency} (${report.summary.variancePercent.toFixed(1)}%)</div>
            </div>
        </div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Dönem</th>
                <th>Tarih</th>
                <th>Açılış Bakiye</th>
                <th>Operasyonel Giriş</th>
                <th>Yatırım Giriş</th>
                <th>Finansman Giriş</th>
                <th>Toplam Giriş</th>
                <th>Operasyonel Çıkış</th>
                <th>Yatırım Çıkış</th>
                <th>Finansman Çıkış</th>
                <th>Toplam Çıkış</th>
                <th>Net Akış</th>
                <th>Kapanış Bakiye</th>
                <th>Değişim</th>
                <th>Değişim %</th>
            </tr>
        </thead>
        <tbody>
            ${report.data.map(item => `
                <tr>
                    <td>${item.period}</td>
                    <td>${item.date.toLocaleDateString('tr-TR')}</td>
                    <td>${item.openingBalance.toLocaleString('tr-TR')}</td>
                    <td class="positive">${item.cashInflows.operating.toLocaleString('tr-TR')}</td>
                    <td class="positive">${item.cashInflows.investing.toLocaleString('tr-TR')}</td>
                    <td class="positive">${item.cashInflows.financing.toLocaleString('tr-TR')}</td>
                    <td class="positive">${item.cashInflows.total.toLocaleString('tr-TR')}</td>
                    <td class="negative">${item.cashOutflows.operating.toLocaleString('tr-TR')}</td>
                    <td class="negative">${item.cashOutflows.investing.toLocaleString('tr-TR')}</td>
                    <td class="negative">${item.cashOutflows.financing.toLocaleString('tr-TR')}</td>
                    <td class="negative">${item.cashOutflows.total.toLocaleString('tr-TR')}</td>
                    <td class="${item.netCashFlow >= 0 ? 'positive' : 'negative'}">${item.netCashFlow.toLocaleString('tr-TR')}</td>
                    <td>${item.closingBalance.toLocaleString('tr-TR')}</td>
                    <td class="${item.variance >= 0 ? 'positive' : 'negative'}">${item.variance.toLocaleString('tr-TR')}</td>
                    <td class="${item.variancePercent >= 0 ? 'positive' : 'negative'}">${item.variancePercent.toFixed(1)}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="assumptions">
        <h3>Varsayımlar</h3>
        <ul>
            ${report.assumptions.map(assumption => `<li>${assumption}</li>`).join('')}
        </ul>
    </div>

    <div class="footer">
        <p><strong>Metodoloji:</strong> ${report.methodology}</p>
        <p>Bu rapor FinBot tarafından ${new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
    </div>
</body>
</html>
  `;
}
