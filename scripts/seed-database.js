#!/usr/bin/env node

/**
 * Database seed script for FinBot V3
 * Creates initial admin user and demo data
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as schema from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  logger.error('❌ DATABASE_URL environment variable is required');
  throw new Error('DATABASE_URL environment variable is required');
}

async function seedDatabase() {
  let sqlClient = null;
  
  try {
    logger.info('🌱 Starting database seeding...');

    // Configure Neon for HTTP connections
    neonConfig.fetchConnectionCache = true;

    // Use appropriate driver based on URL
    let db;
    
    if (DATABASE_URL.includes('neon.tech')) {
      // Neon database with HTTP connection
      sqlClient = neon(DATABASE_URL);
      db = drizzle(sqlClient, { schema });
    } else {
      // Standard PostgreSQL
      sqlClient = postgres(DATABASE_URL);
      db = drizzlePg(sqlClient, { schema });
    }

    // Test connection
    await sqlClient`SELECT 1`;
    logger.info('✅ Database connection established');

    // Seed admin user
    await seedAdminUser(db);
    
    // Seed demo user
    await seedDemoUser(db);
    
    // Seed demo financial data
    await seedDemoData(db);

    logger.info('🎉 Database seeding completed successfully!');

  } catch (error) {
    logger.error('❌ Database seeding failed:', error.message);
    logger.error('📋 Error details:', error.stack);
    // Do not exit the process on Render; allow server to continue
    throw error;
  } finally {
    // Cleanup connections
    try {
      if (sqlClient && typeof sqlClient.end === 'function') {
        await sqlClient.end();
      }
    } catch (cleanupError) {
      logger.warn('⚠️  Error during cleanup:', cleanupError.message);
    }
  }
}

async function seedAdminUser(db) {
  logger.info('👤 Seeding admin user...');
  
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = {
    id: crypto.randomUUID(),
    username: 'admin',
    email: 'admin@finbot.com',
    password: adminPassword,
    name: 'Admin User',
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Check if admin exists
  const existingAdmins = await db.select().from(schema.users).where(eq(schema.users.email, adminUser.email));
  
  if (existingAdmins.length === 0) {
    await db.insert(schema.users).values(adminUser);
    logger.info('✅ Admin user created');
    logger.info('📧 Email: admin@finbot.com');
    logger.info('🔑 Password: admin123');
  } else {
    logger.info('ℹ️  Admin user already exists');
  }
}

async function seedDemoUser(db) {
  logger.info('👤 Seeding demo user...');
  
  const demoPassword = await bcrypt.hash('demo123', 10);
  const demoUser = {
    id: crypto.randomUUID(),
    username: 'demo',
    email: 'demo@finbot.com',
    password: demoPassword,
    name: 'Demo User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Check if demo user exists
  const existingDemos = await db.select().from(schema.users).where(eq(schema.users.email, demoUser.email));
  
  if (existingDemos.length === 0) {
    await db.insert(schema.users).values(demoUser);
    logger.info('✅ Demo user created');
    logger.info('📧 Email: demo@finbot.com');
    logger.info('🔑 Password: demo123');
  } else {
    logger.info('ℹ️  Demo user already exists');
  }
}

async function seedDemoData(db) {
  logger.info('💰 Seeding demo financial data...');
  
  // Get demo user ID
  const demoUsers = await db.select().from(schema.users).where(eq(schema.users.email, 'demo@finbot.com'));
  
  if (demoUsers.length === 0) {
    logger.info('⚠️  Demo user not found, skipping demo data');
    return;
  }
  
  const demoUserId = demoUsers[0].id;
  
  // Sample bank accounts
  const bankAccounts = [
    {
      id: crypto.randomUUID(),
      userId: demoUserId,
      name: 'Ana Hesap',
      type: 'CHECKING',
      balance: 15000.00,
      currency: 'TRY',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: crypto.randomUUID(),
      userId: demoUserId,
      name: 'Tasarruf Hesabı',
      type: 'SAVINGS',
      balance: 50000.00,
      currency: 'TRY',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Insert bank accounts
  for (const account of bankAccounts) {
    const existingAccounts = await db.select().from(schema.bankAccounts)
      .where(eq(schema.bankAccounts.userId, demoUserId));
    
    if (existingAccounts.length === 0) {
      await db.insert(schema.bankAccounts).values(account);
    }
  }
  
  logger.info('✅ Demo financial data created');
}

// Export for use in other scripts
export { seedDatabase };

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}
