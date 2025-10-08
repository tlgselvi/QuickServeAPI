#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 FinBot V3 Local Setup\n');

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# FinBot V3 Development Environment Configuration
NODE_ENV=development

# Database Configuration
# SQLite for local development (no setup required)
DATABASE_URL=file:./dev.db

# JWT Configuration
JWT_SECRET=dev_jwt_secret_key_for_development_only_change_in_production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# API Configuration
API_PORT=5000
API_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5000
FRONTEND_URL=http://localhost:5000

# Email Configuration (Development - Mock)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=test@ethereal.email
SMTP_PASS=test_password
EMAIL_FROM=noreply@finbot-dev.com

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=./logs/development.log

# Security Configuration
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=1000

# Feature Flags
ENABLE_ALERTS=true
ENABLE_NOTIFICATIONS=true
ENABLE_MONTE_CARLO=true
ENABLE_SCENARIOS=true
ENABLE_REPORTS=true

# Turkey Specific
DEFAULT_CURRENCY=TRY
VAT_RATE=0.20
SGK_RATE=0.15
TAX_CALENDAR_ENABLED=true

# Performance Configuration
MAX_CONCURRENT_REQUESTS=50
REQUEST_TIMEOUT=30000
CACHE_TTL=1800`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file');
} else {
  console.log('✅ .env file already exists');
}

// Create logs directory
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
} else {
  console.log('✅ Logs directory already exists');
}

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
} else {
  console.log('✅ Uploads directory already exists');
}

console.log('\n🎉 Local setup completed!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run db:push');
console.log('3. Run: npm run dev');
console.log('\nThe application will be available at http://localhost:5000');
