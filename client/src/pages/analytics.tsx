import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3, Calendar } from 'lucide-react';
import { getCategoryLabel } from '@shared/schema';
import type { Account, Transaction } from '@/lib/types';

interface ChartData {
  name: string;
  value: number;
  label: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export default function Analytics () {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('3months');

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    staleTime: 300000, // 5 minutes cache
  });

  const { data: transactionsData = { transactions: [] }, isLoading: transactionsLoading } = useQuery<{
    transactions: Transaction[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['/api/transactions'],
    staleTime: 300000, // 5 minutes cache
  });

  const { transactions } = transactionsData;

  // Memoized date cutoff calculation
  const dateCutoff = useMemo(() => {
    const now = new Date();
    switch (selectedTimeRange) {
      case '1month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '3months':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case '6months':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case '1year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return new Date(0); // All time
    }
  }, [selectedTimeRange]);

  // Memoized filtered transactions for better performance
  const filteredTransactions = useMemo(() => {
    if (selectedTimeRange === 'all') {
      return transactions;
    }
    return transactions.filter(transaction => new Date(transaction.date) >= dateCutoff);
  }, [transactions, selectedTimeRange, dateCutoff]);

  // Memoized expense breakdown by category
  const expenseCategoryData = useMemo(() => {
    const expensesByCategory = filteredTransactions
      .filter(t => t.type === 'expense' && t.category)
      .reduce((acc, transaction) => {
        const category = transaction.category!;
        acc[category] = (acc[category] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory).map(([category, amount]) => ({
      name: category,
      value: amount,
      label: getCategoryLabel(category),
    }));
  }, [filteredTransactions]);

  // Memoized income breakdown by category
  const incomeCategoryData = useMemo(() => {
    const incomesByCategory = filteredTransactions
      .filter(t => t.type === 'income' && t.category)
      .reduce((acc, transaction) => {
        const category = transaction.category!;
        acc[category] = (acc[category] || 0) + parseFloat(transaction.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(incomesByCategory).map(([category, amount]) => ({
      name: category,
      value: amount,
      label: getCategoryLabel(category),
    }));
  }, [filteredTransactions]);

  // Memoized monthly income vs expense trends
  const monthlyTrends = useMemo(() => {
    const monthlyData = filteredTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthLabel, monthKey, income: 0, expense: 0, net: 0 };
      }

      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'income') {
        acc[monthKey].income += amount;
      } else if (transaction.type === 'expense') {
        acc[monthKey].expense += amount;
      }

      return acc;
    }, {} as Record<string, MonthlyData & { monthKey: string }>);

    // Sort by actual chronological order and calculate cumulative balance
    const sortedMonthlyData = Object.values(monthlyData)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    let runningBalance = 0;
    return sortedMonthlyData.map(month => {
      const monthlyNet = month.income - month.expense;
      runningBalance += monthlyNet;
      return {
        month: month.month,
        income: month.income,
        expense: month.expense,
        net: runningBalance, // Now shows cumulative net balance
      };
    });
  }, [filteredTransactions]);

  // Calculate total metrics
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  // Show loading state while data is being fetched
  const isLoading = accountsLoading || transactionsLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartConfig = {
    income: {
      label: 'Gelir',
      color: '#10b981',
    },
    expense: {
      label: 'Gider',
      color: '#ef4444',
    },
    net: {
      label: 'Net',
      color: '#3b82f6',
    },
  };

  // Show empty state if no transactions
  if (!isLoading && transactions.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" data-testid="analytics-title">Finansal Analiz</h1>
          <div className="w-40 h-10 bg-muted animate-pulse rounded-md" />
        </div>

        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Henüz İşlem Bulunmuyor</h3>
          <p className="text-muted-foreground mb-6">
            Finansal analizlerinizi görmek için önce bazı işlemler eklemeniz gerekiyor.
          </p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Şirket veya Şahsi sayfalarından hesap ekleyebilirsiniz</p>
            <p>• İşlem ekleyerek gelir ve giderlerinizi takip edebilirsiniz</p>
            <p>• Analiz grafikleri otomatik olarak oluşturulacaktır</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" data-testid="analytics-title">Finansal Analiz</h1>
          <div className="w-40 h-10 bg-muted animate-pulse rounded-md" />
        </div>

        {/* Loading skeletons for summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
                <div className="h-8 bg-muted animate-pulse rounded w-32" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Loading skeletons for charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-muted animate-pulse rounded w-48" />
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="analytics-title">Finansal Analiz</h1>
        <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <SelectTrigger className="w-40" data-testid="select-time-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Son 1 Ay</SelectItem>
            <SelectItem value="3months">Son 3 Ay</SelectItem>
            <SelectItem value="6months">Son 6 Ay</SelectItem>
            <SelectItem value="1year">Son 1 Yıl</SelectItem>
            <SelectItem value="all">Tüm Zamanlar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-total-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="total-income">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-expenses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="total-expenses">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-net-balance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Bakiye</CardTitle>
            {netBalance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="net-balance">
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends Chart */}
        <Card data-testid="card-monthly-trends">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Aylık Gelir vs Gider Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={monthlyTrends}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="#10b981" />
                <Bar dataKey="expense" fill="#ef4444" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories Pie Chart */}
        <Card data-testid="card-expense-categories">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Gider Kategorileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <PieChart>
                <Pie
                  data={expenseCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ label, percent }) => `${label} (${(percent * 100).toFixed(1)}%)`}
                >
                  {expenseCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Income Categories Pie Chart */}
        <Card data-testid="card-income-categories">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Gelir Kategorileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-80">
              <PieChart>
                <Pie
                  data={incomeCategoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ label, percent }) => `${label} (${(percent * 100).toFixed(1)}%)`}
                >
                  {incomeCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cumulative Balance Trend */}
        <Card data-testid="card-net-trend">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kümülatif Bakiye Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={monthlyTrends}>
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
