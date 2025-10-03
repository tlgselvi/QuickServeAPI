import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormatCurrency } from '@/contexts/CurrencyContext';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  CreditCard,
  Building,
  PiggyBank,
  Receipt,
  ArrowUpDown,
  History,
  Settings
} from 'lucide-react';

interface Cashbox {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'investment';
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended';
  lastTransaction: string;
  transactionCount: number;
  description?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
}

interface Transaction {
  id: string;
  cashboxId: string;
  cashboxName: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  date: string;
  reference?: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const defaultCashboxes: Cashbox[] = [
  {
    id: '1',
    name: 'Ana Nakit Kasa',
    type: 'cash',
    balance: 45000,
    currency: 'TRY',
    status: 'active',
    lastTransaction: '2024-01-15T10:30:00Z',
    transactionCount: 156,
    description: 'Ana ofis nakit kasa'
  },
  {
    id: '2',
    name: 'Garanti Bankası - Ana Hesap',
    type: 'bank',
    balance: 850000,
    currency: 'TRY',
    status: 'active',
    lastTransaction: '2024-01-15T14:20:00Z',
    transactionCount: 234,
    description: 'Ana işletme hesabı',
    bankName: 'Garanti BBVA',
    accountNumber: '1234567890',
    iban: 'TR12 0006 2000 1234 0000 1234 56'
  },
  {
    id: '3',
    name: 'İş Bankası - Yatırım',
    type: 'investment',
    balance: 250000,
    currency: 'TRY',
    status: 'active',
    lastTransaction: '2024-01-14T16:45:00Z',
    transactionCount: 89,
    description: 'Yatırım hesabı',
    bankName: 'Türkiye İş Bankası',
    accountNumber: '0987654321',
    iban: 'TR64 0006 4000 0010 9876 5432 10'
  },
  {
    id: '4',
    name: 'Kredi Kartı - İş',
    type: 'credit_card',
    balance: -12500,
    currency: 'TRY',
    status: 'active',
    lastTransaction: '2024-01-15T12:15:00Z',
    transactionCount: 67,
    description: 'İş kredi kartı',
    bankName: 'Akbank'
  }
];

const defaultTransactions: Transaction[] = [
  {
    id: '1',
    cashboxId: '2',
    cashboxName: 'Garanti Bankası - Ana Hesap',
    type: 'income',
    amount: 150000,
    description: 'Müşteri ödemesi - ABC Şirketi',
    category: 'Satış Geliri',
    date: '2024-01-15T14:20:00Z',
    reference: 'INV-2024-001',
    status: 'completed'
  },
  {
    id: '2',
    cashboxId: '1',
    cashboxName: 'Ana Nakit Kasa',
    type: 'expense',
    amount: 2500,
    description: 'Ofis malzemeleri',
    category: 'Operasyonel Gider',
    date: '2024-01-15T10:30:00Z',
    status: 'completed'
  },
  {
    id: '3',
    cashboxId: '2',
    cashboxName: 'Garanti Bankası - Ana Hesap',
    type: 'transfer',
    amount: 50000,
    description: 'Yatırım hesabına transfer',
    category: 'Transfer',
    date: '2024-01-14T16:45:00Z',
    reference: 'TRF-001',
    status: 'completed'
  },
  {
    id: '4',
    cashboxId: '4',
    cashboxName: 'Kredi Kartı - İş',
    type: 'expense',
    amount: 8500,
    description: 'Pazarlama harcaması',
    category: 'Pazarlama',
    date: '2024-01-15T12:15:00Z',
    status: 'pending'
  }
];

export function CashboxManagement() {
  const [cashboxes, setCashboxes] = useState<Cashbox[]>(defaultCashboxes);
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddCashbox, setShowAddCashbox] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const formatCurrency = useFormatCurrency();

