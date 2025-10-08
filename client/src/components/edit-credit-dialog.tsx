import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Edit, Save, X, CreditCard, Building, User, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Credit {
  id: string;
  name: string;
  type: 'credit_card' | 'personal_loan' | 'business_loan' | 'mortgage' | 'line_of_credit';
  bankName: string;
  accountNumber: string;
  totalLimit: number;
  usedAmount: number;
  availableAmount: number;
  currency: string;
  interestRate: number;
  minimumPayment: number;
  dueDate: string;
  gracePeriod: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface EditCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCredit: (id: string, data: any) => Promise<void>;
  credit: Credit | null;
  isLoading: boolean;
}

export default function EditCreditDialog({ 
  open, 
  onOpenChange, 
  onUpdateCredit, 
  credit, 
  isLoading 
}: EditCreditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'credit_card' as const,
    bankName: '',
    accountNumber: '',
    totalLimit: '',
    usedAmount: '',
    currency: 'TRY',
    interestRate: '',
    minimumPayment: '',
    dueDate: new Date(),
    gracePeriod: '',
    isActive: true,
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Initialize form data when credit changes
  useEffect(() => {
    if (credit) {
      setFormData({
        name: credit.name || '',
        type: credit.type || 'credit_card',
        bankName: credit.bankName || '',
        accountNumber: credit.accountNumber || '',
        totalLimit: credit.totalLimit?.toString() || '',
        usedAmount: credit.usedAmount?.toString() || '',
        currency: credit.currency || 'TRY',
        interestRate: credit.interestRate?.toString() || '',
        minimumPayment: credit.minimumPayment?.toString() || '',
        dueDate: credit.dueDate ? new Date(credit.dueDate) : new Date(),
        gracePeriod: credit.gracePeriod?.toString() || '',
        isActive: credit.isActive ?? true,
        description: credit.description || ''
      });
      setErrors({});
    }
  }, [credit]);

  const handleInputChange = (field: string, value: string | Date | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Kredi adı zorunludur';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Banka adı zorunludur';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Hesap numarası zorunludur';
    }

    if (!formData.totalLimit.trim()) {
      newErrors.totalLimit = 'Toplam limit zorunludur';
    } else if (isNaN(Number(formData.totalLimit)) || Number(formData.totalLimit) <= 0) {
      newErrors.totalLimit = 'Geçerli bir limit giriniz';
    }

    if (!formData.usedAmount.trim()) {
      newErrors.usedAmount = 'Kullanılan tutar zorunludur';
    } else if (isNaN(Number(formData.usedAmount)) || Number(formData.usedAmount) < 0) {
      newErrors.usedAmount = 'Geçerli bir tutar giriniz';
    }

    if (Number(formData.usedAmount) > Number(formData.totalLimit)) {
      newErrors.usedAmount = 'Kullanılan tutar limiti aşamaz';
    }

    if (formData.interestRate && isNaN(Number(formData.interestRate))) {
      newErrors.interestRate = 'Geçerli bir faiz oranı giriniz';
    }

    if (formData.minimumPayment && isNaN(Number(formData.minimumPayment))) {
      newErrors.minimumPayment = 'Geçerli bir minimum ödeme giriniz';
    }

    if (formData.gracePeriod && isNaN(Number(formData.gracePeriod))) {
      newErrors.gracePeriod = 'Geçerli bir gün sayısı giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !credit) {
      return;
    }

    try {
      const updateData = {
        name: formData.name.trim(),
        type: formData.type,
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        totalLimit: Number(formData.totalLimit),
        usedAmount: Number(formData.usedAmount),
        availableAmount: Number(formData.totalLimit) - Number(formData.usedAmount),
        currency: formData.currency,
        interestRate: formData.interestRate ? Number(formData.interestRate) : 0,
        minimumPayment: formData.minimumPayment ? Number(formData.minimumPayment) : 0,
        dueDate: formData.dueDate.toISOString(),
        gracePeriod: formData.gracePeriod ? Number(formData.gracePeriod) : 0,
        isActive: formData.isActive,
        description: formData.description.trim() || undefined
      };

      await onUpdateCredit(credit.id, updateData);
      onOpenChange(false);
    } catch (error) {
      logger.error('Credit update error:', error);
      setErrors({ submit: 'Kredi güncellenirken hata oluştu' });
    }
  };

  const handleClose = () => {
    setErrors({});
    onOpenChange(false);
  };

  const getCreditTypeIcon = (type: string) => {
    switch (type) {
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'personal_loan':
        return <User className="h-5 w-5 text-blue-600" />;
      case 'business_loan':
        return <Building className="h-5 w-5 text-green-600" />;
      case 'mortgage':
        return <Building className="h-5 w-5 text-orange-600" />;
      case 'line_of_credit':
        return <DollarSign className="h-5 w-5 text-red-600" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCreditTypeText = (type: string) => {
    switch (type) {
      case 'credit_card':
        return 'Kredi Kartı';
      case 'personal_loan':
        return 'Bireysel Kredi';
      case 'business_loan':
        return 'İş Kredisi';
      case 'mortgage':
        return 'Konut Kredisi';
      case 'line_of_credit':
        return 'Kredi Limiti';
      default:
        return type;
    }
  };

  const availableAmount = Number(formData.totalLimit) - Number(formData.usedAmount || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Edit className="h-6 w-6 text-blue-600" />
            Kredi Düzenle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {getCreditTypeIcon(formData.type)}
                Temel Bilgiler
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Kredi Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Örn: Ana İşletme Kredi Kartı"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Kredi Türü *</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                          Kredi Kartı
                        </div>
                      </SelectItem>
                      <SelectItem value="personal_loan">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          Bireysel Kredi
                        </div>
                      </SelectItem>
                      <SelectItem value="business_loan">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-green-600" />
                          İş Kredisi
                        </div>
                      </SelectItem>
                      <SelectItem value="mortgage">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-orange-600" />
                          Konut Kredisi
                        </div>
                      </SelectItem>
                      <SelectItem value="line_of_credit">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-red-600" />
                          Kredi Limiti
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
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
                  placeholder="Kredi hakkında ek bilgiler..."
                  rows={3}
                />
              </div>

              <div className="mt-4 flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Kredi aktif</Label>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Finansal Bilgiler
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalLimit">Toplam Limit *</Label>
                  <Input
                    id="totalLimit"
                    type="number"
                    step="0.01"
                    value={formData.totalLimit}
                    onChange={(e) => handleInputChange('totalLimit', e.target.value)}
                    placeholder="0.00"
                    className={errors.totalLimit ? 'border-red-500' : ''}
                  />
                  {errors.totalLimit && <p className="text-sm text-red-500">{errors.totalLimit}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usedAmount">Kullanılan Tutar *</Label>
                  <Input
                    id="usedAmount"
                    type="number"
                    step="0.01"
                    value={formData.usedAmount}
                    onChange={(e) => handleInputChange('usedAmount', e.target.value)}
                    placeholder="0.00"
                    className={errors.usedAmount ? 'border-red-500' : ''}
                  />
                  {errors.usedAmount && <p className="text-sm text-red-500">{errors.usedAmount}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Kullanılabilir Tutar</Label>
                  <Input
                    value={availableAmount.toFixed(2)}
                    disabled
                    className="bg-gray-50 dark:bg-gray-900"
                  />
                  <p className={`text-xs ${availableAmount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    {availableAmount < 0 ? 'Limit aşıldı!' : 'Limit dahilinde'}
                  </p>
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
                  <Label htmlFor="dueDate">Vade Tarihi</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.dueDate, 'dd MMMM yyyy', { locale: tr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.dueDate}
                        onSelect={(date) => {
                          if (date) {
                            handleInputChange('dueDate', date);
                            setCalendarOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

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
