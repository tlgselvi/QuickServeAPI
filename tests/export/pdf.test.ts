import { describe, test, expect } from 'vitest';
import { PDFExporter } from '../../server/src/modules/exporter/pdf';

describe('PDF Exporter', () => {
  const mockTransactions = [
    {
      id: '1',
      amount: 1000,
      description: 'Test Transaction',
      category: 'Test Category',
      date: '2024-01-15',
      type: 'income' as const
    },
    {
      id: '2',
      amount: -500,
      description: 'Test Expense',
      category: 'Test Category',
      date: '2024-01-16',
      type: 'expense' as const
    }
  ];

  const mockAccounts = [
    {
      id: '1',
      balance: 10000,
      bankName: 'Test Bank',
      accountName: 'Test Account'
    }
  ];

  const mockSummary = {
    totalBalance: 10000,
    totalCash: 8000,
    totalDebt: 2000,
    totalIncome: 5000,
    totalExpense: 3000,
    period: '2024-01',
    netWorth: 8000,
    riskScore: 75
  };

  const mockRiskAnalysis = {
    riskScore: 75,
    riskLevel: 'medium' as const,
    recommendations: [
      'Portföyü çeşitlendirin',
      'Risk yönetimi stratejisi geliştirin'
    ]
  };

  const mockConsolidationBreakdown = {
    company: {
      bank: 6000,
      cash: 1000,
      credit: 500,
      investment: 2500
    },
    personal: {
      bank: 2000,
      cash: 500,
      credit: 300,
      investment: 1200
    }
  };

  test('generateAdvancedFinancialReport - temel HTML yapısı', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary,
      mockRiskAnalysis,
      mockConsolidationBreakdown
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>FinBot - Gelişmiş Finansal Rapor</title>');
    expect(html).toContain('FinBot Finansal Raporu');
  });

  test('generateAdvancedFinancialReport - özet cümle içeriği', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary,
      mockRiskAnalysis
    );

    expect(html).toContain('Bu rapora göre net değer');
    expect(html).toContain('₺8.000,00'); // formatCurrency output
    expect(html).toContain('risk seviyesi Orta (75/100)');
  });

  test('generateAdvancedFinancialReport - risk analizi bölümü', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary,
      mockRiskAnalysis
    );

    expect(html).toContain('⚠️ Risk Analizi');
    expect(html).toContain('Risk Değerlendirmesi ve Öneriler');
    expect(html).toContain('risk-medium'); // CSS class
    expect(html).toContain('Portföyü çeşitlendirin');
  });

  test('generateAdvancedFinancialReport - konsolidasyon breakdown', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary,
      mockRiskAnalysis,
      mockConsolidationBreakdown
    );

    expect(html).toContain('🏢 Konsolidasyon Dağılımı');
    expect(html).toContain('🏢 Şirket Hesapları');
    expect(html).toContain('👤 Kişisel Hesaplar');
    expect(html).toContain('₺6.000,00'); // Company bank amount
    expect(html).toContain('₺2.000,00'); // Personal bank amount
  });

  test('generateAdvancedFinancialReport - hesap bakiyeleri tablosu', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary
    );

    expect(html).toContain('💳 Hesap Bakiyeleri');
    expect(html).toContain('Test Bank');
    expect(html).toContain('Test Account');
    expect(html).toContain('₺10.000,00'); // Account balance
  });

  test('generateAdvancedFinancialReport - işlemler tablosu', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary
    );

    expect(html).toContain('📝 Son İşlemler');
    expect(html).toContain('Test Transaction');
    expect(html).toContain('Test Expense');
    expect(html).toContain('₺1.000,00'); // Income amount
    expect(html).toContain('₺500,00'); // Expense amount
  });

  test('generateAdvancedFinancialReport - metrik kartları', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary,
      mockRiskAnalysis
    );

    expect(html).toContain('🔑 Temel Metrikler');
    expect(html).toContain('Net Değer');
    expect(html).toContain('Toplam Nakit');
    expect(html).toContain('Toplam Borç');
    expect(html).toContain('Risk Skoru');
    expect(html).toContain('metric-value positive'); // Positive values
    expect(html).toContain('metric-value negative'); // Negative values
  });

  test('generateAdvancedFinancialReport - CSS stilleri', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary
    );

    expect(html).toContain('@import url(\'https://fonts.googleapis.com/css2?family=Inter');
    expect(html).toContain('.header {');
    expect(html).toContain('background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)');
    expect(html).toContain('.metric-card::before {');
    expect(html).toContain('@media print {');
  });

  test('generateAdvancedFinancialReport - footer bilgileri', () => {
    const html = PDFExporter.generateAdvancedFinancialReport(
      mockTransactions,
      mockAccounts,
      mockSummary
    );

    expect(html).toContain('Bu rapor FinBot AI sistemi tarafından otomatik olarak oluşturulmuştur');
    expect(html).toContain('FinBot v3.0');
    expect(html).toContain('Rapor Tarihi:');
  });

  test('generateTransactionReport - eski format uyumluluğu', () => {
    const html = PDFExporter.generateTransactionReport(
      mockTransactions,
      mockAccounts,
      mockSummary
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Finansal Rapor</title>');
    expect(html).toContain('Finansal Özet');
    expect(html).toContain('Hesap Bakiyeleri');
    expect(html).toContain('Son İşlemler');
  });

  test('generateAccountStatement - hesap ekstresi', () => {
    const account = mockAccounts[0];
    const html = PDFExporter.generateAccountStatement(
      account,
      mockTransactions,
      '2024-01'
    );

    expect(html).toContain('Hesap Ekstresi');
    expect(html).toContain('Test Bank - Test Account');
    expect(html).toContain('Güncel Bakiye: ₺10.000,00');
    expect(html).toContain('Test Transaction');
    expect(html).toContain('Test Expense');
  });
});
