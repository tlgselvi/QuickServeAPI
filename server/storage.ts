import { type Account, type InsertAccount, type Transaction, type InsertTransaction, type User, type InsertUser, type Team, type InsertTeam, type TeamMember, type InsertTeamMember, type Invite, type InsertInvite, type SystemAlert, type InsertSystemAlert, accounts, transactions, users, teams, teamMembers, invites, systemAlerts } from "@shared/schema";
import { randomUUID } from "crypto";
import type { UserRoleType } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User authentication methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;
  setResetToken(email: string, token: string, expires: Date): Promise<User | undefined>;
  verifyEmail(id: string): Promise<User | undefined>;
  updateLastLogin(id: string): Promise<User | undefined>;

  // Admin user management methods
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: UserRoleType): Promise<User | undefined>;
  updateUserStatus(id: string, isActive: boolean): Promise<User | undefined>;
  
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
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    totalBalance: number;
    companyBalance: number;
    personalBalance: number;
    totalCash: number;
    totalDebt: number;
    totalTransactions: number;
    recentTransactions: Transaction[];
    accounts: Account[];
  }>;
  
  // Team Management methods
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByUserId(userId: string): Promise<Team[]>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  
  // Team Member methods
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  getTeamMember(teamId: string, userId: string): Promise<TeamMember | undefined>;
  updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  getUserTeamRole(teamId: string, userId: string): Promise<string | undefined>;
  
  // Invite methods
  createInvite(invite: InsertInvite): Promise<Invite>;
  getInvite(id: string): Promise<Invite | undefined>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  getTeamInvites(teamId: string): Promise<Invite[]>;
  getPendingInvitesByEmail(email: string): Promise<Invite[]>;
  updateInviteStatus(id: string, status: 'pending' | 'accepted' | 'declined' | 'expired', userId?: string): Promise<Invite | undefined>;
  deleteInvite(id: string): Promise<boolean>;
  
  // System Alert methods
  createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  getSystemAlerts(): Promise<SystemAlert[]>;
  getActiveSystemAlerts(): Promise<SystemAlert[]>;
  getSystemAlertsByType(type: string): Promise<SystemAlert[]>;
  getSystemAlert(id: string): Promise<SystemAlert | undefined>;
  dismissSystemAlert(id: string): Promise<SystemAlert | undefined>;
  updateSystemAlert(id: string, updates: Partial<SystemAlert>): Promise<SystemAlert | undefined>;
  deleteSystemAlert(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private transactions: Map<string, Transaction>;
  private teams: Map<string, Team>;
  private teamMembers: Map<string, TeamMember>;
  private invites: Map<string, Invite>;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.invites = new Map();
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Seed admin user in development only (if no users exist)
    if (process.env.NODE_ENV === 'development' && this.users.size === 0) {
      const bcrypt = require('bcryptjs');
      const adminId = randomUUID();
      const now = new Date();
      // Generate secure random password for development
      const devPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = bcrypt.hashSync(devPassword, 12);
      console.log(`[DEV] Admin user created - Email: admin@finbot.com, Password: ${devPassword}`);
      
      const adminUser: User = {
        id: adminId,
        username: "admin",
        email: "admin@finbot.com", 
        password: hashedPassword,
        role: "admin",
        emailVerified: now,
        resetToken: null,
        resetTokenExpires: null,
        isActive: true,
        createdAt: now,
        lastLogin: null
      };
      this.users.set(adminId, adminUser);
    }

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
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      emailVerified: null,
      resetToken: null,
      resetTokenExpires: null,
      role: "personal_user",
      isActive: true,
      createdAt: now,
      lastLogin: null
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    return this.updateUser(id, { password: hashedPassword });
  }

  async setResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (user) {
      return this.updateUser(user.id, { resetToken: token, resetTokenExpires: expires });
    }
    return undefined;
  }

  async verifyEmail(id: string): Promise<User | undefined> {
    return this.updateUser(id, { emailVerified: new Date() });
  }

  async updateLastLogin(id: string): Promise<User | undefined> {
    return this.updateUser(id, { lastLogin: new Date() });
  }

  // Admin user management methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: string, role: UserRoleType): Promise<User | undefined> {
    return this.updateUser(id, { role });
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    return this.updateUser(id, { isActive });
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

  async getDashboardStats() {
    const accounts = await this.getAccounts();
    const transactions = await this.getTransactions();
    
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const companyBalance = accounts.filter(a => a.type === 'company').reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const personalBalance = accounts.filter(a => a.type === 'personal').reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    
    // KPI Calculations
    const totalCash = accounts
      .filter(acc => parseFloat(acc.balance) > 0)
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    
    const totalDebt = accounts
      .filter(acc => parseFloat(acc.balance) < 0)
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance)), 0);
    
    const recentTransactions = transactions.slice(0, 10);
    
    return {
      totalBalance,
      companyBalance,
      personalBalance,
      totalCash,
      totalDebt,
      totalTransactions: transactions.length,
      recentTransactions,
      accounts
    };
  }

  // Team Management methods
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const now = new Date();
    const team: Team = { 
      ...insertTeam, 
      id,
      description: insertTeam.description || null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.teams.set(id, team);
    return team;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByUserId(userId: string): Promise<Team[]> {
    const userTeamMembers = Array.from(this.teamMembers.values()).filter(
      member => member.userId === userId && member.isActive
    );
    const teamIds = userTeamMembers.map(member => member.teamId);
    return Array.from(this.teams.values()).filter(team => 
      teamIds.includes(team.id) && team.isActive
    );
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (team) {
      const updatedTeam = { ...team, ...updates, updatedAt: new Date() };
      this.teams.set(id, updatedTeam);
      return updatedTeam;
    }
    return undefined;
  }

  async deleteTeam(id: string): Promise<boolean> {
    return this.teams.delete(id);
  }

  // Team Member methods
  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const member: TeamMember = { 
      ...insertMember, 
      id,
      teamRole: insertMember.teamRole || 'member',
      permissions: insertMember.permissions || null,
      joinedAt: new Date(),
      isActive: insertMember.isActive ?? true
    };
    this.teamMembers.set(id, member);
    return member;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      member => member.teamId === teamId && member.isActive
    );
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(
      member => member.teamId === teamId && member.userId === userId && member.isActive
    );
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (member) {
      const updatedMember = { ...member, ...updates };
      this.teamMembers.set(id, updatedMember);
      return updatedMember;
    }
    return undefined;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    // STORAGE GUARDRAIL: Cannot remove team owner at storage level
    const team = await this.getTeam(teamId);
    if (team && team.ownerId === userId) {
      throw new Error("Cannot remove team owner - use transfer ownership first");
    }
    
    const member = await this.getTeamMember(teamId, userId);
    if (member) {
      return this.teamMembers.delete(member.id);
    }
    return false;
  }

  async getUserTeamRole(teamId: string, userId: string): Promise<string | undefined> {
    const member = await this.getTeamMember(teamId, userId);
    return member?.teamRole;
  }

  // Invite methods
  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const id = randomUUID();
    const invite: Invite = { 
      ...insertInvite, 
      id,
      status: insertInvite.status || 'pending',
      teamRole: insertInvite.teamRole || 'member',
      invitedUserId: insertInvite.invitedUserId || null,
      createdAt: new Date(),
      acceptedAt: null
    };
    this.invites.set(id, invite);
    return invite;
  }

  async getInvite(id: string): Promise<Invite | undefined> {
    return this.invites.get(id);
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(
      invite => invite.inviteToken === token
    );
  }

  async getTeamInvites(teamId: string): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      invite => invite.teamId === teamId
    );
  }

  async getPendingInvitesByEmail(email: string): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      invite => invite.invitedEmail === email && invite.status === 'pending'
    );
  }

  async updateInviteStatus(id: string, status: 'pending' | 'accepted' | 'declined' | 'expired', userId?: string): Promise<Invite | undefined> {
    const invite = this.invites.get(id);
    if (invite) {
      const updates: Partial<Invite> = { status };
      if (status === 'accepted') {
        updates.acceptedAt = new Date();
        if (userId) updates.invitedUserId = userId;
      }
      const updatedInvite = { ...invite, ...updates };
      this.invites.set(id, updatedInvite);
      return updatedInvite;
    }
    return undefined;
  }

  async deleteInvite(id: string): Promise<boolean> {
    return this.invites.delete(id);
  }

  // System Alert methods implementation for MemStorage
  private systemAlerts: Map<string, SystemAlert> = new Map();

  async createSystemAlert(alertData: InsertSystemAlert): Promise<SystemAlert> {
    const alert: SystemAlert = {
      id: randomUUID(),
      type: alertData.type,
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity || 'medium',
      triggerDate: alertData.triggerDate || null,
      isActive: alertData.isActive !== undefined ? alertData.isActive : true,
      isDismissed: alertData.isDismissed !== undefined ? alertData.isDismissed : false,
      accountId: alertData.accountId || null,
      transactionId: alertData.transactionId || null,
      metadata: alertData.metadata || null,
      createdAt: new Date(),
      dismissedAt: null,
    };
    this.systemAlerts.set(alert.id, alert);
    return alert;
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values());
  }

  async getActiveSystemAlerts(): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values()).filter(
      alert => alert.isActive && !alert.isDismissed
    );
  }

  async getSystemAlertsByType(type: string): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values()).filter(
      alert => alert.type === type
    );
  }

  async getSystemAlert(id: string): Promise<SystemAlert | undefined> {
    return this.systemAlerts.get(id);
  }

  async dismissSystemAlert(id: string): Promise<SystemAlert | undefined> {
    const alert = this.systemAlerts.get(id);
    if (alert) {
      const updatedAlert = { 
        ...alert, 
        isDismissed: true, 
        dismissedAt: new Date()
      };
      this.systemAlerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }

  async updateSystemAlert(id: string, updates: Partial<SystemAlert>): Promise<SystemAlert | undefined> {
    const alert = this.systemAlerts.get(id);
    if (alert) {
      const updatedAlert = { ...alert, ...updates };
      this.systemAlerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }

  async deleteSystemAlert(id: string): Promise<boolean> {
    return this.systemAlerts.delete(id);
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async setResetToken(email: string, token: string, expires: Date): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ resetToken: token, resetTokenExpires: expires })
      .where(eq(users.email, email))
      .returning();
    return result[0];
  }

  async verifyEmail(id: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateLastLogin(id: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Admin user management methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: UserRoleType): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();
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

  async getDashboardStats() {
    const accounts = await this.getAccounts();
    const transactions = await this.getTransactions();
    
    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const companyBalance = accounts.filter(a => a.type === 'company').reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    const personalBalance = accounts.filter(a => a.type === 'personal').reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    
    // KPI Calculations
    const totalCash = accounts
      .filter(acc => parseFloat(acc.balance) > 0)
      .reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    
    const totalDebt = accounts
      .filter(acc => parseFloat(acc.balance) < 0)
      .reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance)), 0);
    
    const recentTransactions = transactions.slice(0, 10);
    
    return {
      totalBalance,
      companyBalance,
      personalBalance,
      totalCash,
      totalDebt,
      totalTransactions: transactions.length,
      recentTransactions,
      accounts
    };
  }

  // Team Management methods
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values(insertTeam).returning();
    return result[0];
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async getTeamsByUserId(userId: string): Promise<Team[]> {
    const result = await db.select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      ownerId: teams.ownerId,
      isActive: teams.isActive,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(sql`${teamMembers.userId} = ${userId} AND ${teamMembers.isActive} = true AND ${teams.isActive} = true`);
    
    return result;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return result[0];
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  // Team Member methods
  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(insertMember).returning();
    return result[0];
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.isActive} = true`);
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.userId} = ${userId} AND ${teamMembers.isActive} = true`);
    return result[0];
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    // STORAGE GUARDRAIL: Cannot remove team owner at storage level
    const team = await this.getTeam(teamId);
    if (team && team.ownerId === userId) {
      throw new Error("Cannot remove team owner - use transfer ownership first");
    }
    
    const result = await db.delete(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.userId} = ${userId}`)
      .returning();
    return result.length > 0;
  }

  async getUserTeamRole(teamId: string, userId: string): Promise<string | undefined> {
    const member = await this.getTeamMember(teamId, userId);
    return member?.teamRole;
  }

  // Invite methods
  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const result = await db.insert(invites).values(insertInvite).returning();
    return result[0];
  }

  async getInvite(id: string): Promise<Invite | undefined> {
    const result = await db.select().from(invites).where(eq(invites.id, id));
    return result[0];
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const result = await db.select().from(invites).where(eq(invites.inviteToken, token));
    return result[0];
  }

  async getTeamInvites(teamId: string): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.teamId, teamId));
  }

  async getPendingInvitesByEmail(email: string): Promise<Invite[]> {
    return await db.select().from(invites)
      .where(sql`${invites.invitedEmail} = ${email} AND ${invites.status} = 'pending'`);
  }

  async updateInviteStatus(id: string, status: 'pending' | 'accepted' | 'declined' | 'expired', userId?: string): Promise<Invite | undefined> {
    const updates: Partial<Invite> = { status };
    if (status === 'accepted') {
      updates.acceptedAt = new Date();
      if (userId) updates.invitedUserId = userId;
    }
    const result = await db.update(invites)
      .set(updates)
      .where(eq(invites.id, id))
      .returning();
    return result[0];
  }

  async deleteInvite(id: string): Promise<boolean> {
    const result = await db.delete(invites).where(eq(invites.id, id)).returning();
    return result.length > 0;
  }

  // System Alert methods implementation for PostgresStorage
  async createSystemAlert(alertData: InsertSystemAlert): Promise<SystemAlert> {
    const result = await db.insert(systemAlerts).values(alertData).returning();
    return result[0];
  }

  async getSystemAlerts(): Promise<SystemAlert[]> {
    return await db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt));
  }

  async getActiveSystemAlerts(): Promise<SystemAlert[]> {
    return await db.select().from(systemAlerts)
      .where(sql`${systemAlerts.isActive} = true AND ${systemAlerts.isDismissed} = false`)
      .orderBy(desc(systemAlerts.createdAt));
  }

  async getSystemAlertsByType(type: string): Promise<SystemAlert[]> {
    return await db.select().from(systemAlerts)
      .where(eq(systemAlerts.type, type))
      .orderBy(desc(systemAlerts.createdAt));
  }

  async getSystemAlert(id: string): Promise<SystemAlert | undefined> {
    const result = await db.select().from(systemAlerts).where(eq(systemAlerts.id, id));
    return result[0];
  }

  async dismissSystemAlert(id: string): Promise<SystemAlert | undefined> {
    const result = await db.update(systemAlerts)
      .set({ 
        isDismissed: true, 
        dismissedAt: new Date()
      })
      .where(eq(systemAlerts.id, id))
      .returning();
    return result[0];
  }

  async updateSystemAlert(id: string, updates: Partial<SystemAlert>): Promise<SystemAlert | undefined> {
    const result = await db.update(systemAlerts)
      .set(updates)
      .where(eq(systemAlerts.id, id))
      .returning();
    return result[0];
  }

  async deleteSystemAlert(id: string): Promise<boolean> {
    const result = await db.delete(systemAlerts).where(eq(systemAlerts.id, id)).returning();
    return result.length > 0;
  }
}

// Use PostgreSQL storage in production, memory storage for development/testing
export const storage = process.env.NODE_ENV === 'test' ? new MemStorage() : new PostgresStorage();
