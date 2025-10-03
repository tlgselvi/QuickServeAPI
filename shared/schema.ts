import { sql } from 'drizzle-orm';
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
// import { createInsertSchema } from 'drizzle-zod'; // Removed due to version conflict
import { z } from 'zod';

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
  principalRemaining: z.number(),
  monthlyPayment: z.number(),
  interestRate: z.number(),
  dueDate: z.number().min(1).max(31),
  loanName: z.string().optional(),
  totalAmount: z.number().optional(),
});

export const kmhSubAccountSchema = z.object({
  type: z.literal('kmh'),
  limit: z.number(),
  used: z.number(),
  interestRate: z.number(),
  accountName: z.string().optional(),
});

export const depositSubAccountSchema = z.object({
  type: z.literal('deposit'),
  balance: z.number(),
  interestRate: z.number(),
  maturityDate: z.string().optional(), // ISO date string
  depositName: z.string().optional(),
});

export const subAccountSchema = z.discriminatedUnion('type', [
  creditCardSubAccountSchema,
  loanSubAccountSchema,
  kmhSubAccountSchema,
  depositSubAccountSchema,
]);

export type SubAccount = z.infer<typeof subAccountSchema>;

export const accounts = pgTable('accounts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'personal' or 'company'
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  balance: decimal('balance', { precision: 19, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  // Sub-accounts as JSON string
  subAccounts: text('sub_accounts'), // JSON string containing array of sub-account objects
  // Legacy fields for backward compatibility
  paymentDueDate: varchar('payment_due_date', { length: 10 }), // Day of month (1-31)
  cutOffDate: varchar('cut_off_date', { length: 10 }), // Day of month (1-31)
  gracePeriod: varchar('grace_period', { length: 10 }), // Days after due date
  minimumPayment: decimal('minimum_payment', { precision: 19, scale: 4 }), // For credit cards
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }), // Annual interest rate
  // Audit fields
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
  isActive: boolean('is_active').default(true).notNull(),
});

// Bank products table - each bank can have multiple products
export const bankProducts = pgTable('bank_products', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  bankName: varchar('bank_name', { length: 100 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(), // Bank account name (e.g., "Yapı Kredi Şirket Hesabı")
  type: varchar('type', { length: 20 }).notNull(), // 'personal' or 'company'
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  // Products this bank offers
  hasCheckingAccount: boolean('has_checking_account').default(false),
  hasCreditCard: boolean('has_credit_card').default(false),
  hasLoan: boolean('has_loan').default(false),
  hasOverdraft: boolean('has_overdraft').default(false),
  hasSavings: boolean('has_savings').default(false),
  // Payment dates for credit cards and loans
  creditCardCutOffDate: varchar('credit_card_cut_off_date', { length: 10 }),
  creditCardDueDate: varchar('credit_card_due_date', { length: 10 }),
  creditCardGracePeriod: varchar('credit_card_grace_period', { length: 10 }),
  creditCardMinimumPayment: decimal('credit_card_minimum_payment', { precision: 19, scale: 4 }),
  creditCardInterestRate: decimal('credit_card_interest_rate', { precision: 5, scale: 2 }),
  // Loan details
  loanDueDate: varchar('loan_due_date', { length: 10 }),
  loanGracePeriod: varchar('loan_grace_period', { length: 10 }),
  loanMinimumPayment: decimal('loan_minimum_payment', { precision: 19, scale: 4 }),
  loanInterestRate: decimal('loan_interest_rate', { precision: 5, scale: 2 }),
  // Overdraft details
  overdraftLimit: decimal('overdraft_limit', { precision: 19, scale: 4 }),
  overdraftInterestRate: decimal('overdraft_interest_rate', { precision: 5, scale: 2 }),
});

export const transactions = pgTable('transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar('account_id').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'income', 'expense', 'transfer_in', 'transfer_out'
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }),
  virmanPairId: varchar('virman_pair_id'), // for linking transfer transactions
  date: timestamp('date').default(sql`NOW()`).notNull(),
  // Audit fields
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
  isActive: boolean('is_active').default(true).notNull(),
});

// System alerts table for important dates and notifications
export const systemAlerts = pgTable('system_alerts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  type: varchar('type', { length: 50 }).notNull(), // 'low_balance', 'recurring_payment', 'budget_exceeded', 'payment_due'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }).default('medium').notNull(), // 'low', 'medium', 'high', 'critical'
  triggerDate: timestamp('trigger_date'),
  isActive: boolean('is_active').default(true).notNull(),
  isDismissed: boolean('is_dismissed').default(false).notNull(),
  accountId: varchar('account_id'), // Optional - for account-specific alerts
  transactionId: varchar('transaction_id'), // Optional - for transaction-specific alerts
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  dismissedAt: timestamp('dismissed_at'),
});

export const fixedExpenses = pgTable('fixed_expenses', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  category: varchar('category', { length: 50 }),
  accountId: varchar('account_id'), // Optional - if tied to specific account
  type: varchar('type', { length: 20 }).notNull(), // 'expense' or 'income' (for support/grants)
  recurrence: varchar('recurrence', { length: 20 }).notNull(), // 'monthly', 'quarterly', 'yearly', 'weekly', 'one_time'
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // Optional - for time-limited expenses
  isActive: boolean('is_active').default(true).notNull(),
  lastProcessed: timestamp('last_processed'), // Track when this was last processed
  nextDueDate: timestamp('next_due_date'), // When this should be processed next
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const credits = pgTable('credits', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // 'credit_card', 'bank_loan', 'personal_loan', 'receivable', 'payable'
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(), // Original amount
  remainingAmount: decimal('remaining_amount', { precision: 19, scale: 4 }).notNull(), // Remaining balance
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }), // Annual interest rate
  accountId: varchar('account_id'), // Optional - if tied to specific account
  institution: varchar('institution', { length: 100 }), // Bank, credit card company, etc.
  accountNumber: varchar('account_number', { length: 50 }), // Credit card number, loan account, etc.
  startDate: timestamp('start_date').notNull(),
  dueDate: timestamp('due_date'), // Next payment due date
  maturityDate: timestamp('maturity_date'), // Final payment date (for loans)
  minimumPayment: decimal('minimum_payment', { precision: 19, scale: 4 }), // Minimum monthly payment
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'paid_off', 'overdue', 'closed'
  isActive: boolean('is_active').default(true).notNull(),
  lastPaymentDate: timestamp('last_payment_date'),
  lastPaymentAmount: decimal('last_payment_amount', { precision: 19, scale: 4 }),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
});

