import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { User, Building, CreditCard, Calendar, Edit, Save, X } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'loan' | 'investment';
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
  isActive: boolean;
  description?: string;
  paymentDueDate?: string;
  cutOffDate?: string;
  gracePeriod?: number;
  minimumPayment?: number;
  interestRate?: number;
  createdAt: string;
  updatedAt: string;
}

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAccount: (id: string, data: any) => Promise<void>;
  account: Account | null;
  isLoading: boolean;
}

export default function EditAccountDialog({ 
  open, 
  onOpenChange, 
  onUpdateAccount, 
  account, 
  isLoading 
}: EditAccountDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as const,
    bankName: '',
    accountNumber: '',
    balance: '',
    currency: 'TRY',
    isActive: true,
    description: '',
    paymentDueDate: '',
    cutOffDate: '',
    gracePeriod: '',
    minimumPayment: '',
    interestRate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        type: account.type || 'checking',
        bankName: account.bankName || '',
        accountNumber: account.accountNumber || '',
        balance: account.balance?.toString() || '',
        currency: account.currency || 'TRY',
        isActive: account.isActive ?? true,
        description: account.description || '',
        paymentDueDate: account.paymentDueDate || '',
        cutOffDate: account.cutOffDate || '',
        gracePeriod: account.gracePeriod?.toString() || '',
        minimumPayment: account.minimumPayment?.toString() || '',
        interestRate: account.interestRate?.toString() || ''
      });
      setErrors({});
    }
  }, [account]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Hesap adı zorunludur';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Banka adı zorunludur';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Hesap numarası zorunludur';
    }

    if (!formData.balance.trim()) {
      newErrors.balance = 'Bakiye zorunludur';
    } else if (isNaN(Number(formData.balance))) {
      newErrors.balance = 'Geçerli bir sayı giriniz';
    }

    // Credit card specific validations
    if (formData.type === 'credit_card') {
      if (formData.minimumPayment && isNaN(Number(formData.minimumPayment))) {
        newErrors.minimumPayment = 'Geçerli bir sayı giriniz';
      }
      if (formData.interestRate && isNaN(Number(formData.interestRate))) {
        newErrors.interestRate = 'Geçerli bir sayı giriniz';
      }
      if (formData.gracePeriod && isNaN(Number(formData.gracePeriod))) {
        newErrors.gracePeriod = 'Geçerli bir sayı giriniz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !account) {
      return;
    }

    try {
      const updateData = {
        name: formData.name.trim(),
        type: formData.type,
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        balance: Number(formData.balance),
        currency: formData.currency,
        isActive: formData.isActive,
        description: formData.description.trim(),
        ...(formData.type === 'credit_card' && {
          paymentDueDate: formData.paymentDueDate || undefined,
          cutOffDate: formData.cutOffDate || undefined,
          gracePeriod: formData.gracePeriod ? Number(formData.gracePeriod) : undefined,
          minimumPayment: formData.minimumPayment ? Number(formData.minimumPayment) : undefined,
          interestRate: formData.interestRate ? Number(formData.interestRate) : undefined
        })
      };

      await onUpdateAccount(account.id, updateData);
      onOpenChange(false);
    } catch (error) {
      console.error('Account update error:', error);
      setErrors({ submit: 'Hesap güncellenirken hata oluştu' });
    }
  };

  const handleClose = () => {
    setErrors({});
    onOpenChange(false);
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <Building className="h-5 w-5 text-blue-600" />;
      case 'savings':
        return <User className="h-5 w-5 text-green-600" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'loan':
        return <Calendar className="h-5 w-5 text-red-600" />;
      case 'investment':
        return <Building className="h-5 w-5 text-orange-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAccountTypeText = (type: string) => {
    switch (type) {
      case 'checking':
        return 'Vadesiz Hesap';
      case 'savings':
        return 'Vadeli Hesap';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'loan':
        return 'Kredi';
      case 'investment':
        return 'Yatırım';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-6 w-6 text-blue-600" />
            Hesap Düzenle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {getAccountTypeIcon(formData.type)}
                Temel Bilgiler
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Hesap Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Örn: Ana İşletme Hesabı"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Hesap Türü *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-blue-600" />
                          Vadesiz Hesap
                        </div>
                      </SelectItem>
                      <SelectItem value="savings">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-green-600" />
                          Vadeli Hesap
                        </div>
                      </SelectItem>
                      <SelectItem value="credit_card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                          Kredi Kartı
                        </div>
                      </SelectItem>
                      <SelectItem value="loan">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-red-600" />
                          Kredi
                        </div>
                      </SelectItem>
                      <SelectItem value="investment">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-orange-600" />
                          Yatırım
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Banka Adı *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="Örn: Garanti BBVA"
                    className={errors.bankName ? 'border-red-500' : ''}
                  />
                  {errors.bankName && <p className="text-sm text-red-500">{errors.bankName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Hesap Numarası *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="Örn: 1234567890"
                    className={errors.accountNumber ? 'border-red-500' : ''}
                  />
                  {errors.accountNumber && <p className="text-sm text-red-500">{errors.accountNumber}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance">Bakiye *</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => handleInputChange('balance', e.target.value)}
                    placeholder="0.00"
                    className={errors.balance ? 'border-red-500' : ''}
                  />
                  {errors.balance && <p className="text-sm text-red-500">{errors.balance}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Para Birimi</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY - Türk Lirası</SelectItem>
                      <SelectItem value="USD">USD - Amerikan Doları</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label htmlFor="description">Açıklama</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Hesap hakkında ek bilgiler..."
                  rows={3}
                />
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Hesap aktif</Label>
              </div>
            </CardContent>
          </Card>

          {/* Credit Card Specific Fields */}
          {formData.type === 'credit_card' && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  Kredi Kartı Bilgileri
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentDueDate">Ödeme Vade Tarihi</Label>
                    <Input
                      id="paymentDueDate"
                      type="date"
                      value={formData.paymentDueDate}
                      onChange={(e) => handleInputChange('paymentDueDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cutOffDate">Kesim Tarihi</Label>
                    <Input
                      id="cutOffDate"
                      type="date"
                      value={formData.cutOffDate}
                      onChange={(e) => handleInputChange('cutOffDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gracePeriod">Ödemesiz Gün Sayısı</Label>
                    <Input
                      id="gracePeriod"
                      type="number"
                      value={formData.gracePeriod}
                      onChange={(e) => handleInputChange('gracePeriod', e.target.value)}
                      placeholder="30"
                      className={errors.gracePeriod ? 'border-red-500' : ''}
                    />
                    {errors.gracePeriod && <p className="text-sm text-red-500">{errors.gracePeriod}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumPayment">Minimum Ödeme</Label>
                    <Input
                      id="minimumPayment"
                      type="number"
                      step="0.01"
                      value={formData.minimumPayment}
                      onChange={(e) => handleInputChange('minimumPayment', e.target.value)}
                      placeholder="0.00"
                      className={errors.minimumPayment ? 'border-red-500' : ''}
                    />
                    {errors.minimumPayment && <p className="text-sm text-red-500">{errors.minimumPayment}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Faiz Oranı (%)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      value={formData.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      placeholder="0.00"
                      className={errors.interestRate ? 'border-red-500' : ''}
                    />
                    {errors.interestRate && <p className="text-sm text-red-500">{errors.interestRate}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Güncelleniyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Güncelle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
