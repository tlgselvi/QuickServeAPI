import { sql } from 'drizzle-orm';
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
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

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});

export const insertBankProductSchema = createInsertSchema(bankProducts).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  date: true,
});

export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
  dismissedAt: true,
});

export const insertFixedExpenseSchema = createInsertSchema(fixedExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastProcessed: true,
  nextDueDate: true,
});

export const insertCreditSchema = createInsertSchema(credits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastPaymentDate: true,
  lastPaymentAmount: true,
});

export const insertForecastSchema = createInsertSchema(forecasts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  accuracy: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUpdated: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;
export type InsertFixedExpense = z.infer<typeof insertFixedExpenseSchema>;
export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type InsertCredit = z.infer<typeof insertCreditSchema>;
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

export const insertBudgetLineSchema = createInsertSchema(budgetLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
});

export type BudgetLine = typeof budgetLines.$inferSelect;
export type InsertBudgetLine = z.infer<typeof insertBudgetLineSchema>;
export type Loan = typeof loans.$inferSelect;
export type InsertLoan = z.infer<typeof insertLoanSchema>;

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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
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
export const transactionCategories = {
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
// MULTI-USER SYSTEM SCHEMA
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
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTeamSchema = insertTeamSchema.pick({
  name: true,
  description: true,
}).partial();

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertInviteSchema = createInsertSchema(invites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
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

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invites.$inferSelect;
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

export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({
  id: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
});

export type AISettings = typeof aiSettings.$inferSelect;
export type InsertAISettings = typeof aiSettings.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// =====================
// SIMULATION SCHEMAS
// =====================

export const simulationRuns = pgTable('simulation_runs', {
  id: varchar('id', { length: 255 }).primaryKey().default(crypto.randomUUID()),
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

export const insertSimulationRunSchema = createInsertSchema(simulationRuns, {
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
}).omit({
  id: true,
  createdAt: true,
});

export type SimulationRun = typeof simulationRuns.$inferSelect;
export type InsertSimulationRun = typeof simulationRuns.$inferInsert;

