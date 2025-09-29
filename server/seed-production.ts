import { db } from './db';
import { users, accounts, transactions, budgetLines } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

/**
 * Seed production database with demo data
 */
export async function seedProductionData() {
  try {
    console.log('🌱 Seeding production database...');

    // Check if demo user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(sql`email = 'demo@finbot.com'`)
      .limit(1);

    if (existingUser.length > 0) {
      console.log('✅ Demo user already exists, skipping seed');
      return;
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const [demoUser] = await db.insert(users).values({
      username: 'demo',
      email: 'demo@finbot.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    }).returning();

    console.log('✅ Demo user created:', demoUser.email);

    // Create demo accounts
    const demoAccounts = [
      {
        userId: demoUser.id,
        type: 'personal',
        bankName: 'Garanti BBVA',
        accountName: 'Vadesiz Hesap',
        balance: '25000.00',
        currency: 'TRY',
      },
      {
        userId: demoUser.id,
        type: 'personal',
        bankName: 'Garanti BBVA',
        accountName: 'Kredi Kartı',
        balance: '-3500.00',
        currency: 'TRY',
        subAccounts: JSON.stringify({
          creditCard: {
            type: 'creditCard',
            limit: 15000,
            used: 3500,
            cutOffDate: 15,
            paymentDueDate: 30,
            minimumPayment: 350,
            interestRate: 2.8,
          },
        }),
      },
      {
        userId: demoUser.id,
        type: 'company',
        bankName: 'İş Bankası',
        accountName: 'Şirket Vadesiz',
        balance: '45000.00',
        currency: 'TRY',
      },
      {
        userId: demoUser.id,
        type: 'company',
        bankName: 'İş Bankası',
        accountName: 'KMH',
        balance: '-5000.00',
        currency: 'TRY',
        subAccounts: JSON.stringify({
          kmh: {
            type: 'kmh',
            limit: 10000,
            used: 5000,
            interestRate: 3.2,
          },
        }),
      },
    ];

    const createdAccounts = await db.insert(accounts).values(demoAccounts).returning();
    console.log('✅ Demo accounts created:', createdAccounts.length);

    // Create demo transactions
    const demoTransactions = [
      {
        userId: demoUser.id,
        accountId: createdAccounts[0].id,
        type: 'income',
        amount: '5000.00',
        description: 'Maaş',
        category: 'salary',
      },
      {
        userId: demoUser.id,
        accountId: createdAccounts[0].id,
        type: 'expense',
        amount: '-1200.00',
        description: 'Market alışverişi',
        category: 'groceries',
      },
      {
        userId: demoUser.id,
        accountId: createdAccounts[0].id,
        type: 'expense',
        amount: '-800.00',
        description: 'Elektrik faturası',
        category: 'utilities',
      },
      {
        userId: demoUser.id,
        accountId: createdAccounts[2].id,
        type: 'income',
        amount: '15000.00',
        description: 'Müşteri ödemesi',
        category: 'revenue',
      },
      {
        userId: demoUser.id,
        accountId: createdAccounts[2].id,
        type: 'expense',
        amount: '-3500.00',
        description: 'Ofis kirası',
        category: 'rent',
      },
    ];

    const createdTransactions = await db.insert(transactions).values(demoTransactions).returning();
    console.log('✅ Demo transactions created:', createdTransactions.length);

    // Create demo budget lines
    const demoBudgetLines = [
      {
        userId: demoUser.id,
        category: 'Gıda',
        plannedAmount: '2000.00',
        actualAmount: '1200.00',
        month: new Date('2024-01-01'),
      },
      {
        userId: demoUser.id,
        category: 'Faturalar',
        plannedAmount: '1500.00',
        actualAmount: '800.00',
        month: new Date('2024-01-01'),
      },
      {
        userId: demoUser.id,
        category: 'Ulaşım',
        plannedAmount: '800.00',
        actualAmount: '650.00',
        month: new Date('2024-01-01'),
      },
    ];

    const createdBudgetLines = await db.insert(budgetLines).values(demoBudgetLines).returning();
    console.log('✅ Demo budget lines created:', createdBudgetLines.length);

    console.log('🎉 Production seed data created successfully!');
    console.log('📧 Demo login: demo@finbot.com');
    console.log('🔑 Demo password: demo123');

  } catch (error) {
    console.error('❌ Seed data creation failed:', error);
    throw error;
  }
}

/**
 * Check if production environment is properly configured
 */
export function validateProductionEnvironment(): boolean {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'NODE_ENV',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    return false;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ NODE_ENV must be set to "production"');
    return false;
  }

  console.log('✅ Production environment validation passed');
  return true;
}

/**
 * Initialize production database
 */
export async function initializeProduction() {
  console.log('🚀 Initializing production environment...');

  // Validate environment
  if (!validateProductionEnvironment()) {
    throw new Error('Production environment validation failed');
  }

  // Seed demo data
  await seedProductionData();

  console.log('✅ Production initialization completed');
}

