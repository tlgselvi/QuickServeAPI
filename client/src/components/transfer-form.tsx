import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Account } from '@/lib/types';

interface TransferFormProps {
  accounts: Account[];
  onTransfer: (data: any) => void;
  isLoading: boolean;
}

export default function TransferForm ({ accounts, onTransfer, isLoading }: TransferFormProps) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromAccountId || !toAccountId || !amount || fromAccountId === toAccountId) {
      return;
    }

    onTransfer({
      fromAccountId,
      toAccountId,
      amount: parseFloat(amount),
      description,
    });

    // Reset form
    setFromAccountId('');
    setToAccountId('');
    setAmount('');
    setDescription('');
  };

  return (
    <Card data-testid="card-transfer-form">
      <CardHeader>
        <CardTitle data-testid="transfer-form-title">Hızlı Virman</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fromAccount" className="block text-sm font-medium text-foreground mb-2">
              Gönderen Hesap
            </Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger data-testid="select-from-account">
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
            <Label htmlFor="toAccount" className="block text-sm font-medium text-foreground mb-2">
              Alıcı Hesap
            </Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger data-testid="select-to-account">
                <SelectValue placeholder="Hesap seçin" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter(account => account.id !== fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transferAmount" className="block text-sm font-medium text-foreground mb-2">
              Miktar
            </Label>
            <div className="relative">
              <Input
                id="transferAmount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-12"
                step="0.01"
                min="0"
                required
                data-testid="input-transfer-amount"
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
            <Label htmlFor="transferDescription" className="block text-sm font-medium text-foreground mb-2">
              Açıklama
            </Label>
            <Input
              id="transferDescription"
              placeholder="İşlem açıklaması (opsiyonel)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-transfer-description"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading || !fromAccountId || !toAccountId || !amount || fromAccountId === toAccountId}
            data-testid="button-submit-transfer"
          >
            {isLoading ? 'İşleniyor...' : 'Virman Yap'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
