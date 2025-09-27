import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BankAccountDialog from '@/components/bank-account-dialog';
import BankAccountCard from '@/components/bank-account-card';
import AccountTransactionForm from '@/components/account-transaction-form';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import type { Account, Transaction } from '@shared/schema';
import { Plus } from 'lucide-react';

export default function Company () {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [selectedAccountForTransaction, setSelectedAccountForTransaction] = useState<string | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Fetch company accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounts');
      const data = await response.json();
      return data.filter((account: Account) => account.type === 'company');
    },
    staleTime: 30000,
  });

  // Fetch transactions for selected account
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', selectedAccount],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAccount !== 'all') {
        params.append('accountId', selectedAccount);
      }
      params.append('limit', '50');

      const response = await apiRequest('GET', `/api/transactions?${params}`);
      return response.json();
    },
    enabled: selectedAccount !== 'all',
    staleTime: 30000,
  });

  const filteredAccounts = accounts.filter((account: Account) =>
    account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.bankName?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalCompanyBalance = accounts.reduce((sum: number, account: Account) =>
    sum + parseFloat(account.balance), 0,
  );

  // Add transaction function
  const handleAddTransaction = async (transactionData: any) => {
    try {
      const response = await apiRequest('POST', '/api/transactions', transactionData);
      if (response.ok) {
        // Refresh accounts and transactions data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  // Add account function
  const handleAddAccount = async (accountData: any) => {
    setIsAddingAccount(true);
    try {
      const response = await apiRequest('POST', '/api/accounts', accountData);
      if (response.ok) {
        setShowAddAccountDialog(false);
        // Refresh accounts data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding account:', error);
    } finally {
      setIsAddingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Şirket Hesapları</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Toplam: {formatCurrency(totalCompanyBalance, 'TRY')}
          </Badge>
          <Button
            onClick={() => setShowAddAccountDialog(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Hesap Ekle
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Hesap ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Hesap seç" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Hesaplar</SelectItem>
            {filteredAccounts.map((account: Account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.accountName} ({account.bankName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account: Account) => {
          // Parse subAccounts if they exist
          let subAccounts = [];
          try {
            if (account.subAccounts) {
              subAccounts = JSON.parse(account.subAccounts);
            }
          } catch (e) {
            console.error('Error parsing subAccounts:', e);
          }

          // Convert account to BankProduct format
          const bankProduct = {
            id: account.id,
            bankName: account.bankName || 'Bilinmeyen Banka',
            accountName: account.accountName,
            type: account.type as 'personal' | 'company',
            currency: account.currency || 'TRY',
            hasCheckingAccount: true, // Main account is always checking
            hasCreditCard: subAccounts.some((sub: any) => sub.type === 'creditCard'),
            hasLoan: subAccounts.some((sub: any) => sub.type === 'loan'),
            hasOverdraft: subAccounts.some((sub: any) => sub.type === 'kmh'),
            hasSavings: subAccounts.some((sub: any) => sub.type === 'deposit'),
            // Credit card details from subAccounts
            creditCardCutOffDate: subAccounts.find((sub: any) => sub.type === 'creditCard')?.cutOffDate,
            creditCardDueDate: subAccounts.find((sub: any) => sub.type === 'creditCard')?.paymentDueDate,
            creditCardGracePeriod: subAccounts.find((sub: any) => sub.type === 'creditCard')?.gracePeriod,
            creditCardMinimumPayment: subAccounts.find((sub: any) => sub.type === 'creditCard')?.minimumPayment,
            creditCardInterestRate: subAccounts.find((sub: any) => sub.type === 'creditCard')?.interestRate,
            // Loan details from subAccounts
            loanDueDate: subAccounts.find((sub: any) => sub.type === 'loan')?.dueDate,
            loanGracePeriod: subAccounts.find((sub: any) => sub.type === 'loan')?.gracePeriod,
            loanMinimumPayment: subAccounts.find((sub: any) => sub.type === 'loan')?.monthlyPayment,
            loanInterestRate: subAccounts.find((sub: any) => sub.type === 'loan')?.interestRate,
            // Overdraft details from subAccounts
            overdraftLimit: subAccounts.find((sub: any) => sub.type === 'kmh')?.limit,
            overdraftInterestRate: subAccounts.find((sub: any) => sub.type === 'kmh')?.interestRate,
          };

          return (
            <BankAccountCard
              key={account.id}
              bank={bankProduct}
              onAddTransaction={handleAddTransaction}
              onViewHistory={(bankId) => {
                setSelectedAccount(bankId);
                // Scroll to transactions table
                setTimeout(() => {
                  const transactionsSection = document.querySelector('[data-testid="transactions-section"]');
                  if (transactionsSection) {
                    transactionsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 100);
              }}
            />
          );
        })}
      </div>

      {/* Transactions Table */}
      {selectedAccount !== 'all' && (
        <Card data-testid="transactions-section">
          <CardHeader>
            <CardTitle>İşlem Geçmişi</CardTitle>
            <CardDescription>
              {accounts.find((a: Account) => a.id === selectedAccount)?.name} hesabının son işlemleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-8">İşlemler yükleniyor...</div>
            ) : transactionsData?.transactions?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Kategori</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsData.transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.type === 'income' ? 'default' : 'destructive'}
                        >
                          {transaction.type === 'income' ? 'Gelir' : 'Gider'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(transaction.amount), accounts.find((a: Account) => a.id === transaction.accountId)?.currency || 'TRY')}
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Bu hesap için henüz işlem bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filteredAccounts.length === 0 && !accountsLoading && (
        <Card>
          <CardContent className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">Şirket Hesabı Bulunamadı</h3>
            <p className="text-muted-foreground">
              Henüz şirket hesabınız bulunmuyor. Yeni hesap ekleyebilirsiniz.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Account Dialog */}
      <BankAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAddBankAccount={handleAddAccount}
        isLoading={isAddingAccount}
        defaultAccountType="company"
        allowTypeChange={false}
      />


      {/* Account Specific Transaction Form */}
      {selectedAccountForTransaction && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-blue-700">
                {accounts.find((a: Account) => a.id === selectedAccountForTransaction)?.accountName} - Yeni İşlem
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAccountForTransaction(null)}
              >
                ✕
              </Button>
            </div>
            <CardDescription>
              {accounts.find((a: Account) => a.id === selectedAccountForTransaction)?.bankName} hesabına işlem ekleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountTransactionForm
              account={accounts.find((a: Account) => a.id === selectedAccountForTransaction)!}
              onAddTransaction={handleAddTransaction}
              onClose={() => setSelectedAccountForTransaction(null)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
