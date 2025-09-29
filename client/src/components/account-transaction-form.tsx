import { useState } from 'react';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Calendar, AlertTriangle, PiggyBank, Building, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/lib/types';
import type { SubAccount } from '@shared/schema';

interface AccountTransactionFormProps {
  account: Account;
  subAccount?: SubAccount;
  onAddTransaction: (data: any) => void;
  onClose: () => void;
}

// Sub-account tipine göre dinamik kategoriler
const getSubAccountCategories = (subAccount?: SubAccount) => {
  if (!subAccount) {
    // Ana hesap (vadesiz) kategorileri
    return [
      { value: 'salary', label: 'Maaş', type: 'income' },
      { value: 'freelance', label: 'Freelance', type: 'income' },
      { value: 'sales', label: 'Satış', type: 'income' },
      { value: 'rent', label: 'Kira', type: 'expense' },
      { value: 'utilities', label: 'Faturalar', type: 'expense' },
      { value: 'food', label: 'Market', type: 'expense' },
      { value: 'transport', label: 'Ulaşım', type: 'expense' },
      { value: 'health', label: 'Sağlık', type: 'expense' },
      { value: 'education', label: 'Eğitim', type: 'expense' },
      { value: 'entertainment', label: 'Eğlence', type: 'expense' },
      { value: 'other', label: 'Diğer', type: 'expense' },
    ];
  }

  switch (subAccount.type) {
    case 'creditCard':
      return [
        { value: 'minimum_payment', label: 'Asgari Ödeme', type: 'expense' },
        { value: 'full_payment', label: 'Tam Ödeme', type: 'expense' },
        { value: 'partial_payment', label: 'Kısmi Ödeme', type: 'expense' },
        { value: 'credit_usage', label: 'Kredi Kullanımı', type: 'expense' },
      ];

    case 'loan':
      return [
        { value: 'monthly_payment', label: 'Aylık Taksit', type: 'expense' },
        { value: 'extra_payment', label: 'Ekstra Ödeme', type: 'expense' },
        { value: 'early_payment', label: 'Erken Kapatma', type: 'expense' },
      ];

    case 'kmh':
      return [
        { value: 'overdraft_usage', label: 'KMH Kullanımı', type: 'expense' },
        { value: 'overdraft_payment', label: 'KMH Ödemesi', type: 'expense' },
        { value: 'interest_payment', label: 'Faiz Ödemesi', type: 'expense' },
      ];

    case 'deposit':
      return [
        { value: 'interest_accrual', label: 'Faiz Tahakkuku', type: 'income' },
        { value: 'deposit_withdrawal', label: 'Vadeli Çekim', type: 'expense' },
        { value: 'deposit_renewal', label: 'Vade Yenileme', type: 'expense' },
      ];

    default:
      return [];
  }
};

export default function AccountTransactionForm ({
  formatCurrency = useFormatCurrency(), account, subAccount, onAddTransaction, onClose }: AccountTransactionFormProps) {
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const categories = getSubAccountCategories(subAccount);
  const defaultTransactionType = subAccount?.type === 'deposit' ? 'income' : 'expense';

  // Helper functions for sub-account
  const getSubAccountIcon = (type: string) => {
    switch (type) {
      case 'checking': return <Building className="w-4 h-4" />;
      case 'creditCard': return <CreditCard className="w-4 h-4" />;
      case 'loan': return <Calendar className="w-4 h-4" />;
      case 'kmh': return <AlertTriangle className="w-4 h-4" />;
      case 'deposit': return <PiggyBank className="w-4 h-4" />;
      default: return <Building className="w-4 h-4" />;
    }
  };

  const getSubAccountName = (type: string) => {
    switch (type) {
      case 'checking': return 'Vadesiz Hesap';
      case 'creditCard': return 'Kredi Kartı';
      case 'loan': return 'Kredi';
      case 'kmh': return 'KMH (Kredi Mevduat Hesabı)';
      case 'deposit': return 'Vadeli Hesap';
      default: return 'Hesap';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description) {
      return;
    }

    onAddTransaction({
      accountId: account.id,
      type: transactionType,
      amount: parseFloat(amount).toFixed(4),
      description,
      category: category || null,
    });

    // Reset form
    setAmount('');
    setDescription('');
    setCategory('');
    setTransactionType('income');
    onClose();
  };

  const getSuggestedCategories = () => {
    if (transactionType === 'income') {
      return categories.filter(cat =>
        ['salary', 'freelance', 'sales'].includes(cat.value),
      );
    } else {
      return categories.filter(cat =>
        !['salary', 'freelance', 'sales'].includes(cat.value),
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-blue-700">
            {subAccount ? `${getSubAccountName(subAccount.type)} Bilgileri` : 'Hesap Bilgileri'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{account.accountName}</p>
              <p className="text-sm text-muted-foreground">{account.bankName}</p>
              {subAccount && (
                <div className="flex items-center gap-2 mt-1">
                  {getSubAccountIcon(subAccount.type)}
                  <span className="text-xs text-blue-600">
                    {getSubAccountName(subAccount.type)}
                  </span>
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {account.balance} {account.currency}
            </Badge>
          </div>

          {/* Sub-account specific info */}
          {subAccount && (
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                {subAccount.type === 'creditCard' && (
                  <>
                    <div className="flex items-center gap-1 mb-1">
                      <CreditCard className="w-3 h-3" />
                      <span>Limit: {formatCurrency((subAccount as any).limit)} | Kullanılan: {formatCurrency((subAccount as any).used)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Son ödeme: Ayın {(subAccount as any).paymentDueDate}'i | Asgari: {formatCurrency((subAccount as any).minimumPayment)}</span>
                    </div>
                  </>
                )}
                {subAccount.type === 'loan' && (
                  <>
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>Kalan: {formatCurrency((subAccount as any).principalRemaining)} | Taksit: {formatCurrency((subAccount as any).monthlyPayment)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Ödeme tarihi: Ayın {(subAccount as any).dueDate}'i</span>
                    </div>
                  </>
                )}
                {subAccount.type === 'kmh' && (
                  <>
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Limit: {formatCurrency((subAccount as any).limit)} | Kullanılan: {formatCurrency((subAccount as any).used)}</span>
                    </div>
                  </>
                )}
                {subAccount.type === 'deposit' && (
                  <>
                    <div className="flex items-center gap-1 mb-1">
                      <PiggyBank className="w-3 h-3" />
                      <span>Bakiye: {formatCurrency((subAccount as any).balance)} | Faiz: %{(subAccount as any).interestRate}</span>
                    </div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Transaction Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">İşlem Tipi</Label>
            <Select value={transactionType} onValueChange={(value: 'income' | 'expense') => setTransactionType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">
                  <span className="text-green-600">💰 Gelir</span>
                </SelectItem>
                <SelectItem value="expense">
                  <span className="text-red-600">💸 Gider</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Miktar ({account.currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Input
            id="description"
            placeholder="İşlem açıklaması..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Kategori seçin" />
            </SelectTrigger>
            <SelectContent
              className="max-h-60 overflow-y-auto"
              style={{ maxHeight: '240px', overflowY: 'auto' }}
            >
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
            İşlem Ekle
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            İptal
          </Button>
        </div>
      </form>
    </div>
  );
}
