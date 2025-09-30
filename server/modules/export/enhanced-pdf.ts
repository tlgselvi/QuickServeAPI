import { generateCashFlowBridgePDF, generateAgingTablePDF, generateRunwayPDF } from './pdf-export';

export interface PDFTemplate {
  title: string;
  subtitle?: string;
  companyName: string;
  logo?: string;
  period: string;
  generatedAt: Date;
  currency: string;
  data: any;
  summary?: any;
  footer?: string;
}

export interface PDFStyle {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoHeight: string;
  showLogo: boolean;
  showFooter: boolean;
  watermark?: string;
}

/**
 * Generate enhanced PDF with branding and logo
 */
export function generateEnhancedPDF(
  template: PDFTemplate,
  style: PDFStyle = getDefaultStyle()
): string {
  const logoSection = style.showLogo && template.logo 
    ? `<img src="${template.logo}" alt="Logo" style="height: ${style.logoHeight}; margin-bottom: 20px;">`
    : '';

  const watermarkSection = style.watermark 
    ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; color: rgba(0,0,0,0.1); z-index: -1; pointer-events: none;">${style.watermark}</div>`
    : '';

  const footerSection = style.showFooter 
    ? generateFooter(template.footer || 'FinBot Financial Management System')
    : '';

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.title}</title>
    <style>
        @page {
            margin: 20mm;
            size: A4;
            @bottom-center {
                content: counter(page);
                font-size: 10px;
                color: #666;
            }
        }
        
        body { 
            font-family: '${style.fontFamily}', Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #333;
            line-height: 1.6;
        }
        
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid ${style.primaryColor};
            padding-bottom: 20px;
        }
        
        .company-name { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: ${style.primaryColor};
        }
        
        .report-title { 
            font-size: 22px; 
            color: ${style.secondaryColor}; 
            margin-bottom: 5px; 
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        
        .period { 
            font-size: 14px; 
            color: #666; 
        }
        
        .summary { 
            background: linear-gradient(135deg, #f5f5f5 0%, #e9e9e9 100%); 
            padding: 25px; 
            margin-bottom: 30px; 
            border-radius: 8px;
            border-left: 5px solid ${style.primaryColor};
        }
        
        .summary h3 {
            color: ${style.primaryColor};
            margin-top: 0;
            margin-bottom: 20px;
            font-size: 18px;
        }
        
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
        }
        
        .summary-item { 
            text-align: center; 
            background: white;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-label { 
            font-size: 12px; 
            color: #666; 
            margin-bottom: 8px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-value { 
            font-size: 20px; 
            font-weight: bold; 
            color: #333; 
        }
        
        .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .table th, .table td { 
            border: 1px solid #e0e0e0; 
            padding: 12px 8px; 
            text-align: right; 
        }
        
        .table th { 
            background: linear-gradient(135deg, ${style.primaryColor} 0%, ${style.secondaryColor} 100%); 
            font-weight: bold; 
            color: white;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        
        .table td:first-child, .table th:first-child { 
            text-align: left; 
        }
        
        .table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .table tbody tr:hover {
            background-color: #f0f8ff;
        }
        
        .positive { 
            color: #28a745; 
            font-weight: bold;
        }
        
        .negative { 
            color: #dc3545; 
            font-weight: bold;
        }
        
        .neutral {
            color: #6c757d;
        }
        
        .footer { 
            margin-top: 40px; 
            font-size: 11px; 
            color: #666; 
            text-align: center;
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
        }
        
        .assumptions { 
            margin-top: 25px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            border-left: 4px solid ${style.secondaryColor};
        }
        
        .assumptions h3 { 
            font-size: 16px; 
            margin-bottom: 15px; 
            color: ${style.primaryColor};
        }
        
        .assumptions ul { 
            margin: 0; 
            padding-left: 20px; 
        }
        
        .assumptions li {
            margin-bottom: 8px;
            color: #555;
        }
        
        .methodology {
            margin-top: 25px;
            background: #e3f2fd;
            padding: 20px;
            border-radius: 5px;
            border-left: 4px solid #2196f3;
        }
        
        .methodology h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #1976d2;
        }
        
        .methodology p {
            margin: 0;
            color: #555;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .chart-placeholder {
            background: #f5f5f5;
            border: 2px dashed #ccc;
            padding: 40px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .chart-placeholder h4 {
            color: #666;
            margin: 0;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-good { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-danger { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    ${watermarkSection}
    
    <div class="header">
        ${logoSection}
        <div class="company-name">${template.companyName}</div>
        <div class="report-title">${template.title}</div>
        ${template.subtitle ? `<div class="report-subtitle">${template.subtitle}</div>` : ''}
        <div class="period">Dönem: ${template.period}</div>
        <div class="period">Para Birimi: ${template.currency}</div>
        <div class="period">Oluşturulma: ${template.generatedAt.toLocaleDateString('tr-TR')} ${template.generatedAt.toLocaleTimeString('tr-TR')}</div>
    </div>

    ${template.summary ? generateSummarySection(template.summary, template.currency) : ''}

    ${generateDataSection(template.data, template.title)}

    ${generateAssumptionsSection()}

    ${generateMethodologySection(template.title)}

    ${footerSection}
</body>
</html>
  `;
}

/**
 * Get default PDF style
 */
function getDefaultStyle(): PDFStyle {
  return {
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    fontFamily: 'Inter, Arial, sans-serif',
    logoHeight: '60px',
    showLogo: true,
    showFooter: true,
    watermark: undefined,
  };
}

/**
 * Generate summary section
 */
function generateSummarySection(summary: any, currency: string): string {
  const summaryItems = Object.entries(summary).map(([key, value]) => {
    const label = getSummaryLabel(key);
    const formattedValue = formatValue(value, currency);
    const className = getSummaryClassName(key, value);
    
    return `
      <div class="summary-item">
        <div class="summary-label">${label}</div>
        <div class="summary-value ${className}">${formattedValue}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="summary">
      <h3>Özet</h3>
      <div class="summary-grid">
        ${summaryItems}
      </div>
    </div>
  `;
}

/**
 * Generate data section based on report type
 */
function generateDataSection(data: any, reportType: string): string {
  switch (reportType.toLowerCase()) {
    case 'cash flow bridge report':
      return generateCashFlowBridgeTable(data);
    case 'aging analysis report':
      return generateAgingTable(data);
    case 'runway analysis report':
      return generateRunwayTable(data);
    default:
      return generateGenericTable(data);
  }
}

/**
 * Generate Cash Flow Bridge table
 */
function generateCashFlowBridgeTable(data: any[]): string {
  return `
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
        ${data.map(item => `
          <tr>
            <td>${item.period}</td>
            <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
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
  `;
}

/**
 * Generate Aging table
 */
function generateAgingTable(data: any[]): string {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Müşteri/Tedarikçi</th>
          <th>Fatura No</th>
          <th>Fatura Tarihi</th>
          <th>Vade Tarihi</th>
          <th>Güncel Tutar</th>
          <th>Yaş (Gün)</th>
          <th>Segment</th>
          <th>Durum</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            <td>${item.customerVendorName}</td>
            <td>${item.invoiceNumber || '-'}</td>
            <td>${new Date(item.invoiceDate).toLocaleDateString('tr-TR')}</td>
            <td>${new Date(item.dueDate).toLocaleDateString('tr-TR')}</td>
            <td>${parseFloat(item.currentAmount).toLocaleString('tr-TR')}</td>
            <td>${item.agingDays}</td>
            <td><span class="status-badge ${getAgingStatusClass(item.agingBucket)}">${item.agingBucket}</span></td>
            <td><span class="status-badge ${getPaymentStatusClass(item.status)}">${item.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate Runway table
 */
function generateRunwayTable(data: any[]): string {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Dönem</th>
          <th>Başlangıç Bakiyesi</th>
          <th>Girişler</th>
          <th>Çıkışlar</th>
          <th>Net Akış</th>
          <th>Kapanış Bakiyesi</th>
          <th>Runway (Ay)</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            <td>${item.period}</td>
            <td>${item.openingBalance.toLocaleString('tr-TR')}</td>
            <td class="positive">${item.inflows.toLocaleString('tr-TR')}</td>
            <td class="negative">${item.outflows.toLocaleString('tr-TR')}</td>
            <td class="${item.netFlow >= 0 ? 'positive' : 'negative'}">${item.netFlow.toLocaleString('tr-TR')}</td>
            <td>${item.closingBalance.toLocaleString('tr-TR')}</td>
            <td><span class="status-badge ${getRunwayStatusClass(item.runwayMonths)}">${item.runwayMonths.toFixed(1)} ay</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate generic table
 */
function generateGenericTable(data: any[]): string {
  if (!data || data.length === 0) {
    return '<p>Veri bulunamadı.</p>';
  }

  const headers = Object.keys(data[0]);
  
  return `
    <table class="table">
      <thead>
        <tr>
          ${headers.map(header => `<th>${getHeaderLabel(header)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map(item => `
          <tr>
            ${headers.map(header => `<td>${formatCellValue(item[header])}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Generate assumptions section
 */
function generateAssumptionsSection(): string {
  return `
    <div class="assumptions">
      <h3>Varsayımlar ve Sınırlamalar</h3>
      <ul>
        <li>Tüm işlemler nakit bazlı hesaplanmıştır</li>
        <li>Alacak ve borçlar vade tarihlerine göre gruplandırılmıştır</li>
        <li>Faiz ve komisyonlar dahil edilmiştir</li>
        <li>Kur farkları cari kur ile hesaplanmıştır</li>
        <li>Gelecek dönem projeksiyonları geçmiş trendlere dayanmaktadır</li>
      </ul>
    </div>
  `;
}

/**
 * Generate methodology section
 */
function generateMethodologySection(reportType: string): string {
  let methodology = '';
  
  switch (reportType.toLowerCase()) {
    case 'cash flow bridge report':
      methodology = 'Cash Flow Bridge metodu ile nakit akışı analizi yapılmıştır. İşlemler operasyonel, yatırım ve finansman faaliyetleri olarak sınıflandırılmıştır.';
      break;
    case 'aging analysis report':
      methodology = 'Yaşlandırma analizi, alacak ve borçların vade tarihlerine göre gruplandırılması ile yapılmıştır. 0-30, 30-60, 60-90 ve 90+ günlük segmentler kullanılmıştır.';
      break;
    case 'runway analysis report':
      methodology = 'Runway analizi, mevcut nakit pozisyonunun aylık giderlere bölünmesi ile hesaplanmıştır. Gelecek dönem projeksiyonları geçmiş trendlere dayanmaktadır.';
      break;
    default:
      methodology = 'Rapor, FinBot sisteminin gelişmiş analitik motoru kullanılarak oluşturulmuştur.';
  }

  return `
    <div class="methodology">
      <h3>Metodoloji</h3>
      <p>${methodology}</p>
    </div>
  `;
}

/**
 * Generate footer
 */
function generateFooter(footerText: string): string {
  return `
    <div class="footer">
      <p><strong>${footerText}</strong></p>
      <p>Bu rapor ${new Date().toLocaleString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
      <p>Sayfa <span class="page-number"></span></p>
    </div>
  `;
}

/**
 * Helper functions
 */
function getSummaryLabel(key: string): string {
  const labels: Record<string, string> = {
    totalInflows: 'Toplam Giriş',
    totalOutflows: 'Toplam Çıkış',
    netCashFlow: 'Net Nakit Akışı',
    openingBalance: 'Açılış Bakiyesi',
    closingBalance: 'Kapanış Bakiyesi',
    variance: 'Değişim',
    variancePercent: 'Değişim %',
    runwayMonths: 'Runway (Ay)',
    totalAR: 'Toplam Alacak',
    totalAP: 'Toplam Borç',
    overdueAmount: 'Vadesi Geçen Tutar',
  };
  return labels[key] || key;
}

function formatValue(value: any, currency: string): string {
  if (typeof value === 'number') {
    if (value < 0) {
      return `-${Math.abs(value).toLocaleString('tr-TR')} ${currency}`;
    }
    return `${value.toLocaleString('tr-TR')} ${currency}`;
  }
  return String(value);
}

function getSummaryClassName(key: string, value: any): string {
  if (typeof value === 'number') {
    if (key.includes('Inflow') || key.includes('Positive')) {
      return 'positive';
    }
    if (key.includes('Outflow') || key.includes('Negative')) {
      return 'negative';
    }
    if (value < 0) {
      return 'negative';
    }
    if (value > 0) {
      return 'positive';
    }
  }
  return 'neutral';
}

function getAgingStatusClass(bucket: string): string {
  switch (bucket) {
    case '0-30': return 'status-good';
    case '30-60': return 'status-warning';
    case '60-90': return 'status-warning';
    case '90+': return 'status-danger';
    default: return 'status-warning';
  }
}

function getPaymentStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid': return 'status-good';
    case 'outstanding': return 'status-warning';
    case 'overdue': return 'status-danger';
    default: return 'status-warning';
  }
}

function getRunwayStatusClass(months: number): string {
  if (months > 12) return 'status-good';
  if (months > 6) return 'status-warning';
  return 'status-danger';
}

function getHeaderLabel(header: string): string {
  const labels: Record<string, string> = {
    id: 'ID',
    name: 'Ad',
    amount: 'Tutar',
    date: 'Tarih',
    status: 'Durum',
    type: 'Tip',
    description: 'Açıklama',
    createdAt: 'Oluşturulma',
    updatedAt: 'Güncellenme',
  };
  return labels[header] || header;
}

function formatCellValue(value: any): string {
  if (value instanceof Date) {
    return value.toLocaleDateString('tr-TR');
  }
  if (typeof value === 'number') {
    return value.toLocaleString('tr-TR');
  }
  return String(value || '-');
}