  // Calculate totals
  const totalBalance = cashboxes.reduce((sum, cashbox) => sum + cashbox.balance, 0);
  const totalTransactions = transactions.length;
  const todayTransactions = transactions.filter(t => 
    new Date(t.date).toDateString() === new Date().toDateString()
  ).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return <Wallet className="h-5 w-5 text-green-600" />;
      case 'bank':
        return <Building className="h-5 w-5 text-blue-600" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'investment':
        return <TrendingUp className="h-5 w-5 text-orange-600" />;
      default:
        return <PiggyBank className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'bank':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'credit_card':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'investment':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getTypeText = (type: string): string => {
    switch (type) {
      case 'cash':
        return 'Nakit';
      case 'bank':
        return 'Banka';
      case 'credit_card':
        return 'Kredi Kartı';
      case 'investment':
        return 'Yatırım';
      default:
        return type;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Beklemede';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Kasa Yönetimi
          </h1>
          <p className="text-muted-foreground text-lg">
            Nakit akışı ve kasa takibi
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddTransaction(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            İşlem Ekle
          </Button>
          <Button
            onClick={() => setShowAddCashbox(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Kasa
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Toplam Bakiye</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Toplam Kasa</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {cashboxes.length}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Toplam İşlem</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {totalTransactions}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Bugünkü İşlem</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {todayTransactions}
                </p>
              </div>
              <History className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="cashboxes">Kasalar</TabsTrigger>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Cashbox Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cashboxes.map((cashbox) => (
              <Card key={cashbox.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {getTypeIcon(cashbox.type)}
                    {cashbox.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bakiye</span>
                      <span className={`font-medium ${
                        cashbox.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(cashbox.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">İşlem Sayısı</span>
                      <span className="font-medium">{cashbox.transactionCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Son İşlem</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(cashbox.lastTransaction).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge className={getTypeColor(cashbox.type)}>
                      {getTypeText(cashbox.type)}
                    </Badge>
                    <Badge variant={cashbox.status === 'active' ? 'default' : 'secondary'}>
                      {cashbox.status === 'active' ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Son İşlemler
              </CardTitle>
              <CardDescription>
                En son gerçekleştirilen kasa işlemleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTransactionTypeIcon(transaction.type)}
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.cashboxName} • {transaction.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 
                        transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashboxes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Kasa Listesi
              </CardTitle>
              <CardDescription>
                Tüm kasaların detaylı bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kasa Adı</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Bakiye</TableHead>
                    <TableHead>Banka/Bilgi</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashboxes.map((cashbox) => (
                    <TableRow key={cashbox.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cashbox.name}</div>
                          {cashbox.description && (
                            <div className="text-sm text-muted-foreground">{cashbox.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(cashbox.type)}>
                          {getTypeIcon(cashbox.type)}
                          <span className="ml-1">{getTypeText(cashbox.type)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-medium ${
                        cashbox.balance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(cashbox.balance)}
                      </TableCell>
                      <TableCell>
                        {cashbox.bankName && (
                          <div className="text-sm">
                            <div className="font-medium">{cashbox.bankName}</div>
                            {cashbox.accountNumber && (
                              <div className="text-muted-foreground">****{cashbox.accountNumber.slice(-4)}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cashbox.status === 'active' ? 'default' : 'secondary'}>
                          {cashbox.status === 'active' ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-600" />
                İşlem Geçmişi
              </CardTitle>
              <CardDescription>
                Tüm kasa işlemlerinin detaylı listesi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Kasa</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.reference && (
                            <div className="text-sm text-muted-foreground">Ref: {transaction.reference}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.cashboxName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getTransactionTypeIcon(transaction.type)}
                          <span className="ml-1">
                            {transaction.type === 'income' ? 'Gelir' : 
                             transaction.type === 'expense' ? 'Gider' : 'Transfer'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 
                        transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {getStatusIcon(transaction.status)}
                          <span className="ml-1">{getStatusText(transaction.status)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Kasa Raporları
              </CardTitle>
              <CardDescription>
                Nakit akışı ve kasa performans raporları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Detaylı kasa raporları yakında eklenecek
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
