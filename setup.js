#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🚀 FinBot Local Setup\n');
  
  // Check if .env already exists
  if (existsSync('.env')) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }
  
  console.log('📋 Please provide the following information:\n');
  
  // Database configuration
  const dbHost = await question('Database Host (default: localhost): ') || 'localhost';
  const dbPort = await question('Database Port (default: 5432): ') || '5432';
  const dbName = await question('Database Name (default: finbot_db): ') || 'finbot_db';
  const dbUser = await question('Database Username: ');
  const dbPassword = await question('Database Password: ');
  
  // Session secret
  const sessionSecret = await question('Session Secret (press Enter for auto-generated): ');
  const finalSessionSecret = sessionSecret || generateRandomString(32);
  
  // Port
  const port = await question('Application Port (default: 5000): ') || '5000';
  
  // Generate .env content
  const envContent = `# Database Configuration
DATABASE_URL="postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}"

# Session Configuration
SESSION_SECRET="${finalSessionSecret}"

# Environment
NODE_ENV="development"

# Port
PORT=${port}
`;
  
  // Write .env file
  try {
    writeFileSync('.env', envContent);
    console.log('\n✅ .env file created successfully!');
  } catch (error) {
    console.error('\n❌ Error creating .env file:', error.message);
    rl.close();
    return;
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Make sure your PostgreSQL database is running');
  console.log('2. Run: npm run db:push (to create database tables)');
  console.log('3. Run: npm run dev (to start the development server)');
  console.log('\n🌐 The application will be available at: http://localhost:' + port);
  
  rl.close();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

setupEnvironment().catch(console.error);

