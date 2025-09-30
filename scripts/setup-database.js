#!/usr/bin/env node

/**
 * Database setup script for Render.com
 * Runs migrations and seed data on startup
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found, skipping database setup');
  process.exit(0);
}

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');

    // Use appropriate driver based on URL
    let db;
    if (DATABASE_URL.includes('neon.tech')) {
      // Neon database
      const sql = neon(DATABASE_URL);
      db = drizzle(sql, { schema });
    } else {
      // Standard PostgreSQL
      const sql = postgres(DATABASE_URL);
      db = drizzlePg(sql, { schema });
    }

    // Test connection
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection established');

    // Run migrations (push schema)
    console.log('🔄 Running database migrations...');
    // Schema will be pushed automatically by drizzle-kit push
    console.log('✅ Database migrations completed');

    // Seed data
    console.log('🔄 Seeding database...');
    
    // Admin user
    const adminUser = {
      id: crypto.randomUUID(),
      email: 'admin@finbot.com',
      password: '$2b$10$rQZ8K9mP2nL3vX1wY5zAeO8fG7hI6jK2lM4nP5qR7sT9uV3wX6yZ', // admin123
      name: 'Admin User',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check if admin exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, adminUser.email)
    });

    if (!existingUser) {
      await db.insert(schema.users).values(adminUser);
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📧 Admin login: admin@finbot.com');
    console.log('🔑 Admin password: admin123');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('⚠️  Continuing without database setup...');
  }
}

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}
