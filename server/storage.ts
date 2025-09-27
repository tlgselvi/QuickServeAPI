import { type Account, type InsertAccount, type Transaction, type InsertTransaction, type User, type InsertUser, type Team, type InsertTeam, type TeamMember, type InsertTeamMember, type Invite, type InsertInvite, type SystemAlert, type InsertSystemAlert, type FixedExpense, type InsertFixedExpense, type Credit, type InsertCredit, type Investment, type InsertInvestment, type Forecast, type InsertForecast, type Tenant, type InsertTenant, accounts, transactions, users, teams, teamMembers, invites, systemAlerts, fixedExpenses, credits, investments, forecasts, tenants } from '@shared/schema';
import { randomUUID } from 'crypto';
import type { UserRoleType } from '@shared/schema';
import { db } from './db';
import { eq, desc, sql, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
  updateUserProfile(id: string, updates: { username: string; email: string }): Promise<User | undefined>;

  // Account methods
  getAccounts(): Promise<Account[]>;
  getAccount(id: string): Promise<Account | undefined>;
  getAccountSummary(id: string): Promise<{ account: Account; recentTransactions: Transaction[]; balanceHistory: { date: string; balance: number }[] } | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(id: string, balance: number): Promise<Account | undefined>;
  adjustAccountBalance(id: string, amount: number): Promise<Account | undefined>;

  // Transaction methods
  getTransactions(): Promise<Transaction[]>;
  getTransactionsPaginated(page: number, limit: number, search?: string, accountId?: string): Promise<{ transactions: Transaction[]; total: number; totalPages: number }>;
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

  // Fixed Expenses methods
  getFixedExpenses(): Promise<FixedExpense[]>;
  getFixedExpense(id: string): Promise<FixedExpense | undefined>;
  createFixedExpense(expense: InsertFixedExpense): Promise<FixedExpense>;
  updateFixedExpense(id: string, updates: Partial<FixedExpense>): Promise<FixedExpense | undefined>;
  deleteFixedExpense(id: string): Promise<boolean>;
  processRecurringExpenses(): Promise<{ processed: number; transactions: Transaction[] }>;

  // Credits methods
  getCredits(): Promise<Credit[]>;
  getCredit(id: string): Promise<Credit | undefined>;
  createCredit(credit: InsertCredit): Promise<Credit>;
  updateCredit(id: string, updates: Partial<Credit>): Promise<Credit | undefined>;
  deleteCredit(id: string): Promise<boolean>;
  makePayment(creditId: string, amount: number, description?: string): Promise<{ credit: Credit; transaction: Transaction }>;
  getOverdueCredits(): Promise<Credit[]>;

  // Investment methods
  getInvestments(): Promise<Investment[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, updates: Partial<Investment>): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;
  updateInvestmentPrice(id: string, currentPrice: number): Promise<Investment | undefined>;
  getPortfolioSummary(): Promise<{ totalValue: number; totalCost: number; totalGain: number; gainPercentage: number; investments: Investment[] }>;
  getInvestmentsByType(type: string): Promise<Investment[]>;

  // Forecast methods
  getForecasts(): Promise<Forecast[]>;
  getForecast(id: string): Promise<Forecast | undefined>;
  createForecast(forecast: InsertForecast): Promise<Forecast>;
  updateForecast(id: string, updates: Partial<Forecast>): Promise<Forecast | undefined>;
  deleteForecast(id: string): Promise<boolean>;
  getForecastsByScenario(scenario: string): Promise<Forecast[]>;
  getActiveForecasts(): Promise<Forecast[]>;

  // AI Settings methods
  getAISettings(): Promise<any>;
  createAISettings(settings: any): Promise<any>;
  updateAISettings(id: string, updates: any): Promise<any>;
  deleteAISettings(id: string): Promise<boolean>;

  // Tenant methods
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private accounts: Map<string, Account>;
  private transactions: Map<string, Transaction>;
  private teams: Map<string, Team>;
  private teamMembers: Map<string, TeamMember>;
  private invites: Map<string, Invite>;
  private systemAlerts: Map<string, SystemAlert>;
  private fixedExpenses: Map<string, FixedExpense>;
  private credits: Map<string, Credit>;
  private investments: Map<string, Investment>;
  private forecasts: Map<string, Forecast>;
  private aiSettings: Map<string, any>;
  private tenants: Map<string, Tenant>;

  constructor () {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.invites = new Map();
    this.systemAlerts = new Map();
    this.fixedExpenses = new Map();
    this.credits = new Map();
    this.investments = new Map();
    this.forecasts = new Map();
    this.aiSettings = new Map();
    this.tenants = new Map();

    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData () {
    // Seed admin user in development only (if no users exist)
    if (process.env.NODE_ENV === 'development' && this.users.size === 0) {
      const adminId = randomUUID();
      const now = new Date();
      // Generate secure random password for development
      const devPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      const hashedPassword = bcrypt.hashSync(devPassword, 12);
      console.log(`[DEV] Admin user created - Email: admin@finbot.com, Password: ${devPassword}`);

      const adminUser: User = {
        id: adminId,
        username: 'admin',
        email: 'admin@finbot.com',
        password: hashedPassword,
        role: 'admin',
        emailVerified: now,
        resetToken: null,
        resetTokenExpires: null,
        isActive: true,
        lastLogin: null,
        createdAt: now,
      };
      this.users.set(adminId, adminUser);
    }

    // Create permanent admin user
    this.createPermanentAdmin();

    // Make tlgselvi@gmail.com admin if exists
    this.promoteUserToAdmin('tlgselvi@gmail.com');

    // Initialize demo accounts
    this.initializeAccounts();

    // Initialize demo tenants
    // this.initializeTenants();
  }

  private createPermanentAdmin () {
    const adminEmail = 'admin@finbot.com';
    const adminPassword = 'admin123'; // Sabit şifre

    // Check if admin already exists
    const existingAdmin = Array.from(this.users.values()).find(u => u.email === adminEmail);
    if (existingAdmin) {
      console.log(`[DEV] Admin user already exists: ${adminEmail}`);
      return;
    }

    const adminId = randomUUID();
    const now = new Date();
    const hashedPassword = bcrypt.hashSync(adminPassword, 12);

    const adminUser: User = {
      id: adminId,
      username: 'admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      emailVerified: now,
      resetToken: null,
      resetTokenExpires: null,
      isActive: true,
      createdAt: now,
      lastLogin: null,
    };

    this.users.set(adminId, adminUser);
    console.log(`[DEV] Permanent admin created - Email: ${adminEmail}, Password: ${adminPassword}`);
  }

  private promoteUserToAdmin (email: string) {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (user) {
      user.role = 'admin';
      this.users.set(user.id, user);
      console.log(`[DEV] User ${email} promoted to admin`);
    } else {
      console.log(`[DEV] User ${email} not found for promotion`);
    }
  }

  private initializeAccounts () {
    // Company account with sub-accounts
    const account1: Account = {
      id: '1',
      userId: 'demo-user-1',
      type: 'company',
      bankName: 'Yapı Kredi',
      accountName: 'Demo Şirket Hesabı',
      balance: '50000.0000',
      currency: 'TRY',
      cutOffDate: '15',
      paymentDueDate: '25',
      minimumPayment: '1000.0000',
      interestRate: '1.50',
      gracePeriod: '5',
      subAccounts: JSON.stringify([
        {
          type: 'creditCard',
          limit: 25000,
          used: 8500,
          cutOffDate: 15,
          paymentDueDate: 25,
          minimumPayment: 500,
          interestRate: 2.5,
          cardName: 'Şirket Kredi Kartı',
        },
        {
          type: 'loan',
          principalRemaining: 120000,
          monthlyPayment: 3500,
          interestRate: 1.8,
          dueDate: 15,
          loanName: 'İşletme Kredisi',
          totalAmount: 150000,
        },
      ]),
    };

    // Personal account with sub-accounts
    const account2: Account = {
      id: '2',
      userId: 'demo-user-1',
      type: 'personal',
      bankName: 'Garanti',
      accountName: 'Demo Kişisel Hesap',
      balance: '15000.0000',
      currency: 'TRY',
      cutOffDate: '20',
      paymentDueDate: '30',
      minimumPayment: '500.0000',
      interestRate: '1.20',
      gracePeriod: '3',
      subAccounts: JSON.stringify([
        {
          type: 'creditCard',
          limit: 15000,
          used: 3200,
          cutOffDate: 20,
          paymentDueDate: 30,
          minimumPayment: 300,
          interestRate: 2.8,
          cardName: 'Gold Kredi Kartı',
        },
        {
          type: 'kmh',
          limit: 5000,
          used: 0,
          interestRate: 3.2,
          accountName: 'KMH Hesabı',
        },
        {
          type: 'deposit',
          balance: 25000,
          interestRate: 1.5,
          maturityDate: '2024-12-31',
          depositName: 'Vadeli Mevduat',
        },
      ]),
    };

    this.accounts.set('1', account1);
    this.accounts.set('2', account2);
  }

  async getUser (id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername (username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser (insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      emailVerified: null,
      resetToken: null,
      resetTokenExpires: null,
      role: 'personal_user',
      isActive: true,
      createdAt: now,
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail (email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async updateUser (id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  async updateUserPassword (id: string, hashedPassword: string): Promise<User | undefined> {
    return this.updateUser(id, { password: hashedPassword });
  }

  async setResetToken (email: string, token: string, expires: Date): Promise<User | undefined> {
    const user = await this.getUserByEmail(email);
    if (user) {
      return this.updateUser(user.id, { resetToken: token, resetTokenExpires: expires });
    }
    return undefined;
  }

  async verifyEmail (id: string): Promise<User | undefined> {
    return this.updateUser(id, { emailVerified: new Date() });
  }

  async updateLastLogin (id: string): Promise<User | undefined> {
    return this.updateUser(id, { lastLogin: new Date() });
  }

  // Admin user management methods
  async getAllUsers (): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole (id: string, role: UserRoleType): Promise<User | undefined> {
    return this.updateUser(id, { role });
  }

  async updateUserStatus (id: string, isActive: boolean): Promise<User | undefined> {
    return this.updateUser(id, { isActive });
  }

  async updateUserProfile (id: string, updates: { username: string; email: string }): Promise<User | undefined> {
    return this.updateUser(id, updates);
  }

  async getAccounts (): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount (id: string): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async getAccountSummary (id: string): Promise<{ account: Account; recentTransactions: Transaction[]; balanceHistory: { date: string; balance: number }[] } | undefined> {
    const account = this.accounts.get(id);
    if (!account) {
      return undefined;
    }

    // Get recent transactions for this account
    const recentTransactions = Array.from(this.transactions.values())
      .filter(t => t.accountId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Generate balance history (last 30 days)
    const balanceHistory = [];
    const currentDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);

      // Calculate balance for this date (simplified - in real app would track historical balances)
      const transactionsUpToDate = Array.from(this.transactions.values())
        .filter(t => t.accountId === id && new Date(t.date) <= date)
        .reduce((sum, t) => {
          const amount = parseFloat(t.amount);
          if (t.type === 'income' || t.type === 'transfer_in') {
            return sum + amount;
          } else {
            return sum - amount;
          }
        }, 0);

      balanceHistory.push({
        date: date.toISOString().split('T')[0],
        balance: transactionsUpToDate,
      });
    }

    return {
      account,
      recentTransactions,
      balanceHistory,
    };
  }

  async createAccount (insertAccount: InsertAccount): Promise<Account> {
    const id = randomUUID();
    const account: Account = {
      ...insertAccount,
      id,
      balance: (insertAccount.balance || 0).toString(),
      currency: insertAccount.currency || 'TRY',
      subAccounts: insertAccount.subAccounts || null,
      paymentDueDate: insertAccount.paymentDueDate || null,
      cutOffDate: insertAccount.cutOffDate || null,
      gracePeriod: insertAccount.gracePeriod || null,
      minimumPayment: insertAccount.minimumPayment?.toString() || null,
      interestRate: insertAccount.interestRate?.toString() || null,
    };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccountBalance (id: string, balance: number): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      account.balance = balance.toFixed(4);
      this.accounts.set(id, account);
      return account;
    }
    return undefined;
  }

  async getTransactions (): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getTransactionsPaginated (page: number, limit: number, search?: string, accountId?: string): Promise<{ transactions: Transaction[]; total: number; totalPages: number }> {
    let filteredTransactions = Array.from(this.transactions.values());

    // Apply filters
    if (accountId) {
      filteredTransactions = filteredTransactions.filter(t => t.accountId === accountId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t =>
        t.description?.toLowerCase().includes(searchLower) ||
        t.category?.toLowerCase().includes(searchLower) ||
        t.amount.toLowerCase().includes(searchLower),
      );
    }

    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filteredTransactions.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      transactions: filteredTransactions.slice(startIndex, endIndex),
      total,
      totalPages,
    };
  }

  async getTransactionsByAccount (accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTransaction (insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      amount: insertTransaction.amount.toString(),
      category: insertTransaction.category || null,
      virmanPairId: insertTransaction.virmanPairId || null,
      date: (insertTransaction as any).date || new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async adjustAccountBalance (id: string, amount: number): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      const currentBalance = parseFloat(account.balance);
      account.balance = (currentBalance + amount).toFixed(4);
      this.accounts.set(id, account);
      return account;
    }
    return undefined;
  }

  async performTransaction (transactionData: InsertTransaction, balanceAdjustment: number): Promise<Transaction> {
    const transaction = await this.createTransaction(transactionData);
    await this.adjustAccountBalance(transactionData.accountId, balanceAdjustment);
    return transaction;
  }

  async performTransfer (fromAccountId: string, toAccountId: string, amount: number, description: string, virmanPairId: string): Promise<{ outTransaction: Transaction; inTransaction: Transaction }> {
    const fromAccount = this.accounts.get(fromAccountId);
    if (!fromAccount || parseFloat(fromAccount.balance) < amount) {
      throw new Error('Yetersiz bakiye');
    }

    const outTransaction = await this.createTransaction({
      accountId: fromAccountId,
      type: 'transfer_out',
      amount: amount.toString(),
      description: `Virman: ${description}`,
      virmanPairId,
    });

    const inTransaction = await this.createTransaction({
      accountId: toAccountId,
      type: 'transfer_in',
      amount: amount.toString(),
      description: `Virman: ${description}`,
      virmanPairId,
    });

    await this.adjustAccountBalance(fromAccountId, -amount);
    await this.adjustAccountBalance(toAccountId, amount);

    return { outTransaction, inTransaction };
  }

  async getDashboardStats () {
    // Use parallel processing for better performance
    const [accounts, transactions] = await Promise.all([
      this.getAccounts(),
      this.getTransactions(),
    ]);

    // Pre-calculate balances using efficient reduce operations
    const balanceStats = accounts.reduce((stats, account) => {
      const balance = parseFloat(account.balance);
      stats.total += balance;

      if (account.type === 'company') {
        stats.company += balance;
      } else if (account.type === 'personal') {
        stats.personal += balance;
      }

      if (balance > 0) {
        stats.cash += balance;
      } else {
        stats.debt += Math.abs(balance);
      }

      return stats;
    }, { total: 0, company: 0, personal: 0, cash: 0, debt: 0 });

    // Get recent transactions (last 10) with optimized sorting
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      totalBalance: balanceStats.total,
      companyBalance: balanceStats.company,
      personalBalance: balanceStats.personal,
      totalCash: balanceStats.cash,
      totalDebt: balanceStats.debt,
      totalTransactions: transactions.length,
      recentTransactions,
      accounts,
    };
  }

  // Team Management methods
  async createTeam (insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const now = new Date();
    const team: Team = {
      ...insertTeam,
      id,
      description: insertTeam.description || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.teams.set(id, team);
    return team;
  }

  async getTeam (id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByUserId (userId: string): Promise<Team[]> {
    const userTeamMembers = Array.from(this.teamMembers.values()).filter(
      member => member.userId === userId && member.isActive,
    );
    const teamIds = userTeamMembers.map(member => member.teamId);
    return Array.from(this.teams.values()).filter(team =>
      teamIds.includes(team.id) && team.isActive,
    );
  }

  async updateTeam (id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (team) {
      const updatedTeam = { ...team, ...updates, updatedAt: new Date() };
      this.teams.set(id, updatedTeam);
      return updatedTeam;
    }
    return undefined;
  }

  async deleteTeam (id: string): Promise<boolean> {
    return this.teams.delete(id);
  }

  // Team Member methods
  async addTeamMember (insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const member: TeamMember = {
      ...insertMember,
      id,
      teamRole: insertMember.teamRole || 'member',
      permissions: insertMember.permissions || null,
      joinedAt: new Date(),
      isActive: insertMember.isActive ?? true,
    };
    this.teamMembers.set(id, member);
    return member;
  }

  async getTeamMembers (teamId: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(
      member => member.teamId === teamId && member.isActive,
    );
  }

  async getTeamMember (teamId: string, userId: string): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(
      member => member.teamId === teamId && member.userId === userId && member.isActive,
    );
  }

  async updateTeamMember (id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (member) {
      const updatedMember = { ...member, ...updates };
      this.teamMembers.set(id, updatedMember);
      return updatedMember;
    }
    return undefined;
  }

  async removeTeamMember (teamId: string, userId: string): Promise<boolean> {
    // STORAGE GUARDRAIL: Cannot remove team owner at storage level
    const team = await this.getTeam(teamId);
    if (team && team.ownerId === userId) {
      throw new Error('Cannot remove team owner - use transfer ownership first');
    }

    const member = await this.getTeamMember(teamId, userId);
    if (member) {
      return this.teamMembers.delete(member.id);
    }
    return false;
  }

  async getUserTeamRole (teamId: string, userId: string): Promise<string | undefined> {
    const member = await this.getTeamMember(teamId, userId);
    return member?.teamRole;
  }

  // Invite methods
  async createInvite (insertInvite: InsertInvite): Promise<Invite> {
    const id = randomUUID();
    const invite: Invite = {
      ...insertInvite,
      id,
      status: insertInvite.status || 'pending',
      teamRole: insertInvite.teamRole || 'member',
      invitedUserId: insertInvite.invitedUserId || null,
      acceptedAt: null,
      createdAt: new Date(),
    };
    this.invites.set(id, invite);
    return invite;
  }

  async getInvite (id: string): Promise<Invite | undefined> {
    return this.invites.get(id);
  }

  async getInviteByToken (token: string): Promise<Invite | undefined> {
    return Array.from(this.invites.values()).find(
      invite => invite.inviteToken === token,
    );
  }

  async getTeamInvites (teamId: string): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      invite => invite.teamId === teamId,
    );
  }

  async getPendingInvitesByEmail (email: string): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      invite => invite.invitedEmail === email && invite.status === 'pending',
    );
  }

  async updateInviteStatus (id: string, status: 'pending' | 'accepted' | 'declined' | 'expired', userId?: string): Promise<Invite | undefined> {
    const invite = this.invites.get(id);
    if (invite) {
      const updates: Partial<Invite> = { status };
      if (status === 'accepted') {
        updates.acceptedAt = new Date();
        if (userId) {
          updates.invitedUserId = userId;
        }
      }
      const updatedInvite = { ...invite, ...updates };
      this.invites.set(id, updatedInvite);
      return updatedInvite;
    }
    return undefined;
  }

  async deleteInvite (id: string): Promise<boolean> {
    return this.invites.delete(id);
  }

  // System Alert methods implementation for MemStorage

  async createSystemAlert (alertData: InsertSystemAlert): Promise<SystemAlert> {
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
      dismissedAt: null,
      createdAt: new Date(),
    };
    this.systemAlerts.set(alert.id, alert);
    return alert;
  }

  async getSystemAlerts (): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values());
  }

  async getActiveSystemAlerts (): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values()).filter(
      alert => alert.isActive && !alert.isDismissed,
    );
  }

  async getSystemAlertsByType (type: string): Promise<SystemAlert[]> {
    return Array.from(this.systemAlerts.values()).filter(
      alert => alert.type === type,
    );
  }

  async getSystemAlert (id: string): Promise<SystemAlert | undefined> {
    return this.systemAlerts.get(id);
  }

  async dismissSystemAlert (id: string): Promise<SystemAlert | undefined> {
    const alert = this.systemAlerts.get(id);
    if (alert) {
      const updatedAlert = {
        ...alert,
        isDismissed: true,
        dismissedAt: new Date(),
      };
      this.systemAlerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }

  async updateSystemAlert (id: string, updates: Partial<SystemAlert>): Promise<SystemAlert | undefined> {
    const alert = this.systemAlerts.get(id);
    if (alert) {
      const updatedAlert = { ...alert, ...updates };
      this.systemAlerts.set(id, updatedAlert);
      return updatedAlert;
    }
    return undefined;
  }

  async deleteSystemAlert (id: string): Promise<boolean> {
    return this.systemAlerts.delete(id);
  }

  // Fixed Expenses methods implementation for MemStorage

  async getFixedExpenses (): Promise<FixedExpense[]> {
    return Array.from(this.fixedExpenses.values());
  }

  async getFixedExpense (id: string): Promise<FixedExpense | undefined> {
    return this.fixedExpenses.get(id);
  }

  async createFixedExpense (expenseData: InsertFixedExpense): Promise<FixedExpense> {
    const expense: FixedExpense = {
      id: randomUUID(),
      title: expenseData.title,
      description: expenseData.description || null,
      amount: expenseData.amount.toString(),
      currency: expenseData.currency || 'TRY',
      category: expenseData.category || null,
      accountId: expenseData.accountId || null,
      type: expenseData.type,
      recurrence: expenseData.recurrence,
      startDate: expenseData.startDate,
      endDate: expenseData.endDate || null,
      isActive: expenseData.isActive ?? true,
      lastProcessed: null,
      nextDueDate: this.calculateNextDueDate(expenseData.startDate, expenseData.recurrence),
      metadata: expenseData.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.fixedExpenses.set(expense.id, expense);
    return expense;
  }

  async updateFixedExpense (id: string, updates: Partial<FixedExpense>): Promise<FixedExpense | undefined> {
    const expense = this.fixedExpenses.get(id);
    if (!expense) {
      return undefined;
    }

    const updatedExpense = { ...expense, ...updates, updatedAt: new Date() };
    this.fixedExpenses.set(id, updatedExpense);
    return updatedExpense;
  }

  async deleteFixedExpense (id: string): Promise<boolean> {
    return this.fixedExpenses.delete(id);
  }

  async processRecurringExpenses (): Promise<{ processed: number; transactions: Transaction[] }> {
    const now = new Date();
    const transactions: Transaction[] = [];
    let processed = 0;

    for (const expense of Array.from(this.fixedExpenses.values())) {
      if (!expense.isActive || !expense.nextDueDate || expense.nextDueDate > now) {
        continue;
      }

      // Check if end date has passed
      if (expense.endDate && expense.endDate < now) {
        // Mark as inactive
        await this.updateFixedExpense(expense.id, { isActive: false });
        continue;
      }

      // Create transaction for this expense
      const transactionData: InsertTransaction = {
        accountId: expense.accountId || 'default-account', // Use default if no account specified
        type: expense.type === 'income' ? 'income' : 'expense',
        amount: expense.amount,
        description: `Otomatik: ${expense.title}`,
        category: expense.category || 'Diğer',
      };

      const transaction = await this.createTransaction(transactionData);
      transactions.push(transaction);

      // Update expense with new due date
      const nextDueDate = this.calculateNextDueDate(now, expense.recurrence);
      await this.updateFixedExpense(expense.id, {
        lastProcessed: now,
        nextDueDate,
      });

      processed++;
    }

    return { processed, transactions };
  }

  private calculateNextDueDate (startDate: Date, recurrence: string): Date {
    const nextDate = new Date(startDate);

    switch (recurrence) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'one_time':
        // For one-time expenses, set far in the future
        nextDate.setFullYear(nextDate.getFullYear() + 10);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  // Credits methods implementation for MemStorage

  async getCredits (): Promise<Credit[]> {
    return Array.from(this.credits.values());
  }

  async getCredit (id: string): Promise<Credit | undefined> {
    return this.credits.get(id);
  }

  async createCredit (creditData: InsertCredit): Promise<Credit> {
    const credit: Credit = {
      id: randomUUID(),
      title: creditData.title,
      description: creditData.description || null,
      type: creditData.type,
      amount: creditData.amount.toString(),
      remainingAmount: creditData.remainingAmount.toString(),
      currency: creditData.currency || 'TRY',
      interestRate: creditData.interestRate?.toString() || null,
      accountId: creditData.accountId || null,
      institution: creditData.institution || null,
      accountNumber: creditData.accountNumber || null,
      startDate: creditData.startDate,
      dueDate: creditData.dueDate || null,
      maturityDate: creditData.maturityDate || null,
      minimumPayment: creditData.minimumPayment?.toString() || null,
      status: creditData.status || 'active',
      isActive: creditData.isActive ?? true,
      lastPaymentDate: null,
      lastPaymentAmount: null,
      metadata: creditData.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.credits.set(credit.id, credit);
    return credit;
  }

  async updateCredit (id: string, updates: Partial<Credit>): Promise<Credit | undefined> {
    const credit = this.credits.get(id);
    if (!credit) {
      return undefined;
    }

    const updatedCredit = { ...credit, ...updates, updatedAt: new Date() };
    this.credits.set(id, updatedCredit);
    return updatedCredit;
  }

  async deleteCredit (id: string): Promise<boolean> {
    return this.credits.delete(id);
  }

  async makePayment (creditId: string, amount: number, description?: string): Promise<{ credit: Credit; transaction: Transaction }> {
    const credit = this.credits.get(creditId);
    if (!credit) {
      throw new Error('Credit not found');
    }

    if (parseFloat(credit.remainingAmount) <= 0) {
      throw new Error('Credit is already paid off');
    }

    // Calculate new remaining amount
    const newRemainingAmount = Math.max(0, parseFloat(credit.remainingAmount) - amount);
    const paymentAmount = parseFloat(credit.remainingAmount) - newRemainingAmount;

    // Create payment transaction
    const transactionData: InsertTransaction = {
      accountId: credit.accountId || 'default-account',
      type: 'expense', // Payment is an expense
      amount: paymentAmount.toString(),
      description: description || `Ödeme: ${credit.title}`,
      category: 'Kredi Ödemesi',
    };

    const transaction = await this.createTransaction(transactionData);

    // Update credit
    const newStatus = newRemainingAmount <= 0 ? 'paid_off' : credit.status;
    const updatedCredit = await this.updateCredit(creditId, {
      remainingAmount: newRemainingAmount.toString(),
      status: newStatus,
      lastPaymentDate: new Date(),
      lastPaymentAmount: paymentAmount.toString(),
    });

    if (!updatedCredit) {
      throw new Error('Failed to update credit');
    }

    return { credit: updatedCredit, transaction };
  }

  async getOverdueCredits (): Promise<Credit[]> {
    const now = new Date();
    return Array.from(this.credits.values()).filter(credit =>
      credit.isActive &&
      credit.dueDate &&
      credit.dueDate < now &&
      parseFloat(credit.remainingAmount) > 0,
    );
  }

  // Investment methods implementation for MemStorage

  async getInvestments (): Promise<Investment[]> {
    return Array.from(this.investments.values());
  }

  async getInvestment (id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async createInvestment (investmentData: InsertInvestment): Promise<Investment> {
    const investment: Investment = {
      id: randomUUID(),
      title: investmentData.title,
      description: investmentData.description || null,
      type: investmentData.type,
      symbol: investmentData.symbol || null,
      quantity: investmentData.quantity.toString(),
      purchasePrice: investmentData.purchasePrice.toString(),
      currentPrice: investmentData.currentPrice?.toString() || null,
      currency: investmentData.currency || 'TRY',
      purchaseDate: investmentData.purchaseDate,
      accountId: investmentData.accountId || null,
      category: investmentData.category || null,
      riskLevel: investmentData.riskLevel || null,
      isActive: investmentData.isActive ?? true,
      userId: investmentData.userId,
      lastUpdated: new Date(),
      metadata: investmentData.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.investments.set(investment.id, investment);
    return investment;
  }

  async updateInvestment (id: string, updates: Partial<Investment>): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (investment) {
      const updatedInvestment = { ...investment, ...updates, updatedAt: new Date() };
      this.investments.set(id, updatedInvestment);
      return updatedInvestment;
    }
    return undefined;
  }

  async deleteInvestment (id: string): Promise<boolean> {
    return this.investments.delete(id);
  }

  async updateInvestmentPrice (id: string, currentPrice: number): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (investment) {
      const updatedInvestment = {
        ...investment,
        currentPrice: currentPrice.toString(),
        lastUpdated: new Date(),
        updatedAt: new Date(),
      };
      this.investments.set(id, updatedInvestment);
      return updatedInvestment;
    }
    return undefined;
  }

  async getPortfolioSummary (): Promise<{ totalValue: number; totalCost: number; totalGain: number; gainPercentage: number; investments: Investment[] }> {
    const investments = Array.from(this.investments.values()).filter(inv => inv.isActive);

    let totalValue = 0;
    let totalCost = 0;

    investments.forEach(investment => {
      const quantity = parseFloat(investment.quantity);
      const purchasePrice = parseFloat(investment.purchasePrice);
      const currentPrice = parseFloat(investment.currentPrice || investment.purchasePrice);

      totalCost += quantity * purchasePrice;
      totalValue += quantity * currentPrice;
    });

    const totalGain = totalValue - totalCost;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGain,
      gainPercentage,
      investments,
    };
  }

  async getInvestmentsByType (type: string): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(investment =>
      investment.isActive && investment.type === type,
    );
  }

  // Forecast methods implementation for MemStorage

  async getForecasts (): Promise<Forecast[]> {
    return Array.from(this.forecasts.values());
  }

  async getForecast (id: string): Promise<Forecast | undefined> {
    return this.forecasts.get(id);
  }

  async createForecast (forecastData: InsertForecast): Promise<Forecast> {
    const forecast: Forecast = {
      id: randomUUID(),
      title: forecastData.title,
      description: forecastData.description || null,
      type: forecastData.type,
      scenario: forecastData.scenario || null,
      forecastDate: forecastData.forecastDate,
      targetDate: forecastData.targetDate,
      predictedValue: forecastData.predictedValue.toString(),
      confidenceInterval: forecastData.confidenceInterval?.toString() || null,
      lowerBound: forecastData.lowerBound?.toString() || null,
      upperBound: forecastData.upperBound?.toString() || null,
      currency: forecastData.currency || 'TRY',
      category: forecastData.category || null,
      accountId: forecastData.accountId || null,
      parameters: forecastData.parameters || null,
      isActive: forecastData.isActive ?? true,
      accuracy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.forecasts.set(forecast.id, forecast);
    return forecast;
  }

  async updateForecast (id: string, updates: Partial<Forecast>): Promise<Forecast | undefined> {
    const forecast = this.forecasts.get(id);
    if (forecast) {
      const updatedForecast = { ...forecast, ...updates, updatedAt: new Date() };
      this.forecasts.set(id, updatedForecast);
      return updatedForecast;
    }
    return undefined;
  }

  async deleteForecast (id: string): Promise<boolean> {
    return this.forecasts.delete(id);
  }

  async getForecastsByScenario (scenario: string): Promise<Forecast[]> {
    return Array.from(this.forecasts.values()).filter(forecast =>
      forecast.isActive && forecast.scenario === scenario,
    );
  }

  async getActiveForecasts (): Promise<Forecast[]> {
    return Array.from(this.forecasts.values()).filter(forecast =>
      forecast.isActive,
    );
  }

  // AI Settings methods
  async getAISettings (): Promise<any> {
    return Array.from(this.aiSettings?.values() || []);
  }

  async createAISettings (settings: any): Promise<any> {
    const id = crypto.randomUUID();
    const newSettings = { id, ...settings, createdAt: new Date(), updatedAt: new Date() };
    this.aiSettings?.set(id, newSettings);
    return newSettings;
  }

  async updateAISettings (id: string, updates: any): Promise<any> {
    const existing = this.aiSettings?.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.aiSettings?.set(id, updated);
    return updated;
  }

  async deleteAISettings (id: string): Promise<boolean> {
    return this.aiSettings?.delete(id) || false;
  }

  // Tenant methods
  async getTenants (): Promise<Tenant[]> {
    return Array.from(this.tenants?.values() || []);
  }

  async getTenant (id: string): Promise<Tenant | undefined> {
    return this.tenants?.get(id);
  }

  async getTenantByDomain (domain: string): Promise<Tenant | undefined> {
    for (const [_, tenant] of Array.from((this.tenants || new Map()).entries())) {
      if (tenant.domain === domain) {
        return tenant;
      }
    }
    return undefined;
  }

  async createTenant (tenant: InsertTenant): Promise<Tenant> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newTenant: Tenant = {
      id,
      name: tenant.name,
      isActive: tenant.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      logo: tenant.logo ?? null,
      domain: tenant.domain ?? null,
      theme: tenant.theme ?? 'default',
    };
    this.tenants?.set(id, newTenant);
    return newTenant;
  }

  async updateTenant (id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const existing = this.tenants?.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.tenants?.set(id, updated);
    return updated;
  }

  async deleteTenant (id: string): Promise<boolean> {
    return this.tenants?.delete(id) || false;
  }
}

export class PostgresStorage implements IStorage {
  private aiSettings = new Map<string, any>();
  private tenants = new Map<string, Tenant>();
  
  // User methods
  async getUser (id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername (username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser (insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getUserByEmail (email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async updateUser (id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserPassword (id: string, hashedPassword: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async setResetToken (email: string, token: string, expires: Date): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ resetToken: token, resetTokenExpires: expires })
      .where(eq(users.email, email))
      .returning();
    return result[0];
  }

  async verifyEmail (id: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateLastLogin (id: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Admin user management methods
  async getAllUsers (): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserRole (id: string, role: UserRoleType): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserStatus (id: string, isActive: boolean): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUserProfile (id: string, updates: { username: string; email: string }): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ username: updates.username, email: updates.email })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Account methods
  async getAccounts (): Promise<Account[]> {
    return db.select().from(accounts);
  }

  async getAccount (id: string): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async getAccountSummary (id: string): Promise<{ account: Account; recentTransactions: Transaction[]; balanceHistory: { date: string; balance: number }[] } | undefined> {
    const account = await this.getAccount(id);
    if (!account) {
      return undefined;
    }

    // Get recent transactions for this account
    const recentTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.accountId, id))
      .orderBy(desc(transactions.date))
      .limit(10);

    // Generate balance history (last 30 days) - simplified calculation
    const balanceHistory = [];
    const currentDate = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);

      // Calculate cumulative balance up to this date
      const balanceResult = await db.select({
        balance: sql<number>`COALESCE(SUM(
          CASE 
            WHEN type IN ('income', 'transfer_in') THEN amount::numeric
            ELSE -amount::numeric
          END
        ), 0)`,
      })
        .from(transactions)
        .where(sql`${transactions.accountId} = ${id} AND ${transactions.date} <= ${date.toISOString()}`);

      balanceHistory.push({
        date: date.toISOString().split('T')[0],
        balance: balanceResult[0]?.balance || 0,
      });
    }

    return {
      account,
      recentTransactions,
      balanceHistory,
    };
  }

  async createAccount (insertAccount: InsertAccount): Promise<Account> {
    const result = await db.insert(accounts).values(insertAccount).returning();
    return result[0];
  }

  async updateAccountBalance (id: string, balance: number): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set({ balance: balance.toFixed(4) })
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async adjustAccountBalance (id: string, amount: number): Promise<Account | undefined> {
    const result = await db.update(accounts)
      .set({ balance: sql`${accounts.balance}::numeric + ${amount.toFixed(4)}::numeric` })
      .where(eq(accounts.id, id))
      .returning();
    return result[0];
  }

  async performTransaction (transactionData: InsertTransaction, balanceAdjustment: number): Promise<Transaction> {
    return db.transaction(async (tx) => {
      // Create the transaction record
      const transactionResult = await tx.insert(transactions).values(transactionData).returning();

      // Atomically adjust the account balance
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance}::numeric + ${balanceAdjustment.toFixed(4)}::numeric` })
        .where(eq(accounts.id, transactionData.accountId));

      return transactionResult[0];
    });
  }

  async performTransfer (fromAccountId: string, toAccountId: string, amount: number, description: string, virmanPairId: string): Promise<{ outTransaction: Transaction; inTransaction: Transaction }> {
    return db.transaction(async (tx) => {
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
        amount: amount.toString(),
        description: `Virman: ${description}`,
        virmanPairId,
      }).returning();

      const inTransactionResult = await tx.insert(transactions).values({
        accountId: toAccountId,
        type: 'transfer_in',
        amount: amount.toString(),
        description: `Virman: ${description}`,
        virmanPairId,
      }).returning();

      return { outTransaction: outTransactionResult[0], inTransaction: inTransactionResult[0] };
    });
  }

  // Transaction methods
  async getTransactions (): Promise<Transaction[]> {
    return db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async getTransactionsPaginated (page: number, limit: number, search?: string, accountId?: string): Promise<{ transactions: Transaction[]; total: number; totalPages: number }> {
    // Build where conditions
    const whereConditions = [];
    if (accountId) {
      whereConditions.push(eq(transactions.accountId, accountId));
    }
    if (search) {
      whereConditions.push(sql`${transactions.description} ILIKE ${`%${search}%`} OR ${transactions.category} ILIKE ${`%${search}%`} OR ${transactions.amount}::text ILIKE ${`%${search}%`}`);
    }

    // Get total count
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined);
    const total = countResult[0]?.count || 0;

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    const transactionResults = await db.select().from(transactions)
      .where(whereConditions.length > 0 ? sql`${whereConditions.join(' AND ')}` : undefined)
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset);

    return {
      transactions: transactionResults,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTransactionsByAccount (accountId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction (insertTransaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(insertTransaction).returning();
    return result[0];
  }

  async getDashboardStats () {
    // Use parallel processing for better performance
    const [accounts, transactions] = await Promise.all([
      this.getAccounts(),
      this.getTransactions(),
    ]);

    // Pre-calculate balances using efficient reduce operations
    const balanceStats = accounts.reduce((stats, account) => {
      const balance = parseFloat(account.balance);
      stats.total += balance;

      if (account.type === 'company') {
        stats.company += balance;
      } else if (account.type === 'personal') {
        stats.personal += balance;
      }

      if (balance > 0) {
        stats.cash += balance;
      } else {
        stats.debt += Math.abs(balance);
      }

      return stats;
    }, { total: 0, company: 0, personal: 0, cash: 0, debt: 0 });

    // Get recent transactions (last 10) with optimized sorting
    const recentTransactions = transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      totalBalance: balanceStats.total,
      companyBalance: balanceStats.company,
      personalBalance: balanceStats.personal,
      totalCash: balanceStats.cash,
      totalDebt: balanceStats.debt,
      totalTransactions: transactions.length,
      recentTransactions,
      accounts,
    };
  }

  // Team Management methods
  async createTeam (insertTeam: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values(insertTeam).returning();
    return result[0];
  }

  async getTeam (id: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async getTeamsByUserId (userId: string): Promise<Team[]> {
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

  async updateTeam (id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const result = await db.update(teams)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return result[0];
  }

  async deleteTeam (id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  // Team Member methods
  async addTeamMember (insertMember: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(insertMember).returning();
    return result[0];
  }

  async getTeamMembers (teamId: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.isActive} = true`);
  }

  async getTeamMember (teamId: string, userId: string): Promise<TeamMember | undefined> {
    const result = await db.select().from(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.userId} = ${userId} AND ${teamMembers.isActive} = true`);
    return result[0];
  }

  async updateTeamMember (id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const result = await db.update(teamMembers)
      .set(updates)
      .where(eq(teamMembers.id, id))
      .returning();
    return result[0];
  }

  async removeTeamMember (teamId: string, userId: string): Promise<boolean> {
    // STORAGE GUARDRAIL: Cannot remove team owner at storage level
    const team = await this.getTeam(teamId);
    if (team && team.ownerId === userId) {
      throw new Error('Cannot remove team owner - use transfer ownership first');
    }

    const result = await db.delete(teamMembers)
      .where(sql`${teamMembers.teamId} = ${teamId} AND ${teamMembers.userId} = ${userId}`)
      .returning();
    return result.length > 0;
  }

  async getUserTeamRole (teamId: string, userId: string): Promise<string | undefined> {
    const member = await this.getTeamMember(teamId, userId);
    return member?.teamRole;
  }

  // Invite methods
  async createInvite (insertInvite: InsertInvite): Promise<Invite> {
    const result = await db.insert(invites).values(insertInvite).returning();
    return result[0];
  }

  async getInvite (id: string): Promise<Invite | undefined> {
    const result = await db.select().from(invites).where(eq(invites.id, id));
    return result[0];
  }

  async getInviteByToken (token: string): Promise<Invite | undefined> {
    const result = await db.select().from(invites).where(eq(invites.inviteToken, token));
    return result[0];
  }

  async getTeamInvites (teamId: string): Promise<Invite[]> {
    return db.select().from(invites).where(eq(invites.teamId, teamId));
  }

  async getPendingInvitesByEmail (email: string): Promise<Invite[]> {
    return db.select().from(invites)
      .where(sql`${invites.invitedEmail} = ${email} AND ${invites.status} = 'pending'`);
  }

  async updateInviteStatus (id: string, status: 'pending' | 'accepted' | 'declined' | 'expired', userId?: string): Promise<Invite | undefined> {
    const updates: Partial<Invite> = { status };
    if (status === 'accepted') {
      updates.acceptedAt = new Date();
      if (userId) {
        updates.invitedUserId = userId;
      }
    }
    const result = await db.update(invites)
      .set(updates)
      .where(eq(invites.id, id))
      .returning();
    return result[0];
  }

  async deleteInvite (id: string): Promise<boolean> {
    const result = await db.delete(invites).where(eq(invites.id, id)).returning();
    return result.length > 0;
  }

  // System Alert methods implementation for PostgresStorage
  async createSystemAlert (alertData: InsertSystemAlert): Promise<SystemAlert> {
    const result = await db.insert(systemAlerts).values(alertData).returning();
    return result[0];
  }

  async getSystemAlerts (): Promise<SystemAlert[]> {
    return db.select().from(systemAlerts).orderBy(desc(systemAlerts.createdAt));
  }

  async getActiveSystemAlerts (): Promise<SystemAlert[]> {
    return db.select().from(systemAlerts)
      .where(sql`${systemAlerts.isActive} = true AND ${systemAlerts.isDismissed} = false`)
      .orderBy(desc(systemAlerts.createdAt));
  }

  async getSystemAlertsByType (type: string): Promise<SystemAlert[]> {
    return db.select().from(systemAlerts)
      .where(eq(systemAlerts.type, type))
      .orderBy(desc(systemAlerts.createdAt));
  }

  async getSystemAlert (id: string): Promise<SystemAlert | undefined> {
    const result = await db.select().from(systemAlerts).where(eq(systemAlerts.id, id));
    return result[0];
  }

  async dismissSystemAlert (id: string): Promise<SystemAlert | undefined> {
    const result = await db.update(systemAlerts)
      .set({
        isDismissed: true,
        dismissedAt: new Date(),
      })
      .where(eq(systemAlerts.id, id))
      .returning();
    return result[0];
  }

  async updateSystemAlert (id: string, updates: Partial<SystemAlert>): Promise<SystemAlert | undefined> {
    const result = await db.update(systemAlerts)
      .set(updates)
      .where(eq(systemAlerts.id, id))
      .returning();
    return result[0];
  }

  async deleteSystemAlert (id: string): Promise<boolean> {
    const result = await db.delete(systemAlerts).where(eq(systemAlerts.id, id)).returning();
    return result.length > 0;
  }

  // Fixed Expenses methods implementation for PostgresStorage
  async getFixedExpenses (): Promise<FixedExpense[]> {
    return db.select().from(fixedExpenses).orderBy(desc(fixedExpenses.createdAt));
  }

  async getFixedExpense (id: string): Promise<FixedExpense | undefined> {
    const result = await db.select().from(fixedExpenses).where(eq(fixedExpenses.id, id));
    return result[0];
  }

  async createFixedExpense (expenseData: InsertFixedExpense): Promise<FixedExpense> {
    const nextDueDate = this.calculateNextDueDate(expenseData.startDate, expenseData.recurrence);
    const expenseWithDefaults = {
      ...expenseData,
      nextDueDate,
      lastProcessed: null,
    };

    const result = await db.insert(fixedExpenses).values(expenseWithDefaults).returning();
    return result[0];
  }

  async updateFixedExpense (id: string, updates: Partial<FixedExpense>): Promise<FixedExpense | undefined> {
    const result = await db.update(fixedExpenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fixedExpenses.id, id))
      .returning();
    return result[0];
  }

  async deleteFixedExpense (id: string): Promise<boolean> {
    const result = await db.delete(fixedExpenses).where(eq(fixedExpenses.id, id)).returning();
    return result.length > 0;
  }

  async processRecurringExpenses (): Promise<{ processed: number; transactions: Transaction[] }> {
    const now = new Date();
    const transactions: Transaction[] = [];
    let processed = 0;

    // Get all active expenses that are due
    const dueExpenses = await db.select()
      .from(fixedExpenses)
      .where(sql`${fixedExpenses.isActive} = true AND ${fixedExpenses.nextDueDate} <= ${now}`);

    for (const expense of dueExpenses) {
      // Check if end date has passed
      if (expense.endDate && expense.endDate < now) {
        // Mark as inactive
        await this.updateFixedExpense(expense.id, { isActive: false });
        continue;
      }

      // Create transaction for this expense
      const transactionData: InsertTransaction = {
        accountId: expense.accountId || 'default-account', // Use default if no account specified
        type: expense.type === 'income' ? 'income' : 'expense',
        amount: expense.amount,
        description: `Otomatik: ${expense.title}`,
        category: expense.category || 'Diğer',
      };

      const transaction = await this.createTransaction(transactionData);
      transactions.push(transaction);

      // Update expense with new due date
      const nextDueDate = this.calculateNextDueDate(now, expense.recurrence);
      await this.updateFixedExpense(expense.id, {
        lastProcessed: now,
        nextDueDate,
      });

      processed++;
    }

    return { processed, transactions };
  }

  private calculateNextDueDate (startDate: Date, recurrence: string): Date {
    const nextDate = new Date(startDate);

    switch (recurrence) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'one_time':
        // For one-time expenses, set far in the future
        nextDate.setFullYear(nextDate.getFullYear() + 10);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    return nextDate;
  }

  // Credits methods implementation for PostgresStorage
  async getCredits (): Promise<Credit[]> {
    return db.select().from(credits).orderBy(desc(credits.createdAt));
  }

  async getCredit (id: string): Promise<Credit | undefined> {
    const result = await db.select().from(credits).where(eq(credits.id, id));
    return result[0];
  }

  async createCredit (creditData: InsertCredit): Promise<Credit> {
    const result = await db.insert(credits).values(creditData).returning();
    return result[0];
  }

  async updateCredit (id: string, updates: Partial<Credit>): Promise<Credit | undefined> {
    const result = await db.update(credits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(credits.id, id))
      .returning();
    return result[0];
  }

  async deleteCredit (id: string): Promise<boolean> {
    const result = await db.delete(credits).where(eq(credits.id, id)).returning();
    return result.length > 0;
  }

  async makePayment (creditId: string, amount: number, description?: string): Promise<{ credit: Credit; transaction: Transaction }> {
    const credit = await this.getCredit(creditId);
    if (!credit) {
      throw new Error('Credit not found');
    }

    if (parseFloat(credit.remainingAmount) <= 0) {
      throw new Error('Credit is already paid off');
    }

    // Calculate new remaining amount
    const newRemainingAmount = Math.max(0, parseFloat(credit.remainingAmount) - amount);
    const paymentAmount = parseFloat(credit.remainingAmount) - newRemainingAmount;

    // Create payment transaction
    const transactionData: InsertTransaction = {
      accountId: credit.accountId || 'default-account',
      type: 'expense', // Payment is an expense
      amount: paymentAmount.toString(),
      description: description || `Ödeme: ${credit.title}`,
      category: 'Kredi Ödemesi',
    };

    const transaction = await this.createTransaction(transactionData);

    // Update credit
    const newStatus = newRemainingAmount <= 0 ? 'paid_off' : credit.status;
    const updatedCredit = await this.updateCredit(creditId, {
      remainingAmount: newRemainingAmount.toString(),
      status: newStatus,
      lastPaymentDate: new Date(),
      lastPaymentAmount: paymentAmount.toString(),
    });

    if (!updatedCredit) {
      throw new Error('Failed to update credit');
    }

    return { credit: updatedCredit, transaction };
  }

  async getOverdueCredits (): Promise<Credit[]> {
    const now = new Date();
    return db.select()
      .from(credits)
      .where(sql`${credits.isActive} = true AND ${credits.dueDate} < ${now} AND ${credits.remainingAmount} > 0`);
  }

  // Investment methods implementation for PostgresStorage

  async getInvestments (): Promise<Investment[]> {
    return db.select().from(investments).where(eq(investments.isActive, true));
  }

  async getInvestment (id: string): Promise<Investment | undefined> {
    const result = await db.select().from(investments).where(eq(investments.id, id));
    return result[0];
  }

  async createInvestment (investmentData: InsertInvestment): Promise<Investment> {
    const result = await db.insert(investments).values({
      ...investmentData,
      lastUpdated: new Date(),
    }).returning();
    return result[0];
  }

  async updateInvestment (id: string, updates: Partial<Investment>): Promise<Investment | undefined> {
    const result = await db.update(investments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(investments.id, id))
      .returning();
    return result[0];
  }

  async deleteInvestment (id: string): Promise<boolean> {
    const result = await db.update(investments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(investments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateInvestmentPrice (id: string, currentPrice: number): Promise<Investment | undefined> {
    const result = await db.update(investments)
      .set({
        currentPrice: currentPrice.toString(),
        lastUpdated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(investments.id, id))
      .returning();
    return result[0];
  }

  async getPortfolioSummary (): Promise<{ totalValue: number; totalCost: number; totalGain: number; gainPercentage: number; investments: Investment[] }> {
    const investments = await this.getInvestments();

    let totalValue = 0;
    let totalCost = 0;

    investments.forEach(investment => {
      const quantity = parseFloat(investment.quantity);
      const purchasePrice = parseFloat(investment.purchasePrice);
      const currentPrice = parseFloat(investment.currentPrice || investment.purchasePrice);

      totalCost += quantity * purchasePrice;
      totalValue += quantity * currentPrice;
    });

    const totalGain = totalValue - totalCost;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGain,
      gainPercentage,
      investments,
    };
  }

  async getInvestmentsByType (type: string): Promise<Investment[]> {
    return db.select()
      .from(investments)
      .where(and(eq(investments.isActive, true), eq(investments.type, type)));
  }

  // Forecast methods implementation for PostgresStorage

  async getForecasts (): Promise<Forecast[]> {
    return db.select().from(forecasts);
  }

  async getForecast (id: string): Promise<Forecast | undefined> {
    const result = await db.select().from(forecasts).where(eq(forecasts.id, id));
    return result[0];
  }

  async createForecast (forecastData: InsertForecast): Promise<Forecast> {
    const result = await db.insert(forecasts).values(forecastData).returning();
    return result[0];
  }

  async updateForecast (id: string, updates: Partial<Forecast>): Promise<Forecast | undefined> {
    const result = await db.update(forecasts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(forecasts.id, id))
      .returning();
    return result[0];
  }

  async deleteForecast (id: string): Promise<boolean> {
    const result = await db.update(forecasts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(forecasts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getForecastsByScenario (scenario: string): Promise<Forecast[]> {
    return db.select()
      .from(forecasts)
      .where(and(eq(forecasts.isActive, true), eq(forecasts.scenario, scenario)));
  }

  async getActiveForecasts (): Promise<Forecast[]> {
    return db.select().from(forecasts).where(eq(forecasts.isActive, true));
  }

  // AI Settings methods
  async getAISettings (): Promise<any> {
    // Return the first (and only) AI settings record
    for (const [_, settings] of Array.from(this.aiSettings.entries())) {
      return settings;
    }
    return null;
  }

  async createAISettings (settings: any): Promise<any> {
    const id = randomUUID();
    const newSettings = {
      id,
      ...settings,
      updatedAt: new Date(),
    };
    this.aiSettings.set(id, newSettings);
    return newSettings;
  }

  async updateAISettings (id: string, updates: any): Promise<any> {
    const existing = this.aiSettings.get(id);
    if (!existing) {
      throw new Error('AI settings not found');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    this.aiSettings.set(id, updated);
    return updated;
  }

  async deleteAISettings (id: string): Promise<boolean> {
    return this.aiSettings.delete(id);
  }

  // Tenant methods
  async getTenants (): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async getTenant (id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantByDomain (domain: string): Promise<Tenant | undefined> {
    for (const [_, tenant] of Array.from(this.tenants.entries())) {
      if (tenant.domain === domain) {
        return tenant;
      }
    }
    return undefined;
  }

  async createTenant (tenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const newTenant: Tenant = {
      id,
      name: tenant.name,
      isActive: tenant.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      logo: tenant.logo ?? null,
      domain: tenant.domain ?? null,
      theme: tenant.theme ?? 'default',
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }

  async updateTenant (id: string, updates: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const existing = this.tenants.get(id);
    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.tenants.set(id, updated);
    return updated;
  }

  async deleteTenant (id: string): Promise<boolean> {
    return this.tenants.delete(id);
  }

  private initializeTenants () {
    // Default FinBot tenant
    const defaultTenantId = randomUUID();
    const now = new Date();

    const defaultTenant: Tenant = {
      id: defaultTenantId,
      name: 'FinBot',
      logo: null,
      domain: 'finbot.com',
      theme: JSON.stringify({
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#8b5cf6',
      }),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.tenants.set(defaultTenantId, defaultTenant);

    // Demo white-label tenant
    const demoTenantId = randomUUID();
    const demoTenant: Tenant = {
      id: demoTenantId,
      name: 'DemoBank',
      logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMxMGJ5ODEiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RDwvdGV4dD4KPC9zdmc+',
      domain: 'demo.finbot.com',
      theme: JSON.stringify({
        primary: '#10b981',
        secondary: '#059669',
        accent: '#34d399',
      }),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.tenants.set(demoTenantId, demoTenant);
  }
}

// Use PostgreSQL storage in production, memory storage for development/testing
// Temporarily force memory storage for local setup
export const storage = new MemStorage();
