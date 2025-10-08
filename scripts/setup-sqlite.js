#!/usr/bin/env node

/**
 * SQLite Database setup script for development
 * Creates tables and initial data for SQLite database
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

async function setupSQLiteDatabase() {
  try {
    logger.info('🔄 Setting up SQLite database...');

    // Create SQLite database
    const sqlite = new Database('dev.db');
    const db = drizzle(sqlite, { schema });

    // Enable foreign keys
    sqlite.exec('PRAGMA foreign_keys = ON;');

    logger.info('✅ SQLite database connected');

    // Create admin user
    const adminId = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash('admin123', 10);

    try {
      // Insert admin user
      await db.insert(schema.users).values({
        id: adminId,
        email: 'admin@finbot.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      logger.info('✅ Admin user created - Email: admin@finbot.com, Password: admin123');
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        logger.info('ℹ️  Admin user already exists: admin@finbot.com');
      } else {
        throw error;
      }
    }

    // Create demo accounts
    const demoAccounts = [
      {
        id: crypto.randomUUID(),
        userId: adminId,
        name: 'Ana Hesap',
        type: 'company',
        balance: 750000,
        currency: 'TRY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        userId: adminId,
        name: 'Kişisel Hesap',
        type: 'personal',
        balance: 250000,
        currency: 'TRY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const account of demoAccounts) {
      try {
        await db.insert(schema.accounts).values(account);
        logger.info(`✅ Demo account created: ${account.name}`);
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          throw error;
        }
      }
    }

    // Create demo transactions
    const demoTransactions = [
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: 50000,
        type: 'income',
        description: 'Satış Geliri',
        category: 'revenue',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        accountId: demoAccounts[0].id,
        amount: -15000,
        type: 'expense',
        description: 'Ofis Kiraları',
        category: 'rent',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    for (const transaction of demoTransactions) {
      try {
        await db.insert(schema.transactions).values(transaction);
        logger.info(`✅ Demo transaction created: ${transaction.description}`);
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          throw error;
        }
      }
    }

    logger.info('🎉 SQLite database setup completed successfully!');
    sqlite.close();

  } catch (error) {
    logger.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupSQLiteDatabase();
}

export default setupSQLiteDatabase;
