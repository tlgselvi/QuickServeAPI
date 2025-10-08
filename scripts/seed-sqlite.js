#!/usr/bin/env node

/**
 * SQLite Database seed script for development
 * Populates database with demo data for testing
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as schema from '../shared/schema-sqlite.js';

// Simple logger for this script
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};

async function seedSQLiteDatabase() {
  try {
    logger.info('🌱 Seeding SQLite database with demo data...');

    // Connect to SQLite database
    const sqlite = new Database('dev.db');
    const db = drizzle(sqlite, { schema });

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON;');

    // Get admin user
    const adminUsers = await db.select().from(schema.users).where(schema.users.role.eq('admin')).limit(1);
    
    if (adminUsers.length === 0) {
      logger.error('❌ No admin user found. Please run setup-sqlite.js first.');
      process.exit(1);
    }

    const adminUser = adminUsers[0];
    logger.info(`✅ Found admin user: ${adminUser.email}`);

    // Create comprehensive demo accounts
    const demoAccounts = [
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'Şirket Ana Hesabı',
        type: 'company',
        balance: 1000000,
        currency: 'TRY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'Kişisel Banka Hesabı',
        type: 'personal',
        balance: 500000,
        currency: 'TRY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'USD Yatırım Hesabı',
        type: 'investment',
        balance: 25000,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'EUR Tasarruf Hesabı',
        type: 'savings',
        balance: 15000,
        currency: 'EUR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Insert demo accounts
    for (const account of demoAccounts) {
      try {
        await db.insert(schema.accounts).values(account);
        logger.info(`✅ Demo account created: ${account.name} (${account.balance} ${account.currency})`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          logger.info(`ℹ️  Account already exists: ${account.name}`);
        } else {
          throw error;
        }
      }
    }

    // Create comprehensive demo transactions
    const demoTransactions = [
      // Company transactions
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: 150000,
        type: 'income',
        description: 'Ana Satış Geliri - Ocak 2024',
        category: 'revenue',
        date: new Date('2024-01-15').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: -25000,
        type: 'expense',
        description: 'Ofis Kiraları',
        category: 'rent',
        date: new Date('2024-01-01').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: -15000,
        type: 'expense',
        description: 'Elektrik ve Su Faturaları',
        category: 'utilities',
        date: new Date('2024-01-05').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: -40000,
        type: 'expense',
        description: 'Personel Maaşları',
        category: 'salary',
        date: new Date('2024-01-30').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      // Personal transactions
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[1].id,
        amount: 75000,
        type: 'income',
        description: 'Maaş',
        category: 'salary',
        date: new Date('2024-01-30').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[1].id,
        amount: -5000,
        type: 'expense',
        description: 'Market Alışverişi',
        category: 'groceries',
        date: new Date('2024-01-20').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[1].id,
        amount: -2000,
        type: 'expense',
        description: 'Benzin',
        category: 'transportation',
        date: new Date('2024-01-25').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },

      // Investment transactions
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[2].id,
        amount: 5000,
        type: 'income',
        description: 'USD Döviz Kuru Kazancı',
        category: 'investment',
        date: new Date('2024-01-10').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },

      // Savings transactions
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[3].id,
        amount: 2000,
        type: 'income',
        description: 'EUR Faiz Geliri',
        category: 'interest',
        date: new Date('2024-01-15').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Insert demo transactions
    for (const transaction of demoTransactions) {
      try {
        await db.insert(schema.transactions).values(transaction);
        logger.info(`✅ Demo transaction created: ${transaction.description} (${transaction.amount} ${transaction.type})`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          logger.info(`ℹ️  Transaction already exists: ${transaction.description}`);
        } else {
          throw error;
        }
      }
    }

    // Create demo budgets
    const demoBudgets = [
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: '2024 Yıllık Bütçe',
        amount: 5000000,
        spent: 750000,
        category: 'annual',
        startDate: new Date('2024-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'Ofis Giderleri',
        amount: 300000,
        spent: 40000,
        category: 'office',
        startDate: new Date('2024-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Insert demo budgets
    for (const budget of demoBudgets) {
      try {
        await db.insert(schema.budgets).values(budget);
        logger.info(`✅ Demo budget created: ${budget.name} (${budget.spent}/${budget.amount})`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          logger.info(`ℹ️  Budget already exists: ${budget.name}`);
        } else {
          throw error;
        }
      }
    }

    logger.info('🎉 SQLite database seeding completed successfully!');
    logger.info('📊 Demo data summary:');
    logger.info(`   - ${demoAccounts.length} accounts created`);
    logger.info(`   - ${demoTransactions.length} transactions created`);
    logger.info(`   - ${demoBudgets.length} budgets created`);
    
    sqlite.close();

  } catch (error) {
    logger.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSQLiteDatabase();
}

export default seedSQLiteDatabase;
