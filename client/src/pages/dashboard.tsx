import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { useAuth } from '@/hooks/useAuth';
import KPIBar from '@/components/kpi-bar';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { AlertsNotification } from '@/components/AlertsNotification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Plus, BarChart3, PieChart, AlertTriangle } from 'lucide-react';
import { AIChat } from '@/components/ai-chat';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import NotificationBar from '@/components/alerts/NotificationBar';
import { getAllCategories } from '@shared/client-schema';
import BreakdownTable from '@/components/breakdown-table';
import BreakdownChart from '@/components/breakdown-chart';
import RiskAnalysis from '@/components/risk-analysis';
import RiskTable from '@/components/risk-table';
import DSCRCard from '@/components/dscr-card';
import type { Account, Transaction } from '@/lib/types';
import {
  DashboardSkeleton,
  TransactionListSkeleton,
  LoadingOverlay,
  RefreshButton,
  useLoadingState,
} from '@/components/loading-states';

export default function Dashboard () {
  const { user } = useAuth();
  const formatCurrency = useFormatCurrency();
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [selectedAccountTypeFilter, setSelectedAccountTypeFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Calculate total assets and debts - memoized for performance
  const calculateFinancialSummary = useCallback((accounts: Account[]) => {
    let totalAssets = 0;
    let totalDebts = 0;
    let totalCreditCardDebt = 0;
    let totalCreditCardMinPayment = 0;
    let totalLoanDebt = 0;
    let totalLoanMinPayment = 0;
    let totalOverdraftDebt = 0;

    accounts.forEach(account => {
      const balance = parseFloat(account.balance || '0');
      
      if (balance >= 0) {
        totalAssets += balance;
      } else {
        totalDebts += Math.abs(balance);
      }

      // Credit card debt
      if (account.subAccounts?.creditCard) {
        const creditCard = account.subAccounts.creditCard;
        totalCreditCardDebt += creditCard.used || 0;
        totalCreditCardMinPayment += creditCard.minimumPayment || 0;
      }

      // Loan debt
      if (account.subAccounts?.loan) {
        const loan = account.subAccounts.loan;
        totalLoanDebt += loan.principalRemaining || 0;
        totalLoanMinPayment += loan.monthlyPayment || 0;
      }

      // Overdraft debt
      if (account.subAccounts?.kmh) {
        const overdraft = account.subAccounts.kmh;
        totalOverdraftDebt += overdraft.used || 0;
      }
    });

    return {
      totalAssets,
      totalDebts,
      totalCreditCardDebt,
      totalCreditCardMinPayment,
      totalLoanDebt,
      totalLoanMinPayment,
      totalOverdraftDebt,
      netWorth: totalAssets - totalDebts - totalCreditCardDebt - totalLoanDebt - totalOverdraftDebt,
      totalMonthlyPayments: totalCreditCardMinPayment + totalLoanMinPayment
    };
  }, []);

  // Loading states
  const { isLoading: isRefreshing, startLoading: startRefresh, stopLoading: stopRefresh } = useLoadingState();

  // Real-time dashboard updates
  const { isConnected, connectionError } = useRealtimeDashboard();

  // Optimized dashboard query with better caching and performance
  const { data: dashboardData, isLoading: dashboardLoading, error, refetch } = useQuery<{
    accounts: Account[];
    recentTransactions: Transaction[];
    totalBalance: number;
    companyBalance: number;
    personalBalance: number;
    totalCash: number;
    totalDebt: number;
    totalTransactions: number;
  }>({
    queryKey: ['/api/dashboard'],
    enabled: !!user && !!localStorage.getItem('token'), // Only fetch if user is logged in and token exists
    staleTime: 60000, // 1 minute - data is fresh for 1 minute
    gcTime: 300000, // 5 minutes - cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Retry failed requests twice
  });

  // Breakdown query
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery<{
    breakdown: any;
    table: any;
    summary: any;
    chartData: any;
    accounts: number;
  }>({
    queryKey: ['/api/consolidation/breakdown'],
    enabled: !!user && !!localStorage.getItem('token'), // Only fetch if user is logged in and token exists
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // DSCR query (basic smoke: sample params)
  const { data: dscrData } = useQuery<{ dscr: number; status: 'ok' | 'warning' | 'critical' }>({
    queryKey: ['/api/finance/dscr', { operatingCF: 200, debtService: 100 }],
    enabled: !!user && !!localStorage.getItem('token'), // Only fetch if user is logged in and token exists
    queryFn: async () => {
      const params = new URLSearchParams({ operatingCF: '200', debtService: '100' });
      const res = await fetch(`/api/finance/dscr?${params}`);
      if (!res.ok) throw new Error('DSCR fetch failed');
      return res.json();
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  // Risk analysis query
  const [riskParameters, setRiskParameters] = useState({
    fxDelta: 0,
    rateDelta: 0,
    inflationDelta: 0,
    liquidityGap: 0
  });

  const { data: riskData, isLoading: riskLoading, refetch: refetchRisk } = useQuery<{
    best: any;
    base: any;
    worst: any;
    factors: any;
    riskLevel: any;
    recommendations: string[];
    parameters: any;
  }>({
    queryKey: ['/api/risk/analysis', riskParameters],
    enabled: !!user && !!localStorage.getItem('token'), // Only fetch if user is logged in and token exists
    queryFn: async () => {
      const params = new URLSearchParams({
        fxDelta: riskParameters.fxDelta.toString(),
        rateDelta: riskParameters.rateDelta.toString(),
        inflationDelta: riskParameters.inflationDelta.toString(),
        liquidityGap: riskParameters.liquidityGap.toString()
      });
      
      const response = await fetch(`/api/risk/analysis?${params}`);
      if (!response.ok) throw new Error('Risk analysis failed');
      return response.json();
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Handle manual refresh - memoized for performance
  const handleRefresh = useCallback(async () => {
    startRefresh();
    try {
      await refetch();
    } finally {
      stopRefresh();
    }
  }, [refetch, startRefresh, stopRefresh]);

  const isLoading = dashboardLoading;
  const accounts = dashboardData?.accounts || [];
  const transactions = dashboardData?.recentTransactions || [];

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Filter accounts by type (for admin) - memoized for performance
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      if (selectedAccountTypeFilter === 'all') {
        return true;
      }
      return account.type === selectedAccountTypeFilter;
    });
  }, [accounts, selectedAccountTypeFilter]);

  // Filter transactions by account and category (for admin) - memoized for performance
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const accountMatch = selectedAccountFilter === 'all' || transaction.accountId === selectedAccountFilter;
      const categoryMatch = selectedCategoryFilter === 'all' || transaction.category === selectedCategoryFilter;
      return accountMatch && categoryMatch;
    });
  }, [transactions, selectedAccountFilter, selectedCategoryFilter]);

  // Show loading skeleton if data is loading
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Finansal Yönetim Panosu</h1>
          <div className="flex items-center gap-3">
            <CurrencySwitcher />
            <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
            <AlertsNotification />
          </div>
        </div>
        
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Veri yüklenirken hata oluştu</h3>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'}
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="mt-3"
                >
                  Tekrar Dene
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Header with Alerts */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="dashboard-title">
          {isAdmin ? 'Admin - Finansal Yönetim Panosu' : 'Finansal Yönetim Panosu'}
        </h1>
        <div className="flex items-center gap-3">
          <CurrencySwitcher />
          <RefreshButton onRefresh={handleRefresh} isRefreshing={isRefreshing} />
          <AlertsNotification />
        </div>
      </div>

      {/* Proaktif Uyarılar */}
      <NotificationBar />

      {/* KPI Bar */}
      <KPIBar
        totalCash={dashboardData?.totalCash || 0}
        totalDebt={dashboardData?.totalDebt || 0}
        totalBalance={dashboardData?.totalBalance || 0}
        isLoading={isLoading}
      />

      {/* Main Dashboard Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Risk Analizi
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            İşlemler
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary */}
          {dashboardData?.accounts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const summary = calculateFinancialSummary(dashboardData.accounts);
                return (
                  <>
                    <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-700 dark:text-green-300">Toplam Varlık</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                          {formatCurrency(summary.totalAssets)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-700 dark:text-red-300">Toplam Borç</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-800 dark:text-red-200">
                          {formatCurrency(summary.totalCreditCardDebt + summary.totalLoanDebt + summary.totalOverdraftDebt)}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Min. Ödeme: {formatCurrency(summary.totalMonthlyPayments)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Net Değer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${summary.netWorth >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>
                          {formatCurrency(summary.netWorth)}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yellow-700 dark:text-yellow-300">Aylık Ödeme</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                          {formatCurrency(summary.totalMonthlyPayments)}
                        </div>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          Kredi + Kredi Kartı
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DSCRCard dscr={Number.isFinite(dscrData?.dscr || 0) ? (dscrData?.dscr || 0) : Infinity} status={dscrData?.status || 'warning'} />
          </div>
          {/* Admin Only Features */}
          {isAdmin && (
            <>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Chat Assistant */}
            <div>
              <AIChat
                persona="default"
                title="Finansal Asistan"
                description="Finansal konularda size yardımcı olabilirim"
                placeholder="Bütçe planlaması, yatırım tavsiyeleri, vergi planlaması..."
              />
            </div>

            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Bakiye Özeti</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Bakiye:</span>
                    <span className="font-medium">
                      {formatCurrency(dashboardData?.totalBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Şirket Bakiyesi:</span>
                    <span className="font-medium">
                      {formatCurrency(dashboardData?.companyBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kişisel Bakiye:</span>
                    <span className="font-medium">
                      {formatCurrency(dashboardData?.personalBalance || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

            </>
          )}
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownTable
              tableData={breakdownData?.table}
              summary={breakdownData?.summary}
              isLoading={breakdownLoading}
            />
            <BreakdownChart
              chartData={breakdownData?.chartData}
              isLoading={breakdownLoading}
            />
          </div>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAnalysis
              data={riskData}
              isLoading={riskLoading}
              onParameterChange={(newParams) => {
                setRiskParameters(newParams);
              }}
            />
            <RiskTable
              data={riskData}
              isLoading={riskLoading}
            />
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle data-testid="transactions-title">Son İşlemler</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={selectedAccountFilter} onValueChange={setSelectedAccountFilter}>
                      <SelectTrigger className="w-36" data-testid="select-account-filter">
                        <SelectValue placeholder="Hesap seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Hesaplar</SelectItem>
                        {filteredAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName} - {account.type === 'company' ? 'Şirket' : 'Kişisel'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                      <SelectTrigger className="w-36" data-testid="select-category-filter">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                        {getAllCategories().map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" data-testid="button-view-all-transactions">
                      <Filter className="w-4 h-4 mr-1" />
                      Filtrele
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LoadingOverlay isLoading={isRefreshing} message="İşlemler güncelleniyor...">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="no-transactions">
                      Henüz işlem bulunmuyor
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredTransactions.slice(0, 10).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.category} • {new Date(transaction.date).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                          <div className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount))}
                          </div>
                        </div>
                      ))}
                      {filteredTransactions.length > 10 && (
                        <div className="pt-4">
                          <Button variant="ghost" className="w-full" data-testid="button-load-more-transactions">
                            Daha Fazla İşlem Yükle
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </LoadingOverlay>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
