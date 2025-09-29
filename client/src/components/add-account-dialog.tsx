import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { User, Building, CreditCard, Calendar } from 'lucide-react';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAccount: (data: any) => void;
  isLoading: boolean;
}

export default function AddAccountDialog ({ open, onOpenChange, onAddAccount, isLoading }: AddAccountDialogProps) {
  const [accountType, setAccountType] = useState<'personal' | 'company'>('personal');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountCategory, setAccountCategory] = useState<'checking' | 'credit_card' | 'loan' | 'savings'>('checking');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [cutOffDate, setCutOffDate] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Required fields
    if (!bankName.trim()) {
      alert('❌ Banka adı zorunludur!');
      return;
    }

    if (!accountName.trim()) {
      alert('❌ Hesap adı zorunludur!');
      return;
    }

    if (!balance || parseFloat(balance) < 0) {
      alert('❌ Geçerli bir bakiye giriniz!');
      return;
    }

    onAddAccount({
      name: accountName, // Backend schema'sında 'name' field'ı required
      type: accountType,
      bankName,
      accountName,
      balance: parseFloat(balance || '0'), // String yerine number gönder
      currency: 'TRY',
      accountCategory,
      paymentDueDate: paymentDueDate || null,
      cutOffDate: cutOffDate || null,
      gracePeriod: gracePeriod || null,
      minimumPayment: minimumPayment || null,
      interestRate: interestRate || null,
    });

    // Reset form
    setBankName('');
    setAccountName('');
    setBalance('');
    setAccountType('personal');
    setAccountCategory('checking');
    setPaymentDueDate('');
    setCutOffDate('');
    setGracePeriod('');
    setMinimumPayment('');
    setInterestRate('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="dialog-add-account">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Yeni Hesap Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Hesap Türü</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={accountType === 'personal' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setAccountType('personal')}
                data-testid="button-account-type-personal"
              >
                <User className="w-4 h-4 mr-2" />
                Kişisel
              </Button>
              <Button
                type="button"
                variant={accountType === 'company' ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setAccountType('company')}
                data-testid="button-account-type-company"
              >
                <Building className="w-4 h-4 mr-2" />
                Şirket
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="bankName" className="text-sm font-medium text-foreground mb-2 block">
              Banka Adı
            </Label>
            <Input
              id="bankName"
              placeholder="Örn: Yapı Kredi, Garanti, İş Bankası"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              data-testid="input-bank-name"
            />
          </div>

          <div>
            <Label htmlFor="accountName" className="text-sm font-medium text-foreground mb-2 block">
              Hesap Adı
            </Label>
            <Input
              id="accountName"
              placeholder="Hesap için açıklayıcı bir ad"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              data-testid="input-account-name"
            />
          </div>

          <div>
            <Label htmlFor="balance" className="text-sm font-medium text-foreground mb-2 block">
              Başlangıç Bakiyesi
            </Label>
            <div className="relative">
              <Input
                id="balance"
                type="number"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="pr-12"
                step="0.01"
                min="0"
                required
                data-testid="input-balance"
              />
              <span className="absolute right-3 top-2 text-sm text-muted-foreground">TRY</span>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Hesap Kategorisi</Label>
            <Select value={accountCategory} onValueChange={(value: any) => setAccountCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Hesap türünü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Vadesiz Hesap
                  </div>
                </SelectItem>
                <SelectItem value="credit_card">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Kredi Kartı
                  </div>
                </SelectItem>
                <SelectItem value="loan">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Kredi/Kredi Kartı
                  </div>
                </SelectItem>
                <SelectItem value="savings">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Vadeli Hesap
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment dates - only show for credit cards and loans */}
          {(accountCategory === 'credit_card' || accountCategory === 'loan') && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Ödeme Günleri</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="cutOffDate" className="text-xs text-blue-600">Kesim Tarihi (Ayın Kaçı)</Label>
                    <Select value={cutOffDate} onValueChange={setCutOffDate}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Gün" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {(i + 1).toString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentDueDate" className="text-xs text-blue-600">Son Ödeme (Ayın Kaçı)</Label>
                    <Select value={paymentDueDate} onValueChange={setPaymentDueDate}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Gün" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {(i + 1).toString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="gracePeriod" className="text-xs text-blue-600">Ödeme Erteleme (Gün)</Label>
                    <Input
                      id="gracePeriod"
                      type="number"
                      placeholder="0"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(e.target.value)}
                      className="h-8"
                    />
                  </div>

                  {accountCategory === 'credit_card' && (
                    <div>
                      <Label htmlFor="minimumPayment" className="text-xs text-blue-600">Asgari Ödeme (TL)</Label>
                      <Input
                        id="minimumPayment"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={minimumPayment}
                        onChange={(e) => setMinimumPayment(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <Label htmlFor="interestRate" className="text-xs text-blue-600">Faiz Oranı (% Yıllık)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="h-8"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !bankName || !accountName}
              data-testid="button-submit"
            >
              {isLoading ? 'Ekleniyor...' : 'Hesap Ekle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
