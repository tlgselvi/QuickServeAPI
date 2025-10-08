import { db } from '../db';
import {
  users,
  accounts,
  transactions,
  investments,
  fixedExpenses,
  credits,
  systemAlerts,
} from '../db/schema';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export async function createDemoData () {
  try {
    logger.info('🚀 Demo data oluşturuluyor...');

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const demoUserId = randomUUID();

    const [demoUser] = await db.insert(users).values({
      id: demoUserId,
      email: 'demo@finbot.com',
      username: 'demo_user',
      passwordHash: hashedPassword,
      role: 'user',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    logger.info('✅ Demo kullanıcı oluşturuldu:', demoUser.email);

    // Create demo accounts
    const accountsData = [
      {
        id: randomUUID(),
        userId: demoUserId,
        name: 'İş Bankası Vadesiz',
        type: 'checking',
        bankName: 'Türkiye İş Bankası',
        accountNumber: '1234-5678-9012',
        balance: '150000.00',
        currency: 'TRY',
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        name: 'Garanti Kredi Kartı',
        type: 'credit_card',
        bankName: 'Garanti BBVA',
        accountNumber: '****-****-****-1234',
        balance: '-25000.00',
        currency: 'TRY',
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        name: 'Akbank Vadeli Hesap',
        type: 'savings',
        bankName: 'Akbank',
        accountNumber: '9876-5432-1098',
        balance: '75000.00',
        currency: 'TRY',
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        name: 'Konut Kredisi',
        type: 'loan',
        bankName: 'Ziraat Bankası',
        accountNumber: 'KON-2023-001',
        balance: '-450000.00',
        currency: 'TRY',
      },
    ];

    const createdAccounts = await db.insert(accounts).values(accountsData).returning();
    logger.info('✅ Demo hesaplar oluşturuldu:', createdAccounts.length);

    // Create demo transactions
    const transactionsData = [
      {
        id: randomUUID(),
        accountId: createdAccounts[0].id,
        userId: demoUserId,
        type: 'income',
        amount: '25000.00',
        description: 'Maaş',
        category: 'salary',
        date: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        accountId: createdAccounts[0].id,
        userId: demoUserId,
        type: 'expense',
        amount: '5000.00',
        description: 'Market alışverişi',
        category: 'groceries',
        date: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        accountId: createdAccounts[0].id,
        userId: demoUserId,
        type: 'expense',
        amount: '1500.00',
        description: 'Elektrik faturası',
        category: 'utilities',
        date: new Date('2024-01-03'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        accountId: createdAccounts[1].id,
        userId: demoUserId,
        type: 'expense',
        amount: '800.00',
        description: 'Online alışveriş',
        category: 'shopping',
        date: new Date('2024-01-04'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        accountId: createdAccounts[2].id,
        userId: demoUserId,
        type: 'income',
        amount: '375.00',
        description: 'Vadeli hesap faizi',
        category: 'interest',
        date: new Date('2024-01-05'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdTransactions = await db.insert(transactions).values(transactionsData).returning();
    logger.info('✅ Demo işlemler oluşturuldu:', createdTransactions.length);

    // Create demo investments
    const investmentsData = [
      {
        id: randomUUID(),
        userId: demoUserId,
        title: 'Apple Hisse Senedi',
        type: 'stock',
        symbol: 'AAPL',
        quantity: '10.00',
        purchasePrice: '180.00',
        currentPrice: '195.50',
        currency: 'USD',
        category: 'technology',
        riskLevel: 'medium',
        purchaseDate: new Date('2023-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        title: 'Bitcoin',
        type: 'crypto',
        symbol: 'BTC',
        quantity: '0.5',
        purchasePrice: '45000.00',
        currentPrice: '52000.00',
        currency: 'USD',
        category: 'cryptocurrency',
        riskLevel: 'high',
        purchaseDate: new Date('2023-08-20'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        title: 'Devlet Tahvili',
        type: 'bond',
        symbol: 'TRY-BOND-2024',
        quantity: '100000.00',
        purchasePrice: '100.00',
        currentPrice: '102.50',
        currency: 'TRY',
        category: 'government_bond',
        riskLevel: 'low',
        purchaseDate: new Date('2023-12-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        title: 'Altın Fonu',
        type: 'fund',
        symbol: 'ALTIN-FON',
        quantity: '5000.00',
        purchasePrice: '1.00',
        currentPrice: '1.08',
        currency: 'TRY',
        category: 'precious_metals',
        riskLevel: 'medium',
        purchaseDate: new Date('2023-10-10'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdInvestments = await db.insert(investments).values(investmentsData).returning();
    logger.info('✅ Demo yatırımlar oluşturuldu:', createdInvestments.length);

    // Create demo fixed expenses
    const fixedExpensesData = [
      {
        id: randomUUID(),
        userId: demoUserId,
        accountId: createdAccounts[0].id,
        name: 'Kira',
        amount: '8000.00',
        frequency: 'monthly',
        category: 'housing',
        description: 'Aylık kira ödemesi',
        nextDueDate: new Date('2024-02-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        accountId: createdAccounts[0].id,
        name: 'Telefon Faturası',
        amount: '150.00',
        frequency: 'monthly',
        category: 'utilities',
        description: 'Mobil telefon aboneliği',
        nextDueDate: new Date('2024-02-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        accountId: createdAccounts[0].id,
        name: 'Fitness Üyeliği',
        amount: '300.00',
        frequency: 'monthly',
        category: 'health',
        description: 'Spor salonu üyeliği',
        nextDueDate: new Date('2024-02-20'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdFixedExpenses = await db.insert(fixedExpenses).values(fixedExpensesData).returning();
    logger.info('✅ Demo sabit giderler oluşturuldu:', createdFixedExpenses.length);

    // Create demo credits
    const creditsData = [
      {
        id: randomUUID(),
        userId: demoUserId,
        accountId: createdAccounts[1].id,
        type: 'credit_card',
        name: 'Garanti Kredi Kartı',
        totalAmount: '50000.00',
        remainingAmount: '25000.00',
        interestRate: '2.50',
        monthlyPayment: '2500.00',
        dueDate: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        accountId: createdAccounts[3].id,
        type: 'mortgage',
        name: 'Konut Kredisi',
        totalAmount: '500000.00',
        remainingAmount: '450000.00',
        interestRate: '1.80',
        monthlyPayment: '8500.00',
        dueDate: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdCredits = await db.insert(credits).values(creditsData).returning();
    logger.info('✅ Demo krediler oluşturuldu:', createdCredits.length);

    // Create demo system alerts
    const alertsData = [
      {
        id: randomUUID(),
        userId: demoUserId,
        type: 'low_balance',
        title: 'Düşük Bakiye Uyarısı',
        message: "İş Bankası Vadesiz hesabınızda bakiye 10.000 TL'nin altına düştü.",
        severity: 'medium',
        isRead: false,
        metadata: JSON.stringify({ accountId: createdAccounts[0].id, threshold: 10000 }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        userId: demoUserId,
        type: 'payment_due',
        title: 'Ödeme Hatırlatması',
        message: 'Garanti Kredi Kartı ödemeniz 15 gün içinde yapılmalı.',
        severity: 'high',
        isRead: false,
        metadata: JSON.stringify({ creditId: createdCredits[0].id, dueDate: '2024-02-15' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const createdAlerts = await db.insert(systemAlerts).values(alertsData).returning();
    logger.info('✅ Demo uyarılar oluşturuldu:', createdAlerts.length);

    logger.info('🎉 Demo data başarıyla oluşturuldu!');
    logger.info('\n📊 Demo Data Özeti:');
    logger.info('- Kullanıcı: demo@finbot.com (şifre: demo123)');
    logger.info('- Hesaplar: 4 adet');
    logger.info('- İşlemler: 5 adet');
    logger.info('- Yatırımlar: 4 adet');
    logger.info('- Sabit Giderler: 3 adet');
    logger.info('- Krediler: 2 adet');
    logger.info('- Uyarılar: 2 adet');

    return {
      success: true,
      demoUserId,
      accounts: createdAccounts.length,
      transactions: createdTransactions.length,
      investments: createdInvestments.length,
      fixedExpenses: createdFixedExpenses.length,
      credits: createdCredits.length,
      alerts: createdAlerts.length,
    };
  } catch (error) {
    logger.error('❌ Demo data oluşturma hatası:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDemoData()
    .then(() => {
      logger.info('✅ Demo data script tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Demo data script hatası:', error);
      process.exit(1);
    });
}
