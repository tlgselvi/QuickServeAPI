import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { transactionCategories } from '@shared/schema';
import type { Account } from '@/lib/types';

interface TransactionFormProps {
  accounts: Account[];
  onAddTransaction: (data: any) => void;
  isLoading: boolean;
}

export default function TransactionForm ({ accounts, onAddTransaction, isLoading }: TransactionFormProps) {
  const [accountId, setAccountId] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountId || !amount || !description) {
      return;
    }

    onAddTransaction({
      accountId,
      type: transactionType,
      amount: parseFloat(amount).toFixed(4),
      description,
      category: category || null,
    });

    // Reset form
    setAccountId('');
    setAmount('');
    setDescription('');
    setCategory('');
    setTransactionType('income');
  };

  return (
    <Card data-testid="card-transaction-form">
      <CardHeader>
        <CardTitle data-testid="transaction-form-title">Yeni İşlem</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="transactionAccount" className="block text-sm font-medium text-foreground mb-2">
              Hesap
            </Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger data-testid="select-transaction-account">
                <SelectValue placeholder="Hesap seçin" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bankName} - {account.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">İşlem Türü</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={transactionType === 'income' ? 'default' : 'outline'}
                onClick={() => setTransactionType('income')}
                className={transactionType === 'income' ? 'bg-accent hover:bg-accent/90' : ''}
                data-testid="button-transaction-type-income"
              >
                Gelir
              </Button>
              <Button
                type="button"
                variant={transactionType === 'expense' ? 'default' : 'outline'}
                onClick={() => setTransactionType('expense')}
                className={transactionType === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}
                data-testid="button-transaction-type-expense"
              >
                Gider
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="transactionAmount" className="block text-sm font-medium text-foreground mb-2">
              Miktar
            </Label>
            <div className="relative">
              <Input
                id="transactionAmount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-12"
                step="0.01"
                min="0"
                required
                data-testid="input-transaction-amount"
              />
              <span className="absolute right-3 top-2 text-sm text-muted-foreground">TRY</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount('50')}
                className="text-xs px-3 py-1 h-7"
                data-testid="button-quick-amount-50"
              >
                ₺50
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount('100')}
                className="text-xs px-3 py-1 h-7"
                data-testid="button-quick-amount-100"
              >
                ₺100
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount('250')}
                className="text-xs px-3 py-1 h-7"
                data-testid="button-quick-amount-250"
              >
                ₺250
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount('500')}
                className="text-xs px-3 py-1 h-7"
                data-testid="button-quick-amount-500"
              >
                ₺500
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount('1000')}
                className="text-xs px-3 py-1 h-7"
                data-testid="button-quick-amount-1000"
              >
                ₺1000
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="transactionCategory" className="block text-sm font-medium text-foreground mb-2">
              Kategori
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-transaction-category">
                <SelectValue placeholder="Kategori seçin (opsiyonel)" />
              </SelectTrigger>
              <SelectContent>
                {transactionCategories[transactionType].map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transactionDescription" className="block text-sm font-medium text-foreground mb-2">
              Açıklama
            </Label>
            <Input
              id="transactionDescription"
              placeholder="İşlem açıklaması"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              data-testid="input-transaction-description"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
            disabled={isLoading || !accountId || !amount || !description}
            data-testid="button-submit-transaction"
          >
            {isLoading ? 'Ekleniyor...' : 'İşlem Ekle'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
