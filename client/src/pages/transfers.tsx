import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';
import type { Account, Transaction } from '@shared/schema';

export default function Transfers () {
  const formatCurrency = useFormatCurrency();
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/accounts', 'all'], // Unique queryKey for transfers page
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/accounts');
      const data = await response.json();
      logger.info('💸 Transfers: Fetched all accounts:', data);
      return data;
    },
    staleTime: 30000,
  });

  // Fetch recent transfers
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['/api/transactions', 'transfers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/transactions?type=transfer&limit=20');
      const data = await response.json();
      logger.info('💸 Transfers: Fetched transfer transactions:', data);
      return data;
    },
    staleTime: 30000,
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description: string;
    }) => {
      const response = await apiRequest('POST', '/api/virman', transferData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transfer işlemi başarısız');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Transfer Başarılı',
        description: 'Para transferi başarıyla tamamlandı.',
      });

      // Reset form
      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setDescription('');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', 'personal'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts', 'company'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', 'transfers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Transfer Hatası',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromAccountId || !toAccountId || !amount || fromAccountId === toAccountId) {
      toast({
        title: 'Geçersiz Veri',
        description: 'Lütfen tüm alanları doğru şekilde doldurun.',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({
        title: 'Geçersiz Tutar',
        description: "Transfer tutarı 0'dan büyük olmalıdır.",
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await transferMutation.mutateAsync({
        fromAccountId,
        toAccountId,
        amount: amountNum,
        description: description || 'Hesap transferi',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account ? `${account.accountName} (${account.bankName})` : 'Bilinmeyen Hesap';
  };

  const getAccountBalance = (accountId: string) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account ? parseFloat(account.balance) : 0;
  };

  const canTransfer = fromAccountId && toAccountId && amount &&
    fromAccountId !== toAccountId &&
    getAccountBalance(fromAccountId) >= parseFloat(amount || '0');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Virman İşlemleri</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle>Yeni Virman</CardTitle>
            <CardDescription>
              Hesaplar arası para transferi yapın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fromAccount">Gönderen Hesap</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Gönderen hesap seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account: Account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName} ({account.bankName}) - {formatCurrency(parseFloat(account.balance))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="toAccount">Alıcı Hesap</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alıcı hesap seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((account: Account) => account.id !== fromAccountId)
                      .map((account: Account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} ({account.bankName}) - {formatCurrency(parseFloat(account.balance))}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Transfer Tutarı</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    required
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">TRY</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[50, 100, 250, 500, 1000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="text-xs px-3 py-1 h-7"
                    >
                      ₺{quickAmount}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  placeholder="Transfer açıklaması (opsiyonel)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {fromAccountId && toAccountId && amount && (
                <Alert>
                  <AlertDescription>
                    <strong>Transfer Özeti:</strong><br />
                    {getAccountName(fromAccountId)} → {getAccountName(toAccountId)}<br />
                    Tutar: {formatCurrency(parseFloat(amount))}<br />
                    {!canTransfer && (
                      <span className="text-red-600">
                        ⚠️ Gönderen hesapta yeterli bakiye bulunmuyor.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !canTransfer || transferMutation.isPending}
              >
                {isSubmitting || transferMutation.isPending ? 'İşleniyor...' : 'Virman Yap'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Transfers */}
        <Card>
          <CardHeader>
            <CardTitle>Son Transferler</CardTitle>
            <CardDescription>
              Son yapılan virman işlemleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transfersLoading ? (
              <div className="text-center py-8">Transferler yükleniyor...</div>
            ) : transfersData?.transactions?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Transfer</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfersData.transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{transaction.description}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(transaction.amount))}
                      </TableCell>
                      <TableCell>
                        {transaction.category}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Henüz transfer işlemi bulunmuyor.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
