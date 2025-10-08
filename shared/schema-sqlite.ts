import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Sub-account types
export const subAccountTypes = z.enum(['checking', 'creditCard', 'loan', 'kmh', 'deposit']);
export type SubAccountType = z.infer<typeof subAccountTypes>;

export const creditCardSubAccountSchema = z.object({
  type: z.literal('creditCard'),
  limit: z.number(),
  used: z.number(),
  cutOffDate: z.number().min(1).max(31),
  paymentDueDate: z.number().min(1).max(31),
  minimumPayment: z.number(),
  interestRate: z.number(),
  cardName: z.string().optional(),
});

export const loanSubAccountSchema = z.object({
  type: z.literal('loan'),
  principal: z.number(),
  remaining: z.number(),
  interestRate: z.number(),
  monthlyPayment: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  loanName: z.string().optional(),
});

export const kmhSubAccountSchema = z.object({
  type: z.literal('kmh'),
  balance: z.number(),
  interestRate: z.number(),
  maturityDate: z.string(),
  kmhName: z.string().optional(),
});

export const depositSubAccountSchema = z.object({
  type: z.literal('deposit'),
  balance: z.number(),
  interestRate: z.number(),
  maturityDate: z.string(),
  depositName: z.string().optional(),
});

export const checkingSubAccountSchema = z.object({
  type: z.literal('checking'),
  balance: z.number(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
});

export const subAccountSchema = z.discriminatedUnion('type', [
  creditCardSubAccountSchema,
  loanSubAccountSchema,
  kmhSubAccountSchema,
  depositSubAccountSchema,
  checkingSubAccountSchema,
]);

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Teams table
export const teams = sqliteTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.id),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Team Members table
export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  teamId: text('team_id').notNull().references(() => teams.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('member'),
  permissions: text('permissions'), // JSON string
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Accounts table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'checking', 'savings', 'credit_card', 'loan', 'investment'
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('TRY'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  amount: real('amount').notNull(),
  type: text('type').notNull(), // 'income', 'expense', 'transfer'
  category: text('category'),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
});

// Alerts table
export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  accountId: text('account_id').references(() => accounts.id),
  metadata: text('metadata'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

// Permission System
export const Permission = {
  // User Management
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',

  // Account Management
  MANAGE_ALL_ACCOUNTS: 'manage_all_accounts',
  MANAGE_COMPANY_ACCOUNTS: 'manage_company_accounts',
  MANAGE_PERSONAL_ACCOUNTS: 'manage_personal_accounts',
  VIEW_ALL_ACCOUNTS: 'view_all_accounts',
  VIEW_COMPANY_ACCOUNTS: 'view_company_accounts',
  VIEW_PERSONAL_ACCOUNTS: 'view_personal_accounts',

  // Transaction Management
  MANAGE_ALL_TRANSACTIONS: 'manage_all_transactions',
  MANAGE_COMPANY_TRANSACTIONS: 'manage_company_transactions',
  MANAGE_PERSONAL_TRANSACTIONS: 'manage_personal_transactions',
  VIEW_ALL_TRANSACTIONS: 'view_all_transactions',
  VIEW_COMPANY_TRANSACTIONS: 'view_company_transactions',
  VIEW_PERSONAL_TRANSACTIONS: 'view_personal_transactions',
  
  // Transaction CRUD Operations
  CREATE_ALL_TRANSACTIONS: 'create_all_transactions',
  CREATE_COMPANY_TRANSACTIONS: 'create_company_transactions',
  CREATE_PERSONAL_TRANSACTIONS: 'create_personal_transactions',
  UPDATE_ALL_TRANSACTIONS: 'update_all_transactions',
  UPDATE_COMPANY_TRANSACTIONS: 'update_company_transactions',
  UPDATE_PERSONAL_TRANSACTIONS: 'update_personal_transactions',
  DELETE_ALL_TRANSACTIONS: 'delete_all_transactions',
  DELETE_COMPANY_TRANSACTIONS: 'delete_company_transactions',
  DELETE_PERSONAL_TRANSACTIONS: 'delete_personal_transactions',

  // Reports & Analytics
  VIEW_ALL_REPORTS: 'view_all_reports',
  VIEW_COMPANY_REPORTS: 'view_company_reports',
  VIEW_PERSONAL_REPORTS: 'view_personal_reports',
  EXPORT_DATA: 'export_data',

  // Dashboard Management
  MANAGE_DASHBOARD: 'manage_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_DASHBOARD_STREAM: 'view_dashboard_stream',
  VIEW_CONSOLIDATION_BREAKDOWN: 'view_consolidation_breakdown',
  VIEW_ALERTS: 'view_alerts',
  VIEW_RISK_ANALYSIS: 'view_risk_analysis',

  // Cashbox Management
  MANAGE_CASHBOXES: 'manage_cashboxes',
  VIEW_CASHBOXES: 'view_cashboxes',
  TRANSFER_CASHBOX: 'transfer_cashbox',

  // Bank Integration
  MANAGE_BANK_INTEGRATIONS: 'manage_bank_integrations',
  VIEW_BANK_INTEGRATIONS: 'view_bank_integrations',
  IMPORT_BANK_DATA: 'import_bank_data',
  RECONCILE_TRANSACTIONS: 'reconcile_transactions',

  // System Settings
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SETTINGS: 'view_settings',

  // Credit & Cards
  MANAGE_CREDIT: 'manage_credit',
  VIEW_CREDIT: 'view_credit',

  // Admin
  ADMIN_ACCESS: 'admin_access',
  SUPER_ADMIN: 'super_admin'
} as const;

export type PermissionType = typeof Permission[keyof typeof Permission];

// Password Reset Token Schemas
export const insertPasswordResetTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean().default(false),
});

export const updatePasswordResetTokenSchema = insertPasswordResetTokenSchema.partial();

// Password Reset Tokens Table
export const passwordResetTokens = sqliteTable('password_reset_tokens', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull(),
  token: text('token', { length: 255 }).notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  used: integer('used', { mode: 'boolean' }).default(false).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Types for Password Reset Tokens
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type UpdatePasswordResetToken = typeof passwordResetTokens.$inferInsert;

// User Profiles Table
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  userId: text('user_id').notNull().unique(),
  role: text('role', { length: 20 }).default('viewer').notNull(),
  permissions: text('permissions'), // JSON string for custom permissions
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  passwordChangedAt: integer('password_changed_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false).notNull(),
  sessionTimeout: integer('session_timeout').default(3600).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
});

// Types for User Profiles
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;