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
  Building2,
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
  Settings,
  Shield,
  Link,
  RefreshCw,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Activity,
  Zap
} from 'lucide-react';

interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  currency: string;
  balance: number;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync: string;
  transactionCount: number;
  connectionType: 'open_banking' | 'api' | 'manual';
  permissions: string[];
  isActive: boolean;
}

interface BankTransaction {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense' | 'transfer';
  balance: number;
  reference?: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Bank {
  id: string;
  name: string;
  logo: string;
  supportedFeatures: string[];
  connectionStatus: 'available' | 'unavailable' | 'maintenance';
  apiStatus: 'active' | 'inactive' | 'deprecated';
  accounts: BankAccount[];
}

const defaultBanks: Bank[] = [
  {
    id: '1',
    name: 'Garanti BBVA',
    logo: '🏦',
    supportedFeatures: ['Open Banking', 'Real-time Sync', 'Multi-currency', 'API Access'],
    connectionStatus: 'available',
    apiStatus: 'active',
    accounts: [
      {
        id: '1',
        bankName: 'Garanti BBVA',
        accountName: 'Ana İşletme Hesabı',
        accountNumber: '1234567890',
        iban: 'TR12 0006 2000 1234 0000 1234 56',
        currency: 'TRY',
        balance: 850000,
        status: 'connected',
        lastSync: '2024-01-15T14:30:00Z',
        transactionCount: 234,
        connectionType: 'open_banking',
        permissions: ['read_transactions', 'read_balance', 'read_account_info'],
        isActive: true
      }
    ]
  },
  {
    id: '2',
    name: 'Türkiye İş Bankası',
    logo: '🏛️',
    supportedFeatures: ['Open Banking', 'Real-time Sync', 'Multi-currency'],
    connectionStatus: 'available',
    apiStatus: 'active',
    accounts: [
      {
        id: '2',
        bankName: 'Türkiye İş Bankası',
        accountName: 'Yatırım Hesabı',
        accountNumber: '0987654321',
        iban: 'TR64 0006 4000 0010 9876 5432 10',
        currency: 'TRY',
        balance: 250000,
        status: 'connected',
        lastSync: '2024-01-15T12:15:00Z',
        transactionCount: 89,
        connectionType: 'api',
        permissions: ['read_transactions', 'read_balance'],
        isActive: true
      }
    ]
  },
  {
    id: '3',
    name: 'Akbank',
    logo: '🏢',
    supportedFeatures: ['Open Banking', 'Real-time Sync'],
    connectionStatus: 'maintenance',
    apiStatus: 'active',
    accounts: [
      {
        id: '3',
        bankName: 'Akbank',
        accountName: 'Kredi Kartı Hesabı',
        accountNumber: '555544443333',
        iban: 'TR33 0004 1000 5555 4444 3333 22',
        currency: 'TRY',
        balance: -12500,
        status: 'error',
        lastSync: '2024-01-14T16:45:00Z',
        transactionCount: 67,
        connectionType: 'open_banking',
        permissions: ['read_transactions', 'read_balance'],
        isActive: false
      }
    ]
  }
];

const defaultTransactions: BankTransaction[] = [
  {
    id: '1',
    accountId: '1',
    accountName: 'Garanti BBVA - Ana İşletme Hesabı',
    date: '2024-01-15T14:20:00Z',
    amount: 150000,
    description: 'Müşteri ödemesi - ABC Şirketi',
    category: 'Satış Geliri',
    type: 'income',
    balance: 850000,
    reference: 'INV-2024-001',
    status: 'completed'
  },
  {
    id: '2',
    accountId: '1',
    accountName: 'Garanti BBVA - Ana İşletme Hesabı',
    date: '2024-01-15T10:30:00Z',
    amount: -25000,
    description: 'Elektrik faturası ödemesi',
    category: 'Operasyonel Gider',
    type: 'expense',
    balance: 700000,
    status: 'completed'
  },
  {
    id: '3',
    accountId: '2',
    accountName: 'Türkiye İş Bankası - Yatırım Hesabı',
    date: '2024-01-14T16:45:00Z',
    amount: 50000,
    description: 'Yatırım hesabına transfer',
    category: 'Transfer',
    type: 'income',
    balance: 250000,
    reference: 'TRF-001',
    status: 'completed'
  }
];

export function BankIntegration() {
  const [banks, setBanks] = useState<Bank[]>(defaultBanks);
  const [transactions, setTransactions] = useState<BankTransaction[]>(defaultTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  // Calculate totals
  const totalAccounts = banks.reduce((sum, bank) => sum + bank.accounts.length, 0);
  const connectedAccounts = banks.reduce((sum, bank) => 
    sum + bank.accounts.filter(acc => acc.status === 'connected').length, 0
  );
  const totalBalance = banks.reduce((sum, bank) => 
    sum + bank.accounts.reduce((accSum, acc) => accSum + acc.balance, 0), 0
  );
  const lastSyncTime = banks.reduce((latest, bank) => {
    const bankLatest = bank.accounts.reduce((accLatest, acc) => 
      acc.lastSync > accLatest ? acc.lastSync : accLatest, ''
    );
    return bankLatest > latest ? bankLatest : latest;
  }, '');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'connected':
        return 'Bağlı';
      case 'disconnected':
        return 'Bağlı Değil';
      case 'error':
        return 'Hata';
      case 'pending':
        return 'Beklemede';
      default:
        return status;
    }
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'open_banking':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'api':
        return <Zap className="h-4 w-4 text-purple-600" />;
      case 'manual':
        return <Edit className="h-4 w-4 text-orange-600" />;
      default:
        return <Link className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConnectionTypeText = (type: string): string => {
    switch (type) {
      case 'open_banking':
        return 'Open Banking';
      case 'api':
        return 'API Bağlantısı';
      case 'manual':
        return 'Manuel';
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

  const syncAccount = async (accountId: string) => {
    setSyncInProgress(accountId);
    // Simulate sync process
    setTimeout(() => {
      setSyncInProgress(null);
    }, 3000);
  };

  const connectBank = async (bankId: string) => {
    // Simulate bank connection process
    console.log(`Connecting to bank: ${bankId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Banka Entegrasyonu
          </h1>
          <p className="text-muted-foreground text-lg">
            Açık bankacılık ve API entegrasyonları
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddBank(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Banka Ekle
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Tümünü Senkronize Et
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Toplam Hesap</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {totalAccounts}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Bağlı Hesap</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {connectedAccounts}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  %{totalAccounts > 0 ? Math.round((connectedAccounts / totalAccounts) * 100) : 0} bağlantı oranı
                </p>
              </div>
              <Wifi className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Toplam Bakiye</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(totalBalance)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Son Senkronizasyon</p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('tr-TR') : ''}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="banks" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="banks">Bankalar</TabsTrigger>
          <TabsTrigger value="accounts">Hesaplar</TabsTrigger>
          <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
        </TabsList>

        <TabsContent value="banks" className="space-y-6">
          {/* Available Banks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Desteklenen Bankalar
              </CardTitle>
              <CardDescription>
                Open Banking ve API entegrasyonu ile desteklenen bankalar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banks.map((bank) => (
                  <Card key={bank.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <span className="text-2xl">{bank.logo}</span>
                        {bank.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Hesap Sayısı</span>
                          <span className="font-medium">{bank.accounts.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bağlantı Durumu</span>
                          <Badge variant={bank.connectionStatus === 'available' ? 'default' : 'secondary'}>
                            {bank.connectionStatus === 'available' ? 'Mevcut' : 
                             bank.connectionStatus === 'maintenance' ? 'Bakımda' : 'Mevcut Değil'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Desteklenen Özellikler</p>
                        <div className="flex flex-wrap gap-1">
                          {bank.supportedFeatures.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {bank.connectionStatus === 'available' ? (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => connectBank(bank.id)}
                          >
                            <Link className="h-4 w-4 mr-1" />
                            Bağlan
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="flex-1">
                            <WifiOff className="h-4 w-4 mr-1" />
                            Mevcut Değil
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Banka Hesapları
              </CardTitle>
              <CardDescription>
                Tüm banka hesaplarının durumu ve bağlantı bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banka</TableHead>
                    <TableHead>Hesap Adı</TableHead>
                    <TableHead>Hesap No</TableHead>
                    <TableHead>Bakiye</TableHead>
                    <TableHead>Bağlantı</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.flatMap(bank => 
                    bank.accounts.map(account => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{bank.logo}</span>
                            <span className="font-medium">{account.bankName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{account.accountName}</div>
                            <div className="text-sm text-muted-foreground">{account.iban}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            ****{account.accountNumber.slice(-4)}
                          </div>
                        </TableCell>
                        <TableCell className={`font-medium ${
                          account.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(account.balance)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getConnectionTypeIcon(account.connectionType)}
                            <span className="ml-1">{getConnectionTypeText(account.connectionType)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(account.status)}>
                            {getStatusIcon(account.status)}
                            <span className="ml-1">{getStatusText(account.status)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => syncAccount(account.id)}
                              disabled={syncInProgress === account.id}
                            >
                              {syncInProgress === account.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
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
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-600" />
                Banka İşlemleri
              </CardTitle>
              <CardDescription>
                Entegre banka hesaplarından gelen işlemler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Tutar</TableHead>
                    <TableHead>Bakiye</TableHead>
                    <TableHead>Durum</TableHead>
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
                        <Badge variant="outline">{transaction.accountName}</Badge>
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
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.balance)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.status === 'completed' ? 'Tamamlandı' : 
                           transaction.status === 'pending' ? 'Beklemede' : 'Başarısız'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Güvenlik Ayarları
                </CardTitle>
                <CardDescription>
                  Banka bağlantıları için güvenlik yapılandırması
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Şifreleme Seviyesi</Label>
                  <Select defaultValue="high">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Yüksek (AES-256)</SelectItem>
                      <SelectItem value="medium">Orta (AES-128)</SelectItem>
                      <SelectItem value="low">Düşük (AES-64)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Otomatik Senkronizasyon</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Aktif (15 dakikada bir)</SelectItem>
                      <SelectItem value="hourly">Saatlik</SelectItem>
                      <SelectItem value="daily">Günlük</SelectItem>
                      <SelectItem value="disabled">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Güvenlik Ayarlarını Kaydet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  Sistem Durumu
                </CardTitle>
                <CardDescription>
                  Banka entegrasyonları sistem durumu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open Banking API</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Veri Şifreleme</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <Lock className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Otomatik Senkronizasyon</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Yedekleme</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aktif
                    </Badge>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Sistem sağlığı: %100
                  </p>
                  <Progress value={100} className="mt-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
