// =====================
// SIMULATION TYPES
// =====================

export interface SimulationRunDTO {
  id: string;
  userId: string;
  parameters: {
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    horizonMonths: number;
  };
  results: {
    projections: Array<{
      month: number;
      cash: number;
      debt: number;
      netWorth: number;
    }>;
    summary: string;
    formattedSummary: string;
    cashDeficitMonth?: number;
    totalCashChange: number;
    totalDebtChange: number;
    totalNetWorthChange: number;
  };
  createdAt: string;
}

export interface SimulationParametersDTO {
  fxDelta: number;
  rateDelta: number;
  inflationDelta: number;
  horizonMonths: 3 | 6 | 12;
}

// =====================
// ADVISOR TYPES
// =====================

export interface AdvisorRecommendationDTO {
  id: string;
  category: 'allocation' | 'risk' | 'diversification' | 'timing' | 'cost';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

export interface PortfolioAnalysisDTO {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  tips: AdvisorRecommendationDTO[];
  currentAllocation: {
    cash: number;
    deposits: number;
    forex: number;
    stocks: number;
    bonds: number;
    crypto: number;
    commodities: number;
    realEstate: number;
  };
  targetAllocation: {
    cash: number;
    deposits: number;
    forex: number;
    stocks: number;
    bonds: number;
    crypto: number;
    commodities: number;
    realEstate: number;
  };
  recommendations: {
    rebalance: boolean;
    actionItems: string[];
    expectedReturn: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  chartData: {
    current: Array<{ name: string; value: number; color: string }>;
    target: Array<{ name: string; value: number; color: string }>;
  };
}

// =====================
// CONSOLIDATION TYPES
// =====================

export interface ConsolidationBreakdownDTO {
  breakdown: {
    company: {
      bank: number;
      cash: number;
      credit: number;
      investment: number;
    };
    personal: {
      bank: number;
      cash: number;
      credit: number;
      investment: number;
    };
  };
  table: Array<{
    category: string;
    type: string;
    amount: number;
    percentage: number;
  }>;
  summary: {
    totalCompany: number;
    totalPersonal: number;
    totalAmount: number;
    companyPercentage: number;
    personalPercentage: number;
  };
}

export interface ConsolidationChartDataDTO {
  category: string;
  company: number;
  personal: number;
  total: number;
}

// =====================
// RISK TYPES
// =====================

export interface RiskAnalysisDTO {
  best: {
    cash: number;
    score: number;
  };
  base: {
    cash: number;
    score: number;
  };
  worst: {
    cash: number;
    score: number;
  };
  factors: {
    fx: string;
    rate: string;
    inflation: string;
    liquidity: string;
  };
  parameters: {
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    liquidityGap: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// =====================
// EXPORT TYPES
// =====================

export interface ExportSummaryDTO {
  totalBalance: number;
  totalCash: number;
  totalDebt: number;
  totalIncome: number;
  totalExpense: number;
  period: string;
  netWorth: number;
  riskScore?: number;
}

export interface TransactionExportDTO {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
}

export interface AccountExportDTO {
  id: string;
  balance: number;
  bankName: string;
  accountName: string;
}

// =====================
// NOTIFICATION TYPES
// =====================

export interface FutureRiskAlertDTO {
  id: string;
  type: 'futureRisk' | 'liquidityRisk' | 'cashDeficit' | 'highRisk' | 'inflationRisk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  probability: number;
  timeHorizon: number;
  impact: number;
  recommendedAction?: string;
  source: 'simulation' | 'risk' | 'advisor';
  createdAt: string;
}

// =====================
// API RESPONSE TYPES
// =====================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// =====================
// CURRENCY TYPES
// =====================

export type SupportedCurrency = 'TRY' | 'USD' | 'EUR';
export type SupportedLocale = 'tr-TR' | 'en-US' | 'de-DE';

export interface CurrencySettings {
  currency: SupportedCurrency;
  locale: SupportedLocale;
  exchangeRates: Record<SupportedCurrency, number>;
}

// =====================
// COMPONENT PROP TYPES
// =====================

export interface KPIBarProps {
  totalCash: number;
  totalDebt: number;
  totalBalance: number;
  isLoading?: boolean;
}

export interface AccountCardProps {
  account: {
    id: string;
    name: string;
    balance: string;
    type: string;
    bankName?: string;
  };
}

export interface TransactionItemProps {
  transaction: {
    id: string;
    amount: string;
    description: string;
    category: string;
    date: string;
    type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  };
  accounts: Array<{
    id: string;
    name: string;
  }>;
}

export interface BreakdownTableProps {
  tableData?: Array<{
    category: string;
    type: string;
    amount: number;
    percentage: number;
  }>;
  summary?: {
    totalCompany: number;
    totalPersonal: number;
    totalAmount: number;
    companyPercentage: number;
    personalPercentage: number;
  };
  isLoading?: boolean;
}

export interface BreakdownChartProps {
  chartData?: Array<{
    category: string;
    company: number;
    personal: number;
    total: number;
  }>;
  isLoading?: boolean;
}

export interface RiskAnalysisProps {
  data?: RiskAnalysisDTO;
  isLoading?: boolean;
  onParameterChange?: (parameters: {
    fxDelta: number;
    rateDelta: number;
    inflationDelta: number;
    liquidityGap: number;
  }) => void;
}

export interface RiskTableProps {
  data?: RiskAnalysisDTO;
  isLoading?: boolean;
}

export interface SimulationPanelProps {
  onRunSimulation?: (parameters: SimulationParametersDTO) => void;
}

export interface AdvisorPanelProps {
  onAnalyzePortfolio?: (input: {
    portfolio: {
      cash: number;
      deposits: number;
      forex: number;
      stocks: number;
      bonds: number;
      crypto: number;
      commodities: number;
      realEstate: number;
    };
    riskProfile: 'low' | 'medium' | 'high';
  }) => void;
}

export interface NotificationBarProps {
  className?: string;
  onAlertDismiss?: (alertId: string) => void;
}
