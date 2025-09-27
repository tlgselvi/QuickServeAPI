import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { useAuth } from "@/hooks/useAuth";
import KPIBar from "@/components/kpi-bar";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { AlertsNotification } from "@/components/AlertsNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, Plus } from "lucide-react";
import { AIChat } from "@/components/ai-chat";
import { formatCurrency } from "@/lib/utils";
import { getAllCategories } from "@shared/schema";
import type { Account, Transaction } from "@/lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all");
  const [selectedAccountTypeFilter, setSelectedAccountTypeFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  
  // Real-time dashboard updates
  const { isConnected, connectionError } = useRealtimeDashboard();

  // Optimized dashboard query with better caching and performance
  const { data: dashboardData, isLoading: dashboardLoading, error } = useQuery<{
    accounts: Account[];
    recentTransactions: Transaction[];
    totalBalance: number;
    companyBalance: number;
    personalBalance: number;
    totalCash: number;
    totalDebt: number;
    totalTransactions: number;
  }>({
    queryKey: ["/api/dashboard"],
    staleTime: 60000, // 1 minute - data is fresh for 1 minute
    gcTime: 300000, // 5 minutes - cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2, // Retry failed requests twice
  });

  const isLoading = dashboardLoading;
  const accounts = dashboardData?.accounts || [];
  const transactions = dashboardData?.recentTransactions || [];

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Filter accounts by type (for admin)
  const filteredAccounts = accounts.filter(account => {
    if (selectedAccountTypeFilter === "all") return true;
    return account.type === selectedAccountTypeFilter;
  });

  // Filter transactions by account and category (for admin)
  const filteredTransactions = transactions.filter(transaction => {
    const accountMatch = selectedAccountFilter === "all" || transaction.accountId === selectedAccountFilter;
    const categoryMatch = selectedCategoryFilter === "all" || transaction.category === selectedCategoryFilter;
    return accountMatch && categoryMatch;
  });

  return (
    <div className="space-y-8">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Header with Alerts */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="dashboard-title">
          {isAdmin ? "Admin - Finansal Yönetim Panosu" : "Finansal Yönetim Panosu"}
        </h1>
        <div className="flex items-center gap-3">
          <AlertsNotification />
        </div>
      </div>
      
      {/* KPI Bar */}
      <KPIBar 
        totalCash={dashboardData?.totalCash || 0}
        totalDebt={dashboardData?.totalDebt || 0}
        totalBalance={dashboardData?.totalBalance || 0}
        formatCurrency={formatCurrency}
        isLoading={isLoading}
      />

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
                      {formatCurrency(dashboardData?.totalBalance?.toString() || '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Şirket Bakiyesi:</span>
                    <span className="font-medium">
                      {formatCurrency(dashboardData?.companyBalance?.toString() || '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kişisel Bakiye:</span>
                    <span className="font-medium">
                      {formatCurrency(dashboardData?.personalBalance?.toString() || '0')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="mt-8">
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
              {isLoading ? (
                <div className="text-center py-8" data-testid="transactions-loading">
                  İşlemler yükleniyor...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-transactions">
                  Henüz işlem bulunmuyor
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.category} • {new Date(transaction.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <div className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount.toString())}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}