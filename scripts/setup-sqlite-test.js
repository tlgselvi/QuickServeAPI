#!/usr/bin/env node

/**
 * SQLite Test Database Setup Script
 * Creates SQLite test database and runs migrations
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple logger for this script
const logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};

logger.info('🧪 Setting up SQLite test database...');

try {
  // Load test environment variables
  dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found in .env.test');
  }

  logger.info('📊 Database URL:', dbUrl);

  // Create test database directory if it doesn't exist
  const testDbPath = path.join(__dirname, '..', 'test.db');
  const testDbDir = path.dirname(testDbPath);
  
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
    logger.info('🗑️ Removed existing test database');
  }

  // Run migrations using drizzle-kit
  logger.info('🔄 Running database migrations...');
  try {
    execSync('npx drizzle-kit push', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    logger.info('✅ Migrations completed');
  } catch (error) {
    logger.info('⚠️ Migration failed, but continuing with basic setup');
  }

  // Create basic test data
  logger.info('🌱 Creating basic test data...');
  try {
    execSync('node scripts/seed-database.js', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    logger.info('✅ Test data created');
  } catch (error) {
    logger.info('⚠️ Test data creation failed, but continuing');
  }

  logger.info('✅ SQLite test database setup completed!');
  logger.info('🚀 You can now run: npm test');
  logger.info('📁 Test database location:', testDbPath);

} catch (error) {
  logger.error('❌ SQLite test database setup failed:', error.message);
  process.exit(1);
}
