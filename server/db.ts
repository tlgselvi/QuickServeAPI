import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema-sqlite';

// Database connection
const sqlite = new Database('dev.db');
const db = drizzle(sqlite, { schema });

// SQL helper
export const sql = sqlite;

// Database interface for backward compatibility
const dbInterface = {
  getAccounts: () => {
    const stmt = sql.prepare('SELECT * FROM accounts');
    return stmt.all();
  },
  
  getAccountById: (id: string) => {
    const stmt = sql.prepare('SELECT * FROM accounts WHERE id = ?');
    return stmt.get(id);
  },
  
  createAccount: (accountData: any) => {
    const stmt = sql.prepare(`
      INSERT INTO accounts (id, user_id, name, type, balance, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(accountData.id, accountData.user_id, accountData.name,
                   accountData.type, accountData.balance, accountData.currency || 'USD',
                   accountData.created_at, accountData.updated_at);
  },
  
  updateAccount: (id: string, accountData: any) => {
    const stmt = sql.prepare(`
      UPDATE accounts 
      SET name = ?, type = ?, balance = ?, currency = ?, updated_at = ?
      WHERE id = ?
    `);
    return stmt.run(accountData.name, accountData.type, accountData.balance,
                   accountData.currency, accountData.updated_at, id);
  },
  
  deleteAccount: (id: string) => {
    const stmt = sql.prepare('DELETE FROM accounts WHERE id = ?');
    return stmt.run(id);
  },
  
  getTransactions: (userId?: string) => {
    let query = 'SELECT * FROM transactions';
    let params: any[] = [];
    
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY date DESC';
    const stmt = sql.prepare(query);
    return stmt.all(...params);
  },
  
  getTransactionById: (id: string) => {
    const stmt = sql.prepare('SELECT * FROM transactions WHERE id = ?');
    return stmt.get(id);
  },
  
  createTransaction: (transactionData: any) => {
    const stmt = sql.prepare(`
      INSERT INTO transactions (id, user_id, account_id, amount, type, category, description, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(transactionData.id, transactionData.user_id, transactionData.account_id,
                   transactionData.amount, transactionData.type, transactionData.category,
                   transactionData.description, transactionData.date, transactionData.created_at);
  },
  
  updateTransaction: (id: string, transactionData: any) => {
    const stmt = sql.prepare(`
      UPDATE transactions 
      SET amount = ?, type = ?, category = ?, description = ?, date = ?
      WHERE id = ?
    `);
    return stmt.run(transactionData.amount, transactionData.type, transactionData.category,
                   transactionData.description, transactionData.date, id);
  },
  
  deleteTransaction: (id: string) => {
    const stmt = sql.prepare('DELETE FROM transactions WHERE id = ?');
    return stmt.run(id);
  },
  
  getUsers: () => {
    const stmt = sql.prepare('SELECT * FROM users');
    return stmt.all();
  },
  
  getUserById: (id: string) => {
    const stmt = sql.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },
  
  getUserByEmail: (email: string) => {
    const stmt = sql.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },
  
  createUser: (userData: any) => {
    const stmt = sql.prepare(`
      INSERT INTO users (id, email, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(userData.id, userData.email, userData.username, userData.password_hash,
                   userData.role || 'user', userData.is_active !== false ? 1 : 0, 
                   userData.created_at, userData.updated_at);
  },
  
  updateUser: (id: string, userData: any) => {
    const stmt = sql.prepare(`
      UPDATE users 
      SET name = ?, role = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `);
    return stmt.run(userData.name, userData.role, userData.is_active ? 1 : 0,
                   userData.updated_at, id);
  },
  
  createAlert: (alertData: any) => {
    const stmt = sql.prepare(`
      INSERT INTO alerts (id, user_id, type, title, description, severity, account_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    return stmt.run(alertData.id, alertData.user_id, alertData.type, alertData.title,
                   alertData.description, alertData.severity || 'medium', alertData.account_id, alertData.created_at);
  },
  
  getAlerts: (userId: string) => {
    const stmt = sql.prepare('SELECT * FROM alerts WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC');
    return stmt.all(userId);
  }
};

export { dbInterface as db };
