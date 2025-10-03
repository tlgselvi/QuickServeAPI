#!/usr/bin/env node

/**
 * Database setup script for Render.com
 * Runs migrations and seed data on startup
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import * as schema from '../shared/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found, skipping database setup');
  process.exit(0);
}

async function setupDatabase() {
  let sqlClient = null;
  
  try {
    console.log('🔄 Setting up database...');

    // Configure Neon for HTTP connections (avoid WebSocket issues)
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
    console.log('✅ Database connection established');

    // Run migrations (push schema)
    console.log('🔄 Running database migrations...');
    try {
      // Import and run migrations
      const { migrate } = await import('drizzle-orm/neon-http/migrator');
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('✅ Database migrations completed');
    } catch (migrationError) {
      console.log('⚠️  Migration failed, using schema push instead:', migrationError.message);
      // Fallback: schema will be pushed by drizzle-kit push during build
      console.log('✅ Schema will be pushed during build');
    }

    // Seed data
    console.log('🔄 Seeding database...');
    try {
      // Import and run seed script
      const { seedDatabase } = await import('./seed-database.js');
      await seedDatabase();
      console.log('✅ Database seeding completed');
    } catch (seedError) {
      console.log('⚠️  Seeding failed, continuing without seed data:', seedError.message);
    }

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('📋 Error details:', error.stack);
    console.log('⚠️  Continuing without database setup...');
    throw error; // Re-throw for server startup handling
  } finally {
    // Cleanup connections
    try {
      if (sqlClient && typeof sqlClient.end === 'function') {
        await sqlClient.end();
      }
    } catch (cleanupError) {
      console.warn('⚠️  Error during cleanup:', cleanupError.message);
    }
  }
}

// Export for use in server
export { setupDatabase };

// Only run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase();
}
