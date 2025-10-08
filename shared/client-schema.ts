// Client-safe exports from schema.ts (without drizzle-orm dependencies)

// Predefined transaction categories
export const predefinedTransactionCategories = {
  income: [
    { value: 'salary', label: 'Maaş' },
    { value: 'freelance', label: 'Serbest Çalışma' },
    { value: 'investment', label: 'Yatırım Geliri' },
    { value: 'rent_income', label: 'Kira Geliri' },
    { value: 'business', label: 'İş Geliri' },
    { value: 'other_income', label: 'Diğer Gelirler' },
  ],
  expense: [
    { value: 'rent', label: 'Kira' },
    { value: 'utilities', label: 'Faturalar' },
    { value: 'groceries', label: 'Market' },
    { value: 'transport', label: 'Ulaşım' },
    { value: 'entertainment', label: 'Eğlence' },
    { value: 'healthcare', label: 'Sağlık' },
    { value: 'education', label: 'Eğitim' },
    { value: 'shopping', label: 'Alışveriş' },
    { value: 'dining', label: 'Yemek' },
    { value: 'insurance', label: 'Sigorta' },
    { value: 'tax', label: 'Vergi' },
    { value: 'loan_payment', label: 'Kredi Ödemesi' },
    { value: 'subscription', label: 'Abonelik' },
    { value: 'savings', label: 'Tasarruf' },
    { value: 'other_expense', label: 'Diğer Giderler' },
  ],
};

export const getAllCategories = () => [
  ...predefinedTransactionCategories.income,
  ...predefinedTransactionCategories.expense,
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
  VIEW_ALL_ACCOUNTS: 'view_all_accounts',
  MANAGE_COMPANY_ACCOUNTS: 'manage_company_accounts',
  VIEW_COMPANY_ACCOUNTS: 'view_company_accounts',
  MANAGE_PERSONAL_ACCOUNTS: 'manage_personal_accounts',
  VIEW_PERSONAL_ACCOUNTS: 'view_personal_accounts',
  
  // Transaction Management
  MANAGE_ALL_TRANSACTIONS: 'manage_all_transactions',
  VIEW_ALL_TRANSACTIONS: 'view_all_transactions',
  MANAGE_COMPANY_TRANSACTIONS: 'manage_company_transactions',
  VIEW_COMPANY_TRANSACTIONS: 'view_company_transactions',
  MANAGE_PERSONAL_TRANSACTIONS: 'manage_personal_transactions',
  VIEW_PERSONAL_TRANSACTIONS: 'view_personal_transactions',
  
  // Budget Management
  MANAGE_ALL_BUDGETS: 'manage_all_budgets',
  VIEW_ALL_BUDGETS: 'view_all_budgets',
  MANAGE_COMPANY_BUDGETS: 'manage_company_budgets',
  VIEW_COMPANY_BUDGETS: 'view_company_budgets',
  MANAGE_PERSONAL_BUDGETS: 'manage_personal_budgets',
  VIEW_PERSONAL_BUDGETS: 'view_personal_budgets',
  
  // Credit Card Management
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
    Permission.MANAGE_ALL_BUDGETS,
    Permission.VIEW_ALL_BUDGETS,
    Permission.MANAGE_CREDIT,
    Permission.VIEW_CREDIT,
  ],
  [UserRole.COMPANY_USER]: [
    Permission.VIEW_USERS,
    Permission.MANAGE_COMPANY_ACCOUNTS,
    Permission.VIEW_COMPANY_ACCOUNTS,
    Permission.VIEW_PERSONAL_ACCOUNTS,
    Permission.MANAGE_COMPANY_TRANSACTIONS,
    Permission.VIEW_COMPANY_TRANSACTIONS,
    Permission.VIEW_PERSONAL_TRANSACTIONS,
    Permission.MANAGE_COMPANY_BUDGETS,
    Permission.VIEW_COMPANY_BUDGETS,
    Permission.VIEW_PERSONAL_BUDGETS,
    Permission.MANAGE_CREDIT,
    Permission.VIEW_CREDIT,
  ],
  [UserRole.PERSONAL_USER]: [
    Permission.MANAGE_PERSONAL_ACCOUNTS,
    Permission.VIEW_PERSONAL_ACCOUNTS,
    Permission.MANAGE_PERSONAL_TRANSACTIONS,
    Permission.VIEW_PERSONAL_TRANSACTIONS,
    Permission.MANAGE_PERSONAL_BUDGETS,
    Permission.VIEW_PERSONAL_BUDGETS,
    Permission.MANAGE_CREDIT,
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
  }
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
