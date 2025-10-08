import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// Database setup
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = databaseUrl.replace('file:', '');

let sql;

try {
  sql = new Database(dbPath);
  console.log(`✅ Connected to SQLite database: ${dbPath}`);
  
  sql.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      is_active INTEGER DEFAULT 1,
      email_verified INTEGER DEFAULT 0,
      last_login INTEGER,
      created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      updated_at INTEGER DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'TRY',
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      description TEXT NOT NULL,
      date INTEGER DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      deleted_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      is_active INTEGER DEFAULT 1,
      account_id TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
  `);
  
  console.log('✅ Database tables created successfully');
  
} catch (error) {
  console.error('Failed to connect to database:', error);
  sql = new Database(':memory:');
  console.log('Using in-memory SQLite database as fallback');
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FinBot V3 Server is running!',
    timestamp: new Date().toISOString(),
    database: 'SQLite connected'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      database: process.env.DATABASE_URL || 'file:./dev.db'
    }
  });
});

// User routes
app.get('/api/users', (req, res) => {
  try {
    const stmt = sql.prepare('SELECT * FROM users WHERE is_active = 1');
    const users = stmt.all();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', (req, res) => {
  try {
    const { email, username, password_hash } = req.body;
    const id = crypto.randomUUID();
    
    const stmt = sql.prepare(`
      INSERT INTO users (id, email, username, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, email, username, password_hash, 'user');
    res.json({ message: 'User created successfully', id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Account routes
app.get('/api/accounts', (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const stmt = sql.prepare('SELECT * FROM accounts WHERE user_id = ? AND is_active = 1');
    const accounts = stmt.all(userId);
    res.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/accounts', (req, res) => {
  try {
    const { user_id, name, type, bank_name, balance, currency } = req.body;
    const id = crypto.randomUUID();
    
    const stmt = sql.prepare(`
      INSERT INTO accounts (id, user_id, name, type, bank_name, balance, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, user_id, name, type, bank_name, balance || 0, currency || 'TRY');
    res.json({ message: 'Account created successfully', id });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Transaction routes
app.get('/api/transactions', (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const stmt = sql.prepare('SELECT * FROM transactions WHERE user_id = ? AND is_active = 1 ORDER BY date DESC');
    const transactions = stmt.all(userId);
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const { user_id, account_id, amount, type, category, description } = req.body;
    const id = crypto.randomUUID();
    
    const stmt = sql.prepare(`
      INSERT INTO transactions (id, user_id, account_id, amount, type, category, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, user_id, account_id, amount, type, category, description);
    res.json({ message: 'Transaction created successfully', id });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alert routes
app.get('/api/alerts', (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const stmt = sql.prepare('SELECT * FROM alerts WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC');
    const alerts = stmt.all(userId);
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/alerts', (req, res) => {
  try {
    const { user_id, type, title, description, severity, account_id } = req.body;
    const id = crypto.randomUUID();
    
    const stmt = sql.prepare(`
      INSERT INTO alerts (id, user_id, type, title, description, severity, account_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, user_id, type, title, description, severity || 'medium', account_id);
    res.json({ message: 'Alert created successfully', id });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FinBot V3 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`👥 Users endpoint: http://localhost:${PORT}/api/users`);
  console.log(`💰 Accounts endpoint: http://localhost:${PORT}/api/accounts`);
  console.log(`💳 Transactions endpoint: http://localhost:${PORT}/api/transactions`);
  console.log(`🚨 Alerts endpoint: http://localhost:${PORT}/api/alerts`);
});