export const forecasts = pgTable('forecasts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // 'monte_carlo', 'prophet', 'scenario', 'trend'
  scenario: varchar('scenario', { length: 50 }), // 'optimistic', 'pessimistic', 'realistic'
  forecastDate: timestamp('forecast_date').notNull(),
  targetDate: timestamp('target_date').notNull(),
  predictedValue: decimal('predicted_value', { precision: 19, scale: 4 }).notNull(),
  confidenceInterval: decimal('confidence_interval', { precision: 5, scale: 2 }), // 95%, 90%, etc.
  lowerBound: decimal('lower_bound', { precision: 19, scale: 4 }),
  upperBound: decimal('upper_bound', { precision: 19, scale: 4 }),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  category: varchar('category', { length: 50 }), // 'income', 'expense', 'balance', 'investment'
  accountId: varchar('account_id'), // Optional - if tied to specific account
  parameters: text('parameters'), // JSON string for simulation parameters
  isActive: boolean('is_active').default(true).notNull(),
  accuracy: decimal('accuracy', { precision: 5, scale: 2 }), // Accuracy score if validated
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const investments = pgTable('investments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // 'stock', 'crypto', 'bond', 'fund', 'real_estate'
  symbol: varchar('symbol', { length: 20 }), // Stock symbol, crypto ticker, etc.
  quantity: decimal('quantity', { precision: 19, scale: 8 }).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 19, scale: 8 }).notNull(),
  currentPrice: decimal('current_price', { precision: 19, scale: 8 }), // Latest market price
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  purchaseDate: timestamp('purchase_date').notNull(),
  accountId: varchar('account_id'), // Optional - if tied to specific account
  category: varchar('category', { length: 50 }), // 'growth', 'value', 'dividend', 'defensive'
  riskLevel: varchar('risk_level', { length: 20 }).default('medium'), // 'low', 'medium', 'high'
  isActive: boolean('is_active').default(true).notNull(),
  lastUpdated: timestamp('last_updated').default(sql`NOW()`).notNull(),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// Tenants table for white-label support
export const tenants = pgTable('tenants', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  logo: text('logo'), // Base64 or URL
  domain: varchar('domain', { length: 255 }).unique(), // Custom domain
  theme: text('theme').notNull().default('{"primary":"#3b82f6","secondary":"#1e40af","accent":"#8b5cf6"}'), // JSON theme config
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// AI Settings table for managing AI providers and configurations
export const aiSettings = pgTable('ai_settings', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar('tenant_id').references(() => tenants.id), // Multi-tenant support
  provider: varchar('provider', { length: 50 }).notNull(), // 'openai', 'mock'
  apiKey: text('api_key'), // Encrypted API key
  isActive: boolean('is_active').default(false).notNull(),
  defaultModel: varchar('default_model', { length: 50 }).default('gpt-3.5-turbo').notNull(), // 'gpt-3.5-turbo', 'gpt-4', 'mock'
  cacheDuration: decimal('cache_duration', { precision: 10, scale: 0 }).default('60').notNull(), // minutes
  maxTokens: decimal('max_tokens', { precision: 10, scale: 0 }).default('500').notNull(),
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.70').notNull(),
  lastTested: timestamp('last_tested'),
  testResult: text('test_result'), // JSON string for test results
  metadata: text('metadata'), // JSON string for additional configuration
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const insertAccountSchema = z.object({
  name: z.string(),
  type: z.enum(['personal', 'company']),
  balance: z.number(),
  currency: z.string().default('TRY'),
  description: z.string().optional(),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  isActive: z.boolean().default(true),
  metadata: z.string().optional(),
});

export const updateAccountSchema = z.object({
  accountName: z.string().min(2, 'Hesap adı en az 2 karakter olmalı').max(255, 'Hesap adı çok uzun').optional(),
  bankName: z.string().max(100, 'Banka adı çok uzun').optional(),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').optional(),
  subAccounts: z.string().optional(),
  paymentDueDate: z.string().optional(),
  cutOffDate: z.string().optional(),
  gracePeriod: z.string().optional(),
  minimumPayment: z.number().optional(),
  interestRate: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
});

export const insertBankProductSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  accountId: z.string(),
  amount: z.number(),
  description: z.string(),
  category: z.string().optional(),
  virmanPairId: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer_in', 'transfer_out']).optional(),
  accountId: z.string().optional(),
  amount: z.number().positive('Tutar pozitif olmalı').optional(),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  category: z.string().max(50, 'Kategori çok uzun').optional(),
  date: z.date().optional(),
});

export const deleteTransactionSchema = z.object({
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
});

export const insertSystemAlertSchema = z.object({
  type: z.string(),
  accountId: z.string().optional(),
  description: z.string(),
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  isActive: z.boolean().default(true),
  metadata: z.string().optional(),
});

