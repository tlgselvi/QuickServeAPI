#!/usr/bin/env node

/**
 * Render.com için seed data script
 * Production database'e demo data ekler
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  logger.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seedDatabase() {
  try {
    logger.info('🔄 Starting database seeding...');

    // Admin user oluştur
    const adminUser = {
      id: crypto.randomUUID(),
      email: 'admin@finbot.com',
      password: '$2b$10$rQZ8K9mP2nL3vX1wY5zAeO8fG7hI6jK2lM4nP5qR7sT9uV3wX6yZ', // admin123
      name: 'Admin User',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // User'ı kontrol et ve ekle
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, adminUser.email)
    });

    if (!existingUser) {
      await db.insert(schema.users).values(adminUser);
      logger.info('✅ Admin user created');
    } else {
      logger.info('ℹ️ Admin user already exists');
    }

    // Demo company data
    const companyData = {
      id: crypto.randomUUID(),
      name: 'Demo Şirket A.Ş.',
      taxNumber: '1234567890',
      address: 'İstanbul, Türkiye',
      phone: '+90 212 555 0123',
      email: 'info@demosirket.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existingCompany = await db.query.companies.findFirst({
      where: eq(schema.companies.name, companyData.name)
    });

    if (!existingCompany) {
      await db.insert(schema.companies).values(companyData);
      logger.info('✅ Demo company created');
    } else {
      logger.info('ℹ️ Demo company already exists');
    }

    // Demo bank accounts
    const bankAccounts = [
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'Ana Vadesiz Hesap',
        bankName: 'Garanti BBVA',
        accountNumber: '1234567890',
        balance: 50000,
        currency: 'TRY',
        accountType: 'CHECKING',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'USD Ticari Hesap',
        bankName: 'İş Bankası',
        accountNumber: '0987654321',
        balance: 25000,
        currency: 'USD',
        accountType: 'CHECKING',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        name: 'EUR Vadeli Hesap',
        bankName: 'Akbank',
        accountNumber: '1122334455',
        balance: 15000,
        currency: 'EUR',
        accountType: 'SAVINGS',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const account of bankAccounts) {
      const existingAccount = await db.query.bankAccounts.findFirst({
        where: eq(schema.bankAccounts.accountNumber, account.accountNumber)
      });

      if (!existingAccount) {
        await db.insert(schema.bankAccounts).values(account);
        logger.info(`✅ Bank account created: ${account.name}`);
      } else {
        logger.info(`ℹ️ Bank account already exists: ${account.name}`);
      }
    }

    // Demo transactions
    const transactions = [
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        bankAccountId: bankAccounts[0].id,
        type: 'INCOME',
        amount: 15000,
        currency: 'TRY',
        description: 'Müşteri ödemesi',
        category: 'SALES',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 gün önce
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        bankAccountId: bankAccounts[0].id,
        type: 'EXPENSE',
        amount: 5000,
        currency: 'TRY',
        description: 'Ofis kirası',
        category: 'RENT',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 gün önce
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        userId: adminUser.id,
        bankAccountId: bankAccounts[1].id,
        type: 'INCOME',
        amount: 5000,
        currency: 'USD',
        description: 'Export geliri',
        category: 'SALES',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 gün önce
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const transaction of transactions) {
      await db.insert(schema.transactions).values(transaction);
      logger.info(`✅ Transaction created: ${transaction.description}`);
    }

    logger.info('🎉 Database seeding completed successfully!');
    logger.info('📧 Admin login: admin@finbot.com');
    logger.info('🔑 Admin password: admin123');

  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
