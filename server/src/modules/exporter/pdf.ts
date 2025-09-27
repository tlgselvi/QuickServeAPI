import { formatCurrency } from '../../../lib/utils/formatCurrency';

interface RiskAnalysis {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface ConsolidationBreakdown {
  company: {
    bank: number;
    cash: number;
    credit: number;
    investment: number;
  };
  personal: {
    bank: number;
    cash: number;
    credit: number;
    investment: number;
  };
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
}

interface Account {
  id: string;
  balance: number;
  bankName: string;
  accountName: string;
}

interface FinancialSummary {
  totalBalance: number;
  totalCash: number;
  totalDebt: number;
  totalIncome: number;
  totalExpense: number;
  period: string;
  netWorth: number;
  riskScore?: number;
}

export class PDFExporter {
  /**
   * Gelişmiş finansal rapor oluşturur - şirket logosu, renkli grafikler ve özet cümle ile
   */
  static generateAdvancedFinancialReport(
    transactions: Transaction[],
    accounts: Account[],
    summary: FinancialSummary,
    riskAnalysis?: RiskAnalysis,
    consolidationBreakdown?: ConsolidationBreakdown
  ): string {
    const currentDate = new Date().toLocaleDateString('tr-TR');
    const riskLevelText = riskAnalysis ? 
      (riskAnalysis.riskLevel === 'low' ? 'Düşük' : 
       riskAnalysis.riskLevel === 'medium' ? 'Orta' : 'Yüksek') : 'Belirlenmemiş';
    
    // Özet cümle oluştur
    const summarySentence = `Bu rapora göre net değer ${formatCurrency(summary.netWorth || summary.totalBalance, 'TRY')}, ` +
      `risk seviyesi ${riskLevelText} (${riskAnalysis?.riskScore || 'N/A'}/100).`;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FinBot - Gelişmiş Finansal Rapor</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            margin: 0; 
            padding: 40px;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
          }
          
          .page {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            max-width: 210mm;
            margin: 0 auto;
          }
          
          .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
          }
          
