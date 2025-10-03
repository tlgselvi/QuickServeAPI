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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Target,
  PieChart,
  Calendar,
  Wallet
} from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  category: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  spent: number;
  remaining: number;
  startDate: string;
  endDate: string;
  status: 'on-track' | 'warning' | 'exceeded';
  percentage: number;
  description?: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalBudget: number;
  totalSpent: number;
  budgets: Budget[];
}

const defaultCategories: BudgetCategory[] = [
  {
    id: '1',
    name: 'Operasyonel Giderler',
    icon: '🏢',
    color: 'blue',
    totalBudget: 500000,
    totalSpent: 320000,
    budgets: []
  },
  {
    id: '2',
    name: 'Pazarlama',
    icon: '📢',
    color: 'green',
    totalBudget: 200000,
    totalSpent: 150000,
    budgets: []
  },
  {
    id: '3',
    name: 'Teknoloji',
    icon: '💻',
    color: 'purple',
    totalBudget: 300000,
    totalSpent: 280000,
    budgets: []
  },
  {
    id: '4',
    name: 'İnsan Kaynakları',
    icon: '👥',
    color: 'orange',
    totalBudget: 800000,
    totalSpent: 750000,
    budgets: []
  }
];

const defaultBudgets: Budget[] = [
  {
    id: '1',
    name: 'Ofis Kiraları',
    category: 'Operasyonel Giderler',
    period: 'monthly',
    amount: 50000,
    spent: 48000,
    remaining: 2000,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'on-track',
    percentage: 96,
    description: 'Ana ofis ve depo kiraları'
  },
  {
    id: '2',
    name: 'Dijital Pazarlama',
    category: 'Pazarlama',
    period: 'monthly',
    amount: 25000,
    spent: 28000,
    remaining: -3000,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'exceeded',
    percentage: 112,
    description: 'Google Ads, Facebook Ads, SEO'
  },
  {
    id: '3',
    name: 'Yazılım Lisansları',
    category: 'Teknoloji',
    period: 'yearly',
    amount: 120000,
    spent: 95000,
    remaining: 25000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'warning',
    percentage: 79,
    description: 'Microsoft, Adobe, diğer SaaS lisansları'
  },
  {
    id: '4',
    name: 'Maaşlar',
    category: 'İnsan Kaynakları',
    period: 'monthly',
    amount: 200000,
    spent: 195000,
    remaining: 5000,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'on-track',
    percentage: 97.5,
    description: 'Çalışan maaşları ve yan haklar'
  }
];

export function BudgetManagement() {
  const [categories, setCategories] = useState<BudgetCategory[]>(defaultCategories);
  const [budgets, setBudgets] = useState<Budget[]>(defaultBudgets);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const formatCurrency = useFormatCurrency();

  // Calculate totals
  const totalBudget = categories.reduce((sum, cat) => sum + cat.totalBudget, 0);
  const totalSpent = categories.reduce((sum, cat) => sum + cat.totalSpent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'exceeded':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'exceeded':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'on-track':
        return 'Hedefte';
      case 'warning':
        return 'Dikkat';
      case 'exceeded':
        return 'Aşıldı';
      default:
        return status;
    }
  };

  const getCategoryColor = (color: string): string => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500';
      case 'green':
        return 'bg-green-500';
      case 'purple':
        return 'bg-purple-500';
      case 'orange':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Bütçe Yönetimi
          </h1>
          <p className="text-muted-foreground text-lg">
            Finansal planlama ve harcama takibi
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowAddBudget(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Bütçe
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Toplam Bütçe</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(totalBudget)}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Harcanan</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Kalan</p>
                <p className={`text-3xl font-bold ${
                  totalRemaining >= 0 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Kullanım</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  %{overallPercentage.toFixed(1)}
                </p>
                <Progress value={overallPercentage} className="mt-2 h-2" />
              </div>
              <PieChart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="categories">Kategoriler</TabsTrigger>
          <TabsTrigger value="budgets">Bütçeler</TabsTrigger>
          <TabsTrigger value="analysis">Analiz</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card key={category.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <span className="text-2xl">{category.icon}</span>
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bütçe</span>
                      <span className="font-medium">{formatCurrency(category.totalBudget)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Harcanan</span>
                      <span className="font-medium">{formatCurrency(category.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kalan</span>
                      <span className={`font-medium ${
                        category.totalBudget - category.totalSpent >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(category.totalBudget - category.totalSpent)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Kullanım</span>
                      <span>%{((category.totalSpent / category.totalBudget) * 100).toFixed(1)}</span>
                    </div>
                    <Progress 
                      value={(category.totalSpent / category.totalBudget) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                Bütçe Kategorileri
              </CardTitle>
              <CardDescription>
                Kategori bazında bütçe dağılımı ve performansı
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Bütçe</TableHead>
                    <TableHead>Harcanan</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Kullanım</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const percentage = (category.totalSpent / category.totalBudget) * 100;
                    const remaining = category.totalBudget - category.totalSpent;
                    const status = remaining < 0 ? 'exceeded' : percentage > 90 ? 'warning' : 'on-track';
                    
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium">{category.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(category.totalBudget)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(category.totalSpent)}
                        </TableCell>
                        <TableCell className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(remaining)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={percentage} className="h-2 w-20" />
                            <span className="text-sm">%{percentage.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {getStatusIcon(status)}
                            <span className="ml-1">{getStatusText(status)}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Bütçe Detayları
              </CardTitle>
              <CardDescription>
                Tüm bütçelerin detaylı listesi ve durumu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bütçe Adı</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Dönem</TableHead>
                    <TableHead>Bütçe</TableHead>
                    <TableHead>Harcanan</TableHead>
                    <TableHead>Kalan</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{budget.name}</div>
                          {budget.description && (
                            <div className="text-sm text-muted-foreground">{budget.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{budget.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {budget.period === 'monthly' ? 'Aylık' : 
                           budget.period === 'quarterly' ? 'Üç Aylık' : 'Yıllık'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(budget.amount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(budget.spent)}
                      </TableCell>
                      <TableCell className={budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(budget.remaining)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(budget.status)}>
                          {getStatusIcon(budget.status)}
                          <span className="ml-1">{getStatusText(budget.status)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
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

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Bütçe Analizi
              </CardTitle>
              <CardDescription>
                Harcama trendleri ve bütçe performans analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Detaylı analiz grafikleri yakında eklenecek
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
