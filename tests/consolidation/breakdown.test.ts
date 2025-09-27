import { describe, test, expect } from 'vitest';
import { calculateConsolidationBreakdown, prepareBreakdownChartData } from '../../server/src/modules/consolidation/breakdown';

describe('Consolidation Breakdown', () => {
  const mockAccounts = [
    {
      id: '1',
      userId: 'user1',
      name: 'Şirket Vadesiz',
      type: 'checking',
      bankName: 'Ziraat Bank',
      accountNumber: '1234567890',
      balance: '100000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      userId: 'user1',
      name: 'Şirket Vadeli',
      type: 'savings',
      bankName: 'İş Bank',
      accountNumber: '0987654321',
      balance: '200000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      userId: 'user1',
      name: 'Kişisel Vadesiz',
      type: 'checking',
      bankName: 'Garanti BBVA',
      accountNumber: '1111111111',
      balance: '50000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      userId: 'user1',
      name: 'Kredi Kartı',
      type: 'credit',
      bankName: 'Yapı Kredi',
      accountNumber: '2222222222',
      balance: '-25000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      userId: 'user1',
      name: 'Yatırım Hesabı',
      type: 'investment',
      bankName: 'Akbank',
      accountNumber: '3333333333',
      balance: '150000',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  test('calculateConsolidationBreakdown - doğru kategorilere ayırma', () => {
    const result = calculateConsolidationBreakdown(mockAccounts);

    // Şirket hesapları kontrolü
    expect(result.breakdown.company.bank).toBe(300000); // 100000 + 200000
    expect(result.breakdown.company.cash).toBe(0);
    expect(result.breakdown.company.credit).toBe(0);
    expect(result.breakdown.company.investment).toBe(150000);

    // Kişisel hesaplar kontrolü
    expect(result.breakdown.personal.bank).toBe(50000);
    expect(result.breakdown.personal.cash).toBe(0);
    expect(result.breakdown.personal.credit).toBe(25000); // Negatif bakiye pozitif olarak
    expect(result.breakdown.personal.investment).toBe(0);
  });

  test('calculateConsolidationBreakdown - tablo verilerini doğru oluşturma', () => {
    const result = calculateConsolidationBreakdown(mockAccounts);

    expect(result.table).toHaveLength(8); // 4 kategori × 2 tip (company/personal)
    
    // Şirket banka kontrolü
    const companyBank = result.table.find(item => 
      item.category === 'Banka' && item.type === 'Şirket'
    );
    expect(companyBank).toBeDefined();
    expect(companyBank?.amount).toBe(300000);
    expect(companyBank?.percentage).toBeCloseTo(60, 1); // 300000 / 500000 * 100

    // Kişisel kredi kontrolü
    const personalCredit = result.table.find(item => 
      item.category === 'Kredi' && item.type === 'Kişisel'
    );
    expect(personalCredit).toBeDefined();
    expect(personalCredit?.amount).toBe(25000);
  });

  test('calculateConsolidationBreakdown - özet hesaplamaları', () => {
    const result = calculateConsolidationBreakdown(mockAccounts);

    expect(result.summary.totalCompany).toBe(450000); // 300000 + 150000
    expect(result.summary.totalPersonal).toBe(75000); // 50000 + 25000
    expect(result.summary.totalAmount).toBe(525000); // 450000 + 75000
    expect(result.summary.companyPercentage).toBeCloseTo(85.7, 1);
    expect(result.summary.personalPercentage).toBeCloseTo(14.3, 1);
  });

  test('prepareBreakdownChartData - grafik verilerini doğru oluşturma', () => {
    const breakdown = {
      company: {
        bank: 300000,
        cash: 0,
        credit: 0,
        investment: 150000
      },
      personal: {
        bank: 50000,
        cash: 0,
        credit: 25000,
        investment: 0
      }
    };

    const chartData = prepareBreakdownChartData(breakdown);

    expect(chartData).toHaveLength(4); // 4 kategori

    // Banka kategorisi kontrolü
    const bankCategory = chartData.find(item => item.category === 'Banka');
    expect(bankCategory).toBeDefined();
    expect(bankCategory?.company).toBe(300000);
    expect(bankCategory?.personal).toBe(50000);
    expect(bankCategory?.total).toBe(350000);

    // Yatırım kategorisi kontrolü
    const investmentCategory = chartData.find(item => item.category === 'Yatırım');
    expect(investmentCategory).toBeDefined();
    expect(investmentCategory?.company).toBe(150000);
    expect(investmentCategory?.personal).toBe(0);
    expect(investmentCategory?.total).toBe(150000);
  });

  test('boş hesap listesi ile çalışma', () => {
    const result = calculateConsolidationBreakdown([]);

    expect(result.breakdown.company.bank).toBe(0);
    expect(result.breakdown.company.cash).toBe(0);
    expect(result.breakdown.company.credit).toBe(0);
    expect(result.breakdown.company.investment).toBe(0);
    expect(result.breakdown.personal.bank).toBe(0);
    expect(result.breakdown.personal.cash).toBe(0);
    expect(result.breakdown.personal.credit).toBe(0);
    expect(result.breakdown.personal.investment).toBe(0);
    expect(result.table).toHaveLength(0);
    expect(result.summary.totalAmount).toBe(0);
  });

  test('negatif bakiyeli hesaplar', () => {
    const negativeAccounts = [
      {
        id: '1',
        userId: 'user1',
        name: 'Kredi Kartı',
        type: 'credit',
        bankName: 'Test Bank',
        accountNumber: '123',
        balance: '-50000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        userId: 'user1',
        name: 'Kredi Kartı 2',
        type: 'credit',
        bankName: 'Test Bank 2',
        accountNumber: '456',
        balance: '-25000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const result = calculateConsolidationBreakdown(negativeAccounts);

    // Negatif bakiyeler pozitif olarak işlenmeli
    expect(result.breakdown.personal.credit).toBe(75000); // 50000 + 25000
  });
});