          .logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            font-weight: 700;
            color: #3b82f6;
          }
          
          .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .report-date {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
          }
          
          .content {
            padding: 40px;
          }
          
          .executive-summary {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 40px;
            border-left: 4px solid #3b82f6;
          }
          
          .executive-summary h2 {
            color: #1e293b;
            margin-bottom: 16px;
            font-size: 24px;
            font-weight: 600;
          }
          
          .summary-sentence {
            font-size: 18px;
            color: #475569;
            font-weight: 500;
            line-height: 1.7;
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }
          
          .metric-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
          }
          
          .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          }
          
          .metric-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
            font-weight: 500;
          }
          
          .metric-value {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
          }
          
          .metric-value.positive { color: #059669; }
          .metric-value.negative { color: #dc2626; }
          
          .section {
            margin-bottom: 40px;
          }
          
          .section-title {
            font-size: 24px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .chart-container {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
          }
          
          .chart-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #1e293b;
          }
          
          .breakdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          
          .breakdown-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
          }
          
          .breakdown-card h4 {
            color: #3b82f6;
            margin-bottom: 16px;
            font-size: 16px;
            font-weight: 600;
          }
          
          .breakdown-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          
          .breakdown-item:last-child {
            border-bottom: none;
          }
          
          .breakdown-label {
            color: #64748b;
            font-size: 14px;
          }
          
          .breakdown-value {
            font-weight: 600;
            color: #1e293b;
          }
          
          .risk-indicator {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-left: 12px;
          }
          
          .risk-low { background: #dcfce7; color: #166534; }
          .risk-medium { background: #fef3c7; color: #92400e; }
          .risk-high { background: #fee2e2; color: #991b1b; }
          
          .table-container {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          
          td {
            padding: 16px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
          }
          
          tr:hover {
            background: #f8fafc;
          }
          
          .amount {
            text-align: right;
            font-weight: 600;
          }
          
          .income { color: #059669; }
          .expense { color: #dc2626; }
          
          .footer {
            background: #f8fafc;
            padding: 24px 40px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
          }
          
          @media print {
            body { background: white; }
            .page { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header with Logo -->
          <div class="header">
            <div class="report-date">${currentDate}</div>
            <div class="logo">FB</div>
            <h1>FinBot Finansal Raporu</h1>
            <p>Kapsamlı Finansal Analiz ve Risk Değerlendirmesi</p>
          </div>
          
          <div class="content">
            <!-- Executive Summary -->
            <div class="executive-summary">
              <h2>📊 Yönetici Özeti</h2>
              <div class="summary-sentence">${summarySentence}</div>
            </div>
            
            <!-- Key Metrics -->
            <div class="section">
              <h2 class="section-title">🔑 Temel Metrikler</h2>
              <div class="metrics-grid">
                <div class="metric-card">
                  <div class="metric-label">Net Değer</div>
                  <div class="metric-value ${(summary.netWorth || summary.totalBalance) >= 0 ? 'positive' : 'negative'}">
                    ${formatCurrency(summary.netWorth || summary.totalBalance, 'TRY')}
                  </div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Toplam Nakit</div>
                  <div class="metric-value positive">${formatCurrency(summary.totalCash, 'TRY')}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Toplam Borç</div>
                  <div class="metric-value negative">${formatCurrency(summary.totalDebt, 'TRY')}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">Risk Skoru</div>
                  <div class="metric-value">
                    ${riskAnalysis?.riskScore || 'N/A'}/100
                    ${riskAnalysis ? `<span class="risk-indicator risk-${riskAnalysis.riskLevel}">${riskLevelText}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>
    `;

    // Konsolidasyon Breakdown
    if (consolidationBreakdown) {
      html += `
            <div class="section">
              <h2 class="section-title">🏢 Konsolidasyon Dağılımı</h2>
              <div class="chart-container">
                <div class="chart-title">Şirket vs Kişisel Hesap Dağılımı</div>
                <div class="breakdown-grid">
                  <div class="breakdown-card">
                    <h4>🏢 Şirket Hesapları</h4>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Banka</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.company.bank, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Nakit</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.company.cash, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Kredi</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.company.credit, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Yatırım</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.company.investment, 'TRY')}</span>
                    </div>
                  </div>
                  <div class="breakdown-card">
                    <h4>👤 Kişisel Hesaplar</h4>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Banka</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.personal.bank, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Nakit</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.personal.cash, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Kredi</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.personal.credit, 'TRY')}</span>
                    </div>
                    <div class="breakdown-item">
                      <span class="breakdown-label">Yatırım</span>
                      <span class="breakdown-value">${formatCurrency(consolidationBreakdown.personal.investment, 'TRY')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      `;
    }

    // Risk Analizi
    if (riskAnalysis) {
      html += `
            <div class="section">
              <h2 class="section-title">⚠️ Risk Analizi</h2>
              <div class="chart-container">
                <div class="chart-title">Risk Değerlendirmesi ve Öneriler</div>
                <div style="margin-bottom: 20px;">
                  <div style="display: flex; align-items: center; margin-bottom: 16px;">
                    <span style="font-weight: 600; margin-right: 12px;">Genel Risk Seviyesi:</span>
                    <span class="risk-indicator risk-${riskAnalysis.riskLevel}">${riskLevelText} Risk (${riskAnalysis.riskScore}/100)</span>
                  </div>
                  <div style="background: #f1f5f9; padding: 16px; border-radius: 8px;">
                    <h4 style="margin-bottom: 12px; color: #1e293b;">Risk Yönetimi Önerileri:</h4>
                    <ul style="list-style: none; padding: 0;">
      `;
      
      riskAnalysis.recommendations.forEach((rec, index) => {
        html += `<li style="margin-bottom: 8px; padding-left: 20px; position: relative;">
                   <span style="position: absolute; left: 0; color: #3b82f6;">${index + 1}.</span>
                   ${rec}
                 </li>`;
      });
      
      html += `
                    </ul>
                  </div>
                </div>
              </div>
            </div>
      `;
    }

    // Hesap Bakiyeleri
    html += `
            <div class="section">
              <h2 class="section-title">💳 Hesap Bakiyeleri</h2>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Banka</th>
                      <th>Hesap Adı</th>
                      <th>Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
    `;

    accounts.forEach(account => {
      const balanceClass = account.balance >= 0 ? 'positive' : 'negative';
      html += `
        <tr>
          <td>${account.bankName}</td>
          <td>${account.accountName}</td>
          <td class="amount ${balanceClass}">${formatCurrency(account.balance, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- Son İşlemler -->
            <div class="section">
              <h2 class="section-title">📝 Son İşlemler</h2>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Açıklama</th>
                      <th>Kategori</th>
                      <th>Tür</th>
                      <th>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
    `;

    transactions.slice(0, 20).forEach(transaction => {
      const amountClass = transaction.type === 'income' || transaction.type === 'transfer_in' 
        ? 'income' : 'expense';
      
      html += `
        <tr>
          <td>${new Date(transaction.date).toLocaleDateString('tr-TR')}</td>
          <td>${transaction.description}</td>
          <td>${transaction.category}</td>
          <td>${transaction.type}</td>
          <td class="amount ${amountClass}">${formatCurrency(transaction.amount, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>Bu rapor FinBot AI sistemi tarafından otomatik olarak oluşturulmuştur.</p>
            <p>Rapor Tarihi: ${currentDate} | FinBot v3.0</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  static generateTransactionReport(
    transactions: Transaction[],
    accounts: Account[],
    summary: FinancialSummary
  ): string {
    // Bu örnek HTML formatında PDF içeriği oluşturur
    // Gerçek uygulamada PDF kütüphanesi (pdfkit, puppeteer vb.) kullanılabilir
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Finansal Rapor</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .summary-item { background: #f5f5f5; padding: 15px; border-radius: 5px; }
          .summary-label { font-weight: bold; margin-bottom: 5px; }
          .summary-value { font-size: 18px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .amount { text-align: right; }
          .income { color: green; }
          .expense { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Finansal Rapor</h1>
          <p>Dönem: ${summary.period}</p>
        </div>

        <div class="section">
          <h2>Finansal Özet</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Toplam Bakiye</div>
              <div class="summary-value">${formatCurrency(summary.totalBalance, 'TRY')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Toplam Nakit</div>
              <div class="summary-value">${formatCurrency(summary.totalCash, 'TRY')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Toplam Borç</div>
              <div class="summary-value">${formatCurrency(summary.totalDebt, 'TRY')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Toplam Gelir</div>
              <div class="summary-value income">${formatCurrency(summary.totalIncome, 'TRY')}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Toplam Gider</div>
              <div class="summary-value expense">${formatCurrency(summary.totalExpense, 'TRY')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Hesap Bakiyeleri</h2>
          <table>
            <thead>
              <tr>
                <th>Banka</th>
                <th>Hesap Adı</th>
                <th>Bakiye</th>
              </tr>
            </thead>
            <tbody>
    `;

    accounts.forEach(account => {
      html += `
        <tr>
          <td>${account.bankName}</td>
          <td>${account.accountName}</td>
          <td class="amount">${formatCurrency(account.balance, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Son İşlemler</h2>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
                <th>Kategori</th>
                <th>Tür</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
    `;

    transactions.forEach(transaction => {
      const amountClass = transaction.type === 'income' || transaction.type === 'transfer_in' 
        ? 'income' : 'expense';
      
      html += `
        <tr>
          <td>${new Date(transaction.date).toLocaleDateString('tr-TR')}</td>
          <td>${transaction.description}</td>
          <td>${transaction.category}</td>
          <td>${transaction.type}</td>
          <td class="amount ${amountClass}">${formatCurrency(transaction.amount, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  static generateAccountStatement(
    account: Account,
    transactions: Transaction[],
    period: string
  ): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hesap Ekstresi - ${account.accountName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .account-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .balance { font-size: 24px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .amount { text-align: right; }
          .income { color: green; }
          .expense { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Hesap Ekstresi</h1>
          <p>Dönem: ${period}</p>
        </div>

        <div class="account-info">
          <h2>${account.bankName} - ${account.accountName}</h2>
          <div class="balance">Güncel Bakiye: ${formatCurrency(account.balance, 'TRY')}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Açıklama</th>
              <th>Kategori</th>
              <th>Tür</th>
              <th>Tutar</th>
            </tr>
          </thead>
          <tbody>
    `;

    transactions.forEach(transaction => {
      const amountClass = transaction.type === 'income' || transaction.type === 'transfer_in' 
        ? 'income' : 'expense';
      
      html += `
        <tr>
          <td>${new Date(transaction.date).toLocaleDateString('tr-TR')}</td>
          <td>${transaction.description}</td>
          <td>${transaction.category}</td>
          <td>${transaction.type}</td>
          <td class="amount ${amountClass}">${formatCurrency(transaction.amount, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    return html;
  }

  static generateFinancialDashboard(
    accounts: Account[],
    summary: FinancialSummary,
    recentTransactions: Transaction[]
  ): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Finansal Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
          .summary-section { background: #f8f9fa; padding: 20px; border-radius: 10px; }
          .summary-item { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px; }
          .summary-label { font-weight: bold; }
          .summary-value { font-size: 16px; }
          .positive { color: green; }
          .negative { color: red; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .amount { text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Finansal Dashboard</h1>
          <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        <div class="dashboard-grid">
          <div>
            <h2>Hesap Bakiyeleri</h2>
            <table>
              <thead>
                <tr>
                  <th>Banka</th>
                  <th>Hesap</th>
                  <th>Bakiye</th>
                </tr>
              </thead>
              <tbody>
    `;

    accounts.forEach(account => {
      const balanceClass = account.balance >= 0 ? 'positive' : 'negative';
      html += `
        <tr>
          <td>${account.bankName}</td>
          <td>${account.accountName}</td>
          <td class="amount ${balanceClass}">${formatCurrency(account.balance, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>

            <h2>Son İşlemler</h2>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Tutar</th>
                </tr>
              </thead>
              <tbody>
    `;

    recentTransactions.slice(0, 10).forEach(transaction => {
      const amountClass = transaction.type === 'income' || transaction.type === 'transfer_in' 
        ? 'positive' : 'negative';
      
      html += `
        <tr>
          <td>${new Date(transaction.date).toLocaleDateString('tr-TR')}</td>
          <td>${transaction.description}</td>
          <td class="amount ${amountClass}">${formatCurrency(transaction.amount, 'TRY')}</td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>

          <div class="summary-section">
            <h2>Finansal Özet</h2>
            <div class="summary-item">
              <span class="summary-label">Toplam Bakiye:</span>
              <span class="summary-value ${summary.totalBalance >= 0 ? 'positive' : 'negative'}">
                ${formatCurrency(summary.totalBalance, 'TRY')}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Toplam Nakit:</span>
              <span class="summary-value positive">${formatCurrency(summary.totalCash, 'TRY')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Toplam Borç:</span>
              <span class="summary-value negative">${formatCurrency(summary.totalDebt, 'TRY')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Toplam Gelir:</span>
              <span class="summary-value positive">${formatCurrency(summary.totalIncome, 'TRY')}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Toplam Gider:</span>
              <span class="summary-value negative">${formatCurrency(summary.totalExpense, 'TRY')}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }
}
