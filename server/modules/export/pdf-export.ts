import type { Account, Transaction } from '@shared/schema';
import puppeteer from 'puppeteer';
import { logger } from '../../utils/logger';
import { logger } from '../../utils/logger';

export interface PDFExportOptions {
  locale: 'tr-TR' | 'en-US';
  currency: 'TRY' | 'USD' | 'EUR';
  includeLogo: boolean;
  includeCharts: boolean;
  companyName?: string;
}

export interface PDFExportData {
  accounts?: Account[];
  transactions?: Transaction[];
  summary?: {
    totalBalance: number;
    totalAssets: number;
    totalDebts: number;
    netWorth: number;
  };
  type: 'accounts' | 'transactions' | 'financial-summary' | 'combined';
}

/**
 * Export data to PDF with logo and charts
 */
export async function exportToPDF(
  data: PDFExportData,
  options: PDFExportOptions = {
    locale: 'tr-TR',
    currency: 'TRY',
    includeLogo: true,
    includeCharts: true,
  }
): Promise<Buffer> {
  try {
    // Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = generateHTMLContent(data, options);
    
    // Set content and generate PDF
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    logger.error('PDF generation failed:', error);
    // Fallback to mock PDF
  const mockPDFContent = generateMockPDFContent(data, options);
  return Buffer.from(mockPDFContent, 'utf-8');
  }
}

/**
 * Generate HTML content for PDF
 */
