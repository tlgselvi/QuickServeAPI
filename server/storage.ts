import { type Account, type InsertAccount, type Transaction, type InsertTransaction, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Account methods
  getAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(id: string, balance: number): Promise<Account | undefined>;
  
  // Transaction methods
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByAccount(accountId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    const account1: Account = {
      id: '1',
      type: 'company',
      bankName: 'Yapı Kredi',
      accountName: 'Demo Şirket Hesabı',
      balance: '50000.0000',
      currency: 'TRY'
    };
    
    const account2: Account = {
      id: '2',
      type: 'personal',
      bankName: 'Garanti',
      accountName: 'Demo Kişisel Hesap',
      balance: '15000.0000',
      currency: 'TRY'
    };
    
    this.accounts.set('1', account1);
    this.accounts.set('2', account2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: string): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const account: Account = { 
      ...insertAccount, 
      id,
      balance: insertAccount.balance || '0.0000',
      currency: insertAccount.currency || 'TRY'
    };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccountBalance(id: string, balance: number): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      account.balance = balance.toFixed(4);
      this.accounts.set(id, account);
      return account;
    }
    return undefined;
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = { 
      ...insertTransaction, 
      id,
      date: new Date(),
      category: insertTransaction.category || null,
      virmanPairId: insertTransaction.virmanPairId || null
    };
    this.transactions.set(id, transaction);
    return transaction;
  }
}

export const storage = new MemStorage();
