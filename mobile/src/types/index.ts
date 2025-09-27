export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'company' | 'personal';
}

export interface Account {
  id: string;
  type: 'company' | 'personal';
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  subAccounts?: string; // JSON string
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface SubAccount {
  type: 'creditCard' | 'loan' | 'kmh' | 'deposit';
  limit?: number;
  used?: number;
  cutOffDate?: number;
  paymentDueDate?: number;
  minimumPayment?: number;
  interestRate?: number;
  principalRemaining?: number;
  monthlyPayment?: number;
  balance?: number;
}

export interface DashboardData {
  totalBalance: number;
  companyBalance: number;
  personalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  recentTransactions: Transaction[];
}

export interface AIResponse {
  response: string;
  persona?: string;
}

export interface Tenant {
  id: string;
  name: string;
  logo?: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  domain?: string;
  isActive: boolean;
}
