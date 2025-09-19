import { type Account, type InsertAccount, type Transaction, type InsertTransaction, type User, type InsertUser, accounts, transactions, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

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
  adjustAccountBalance(id: string, amount: number): Promise<Account | undefined>;
  
  // Transaction methods
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByAccount(accountId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  performTransaction(transactionData: InsertTransaction, balanceAdjustment: number): Promise<Transaction>;
  performTransfer(fromAccountId: string, toAccountId: string, amount: number, description: string, virmanPairId: string): Promise<{ outTransaction: Transaction; inTransaction: Transaction }>;
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

  async adjustAccountBalance(id: string, amount: number): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      account.balance = (currentBalance + amount).toFixed(4);
      this.accounts.set(id, account);
      return account;
    }
    return undefined;
  }

  async performTransaction(transactionData: InsertTransaction, balanceAdjustment: number): Promise<Transaction> {
    const transaction = await this.createTransaction(transactionData);
    await this.adjustAccountBalance(transactionData.accountId, balanceAdjustment);
    return transaction;
  }

  async performTransfer(fromAccountId: string, toAccountId: string, amount: number, description: string, virmanPairId: string): Promise<{ outTransaction: Transaction; inTransaction: Transaction }> {
    const fromAccount = this.accounts.get(fromAccountId);
    if (!fromAccount || parseFloat(fromAccount.balance) < amount) {
      throw new Error('Yetersiz bakiye');
    }

    const outTransaction = await this.createTransaction({
      accountId: fromAccountId,
      type: 'transfer_out',
      amount: amount.toFixed(4),
      description: `Virman: ${description}`,
      virmanPairId
    });

    const inTransaction = await this.createTransaction({
      accountId: toAccountId,
      type: 'transfer_in',
      amount: amount.toFixed(4),
      description: `Virman: ${description}`,
      virmanPairId
    });

    await this.adjustAccountBalance(fromAccountId, -amount);
    await this.adjustAccountBalance(toAccountId, amount);

    return { outTransaction, inTransaction };
  }
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Account methods
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async getAccount(id: string): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values(insertAccount).returning();
    return result[0];
  }

  async updateAccountBalance(id: string, balance: number): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set({ balance: balance.toFixed(4) })
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async adjustAccountBalance(id: string, amount: number): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set({ balance: sql`${accounts.balance}::numeric + ${amount.toFixed(4)}::numeric` })
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async performTransaction(transactionData: InsertTransaction, balanceAdjustment: number): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      // Create the transaction record
      const transactionResult = await tx.insert(transactions).values(transactionData).returning();
      
      // Atomically adjust the account balance
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance}::numeric + ${balanceAdjustment.toFixed(4)}::numeric` })
        .where(eq(accounts.id, transactionData.accountId));
        
      return transactionResult[0];
    });
  }

  async performTransfer(fromAccountId: string, toAccountId: string, amount: number, description: string, virmanPairId: string): Promise<{ outTransaction: Transaction; inTransaction: Transaction }> {
    return await db.transaction(async (tx) => {
      // Atomically debit the source account with conditional check
      const debitResult = await tx.update(accounts)
        .set({ balance: sql`${accounts.balance}::numeric - ${amount.toFixed(4)}::numeric` })
        .where(sql`${accounts.id} = ${fromAccountId} AND ${accounts.balance}::numeric >= ${amount.toFixed(4)}::numeric`)
        .returning();
      
      if (debitResult.length === 0) {
        throw new Error('Yetersiz bakiye');
      }
      
      // Credit the destination account
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance}::numeric + ${amount.toFixed(4)}::numeric` })
        .where(eq(accounts.id, toAccountId));
      
      // Create transaction records after successful balance updates
      const outTransactionResult = await tx.insert(transactions).values({
        accountId: fromAccountId,
        type: 'transfer_out',
        amount: amount.toFixed(4),
        description: `Virman: ${description}`,
        virmanPairId
      }).returning();
      
      const inTransactionResult = await tx.insert(transactions).values({
        accountId: toAccountId,
        type: 'transfer_in',
        amount: amount.toFixed(4),
        description: `Virman: ${description}`,
        virmanPairId
      }).returning();
        
      return { outTransaction: outTransactionResult[0], inTransaction: inTransactionResult[0] };
    });
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(insertTransaction).returning();
    return result[0];
  }
}

// Use PostgreSQL storage in production, memory storage for development/testing
export const storage = process.env.NODE_ENV === 'test' ? new MemStorage() : new PostgresStorage();
