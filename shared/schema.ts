import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // 'personal' or 'company'
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  balance: decimal("balance", { precision: 19, scale: 4 }).default("0").notNull(),
  currency: varchar("currency", { length: 3 }).default("TRY").notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'income', 'expense', 'transfer_in', 'transfer_out'
  amount: decimal("amount", { precision: 19, scale: 4 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }),
  virmanPairId: varchar("virman_pair_id"), // for linking transfer transactions
  date: timestamp("date").default(sql`NOW()`).notNull(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  date: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: timestamp("email_verified"),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
  role: varchar("role", { length: 20 }).default("personal_user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email("Geçerli bir email adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir email adresi giriniz"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

// Admin route validation schemas
export const updateUserRoleSchema = z.object({
  role: z.enum(["admin", "company_user", "personal_user"]),
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
    { value: 'other_income', label: 'Diğer Gelirler' }
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
    { value: 'other_expense', label: 'Diğer Giderler' }
  ]
};

export const getAllCategories = () => [
  ...transactionCategories.income,
  ...transactionCategories.expense
];

export const getCategoryLabel = (categoryValue: string | null | undefined): string => {
  if (!categoryValue) return 'Kategori Yok';
  const allCategories = getAllCategories();
  const category = allCategories.find(cat => cat.value === categoryValue);
  return category?.label || categoryValue;
};

// RBAC System
export const UserRole = {
  ADMIN: 'admin',
  COMPANY_USER: 'company_user', 
  PERSONAL_USER: 'personal_user'
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
  if (userRole === UserRole.ADMIN) return true;
  if (userRole === UserRole.COMPANY_USER) return true; // Can access both
  if (userRole === UserRole.PERSONAL_USER) return accountType === 'personal';
  return false;
};

export const canManageAccountType = (userRole: UserRoleType, accountType: 'personal' | 'company'): boolean => {
  if (userRole === UserRole.ADMIN) return true;
  if (userRole === UserRole.COMPANY_USER && accountType === 'company') return true;
  if (userRole === UserRole.PERSONAL_USER && accountType === 'personal') return true;
  return false;
};

// =====================
// MULTI-USER SYSTEM SCHEMA
// =====================

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`NOW()`).notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  userId: varchar("user_id").notNull(),
  teamRole: varchar("team_role", { length: 20 }).default("member").notNull(), // 'owner', 'admin', 'member', 'viewer'
  permissions: text("permissions").array(), // Custom permissions for team member
  joinedAt: timestamp("joined_at").default(sql`NOW()`).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const invites = pgTable("invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  inviterUserId: varchar("inviter_user_id").notNull(),
  invitedEmail: text("invited_email").notNull(),
  invitedUserId: varchar("invited_user_id"), // null until user accepts
  teamRole: varchar("team_role", { length: 20 }).default("member").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'accepted', 'declined', 'expired'
  inviteToken: text("invite_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`).notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// Team Role Types
export const TeamRole = {
  OWNER: 'owner',
  ADMIN: 'admin', 
  MEMBER: 'member',
  VIEWER: 'viewer'
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
  email: z.string().email("Geçerli bir email adresi giriniz"),
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
  if (currentRole === TeamRole.OWNER) return true;
  if (currentRole === TeamRole.ADMIN && (targetRole === TeamRole.MEMBER || targetRole === TeamRole.VIEWER)) return true;
  return false;
};
