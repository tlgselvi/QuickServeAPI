import Database from 'better-sqlite3';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = databaseUrl.replace('file:', '');

let sql: Database.Database | null = null;

// Lazy database initialization
function getDatabase(): Database.Database {
  if (!sql) {
    try {
      sql = new Database(dbPath);
      console.log(`✅ Connected to SQLite database: ${dbPath}`);
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  return sql;
}

// Initialize database on first access
try {
  getDatabase();
  
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

// Export the getter function instead of direct sql instance
export { getDatabase as sql };

interface UserData {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role?: string;
}

interface AccountData {
  id: string;
  user_id: string;
  name: string;
  type: string;
  bank_name?: string;
  balance?: number;
  currency?: string;
}

interface TransactionData {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  type: string;
  category?: string;
  description: string;
}

interface AlertData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  severity?: string;
  account_id?: string;
}

const dbInterface = {
  createUser: (userData: UserData) => {
    const stmt = sql.prepare(`
      INSERT INTO users (id, email, username, password_hash, role) 
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(userData.id, userData.email, userData.username, userData.password_hash, userData.role || 'user');
  },
  
  getUser: (id: string) => {
    const stmt = sql.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1');
    return stmt.get(id);
  },
  
  getUserByEmail: (email: string) => {
    const stmt = sql.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1');
    return stmt.get(email);
  },
  
  createAccount: (accountData: AccountData) => {
    const stmt = sql.prepare(`
      INSERT INTO accounts (id, user_id, name, type, bank_name, balance, currency) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(accountData.id, accountData.user_id, accountData.name, accountData.type, 
                   accountData.bank_name, accountData.balance || 0, accountData.currency || 'TRY');
  },
  
  getAccounts: (userId: string) => {
    const stmt = sql.prepare('SELECT * FROM accounts WHERE user_id = ? AND is_active = 1');
    return stmt.all(userId);
  },
  
  createTransaction: (transactionData: TransactionData) => {
    const stmt = sql.prepare(`
      INSERT INTO transactions (id, user_id, account_id, amount, type, category, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(transactionData.id, transactionData.user_id, transactionData.account_id,
                   transactionData.amount, transactionData.type, transactionData.category, transactionData.description);
  },
  
  getTransactions: (userId: string) => {
    const stmt = sql.prepare('SELECT * FROM transactions WHERE user_id = ? AND is_active = 1 ORDER BY date DESC');
    return stmt.all(userId);
  },
  
  createAlert: (alertData: AlertData) => {
    const stmt = sql.prepare(`
      INSERT INTO alerts (id, user_id, type, title, description, severity, account_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(alertData.id, alertData.user_id, alertData.type, alertData.title,
                   alertData.description, alertData.severity || 'medium', alertData.account_id);
  },
  
  getAlerts: (userId: string) => {
    const stmt = sql.prepare('SELECT * FROM alerts WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC');
    return stmt.all(userId);
  }
};

export { sql, db: dbInterface };