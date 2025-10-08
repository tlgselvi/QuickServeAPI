#!/usr/bin/env node

/**
 * Test Database Setup Script
 * Creates test database and runs migrations
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

logger.info('🧪 Setting up test database...');

try {
  // Load test environment variables
  dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found in .env.test');
  }

  logger.info('📊 Database URL:', dbUrl.replace(/\/\/.*@/, '//***:***@'));

  // Check if database exists
  try {
    execSync(`psql "${dbUrl}" -c "SELECT 1;"`, { stdio: 'pipe' });
    logger.info('✅ Database connection successful');
  } catch (error) {
    logger.info('❌ Database connection failed:', error.message);
    logger.info('💡 Please ensure PostgreSQL is running and database exists');
    process.exit(1);
  }

  // Run migrations
  logger.info('🔄 Running database migrations...');
  execSync('npx drizzle-kit push', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });

  // Seed test data
  logger.info('🌱 Seeding test data...');
  execSync('node scripts/seed-database.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });

  logger.info('✅ Test database setup completed!');
  logger.info('🚀 You can now run: npm test');

} catch (error) {
  logger.error('❌ Test database setup failed:', error.message);
  process.exit(1);
}
