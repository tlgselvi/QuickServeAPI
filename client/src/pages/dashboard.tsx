import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AccountCard from "@/components/account-card";
import TransactionItem from "@/components/transaction-item";
import AddAccountDialog from "@/components/add-account-dialog";
import TransferForm from "@/components/transfer-form";
import TransactionForm from "@/components/transaction-form";
import KPIBar from "@/components/kpi-bar";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Filter } from "lucide-react";
import { getAllCategories, getCategoryLabel } from "@shared/schema";
import type { Account, Transaction } from "@/lib/types";

export default function Dashboard() {
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const { toast } = useToast();

  // Single dashboard query for better performance
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<{
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
  });

  const accounts = dashboardData?.accounts || [];
  const transactions = dashboardData?.recentTransactions || [];
  const isLoading = dashboardLoading;

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: { type: string; bankName: string; accountName: string; balance: string; currency: string }) => {
      const response = await apiRequest("POST", "/api/accounts", accountData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setShowAddAccountDialog(false);
      toast({
        title: "Başarılı",
        description: "Hesap başarıyla eklendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Hesap eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transactionData: { accountId: string; type: string; amount: string; description: string; category?: string }) => {
      const response = await apiRequest("POST", "/api/transactions", transactionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla eklendi",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "İşlem eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (transferData: { fromAccountId: string; toAccountId: string; amount: number; description?: string }) => {
      const response = await apiRequest("POST", "/api/virman", transferData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Başarılı",
        description: "Virman işlemi başarıyla tamamlandı",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Virman işleminde bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const filteredTransactions = transactions.filter(transaction => {
    const accountMatch = selectedAccountFilter === "all" || transaction.accountId === selectedAccountFilter;
    const categoryMatch = selectedCategoryFilter === "all" || transaction.category === selectedCategoryFilter;
    return accountMatch && categoryMatch;
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(num);
  };

  return (
    <div className="space-y-8">
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Header with Add Account Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="dashboard-title">Finansal Yönetim Panosu</h1>
        <Button 
          onClick={() => setShowAddAccountDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="button-add-account"
        >
          <Plus className="w-4 h-4 mr-2" />
          Hesap Ekle
        </Button>
      </div>
      
      {/* KPI Bar */}
      <KPIBar 
        totalCash={dashboardData?.totalCash || 0}
        totalDebt={dashboardData?.totalDebt || 0}
        totalBalance={dashboardData?.totalBalance || 0}
        formatCurrency={formatCurrency}
        isLoading={isLoading}
      />
      
      {/* Dashboard Overview */}
      <div>
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-foreground sm:text-3xl sm:truncate" data-testid="page-title">
                Genel Bakış
              </h2>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="page-description">
                Tüm hesaplarınızı ve son işlemlerinizi görüntüleyin
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <span className="text-sm text-muted-foreground" data-testid="last-updated">
                Son güncelleme: 2 dakika önce
              </span>
            </div>
          </div>
        </div>

        {/* Account Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            <div className="col-span-full text-center py-8" data-testid="accounts-loading">
              Hesaplar yükleniyor...
            </div>
          ) : (
            <>
              {accounts.map((account) => (
                <AccountCard 
                  key={account.id} 
                  account={account} 
                  formatCurrency={formatCurrency}
                />
              ))}
              {/* Add Account Card */}
              <div 
                className="bg-card rounded-lg border-2 border-dashed border-border p-6 shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setShowAddAccountDialog(true)}
                data-testid="card-add-account"
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <Plus className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">Yeni Hesap Ekle</h3>
                  <p className="text-xs text-muted-foreground">Yeni bir banka hesabı ekleyin</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction History */}
          <div className="lg:col-span-2">
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
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName}
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
                      <TransactionItem 
                        key={transaction.id} 
                        transaction={transaction} 
                        accounts={accounts}
                        formatCurrency={formatCurrency}
                      />
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
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Money Transfer Card */}
            <TransferForm 
              accounts={accounts}
              onTransfer={(data: { fromAccountId: string; toAccountId: string; amount: number; description?: string }) => transferMutation.mutate(data)}
              isLoading={transferMutation.isPending}
            />

            {/* Add Transaction Card */}
            <TransactionForm 
              accounts={accounts}
              onAddTransaction={(data: { accountId: string; type: string; amount: string; description: string; category?: string }) => addTransactionMutation.mutate(data)}
              isLoading={addTransactionMutation.isPending}
            />
          </div>
        </div>

        {/* Add Account Dialog */}
        <AddAccountDialog
          open={showAddAccountDialog}
          onOpenChange={setShowAddAccountDialog}
          onAddAccount={(data: { type: string; bankName: string; accountName: string; balance: string; currency: string }) => addAccountMutation.mutate(data)}
          isLoading={addAccountMutation.isPending}
        />
    </div>
  );
}