export const insertFixedExpenseSchema = z.object({
  type: z.string(),
  currency: z.string().optional(),
  accountId: z.string().optional(),
  amount: z.number(),
  description: z.string(),
  category: z.string().optional(),
  frequency: z.enum(['monthly', 'yearly', 'weekly', 'daily']),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export const insertCreditSchema = z.object({
  type: z.string(),
  status: z.string().optional(),
  minimumPayment: z.number().optional(),
  creditLimit: z.number(),
  currentBalance: z.number(),
  interestRate: z.number(),
  dueDate: z.date(),
  gracePeriod: z.number().optional(),
  accountNumber: z.string().optional(),
});

export const updateCreditSchema = z.object({
  title: z.string().max(255, 'Başlık çok uzun').optional(),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  type: z.string().max(20, 'Tip çok uzun').optional(),
  amount: z.number().positive('Tutar pozitif olmalı').optional(),
  remainingAmount: z.number().positive('Kalan tutar pozitif olmalı').optional(),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').optional(),
  interestRate: z.number().optional(),
  accountId: z.string().optional(),
  institution: z.string().max(100, 'Kurum adı çok uzun').optional(),
  accountNumber: z.string().max(50, 'Hesap numarası çok uzun').optional(),
  dueDate: z.date().optional(),
  maturityDate: z.date().optional(),
  minimumPayment: z.number().positive('Asgari ödeme pozitif olmalı').optional(),
  status: z.string().max(20, 'Durum çok uzun').optional(),
  isActive: z.boolean().optional(),
});

export const deleteCreditSchema = z.object({
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
});

export const insertForecastSchema = z.object({
  type: z.string(),
  currency: z.string().optional(),
  accountId: z.string().optional(),
  horizonMonths: z.number(),
  confidence: z.number(),
  parameters: z.string().optional(),
});

export const insertInvestmentSchema = z.object({
  symbol: z.string().optional(),
  type: z.string(),
  userId: z.string(),
  currency: z.string().optional(),
  quantity: z.number(),
  purchasePrice: z.number(),
  currentPrice: z.number().optional(),
  purchaseDate: z.date(),
  riskLevel: z.string().optional(),
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type UpdateAccount = z.infer<typeof updateAccountSchema>;
export type DeleteAccount = z.infer<typeof deleteAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;
export type DeleteTransaction = z.infer<typeof deleteTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertFixedExpense = z.infer<typeof insertFixedExpenseSchema>;
export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type InsertCredit = z.infer<typeof insertCreditSchema>;
export type UpdateCredit = z.infer<typeof updateCreditSchema>;
export type DeleteCredit = z.infer<typeof deleteCreditSchema>;
export type Credit = typeof credits.$inferSelect;
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = typeof forecasts.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

// =====================
// BUDGET LINE & LOAN (Sprint 2)
// =====================

export const budgetLines = pgTable('budget_lines', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  category: varchar('category', { length: 100 }).notNull(),
  plannedAmount: decimal('planned_amount', { precision: 19, scale: 4 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 19, scale: 4 }).default('0').notNull(),
  month: timestamp('month').notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const loans = pgTable('loans', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  principal: decimal('principal', { precision: 19, scale: 4 }).notNull(),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull(),
  termMonths: varchar('term_months', { length: 10 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  paymentType: varchar('payment_type', { length: 20 }).notNull(), // 'annuity' | 'bullet'
});

// =====================
// AGING TABLE (Sprint 2)
// =====================

export const agingTable = pgTable('aging_table', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'receivable' or 'payable'
  customerSupplier: varchar('customer_supplier', { length: 255 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  originalAmount: decimal('original_amount', { precision: 19, scale: 4 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  status: varchar('status', { length: 20 }).default('outstanding').notNull(), // 'outstanding', 'paid', 'overdue'
  daysOutstanding: integer('days_outstanding'),
  agingBucket: varchar('aging_bucket', { length: 20 }), // '0-30', '31-60', '61-90', '90+'
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// =====================
// PROGRESS PAYMENT (Sprint 2)
// =====================

export const progressPayments = pgTable('progress_payments', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  projectType: varchar('project_type', { length: 50 }).notNull(), // 'construction', 'consulting', 'other'
  contractValue: decimal('contract_value', { precision: 19, scale: 4 }).notNull(),
  progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0').notNull(),
  billedAmount: decimal('billed_amount', { precision: 19, scale: 4 }).default('0').notNull(),
  paidAmount: decimal('paid_amount', { precision: 19, scale: 4 }).default('0').notNull(),
  pendingAmount: decimal('pending_amount', { precision: 19, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'completed', 'cancelled'
  startDate: timestamp('start_date'),
  expectedCompletionDate: timestamp('expected_completion_date'),
  actualCompletionDate: timestamp('actual_completion_date'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// =====================
// RECURRING TRANSACTIONS (Sprint 1.1)
// =====================

export const recurringTransactions = pgTable('recurring_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  description: varchar('description', { length: 500 }),
  category: varchar('category', { length: 100 }),
  interval: varchar('interval', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  intervalCount: integer('interval_count').default(1).notNull(), // Every N intervals
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'), // Optional end date
  isActive: boolean('is_active').default(true).notNull(),
  lastProcessed: timestamp('last_processed'),
  nextDueDate: timestamp('next_due_date').notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  metadata: jsonb('metadata'), // Additional configuration
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const insertBudgetLineSchema = z.object({
  category: z.string(),
  plannedAmount: z.number(),
  actualAmount: z.number().optional(),
  month: z.date(),
});

export const insertLoanSchema = z.object({
  interestRate: z.number(),
  startDate: z.date(),
  principal: z.number(),
  termMonths: z.number(),
  paymentType: z.string(),
});

export const insertRecurringTransactionSchema = z.object({
  accountId: z.string(),
  amount: z.number(),
  description: z.string().optional(),
  category: z.string().optional(),
  interval: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  intervalCount: z.number().default(1),
  startDate: z.date(),
  endDate: z.date().optional(),
  currency: z.string().default('TRY'),
  metadata: z.record(z.any()).optional(),
});

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = z.infer<typeof insertBudgetLineSchema>;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = z.infer<typeof insertRecurringTransactionSchema>;

// =====================
// AR/AP AGING TABLES (Sprint 1.2)
// =====================

export const cashboxes = pgTable('cashboxes', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  location: varchar('location', { length: 255 }),
  currentBalance: decimal('current_balance', { precision: 19, scale: 4 }).default('0').notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const cashboxTransactions = pgTable('cashbox_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  cashboxId: varchar('cashbox_id', { length: 255 }).notNull().references(() => cashboxes.id),
  type: varchar('type', { length: 20 }).notNull(), // 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  description: varchar('description', { length: 1000 }),
  reference: varchar('reference', { length: 255 }), // external reference (invoice, receipt, etc.)
  transferToCashboxId: varchar('transfer_to_cashbox_id', { length: 255 }).references(() => cashboxes.id),
  transferFromCashboxId: varchar('transfer_from_cashbox_id', { length: 255 }).references(() => cashboxes.id),
  balanceAfter: decimal('balance_after', { precision: 19, scale: 4 }).notNull(),
  isReconciled: boolean('is_reconciled').default(false).notNull(),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: varchar('reconciled_by', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const cashboxAuditLogs = pgTable('cashbox_audit_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  cashboxId: varchar('cashbox_id', { length: 255 }).references(() => cashboxes.id),
  transactionId: varchar('transaction_id', { length: 255 }).references(() => cashboxTransactions.id),
  action: varchar('action', { length: 50 }).notNull(), // 'create', 'update', 'delete', 'restore', 'transfer'
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'cashbox', 'transaction'
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changes: jsonb('changes'),
  reason: varchar('reason', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 1000 }),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

export const bankIntegrations = pgTable('bank_integrations', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  bankCode: varchar('bank_code', { length: 50 }).notNull(),
  accountNumber: varchar('account_number', { length: 100 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // 'checking', 'savings', 'credit', 'investment'
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  apiEndpoint: varchar('api_endpoint', { length: 500 }),
  apiKey: varchar('api_key', { length: 500 }),
  credentials: jsonb('credentials'), // Encrypted credentials
  isActive: boolean('is_active').default(true).notNull(),
  lastSyncAt: timestamp('last_sync_at'),
  syncStatus: varchar('sync_status', { length: 20 }).default('idle'), // 'idle', 'syncing', 'success', 'error'
  syncError: varchar('sync_error', { length: 1000 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  bankIntegrationId: varchar('bank_integration_id', { length: 255 }).notNull().references(() => bankIntegrations.id),
  externalTransactionId: varchar('external_transaction_id', { length: 255 }).notNull(),
  accountId: varchar('account_id', { length: 255 }).references(() => accounts.id),
  date: timestamp('date').notNull(),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  description: varchar('description', { length: 1000 }),
  reference: varchar('reference', { length: 255 }),
  category: varchar('category', { length: 100 }),
  subcategory: varchar('subcategory', { length: 100 }),
  balance: decimal('balance', { precision: 19, scale: 4 }),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'debit', 'credit'
  isReconciled: boolean('is_reconciled').default(false).notNull(),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: varchar('reconciled_by', { length: 255 }),
  isImported: boolean('is_imported').default(false).notNull(),
  importSource: varchar('import_source', { length: 50 }), // 'api', 'csv', 'ofx', 'xml'
  importBatchId: varchar('import_batch_id', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const importBatches = pgTable('import_batches', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  bankIntegrationId: varchar('bank_integration_id', { length: 255 }).references(() => bankIntegrations.id),
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 20 }).notNull(), // 'csv', 'ofx', 'xml'
  fileSize: integer('file_size'),
  totalRecords: integer('total_records').default(0),
  processedRecords: integer('processed_records').default(0),
  successfulRecords: integer('successful_records').default(0),
  failedRecords: integer('failed_records').default(0),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorMessage: varchar('error_message', { length: 1000 }),
  validationErrors: jsonb('validation_errors'),
  duplicateRecords: jsonb('duplicate_records'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const reconciliationLogs = pgTable('reconciliation_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  bankIntegrationId: varchar('bank_integration_id', { length: 255 }).references(() => bankIntegrations.id),
  bankTransactionId: varchar('bank_transaction_id', { length: 255 }).references(() => bankTransactions.id),
  systemTransactionId: varchar('system_transaction_id', { length: 255 }).references(() => transactions.id),
  matchType: varchar('match_type', { length: 50 }).notNull(), // 'exact', 'fuzzy', 'manual'
  matchScore: decimal('match_score', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 20 }).notNull(), // 'matched', 'unmatched', 'disputed'
  reason: varchar('reason', { length: 500 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

export const agingReports = pgTable('aging_reports', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  reportType: varchar('report_type', { length: 20 }).notNull(), // 'ar' (accounts receivable) or 'ap' (accounts payable)
  customerVendorId: varchar('customer_vendor_id', { length: 255 }).notNull(),
  customerVendorName: varchar('customer_vendor_name', { length: 500 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  invoiceDate: timestamp('invoice_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  originalAmount: decimal('original_amount', { precision: 19, scale: 4 }).notNull(),
  currentAmount: decimal('current_amount', { precision: 19, scale: 4 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY').notNull(),
  agingDays: integer('aging_days').notNull(),
  agingBucket: varchar('aging_bucket', { length: 20 }).notNull(), // '0-30', '30-60', '60-90', '90+'
  description: varchar('description', { length: 1000 }),
  status: varchar('status', { length: 20 }).default('outstanding').notNull(), // 'outstanding', 'paid', 'overdue'
  paymentTerms: varchar('payment_terms', { length: 100 }),
  lastPaymentDate: timestamp('last_payment_date'),
  lastPaymentAmount: decimal('last_payment_amount', { precision: 19, scale: 4 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const insertCashboxSchema = z.object({
  name: z.string().min(1, 'Kasa adı gereklidir').max(255, 'Kasa adı çok uzun'),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  location: z.string().max(255, 'Konum çok uzun').optional(),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').default('TRY'),
  metadata: z.record(z.any()).optional(),
});

export const updateCashboxSchema = z.object({
  name: z.string().min(1, 'Kasa adı gereklidir').max(255, 'Kasa adı çok uzun').optional(),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  location: z.string().max(255, 'Konum çok uzun').optional(),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const insertCashboxTransactionSchema = z.object({
  cashboxId: z.string().min(1, 'Kasa ID gereklidir'),
  type: z.enum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out'], {
    errorMap: () => ({ message: 'Geçersiz işlem tipi' }),
  }),
  amount: z.number().positive('Tutar pozitif olmalı'),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').default('TRY'),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  reference: z.string().max(255, 'Referans çok uzun').optional(),
  transferToCashboxId: z.string().optional(),
  transferFromCashboxId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const insertBankIntegrationSchema = z.object({
  bankName: z.string().min(1, 'Banka adı gereklidir').max(255, 'Banka adı çok uzun'),
  bankCode: z.string().min(1, 'Banka kodu gereklidir').max(50, 'Banka kodu çok uzun'),
  accountNumber: z.string().min(1, 'Hesap numarası gereklidir').max(100, 'Hesap numarası çok uzun'),
  accountType: z.enum(['checking', 'savings', 'credit', 'investment'], {
    errorMap: () => ({ message: 'Geçersiz hesap tipi' }),
  }),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').default('TRY'),
  apiEndpoint: z.string().url('Geçersiz API endpoint').optional(),
  apiKey: z.string().optional(),
  credentials: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateBankIntegrationSchema = z.object({
  bankName: z.string().min(1, 'Banka adı gereklidir').max(255, 'Banka adı çok uzun').optional(),
  bankCode: z.string().min(1, 'Banka kodu gereklidir').max(50, 'Banka kodu çok uzun').optional(),
  accountNumber: z.string().min(1, 'Hesap numarası gereklidir').max(100, 'Hesap numarası çok uzun').optional(),
  accountType: z.enum(['checking', 'savings', 'credit', 'investment']).optional(),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').optional(),
  apiEndpoint: z.string().url('Geçersiz API endpoint').optional(),
  apiKey: z.string().optional(),
  credentials: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const importTransactionsSchema = z.object({
  bankIntegrationId: z.string().min(1, 'Banka entegrasyon ID gereklidir'),
  fileType: z.enum(['csv', 'ofx', 'xml'], {
    errorMap: () => ({ message: 'Geçersiz dosya tipi' }),
  }),
  fileName: z.string().optional(),
  autoReconcile: z.boolean().default(false),
  duplicateHandling: z.enum(['skip', 'update', 'create'], {
    errorMap: () => ({ message: 'Geçersiz duplicate handling' }),
  }).default('skip'),
  metadata: z.record(z.any()).optional(),
});

export const reconciliationSchema = z.object({
  bankTransactionId: z.string().min(1, 'Banka işlem ID gereklidir'),
  systemTransactionId: z.string().min(1, 'Sistem işlem ID gereklidir'),
  matchType: z.enum(['exact', 'fuzzy', 'manual'], {
    errorMap: () => ({ message: 'Geçersiz eşleştirme tipi' }),
  }),
  matchScore: z.number().min(0).max(100).optional(),
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
  metadata: z.record(z.any()).optional(),
});

export const transferCashboxSchema = z.object({
  fromCashboxId: z.string().min(1, 'Kaynak kasa ID gereklidir'),
  toCashboxId: z.string().min(1, 'Hedef kasa ID gereklidir'),
  amount: z.number().positive('Tutar pozitif olmalı'),
  currency: z.string().length(3, 'Para birimi 3 karakter olmalı').default('TRY'),
  description: z.string().max(1000, 'Açıklama çok uzun').optional(),
  reference: z.string().max(255, 'Referans çok uzun').optional(),
  metadata: z.record(z.any()).optional(),
}).refine(data => data.fromCashboxId !== data.toCashboxId, {
  message: 'Kaynak ve hedef kasa aynı olamaz',
  path: ['toCashboxId'],
});

export const insertAgingReportSchema = z.object({
  reportType: z.enum(['ar', 'ap']),
  customerVendorId: z.string(),
  customerVendorName: z.string(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.date(),
  dueDate: z.date(),
  originalAmount: z.number(),
  currentAmount: z.number(),
  currency: z.string().default('TRY'),
  description: z.string().optional(),
  paymentTerms: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Cashbox = typeof cashboxes.$inferSelect;
export type InsertCashbox = z.infer<typeof insertCashboxSchema>;
export type UpdateCashbox = z.infer<typeof updateCashboxSchema>;

export type CashboxTransaction = typeof cashboxTransactions.$inferSelect;
export type InsertCashboxTransaction = z.infer<typeof insertCashboxTransactionSchema>;
export type TransferCashbox = z.infer<typeof transferCashboxSchema>;

export type CashboxAuditLog = typeof cashboxAuditLogs.$inferSelect;

export type BankIntegration = typeof bankIntegrations.$inferSelect;
export type InsertBankIntegration = z.infer<typeof insertBankIntegrationSchema>;
export type UpdateBankIntegration = z.infer<typeof updateBankIntegrationSchema>;

export type BankTransaction = typeof bankTransactions.$inferSelect;
export type ImportTransactions = z.infer<typeof importTransactionsSchema>;

export type ImportBatch = typeof importBatches.$inferSelect;
export type ReconciliationLog = typeof reconciliationLogs.$inferSelect;
export type Reconciliation = z.infer<typeof reconciliationSchema>;

export type AgingReport = typeof agingReports.$inferSelect;
export type InsertAgingReport = z.infer<typeof insertAgingReportSchema>;

export const users = pgTable('users', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  emailVerified: timestamp('email_verified'),
  resetToken: text('reset_token'),
  resetTokenExpires: timestamp('reset_token_expires'),
  role: varchar('role', { length: 20 }).default('personal_user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  lastLogin: timestamp('last_login'),
});

export const insertUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

// Admin route validation schemas
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'company_user', 'personal_user']),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusSchema>;

// Predefined transaction categories
export const predefinedTransactionCategories = {
  income: [
    { value: 'salary', label: 'Maaş' },
    { value: 'freelance', label: 'Serbest Çalışma' },
    { value: 'investment', label: 'Yatırım Geliri' },
    { value: 'rental', label: 'Kira Geliri' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'other_income', label: 'Diğer Gelirler' },
  ],
  expense: [
    { value: 'food', label: 'Yiyecek & İçecek' },
    { value: 'transportation', label: 'Ulaşım' },
    { value: 'utilities', label: 'Faturalar' },
    { value: 'rent', label: 'Kira' },
    { value: 'shopping', label: 'Alışveriş' },
    { value: 'healthcare', label: 'Sağlık' },
    { value: 'entertainment', label: 'Eğlence' },
    { value: 'education', label: 'Eğitim' },
    { value: 'insurance', label: 'Sigorta' },
    { value: 'savings', label: 'Tasarruf' },
    { value: 'other_expense', label: 'Diğer Giderler' },
  ],
};

export const getAllCategories = () => [
  ...transactionCategories.income,
  ...transactionCategories.expense,
];

export const getCategoryLabel = (categoryValue: string | null | undefined): string => {
  if (!categoryValue) {
    return 'Kategori Yok';
  }
  const allCategories = getAllCategories();
  const category = allCategories.find(cat => cat.value === categoryValue);
  return category?.label || categoryValue;
};

// RBAC System
export const UserRole = {
  ADMIN: 'admin',
  COMPANY_USER: 'company_user',
  PERSONAL_USER: 'personal_user',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

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
} as const;

export type PermissionType = typeof Permission[keyof typeof Permission];

// Role-Permission Mapping
export const rolePermissions: Record<UserRoleType, PermissionType[]> = {
  [UserRole.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.MANAGE_ALL_ACCOUNTS,
    Permission.VIEW_ALL_ACCOUNTS,
    Permission.MANAGE_ALL_TRANSACTIONS,
    Permission.VIEW_ALL_TRANSACTIONS,
    Permission.VIEW_ALL_REPORTS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_CREDIT,
    Permission.VIEW_CREDIT,
  ],
  [UserRole.COMPANY_USER]: [
    Permission.MANAGE_COMPANY_ACCOUNTS,
    Permission.VIEW_COMPANY_ACCOUNTS,
    Permission.VIEW_PERSONAL_ACCOUNTS,
    Permission.MANAGE_COMPANY_TRANSACTIONS,
    Permission.VIEW_COMPANY_TRANSACTIONS,
    Permission.VIEW_PERSONAL_TRANSACTIONS,
    Permission.VIEW_COMPANY_REPORTS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_CREDIT,
    Permission.VIEW_CREDIT,
  ],
  [UserRole.PERSONAL_USER]: [
    Permission.MANAGE_PERSONAL_ACCOUNTS,
    Permission.VIEW_PERSONAL_ACCOUNTS,
    Permission.MANAGE_PERSONAL_TRANSACTIONS,
    Permission.VIEW_PERSONAL_TRANSACTIONS,
    Permission.VIEW_PERSONAL_REPORTS,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_CREDIT,
  ],
};

// Helper functions for RBAC
export const hasPermission = (userRole: UserRoleType, permission: PermissionType): boolean => {
  return rolePermissions[userRole]?.includes(permission) || false;
};

export const hasAnyPermission = (userRole: UserRoleType, permissions: PermissionType[]): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

export const canAccessAccountType = (userRole: UserRoleType, accountType: 'personal' | 'company'): boolean => {
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  if (userRole === UserRole.COMPANY_USER) {
    return true;
  } // Can access both
  if (userRole === UserRole.PERSONAL_USER) {
    return accountType === 'personal';
  }
  return false;
};

export const canManageAccountType = (userRole: UserRoleType, accountType: 'personal' | 'company'): boolean => {
  if (userRole === UserRole.ADMIN) {
    return true;
  }
  if (userRole === UserRole.COMPANY_USER && accountType === 'company') {
    return true;
  }
  if (userRole === UserRole.PERSONAL_USER && accountType === 'personal') {
    return true;
  }
  return false;
};

// =====================
// ADVANCED SECURITY & USER MANAGEMENT
// =====================

// Enhanced User Roles
export const UserRoleV2 = {
  ADMIN: 'admin',
  FINANCE: 'finance', 
  VIEWER: 'viewer',
  AUDITOR: 'auditor',
} as const;

export type UserRoleV2Type = typeof UserRoleV2[keyof typeof UserRoleV2];

// Granular Permissions
export const PermissionV2 = {
  // Dashboard Access
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_DASHBOARD: 'manage_dashboard',
  
  // Cashbox Management
  VIEW_CASHBOXES: 'view_cashboxes',
  MANAGE_CASHBOXES: 'manage_cashboxes',
  TRANSFER_CASHBOX: 'transfer_cashbox',
  
  // Bank Integration
  VIEW_BANK_INTEGRATIONS: 'view_bank_integrations',
  MANAGE_BANK_INTEGRATIONS: 'manage_bank_integrations',
  IMPORT_BANK_DATA: 'import_bank_data',
  RECONCILE_TRANSACTIONS: 'reconcile_transactions',
  
  // Reports & Analytics
  VIEW_REPORTS: 'view_reports',
  EXPORT_REPORTS: 'export_reports',
  VIEW_ANALYTICS: 'view_analytics',
  
  // User Management
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  ASSIGN_ROLES: 'assign_roles',
  
  // System Administration
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_SYSTEM_STATUS: 'view_system_status',
} as const;

export type PermissionV2Type = typeof PermissionV2[keyof typeof PermissionV2];

// Enhanced Role-Permission Mapping
export const rolePermissionsV2: Record<UserRoleV2Type, PermissionV2Type[]> = {
  [UserRoleV2.ADMIN]: [
    PermissionV2.VIEW_DASHBOARD,
    PermissionV2.MANAGE_DASHBOARD,
    PermissionV2.VIEW_CASHBOXES,
    PermissionV2.MANAGE_CASHBOXES,
    PermissionV2.TRANSFER_CASHBOX,
    PermissionV2.VIEW_BANK_INTEGRATIONS,
    PermissionV2.MANAGE_BANK_INTEGRATIONS,
    PermissionV2.IMPORT_BANK_DATA,
    PermissionV2.RECONCILE_TRANSACTIONS,
    PermissionV2.VIEW_REPORTS,
    PermissionV2.EXPORT_REPORTS,
    PermissionV2.VIEW_ANALYTICS,
    PermissionV2.VIEW_USERS,
    PermissionV2.MANAGE_USERS,
    PermissionV2.ASSIGN_ROLES,
    PermissionV2.VIEW_AUDIT_LOGS,
    PermissionV2.MANAGE_SETTINGS,
    PermissionV2.VIEW_SYSTEM_STATUS,
  ],
  [UserRoleV2.FINANCE]: [
    PermissionV2.VIEW_DASHBOARD,
    PermissionV2.VIEW_CASHBOXES,
    PermissionV2.MANAGE_CASHBOXES,
    PermissionV2.TRANSFER_CASHBOX,
    PermissionV2.VIEW_BANK_INTEGRATIONS,
    PermissionV2.MANAGE_BANK_INTEGRATIONS,
    PermissionV2.IMPORT_BANK_DATA,
    PermissionV2.RECONCILE_TRANSACTIONS,
    PermissionV2.VIEW_REPORTS,
    PermissionV2.EXPORT_REPORTS,
    PermissionV2.VIEW_ANALYTICS,
  ],
  [UserRoleV2.VIEWER]: [
    PermissionV2.VIEW_DASHBOARD,
    PermissionV2.VIEW_CASHBOXES,
    PermissionV2.VIEW_BANK_INTEGRATIONS,
    PermissionV2.VIEW_REPORTS,
    PermissionV2.EXPORT_REPORTS,
    PermissionV2.VIEW_ANALYTICS,
  ],
  [UserRoleV2.AUDITOR]: [
    PermissionV2.VIEW_DASHBOARD,
    PermissionV2.VIEW_CASHBOXES,
    PermissionV2.VIEW_BANK_INTEGRATIONS,
    PermissionV2.VIEW_REPORTS,
    PermissionV2.EXPORT_REPORTS,
    PermissionV2.VIEW_ANALYTICS,
    PermissionV2.VIEW_AUDIT_LOGS,
    PermissionV2.VIEW_USERS,
  ],
};

// Enhanced Permission Helper Functions
export const hasPermissionV2 = (userRole: UserRoleV2Type, permission: PermissionV2Type): boolean => {
  return rolePermissionsV2[userRole]?.includes(permission) || false;
};

export const hasAnyPermissionV2 = (userRole: UserRoleV2Type, permissions: PermissionV2Type[]): boolean => {
  return permissions.some(permission => hasPermissionV2(userRole, permission));
};

// User Activity Logging Tables
export const userActivityLogs = pgTable('user_activity_logs', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(), // 'login', 'logout', 'api_call', 'cashbox_transfer', etc.
  resource: varchar('resource', { length: 100 }), // 'cashbox', 'bank_account', 'report', etc.
  resourceId: varchar('resource_id'), // ID of the affected resource
  endpoint: varchar('endpoint', { length: 255 }), // API endpoint called
  method: varchar('method', { length: 10 }), // HTTP method
  statusCode: integer('status_code'), // HTTP status code
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'), // Browser/client info
  metadata: jsonb('metadata'), // Additional context data
  timestamp: timestamp('timestamp').default(sql`NOW()`).notNull(),
});

// Two-Factor Authentication Tables
export const userTwoFactorAuth = pgTable('user_two_factor_auth', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().unique(),
  secret: varchar('secret', { length: 32 }).notNull(), // TOTP secret
  isEnabled: boolean('is_enabled').default(false).notNull(),
  backupCodes: varchar('backup_codes', { length: 255 }).array(), // Encrypted backup codes
  phoneNumber: varchar('phone_number', { length: 20 }), // For SMS 2FA
  smsEnabled: boolean('sms_enabled').default(false).notNull(),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
});

// Enhanced User Profiles
export const userProfiles = pgTable('user_profiles', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().unique(),
  role: varchar('role', { length: 20 }).default('viewer').notNull(), // ADMIN, FINANCE, VIEWER, AUDITOR
  permissions: text('permissions').array(), // Custom permissions override
  lastLogin: timestamp('last_login'),
  passwordChangedAt: timestamp('password_changed_at').default(sql`NOW()`).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'), // Account lockout
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  sessionTimeout: integer('session_timeout').default(3600).notNull(), // seconds
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

// =====================
// LEGACY MULTI-USER SYSTEM SCHEMA
// =====================

export const teams = pgTable('teams', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: varchar('owner_id').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  updatedAt: timestamp('updated_at').default(sql`NOW()`).notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar('team_id').notNull(),
  userId: varchar('user_id').notNull(),
  teamRole: varchar('team_role', { length: 20 }).default('member').notNull(), // 'owner', 'admin', 'member', 'viewer'
  permissions: text('permissions').array(), // Custom permissions for team member
  joinedAt: timestamp('joined_at').default(sql`NOW()`).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const invites = pgTable('invites', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar('team_id').notNull(),
  inviterUserId: varchar('inviter_user_id').notNull(),
  invitedEmail: text('invited_email').notNull(),
  invitedUserId: varchar('invited_user_id'), // null until user accepts
  teamRole: varchar('team_role', { length: 20 }).default('member').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'accepted', 'declined', 'expired'
  inviteToken: text('invite_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').default(sql`NOW()`).notNull(),
  acceptedAt: timestamp('accepted_at'),
});

// Team Role Types
export const TeamRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type TeamRoleType = typeof TeamRole[keyof typeof TeamRole];

// Team Permission System
export const TeamPermission = {
  // Team Management
  MANAGE_TEAM: 'manage_team',
  INVITE_MEMBERS: 'invite_members',
  REMOVE_MEMBERS: 'remove_members',
  MANAGE_ROLES: 'manage_roles',

  // Data Access
  VIEW_ALL_DATA: 'view_all_data',
  MANAGE_ALL_DATA: 'manage_all_data',

  // Financial Operations
  CREATE_ACCOUNTS: 'create_accounts',
  MANAGE_TRANSACTIONS: 'manage_transactions',
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
} as const;

export type TeamPermissionType = typeof TeamPermission[keyof typeof TeamPermission];

// Team Role-Permission Mapping
export const teamRolePermissions: Record<TeamRoleType, TeamPermissionType[]> = {
  [TeamRole.OWNER]: [
    TeamPermission.MANAGE_TEAM,
    TeamPermission.INVITE_MEMBERS,
    TeamPermission.REMOVE_MEMBERS,
    TeamPermission.MANAGE_ROLES,
    TeamPermission.VIEW_ALL_DATA,
    TeamPermission.MANAGE_ALL_DATA,
    TeamPermission.CREATE_ACCOUNTS,
    TeamPermission.MANAGE_TRANSACTIONS,
    TeamPermission.VIEW_REPORTS,
    TeamPermission.EXPORT_DATA,
  ],
  [TeamRole.ADMIN]: [
    TeamPermission.INVITE_MEMBERS,
    TeamPermission.REMOVE_MEMBERS,
    TeamPermission.VIEW_ALL_DATA,
    TeamPermission.MANAGE_ALL_DATA,
    TeamPermission.CREATE_ACCOUNTS,
    TeamPermission.MANAGE_TRANSACTIONS,
    TeamPermission.VIEW_REPORTS,
    TeamPermission.EXPORT_DATA,
  ],
  [TeamRole.MEMBER]: [
    TeamPermission.VIEW_ALL_DATA,
    TeamPermission.MANAGE_TRANSACTIONS,
    TeamPermission.VIEW_REPORTS,
  ],
  [TeamRole.VIEWER]: [
    TeamPermission.VIEW_ALL_DATA,
    TeamPermission.VIEW_REPORTS,
  ],
};

// Schema Types and Validation
export const insertTeamSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  ownerId: z.string(),
});

export const updateTeamSchema = insertTeamSchema.pick({
  name: true,
  description: true,
}).partial();

export const insertTeamMemberSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().default(true),
  teamId: z.string(),
  teamRole: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const insertInviteSchema = z.object({
  status: z.string().optional(),
  teamId: z.string(),
  teamRole: z.string().optional(),
  inviterUserId: z.string(),
  invitedEmail: z.string(),
  invitedUserId: z.string().optional(),
  inviteToken: z.string(),
  expiresAt: z.date(),
});

export const inviteUserSchema = z.object({
  teamId: z.string(),
  email: z.string().email('Geçerli bir email adresi giriniz'),
  teamRole: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
});

export const acceptInviteSchema = z.object({
  token: z.string(),
  userId: z.string().optional(),
});

// =====================
// SECURITY SCHEMAS & VALIDATION
// =====================

// User Activity Log Schemas
export const insertUserActivityLogSchema = z.object({
  userId: z.string(),
  action: z.string().max(100),
  resource: z.string().max(100).optional(),
  resourceId: z.string().optional(),
  endpoint: z.string().max(255).optional(),
  method: z.string().max(10).optional(),
  statusCode: z.number().int().optional(),
  ipAddress: z.string().max(45).optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const logUserActivitySchema = z.object({
  action: z.string().max(100),
  resource: z.string().max(100).optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Two-Factor Authentication Schemas
export const setupTwoFactorAuthSchema = z.object({
  phoneNumber: z.string().max(20).optional(),
  enableSMS: z.boolean().default(false),
});

export const verifyTwoFactorAuthSchema = z.object({
  token: z.string().length(6),
  backupCode: z.string().optional(),
});

export const enableTwoFactorAuthSchema = z.object({
  secret: z.string().length(32),
  token: z.string().length(6),
});

export const disableTwoFactorAuthSchema = z.object({
  password: z.string().min(8),
  backupCode: z.string().optional(),
});

// Password Reset Schemas
export const requestPasswordResetSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
});

export const resetPasswordV2Schema = z.object({
  token: z.string().min(1, 'Reset token gerekli'),
  newPassword: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/[a-z]/, 'En az bir küçük harf içermeli')
    .regex(/[0-9]/, 'En az bir rakam içermeli')
    .regex(/[^A-Za-z0-9]/, 'En az bir özel karakter içermeli'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

// User Profile Schemas
export const updateUserProfileSchema = z.object({
  role: z.enum(['admin', 'finance', 'viewer', 'auditor']).optional(),
  permissions: z.array(z.string()).optional(),
  sessionTimeout: z.number().int().min(300).max(86400).optional(), // 5 min to 24 hours
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
  newPassword: z.string()
    .min(8, 'Şifre en az 8 karakter olmalı')
    .regex(/[A-Z]/, 'En az bir büyük harf içermeli')
    .regex(/[a-z]/, 'En az bir küçük harf içermeli')
    .regex(/[0-9]/, 'En az bir rakam içermeli')
    .regex(/[^A-Za-z0-9]/, 'En az bir özel karakter içermeli'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

// Permission Check Schema
export const checkPermissionSchema = z.object({
  permission: z.string(),
  resource: z.string().optional(),
  resourceId: z.string().optional(),
});

// =====================
// LEGACY SCHEMA TYPES
// =====================

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;

// =====================
// SECURITY SCHEMA TYPES
// =====================

export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLogs.$inferSelect;
export type LogUserActivity = z.infer<typeof logUserActivitySchema>;

export const insertUserTwoFactorAuthSchema = z.object({
  userId: z.string(),
  secret: z.string(),
  backupCodes: z.array(z.string()).optional(),
  isEnabled: z.boolean().default(false),
  smsEnabled: z.boolean().default(false),
  smsPhoneNumber: z.string().optional(),
  lastUsedAt: z.date().optional(),
});

export const updateUserTwoFactorAuthSchema = insertUserTwoFactorAuthSchema.partial();

export type InsertUserTwoFactorAuth = typeof userTwoFactorAuth.$inferInsert;
export type UpdateUserTwoFactorAuth = typeof userTwoFactorAuth.$inferInsert;
export type UserTwoFactorAuth = typeof userTwoFactorAuth.$inferSelect;
export type SetupTwoFactorAuth = z.infer<typeof setupTwoFactorAuthSchema>;
export type VerifyTwoFactorAuth = z.infer<typeof verifyTwoFactorAuthSchema>;
export type EnableTwoFactorAuth = z.infer<typeof enableTwoFactorAuthSchema>;
export type DisableTwoFactorAuth = z.infer<typeof disableTwoFactorAuthSchema>;

export const insertPasswordResetTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  used: z.boolean().default(false),
});

export const updatePasswordResetTokenSchema = insertPasswordResetTokenSchema.partial();

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type UpdatePasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordV2Schema>;

export type InsertUserProfile = typeof userProfiles.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type CheckPermission = z.infer<typeof checkPermissionSchema>;
export type InviteUserRequest = z.infer<typeof inviteUserSchema>;
export type AcceptInviteRequest = z.infer<typeof acceptInviteSchema>;

// Helper Functions for Team Management
export const hasTeamPermission = (teamRole: TeamRoleType, permission: TeamPermissionType): boolean => {
  return teamRolePermissions[teamRole]?.includes(permission) || false;
};

export const canManageTeamMember = (currentRole: TeamRoleType, targetRole: TeamRoleType): boolean => {
  // Owner can manage everyone, Admin can manage Member/Viewer
  if (currentRole === TeamRole.OWNER) {
    return true;
  }
  if (currentRole === TeamRole.ADMIN && (targetRole === TeamRole.MEMBER || targetRole === TeamRole.VIEWER)) {
    return true;
  }
  return false;
};

// =====================
// TRANSACTION JSON API SCHEMAS
// =====================

// Schema for importing transactions from JSON
export const importTransactionJsonSchema = z.object({
  overwriteExisting: z.boolean().default(false),
});

// Schema for exporting transactions by date range
export const exportTransactionsByDateSchema = z.object({
  startDate: z.string().min(1, 'Başlangıç tarihi gereklidir'),
  endDate: z.string().min(1, 'Bitiş tarihi gereklidir'),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}, {
  message: 'Geçerli tarih aralığı giriniz (başlangıç ≤ bitiş)',
});

// Schema for transaction JSON file structure
export const transactionJsonFileSchema = z.object({
  exportDate: z.string(),
  totalTransactions: z.number().nonnegative(),
  transactions: z.array(z.object({
    id: z.string().min(1),
    accountId: z.string().min(1),
    type: z.enum(['income', 'expense', 'transfer_in', 'transfer_out']),
    amount: z.string().min(1),
    description: z.string().min(1),
    category: z.string().nullable(),
    virmanPairId: z.string().nullable(),
    date: z.union([z.string(), z.date()]),
    accountInfo: z.object({
      bankName: z.string(),
      accountName: z.string(),
      type: z.enum(['personal', 'company']),
    }).nullable().optional(),
  })),
  summary: z.object({
    totalIncome: z.number().nonnegative(),
    totalExpenses: z.number().nonnegative(),
    totalTransfers: z.number().nonnegative(),
  }).optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

export type ImportTransactionJson = z.infer<typeof importTransactionJsonSchema>;
export type ExportTransactionsByDate = z.infer<typeof exportTransactionsByDateSchema>;
export type TransactionJsonFile = z.infer<typeof transactionJsonFileSchema>;

// =====================
// AI SETTINGS SCHEMAS
// =====================

export const insertAISettingsSchema = z.object({
  fxDelta: z.number(),
  rateDelta: z.number(),
  inflationDelta: z.number(),
  horizonMonths: z.number(),
});

export const insertTenantSchema = z.object({
  projections: z.array(z.object({
    month: z.number(),
    cash: z.number(),
    debt: z.number(),
    netWorth: z.number(),
  })),
  summary: z.string(),
  cashDeficitMonth: z.number().optional(),
});

export type AISettings = typeof aiSettings.$inferSelect;
export type InsertAISettings = typeof aiSettings.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// =====================
// SIMULATION SCHEMAS
// =====================

export const simulationRuns = pgTable('simulation_runs', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  parameters: jsonb('parameters').$type<{
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    horizonMonths: number;
  }>().notNull(),
  results: jsonb('results').$type<{
    projections: Array<{
      month: number;
      cash: number;
      debt: number;
      netWorth: number;
    }>;
    summary: string;
    cashDeficitMonth?: number;
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertSimulationRunSchema = z.object({
  userId: z.string(),
  parameters: z.object({
    fxDelta: z.number(),
    rateDelta: z.number(),
    inflationDelta: z.number(),
    horizonMonths: z.number(),
  }),
  results: z.object({
    projections: z.array(z.object({
      month: z.number(),
      cash: z.number(),
      debt: z.number(),
      netWorth: z.number(),
    })),
    summary: z.string(),
    cashDeficitMonth: z.number().optional(),
  }),
});

export type SimulationRun = typeof simulationRuns.$inferSelect;
export type InsertSimulationRun = typeof simulationRuns.$inferInsert;

// JWT Token Management Tables
export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedBy: varchar('revoked_by', { length: 255 }), // User ID who revoked it
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4/IPv6
  userAgent: text('user_agent'),
  familyId: varchar('family_id', { length: 255 }), // For token family rotation
});

export const revokedTokens = pgTable('revoked_tokens', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id', { length: 255 }).notNull(),
  token: varchar('token', { length: 500 }).notNull(),
  tokenType: varchar('token_type', { length: 20 }).notNull(), // 'access' or 'refresh'
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at').defaultNow().notNull(),
  revokedBy: varchar('revoked_by', { length: 255 }), // User ID who revoked it
  reason: varchar('reason', { length: 100 }), // 'logout', 'security', 'expired', 'rotation'
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
});

// JWT Token Schemas
export const insertRefreshTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date().optional(),
});
export const updateRefreshTokenSchema = insertRefreshTokenSchema.partial();

export const insertRevokedTokenSchema = z.object({
  jti: z.string(),
  userId: z.string(),
  reason: z.string(),
  revokedAt: z.date(),
});
export const updateRevokedTokenSchema = insertRevokedTokenSchema.partial();

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
export type UpdateRefreshToken = typeof refreshTokens.$inferInsert;

export type RevokedToken = typeof revokedTokens.$inferSelect;
export type InsertRevokedToken = typeof revokedTokens.$inferInsert;
export type UpdateRevokedToken = typeof revokedTokens.$inferInsert;

// Audit Log Table for tracking all changes
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  recordId: varchar('record_id', { length: 255 }).notNull(),
  operation: varchar('operation', { length: 20 }).notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  userId: varchar('user_id', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  userRole: varchar('user_role', { length: 50 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  changedFields: jsonb('changed_fields'),
  reason: text('reason'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  sessionId: varchar('session_id', { length: 255 }),
  requestId: varchar('request_id', { length: 255 }),
  metadata: jsonb('metadata'),
});

// Audit Log Schemas
export const insertAuditLogSchema = z.object({
  tableName: z.string(),
  recordId: z.string(),
  userId: z.string().optional(),
  operation: z.string(),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  timestamp: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});
export const updateAuditLogSchema = insertAuditLogSchema.partial();

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type UpdateAuditLog = typeof auditLogs.$inferInsert;

// Category Table for transaction categorization
export const categories = pgTable('categories', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#3B82F6'), // Hex color
  icon: varchar('icon', { length: 50 }),
  parentId: varchar('parent_id', { length: 255 }),
  userId: varchar('user_id', { length: 255 }),
  isSystem: boolean('is_system').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'),
});

// Tag Table for flexible tagging system
export const tags = pgTable('tags', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#10B981'), // Hex color
  userId: varchar('user_id', { length: 255 }),
  isSystem: boolean('is_system').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  metadata: jsonb('metadata'),
});

// Transaction-Category relationship table
export const transactionCategories = pgTable('transaction_categories', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar('transaction_id', { length: 255 }).notNull(),
  categoryId: varchar('category_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Transaction-Tag relationship table
export const transactionTags = pgTable('transaction_tags', {
  id: varchar('id', { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar('transaction_id', { length: 255 }).notNull(),
  tagId: varchar('tag_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Category Schemas
export const insertCategorySchema = z.object({
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional(),
});
export const updateCategorySchema = insertCategorySchema.partial();
export const deleteCategorySchema = z.object({
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
});

// Tag Schemas
export const insertTagSchema = z.object({
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional(),
});
export const updateTagSchema = insertTagSchema.partial();
export const deleteTagSchema = z.object({
  reason: z.string().max(500, 'Sebep çok uzun').optional(),
});

// Transaction-Category Schemas
export const insertTransactionCategorySchema = z.object({
  transactionId: z.string(),
  categoryId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const updateTransactionCategorySchema = insertTransactionCategorySchema.partial();

// Transaction-Tag Schemas
export const insertTransactionTagSchema = z.object({
  transactionId: z.string(),
  tagId: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const updateTransactionTagSchema = insertTransactionTagSchema.partial();

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type UpdateCategory = typeof categories.$inferInsert;
export type DeleteCategory = z.infer<typeof deleteCategorySchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type UpdateTag = typeof tags.$inferInsert;
export type DeleteTag = z.infer<typeof deleteTagSchema>;

export type TransactionCategory = typeof transactionCategories.$inferSelect;
export type InsertTransactionCategory = typeof transactionCategories.$inferInsert;
export type UpdateTransactionCategory = typeof transactionCategories.$inferInsert;

export type TransactionTag = typeof transactionTags.$inferSelect;
export type InsertTransactionTag = typeof transactionTags.$inferInsert;
export type UpdateTransactionTag = typeof transactionTags.$inferInsert;

// Database Indexes for Performance Optimization
// Note: Indexes are defined in migration files for better performance