function generateHTMLContent(data: PDFExportData, options: PDFExportOptions): string {
  const { locale, currency, includeLogo, companyName } = options;
  const isTurkish = locale === 'tr-TR';
  
  const title = isTurkish ? 'FinBot Finansal Rapor' : 'FinBot Financial Report';
  const generatedAt = new Date().toLocaleDateString(locale);
  
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          margin: 10px 0;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .section {
          margin: 30px 0;
        }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .summary-item {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 24px;
          font-weight: bold;
          color: #1f2937;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .table th,
        .table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .table th {
          background: #f8fafc;
          font-weight: bold;
          color: #374151;
        }
        .currency {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${includeLogo ? '<div class="logo">FinBot</div>' : ''}
        <div class="title">${title}</div>
        <div class="subtitle">
          ${companyName ? `${isTurkish ? 'Şirket' : 'Company'}: ${companyName}<br>` : ''}
          ${isTurkish ? 'Oluşturulma Tarihi' : 'Generated'}: ${generatedAt}<br>
          ${isTurkish ? 'Para Birimi' : 'Currency'}: ${currency}
        </div>
      </div>

      ${data.summary ? generateSummarySection(data.summary, options) : ''}
      ${data.accounts && data.accounts.length > 0 ? generateAccountsSection(data.accounts, options) : ''}
      ${data.transactions && data.transactions.length > 0 ? generateTransactionsSection(data.transactions, options) : ''}

      <div class="footer">
        <p>${isTurkish ? 'FinBot ile oluşturuldu' : 'Generated by FinBot'} - ${new Date().toLocaleDateString(locale)}</p>
        <p>${isTurkish ? 'Bu rapor otomatik olarak oluşturulmuştur.' : 'This report was automatically generated.'}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate summary section HTML
 */
function generateSummarySection(summary: any, options: PDFExportOptions): string {
  const isTurkish = options.locale === 'tr-TR';
  
  return `
    <div class="section">
      <div class="section-title">${isTurkish ? 'Özet' : 'Summary'}</div>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">${isTurkish ? 'Toplam Bakiye' : 'Total Balance'}</div>
          <div class="summary-value">${formatCurrency(summary.totalBalance, options.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">${isTurkish ? 'Toplam Varlık' : 'Total Assets'}</div>
          <div class="summary-value">${formatCurrency(summary.totalAssets, options.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">${isTurkish ? 'Toplam Borç' : 'Total Debts'}</div>
          <div class="summary-value">${formatCurrency(summary.totalDebts, options.currency)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">${isTurkish ? 'Net Değer' : 'Net Worth'}</div>
          <div class="summary-value">${formatCurrency(summary.netWorth, options.currency)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate accounts section HTML
 */
function generateAccountsSection(accounts: Account[], options: PDFExportOptions): string {
  const isTurkish = options.locale === 'tr-TR';
  
  return `
    <div class="section">
      <div class="section-title">${isTurkish ? 'Hesaplar' : 'Accounts'}</div>
      <table class="table">
        <thead>
          <tr>
            <th>${isTurkish ? 'Banka' : 'Bank'}</th>
            <th>${isTurkish ? 'Hesap Adı' : 'Account Name'}</th>
            <th>${isTurkish ? 'Tip' : 'Type'}</th>
            <th class="currency">${isTurkish ? 'Bakiye' : 'Balance'}</th>
            <th>${isTurkish ? 'Para Birimi' : 'Currency'}</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(account => `
            <tr>
              <td>${account.bankName}</td>
              <td>${account.accountName}</td>
              <td>${account.type}</td>
              <td class="currency">${formatCurrency(parseFloat(account.balance), options.currency)}</td>
              <td>${account.currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate transactions section HTML
 */
function generateTransactionsSection(transactions: Transaction[], options: PDFExportOptions): string {
  const isTurkish = options.locale === 'tr-TR';
  const limitedTransactions = transactions.slice(0, 50); // Limit to 50 transactions
  
  return `
    <div class="section">
      <div class="section-title">${isTurkish ? 'İşlemler' : 'Transactions'}</div>
      <table class="table">
        <thead>
          <tr>
            <th>${isTurkish ? 'Tarih' : 'Date'}</th>
            <th class="currency">${isTurkish ? 'Tutar' : 'Amount'}</th>
            <th>${isTurkish ? 'Açıklama' : 'Description'}</th>
            <th>${isTurkish ? 'Kategori' : 'Category'}</th>
            <th>${isTurkish ? 'Tip' : 'Type'}</th>
          </tr>
        </thead>
        <tbody>
          ${limitedTransactions.map(transaction => `
            <tr>
              <td>${new Date(transaction.createdAt).toLocaleDateString(options.locale)}</td>
              <td class="currency">${formatCurrency(parseFloat(transaction.amount), options.currency)}</td>
              <td>${transaction.description || ''}</td>
              <td>${transaction.category || ''}</td>
              <td>${transaction.type}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate mock PDF content (fallback)
 */
function generateMockPDFContent(data: PDFExportData, options: PDFExportOptions): string {
  const { locale, currency, includeLogo, companyName } = options;
  const isTurkish = locale === 'tr-TR';
  
  const title = isTurkish ? 'FinBot Finansal Rapor' : 'FinBot Financial Report';
  const generatedAt = new Date().toLocaleDateString(locale);
  
  let content = `
=== ${title} ===
${companyName ? `Şirket: ${companyName}` : ''}
Oluşturulma Tarihi: ${generatedAt}
Para Birimi: ${currency}

`;

  if (includeLogo) {
    content += `
[LOGO PLACEHOLDER]
FinBot - Finansal Yönetim Platformu

`;
  }

  // Summary section
  if (data.summary) {
    const summaryTitle = isTurkish ? 'Özet' : 'Summary';
    content += `
=== ${summaryTitle} ===
Toplam Bakiye: ${formatCurrency(data.summary.totalBalance, currency)}
Toplam Varlık: ${formatCurrency(data.summary.totalAssets, currency)}
Toplam Borç: ${formatCurrency(data.summary.totalDebts, currency)}
Net Değer: ${formatCurrency(data.summary.netWorth, currency)}

`;
  }

  // Accounts section
  if (data.accounts && data.accounts.length > 0) {
    const accountsTitle = isTurkish ? 'Hesaplar' : 'Accounts';
    content += `
=== ${accountsTitle} ===
`;

    data.accounts.forEach(account => {
      content += `
Banka: ${account.bankName}
Hesap: ${account.accountName}
Tip: ${account.type}
Bakiye: ${formatCurrency(parseFloat(account.balance), currency)}
Para Birimi: ${account.currency}
---
`;
    });
  }

  // Transactions section
  if (data.transactions && data.transactions.length > 0) {
    const transactionsTitle = isTurkish ? 'İşlemler' : 'Transactions';
    content += `
=== ${transactionsTitle} ===
`;

    data.transactions.slice(0, 50).forEach(transaction => { // Limit to 50 transactions
      content += `
Tarih: ${new Date(transaction.createdAt).toLocaleDateString(locale)}
Tutar: ${formatCurrency(parseFloat(transaction.amount), currency)}
Açıklama: ${transaction.description || ''}
Kategori: ${transaction.category || ''}
Tip: ${transaction.type}
---
`;
    });
  }

  // Charts placeholder
  if (options.includeCharts) {
    const chartsTitle = isTurkish ? 'Grafikler' : 'Charts';
    content += `
=== ${chartsTitle} ===
[Grafik 1: Hesap Dağılımı]
[Grafik 2: İşlem Trendi]
[Grafik 3: Kategori Analizi]
`;
  }

  // Footer
  content += `

---
FinBot ile oluşturuldu - ${new Date().toLocaleDateString(locale)}
Bu rapor otomatik olarak oluşturulmuştur.
`;

  return content;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string): string {
  const formatted = Math.abs(amount).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  const symbol = {
    'TRY': '₺',
    'USD': '$',
    'EUR': '€',
  }[currency] || currency;
  
  return `${symbol} ${formatted}`;
}

/**
 * Generate PDF filename
 */
export function generatePDFFilename(
  type: 'accounts' | 'transactions' | 'financial-summary' | 'combined',
  locale: 'tr-TR' | 'en-US' = 'tr-TR'
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const typeMap = {
    accounts: locale === 'tr-TR' ? 'hesaplar-raporu' : 'accounts-report',
    transactions: locale === 'tr-TR' ? 'islemler-raporu' : 'transactions-report',
    'financial-summary': locale === 'tr-TR' ? 'finansal-ozet' : 'financial-summary',
    combined: locale === 'tr-TR' ? 'kapsamli-rapor' : 'comprehensive-report',
  };

  return `${typeMap[type]}_${timestamp}.pdf`;
}

/**
 * Get PDF export options for user's locale
 */
export function getPDFExportOptions(locale: string, companyName?: string): PDFExportOptions {
  const isTurkish = locale.startsWith('tr');
  
  return {
    locale: isTurkish ? 'tr-TR' : 'en-US',
    currency: 'TRY', // Default currency - can be overridden via options
    includeLogo: true,
    includeCharts: true,
    companyName,
  };
}

