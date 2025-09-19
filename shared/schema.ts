import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp } from "drizzle-orm/pg-core";
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
  role: varchar("role", { length: 20 }).default("user").notNull(),
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
