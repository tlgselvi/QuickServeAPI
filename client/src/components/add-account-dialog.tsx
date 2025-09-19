import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Building } from "lucide-react";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAccount: (data: any) => void;
  isLoading: boolean;
}

export default function AddAccountDialog({ open, onOpenChange, onAddAccount, isLoading }: AddAccountDialogProps) {
  const [accountType, setAccountType] = useState<'personal' | 'company'>('personal');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [balance, setBalance] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bankName || !accountName) {
      return;
    }

    onAddAccount({
      type: accountType,
      bankName,
      accountName,
      balance: balance || '0',
      currency: 'TRY'
    });

    // Reset form
    setBankName('');
    setAccountName('');
    setBalance('');
    setAccountType('personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-add-account">
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
                data-testid="input-balance"
              />
              <span className="absolute right-3 top-2 text-sm text-muted-foreground">TRY</span>
            </div>
          </div>
          
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
