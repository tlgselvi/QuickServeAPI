import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { Plus, CreditCard, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import type { Credit } from '@shared/schema';

export default function CreditCards () {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCredit, setNewCredit] = useState({
    title: '',
    description: '',
    amount: '',
    currency: 'TRY',
    category: 'credit_card',
    type: 'credit_card' as 'credit_card' | 'bank_loan' | 'personal_loan',
    interestRate: '',
    dueDate: '',
    minimumPayment: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch credits
  const { data: credits = [], isLoading } = useQuery({
    queryKey: ['/api/credits'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/credits');
      return response.json();
    },
    staleTime: 30000,
  });

  // Add credit mutation
  const addCreditMutation = useMutation({
    mutationFn: async (creditData: any) => {
      const response = await apiRequest('POST', '/api/credits', creditData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kredi eklenemedi');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Kredi Eklendi',
        description: 'Yeni kredi başarıyla eklendi.',
      });

      setNewCredit({
        title: '',
        description: '',
        amount: '',
        currency: 'TRY',
        category: 'credit_card',
        type: 'credit_card',
        interestRate: '',
        dueDate: '',
        minimumPayment: '',
      });
      setIsAddDialogOpen(false);

      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCredit.title || !newCredit.amount || !newCredit.dueDate) {
      toast({
        title: 'Geçersiz Veri',
        description: 'Lütfen gerekli alanları doldurun.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addCreditMutation.mutateAsync({
        ...newCredit,
        amount: parseFloat(newCredit.amount),
        interestRate: parseFloat(newCredit.interestRate || '0'),
        minimumPayment: parseFloat(newCredit.minimumPayment || '0'),
        dueDate: new Date(newCredit.dueDate).toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const types = {
      credit_card: { label: 'Kredi Kartı', variant: 'default' as const },
      bank_loan: { label: 'Banka Kredisi', variant: 'secondary' as const },
      personal_loan: { label: 'Bireysel Kredi', variant: 'outline' as const },
    };

    const typeInfo = types[type as keyof typeof types] || { label: type, variant: 'secondary' as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const getOverdueCredits = () => {
    const today = new Date();
    return credits.filter((credit: Credit) => {
      const dueDate = credit.dueDate ? new Date(credit.dueDate) : null;
      return dueDate && dueDate < today && credit.amount && parseFloat(credit.amount) > 0;
    });
  };

  const totalDebt = credits
    .filter((credit: Credit) => credit.amount && parseFloat(credit.amount) > 0)
    .reduce((sum: number, credit: Credit) => sum + parseFloat(credit.amount), 0);

  const totalMinimumPayments = credits
    .filter((credit: Credit) => credit.minimumPayment && parseFloat(credit.minimumPayment) > 0)
    .reduce((sum: number, credit: Credit) => sum + parseFloat(credit.minimumPayment || '0'), 0);

  const overdueCredits = getOverdueCredits();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Kredi ve Kartlar</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Kredi/Kart Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Yeni Kredi/Kart</DialogTitle>
              <DialogDescription>
                Kredi kartı veya kredi kaydı ekleyin
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCredit} className="space-y-4">
              <div>
                <Label htmlFor="title">Başlık *</Label>
                <Input
                  id="title"
                  value={newCredit.title}
                  onChange={(e) => setNewCredit({ ...newCredit, title: e.target.value })}
                  placeholder="Örn: Visa Kart, Konut Kredisi"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  value={newCredit.description}
                  onChange={(e) => setNewCredit({ ...newCredit, description: e.target.value })}
                  placeholder="Detaylı açıklama (opsiyonel)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tür</Label>
                  <Select value={newCredit.type} onValueChange={(value: 'credit_card' | 'bank_loan' | 'personal_loan') => setNewCredit({ ...newCredit, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                      <SelectItem value="bank_loan">Banka Kredisi</SelectItem>
                      <SelectItem value="personal_loan">Bireysel Kredi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="currency">Para Birimi</Label>
                  <Select value={newCredit.currency} onValueChange={(value) => setNewCredit({ ...newCredit, currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Borç Tutarı *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newCredit.amount}
                    onChange={(e) => setNewCredit({ ...newCredit, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="interestRate">Faiz Oranı (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    value={newCredit.interestRate}
                    onChange={(e) => setNewCredit({ ...newCredit, interestRate: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Vade Tarihi *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newCredit.dueDate}
                    onChange={(e) => setNewCredit({ ...newCredit, dueDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="minimumPayment">Minimum Ödeme</Label>
                  <Input
                    id="minimumPayment"
                    type="number"
                    value={newCredit.minimumPayment}
                    onChange={(e) => setNewCredit({ ...newCredit, minimumPayment: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit" disabled={isSubmitting || addCreditMutation.isPending}>
                  {isSubmitting || addCreditMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {overdueCredits.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{overdueCredits.length}</strong> adet vadesi geçmiş kredi/kart bulunuyor.
            Acil ödeme yapmanız önerilir.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDebt, 'TRY')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minimum Ödemeler</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalMinimumPayments, 'TRY')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vadesi Geçmiş</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCredits.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kredi ve Kartlar</CardTitle>
          <CardDescription>
            Kredi kartları ve kredi kayıtlarınız
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Krediler yükleniyor...</div>
          ) : credits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Borç Tutarı</TableHead>
                  <TableHead>Faiz Oranı</TableHead>
                  <TableHead>Vade Tarihi</TableHead>
                  <TableHead>Min. Ödeme</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit: Credit) => {
                  const isOverdue = credit.dueDate ? new Date(credit.dueDate) < new Date() && parseFloat(credit.amount || '0') > 0 : false;
                  return (
                    <TableRow key={credit.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">{credit.title}</TableCell>
                      <TableCell>{getTypeBadge(credit.type)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(credit.amount || '0'), credit.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        {credit.interestRate ? `${parseFloat(credit.interestRate)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {credit.dueDate ? new Date(credit.dueDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {credit.minimumPayment ? formatCurrency(parseFloat(credit.minimumPayment), credit.currency) : '-'}
                      </TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <Badge variant="destructive">Vadesi Geçmiş</Badge>
                        ) : (
                          <Badge variant="default">Aktif</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Henüz Kredi/Kart Yok</h3>
              <p className="text-muted-foreground mb-4">
                Kredi kartlarınızı ve kredilerinizi takip etmek için kayıt ekleyin.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                İlk Kredi/Kartı Ekle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
