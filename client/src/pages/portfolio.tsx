import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InvestmentDialog } from '@/components/investment-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Edit,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';

interface Investment {
  id: string;
  title: string;
  type: 'stock' | 'crypto' | 'bond' | 'fund' | 'real_estate';
  symbol?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  currency: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  purchaseDate: string;
  lastUpdated: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalGain: number;
  totalGainPercentage: number;
  totalInvested: number;
  assetAllocation: Array<{
    type: string;
    value: number;
    percentage: number;
  }>;
  riskDistribution: Array<{
    level: string;
    value: number;
    percentage: number;
  }>;
}

export default function Portfolio () {
  const formatCurrency = useFormatCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

  // Fetch investments
  const { data: investments = [], isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/investments');
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch portfolio summary
  const { data: portfolioSummary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ['/api/portfolio/summary'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/portfolio/summary');
      return response.json();
    },
    staleTime: 30000,
  });

  const filteredInvestments = investments.filter((investment) => {
    const matchesSearch = investment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investment.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || investment.type === selectedType;
    const matchesRisk = selectedRisk === 'all' || investment.riskLevel === selectedRisk;

    return matchesSearch && matchesType && matchesRisk;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock': return <TrendingUp className="w-4 h-4" />;
      case 'crypto': return <DollarSign className="w-4 h-4" />;
      case 'bond': return <Target className="w-4 h-4" />;
      case 'fund': return <PieChart className="w-4 h-4" />;
      case 'real_estate': return <BarChart3 className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stock': return 'Hisse Senedi';
      case 'crypto': return 'Kripto Para';
      case 'bond': return 'Tahvil';
      case 'fund': return 'Fon';
      case 'real_estate': return 'Gayrimenkul';
      default: return type;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Düşük Risk';
      case 'medium': return 'Orta Risk';
      case 'high': return 'Yüksek Risk';
      default: return risk;
    }
  };

  const calculateGainLoss = (investment: Investment) => {
    if (!investment.currentPrice) {
      return { gain: 0, percentage: 0 };
    }

    const totalValue = investment.quantity * investment.currentPrice;
    const totalCost = investment.quantity * investment.purchasePrice;
    const gain = totalValue - totalCost;
    const percentage = (gain / totalCost) * 100;

    return { gain, percentage };
  };

  const handleAddInvestment = () => {
    setSelectedInvestment(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditInvestment = (investment: Investment) => {
    setSelectedInvestment(investment);
    setDialogMode('edit');
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Portföy Yönetimi</h1>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleAddInvestment}
        >
          <Plus className="w-4 h-4 mr-2" />
          Yatırım Ekle
        </Button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Portföy Değeri</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioSummary?.totalValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Toplam yatırım değeri
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kar/Zarar</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(portfolioSummary?.totalGain || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolioSummary?.totalGain || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioSummary?.totalGainPercentage?.toFixed(2)}% getiri
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yatırım</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioSummary?.totalInvested || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Yatırılan toplam miktar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Dağılımı</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {portfolioSummary?.riskDistribution?.slice(0, 2).map((risk) => (
                <div key={risk.level} className="flex justify-between text-xs">
                  <span>{getRiskLabel(risk.level)}</span>
                  <span>{risk.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Yatırım ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tür seç" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Türler</SelectItem>
            <SelectItem value="stock">Hisse Senedi</SelectItem>
            <SelectItem value="crypto">Kripto Para</SelectItem>
            <SelectItem value="bond">Tahvil</SelectItem>
            <SelectItem value="fund">Fon</SelectItem>
            <SelectItem value="real_estate">Gayrimenkul</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedRisk} onValueChange={setSelectedRisk}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Risk seviyesi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Risk Seviyeleri</SelectItem>
            <SelectItem value="low">Düşük Risk</SelectItem>
            <SelectItem value="medium">Orta Risk</SelectItem>
            <SelectItem value="high">Yüksek Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Investments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Yatırımlar</CardTitle>
          <CardDescription>
            Portföyünüzdeki tüm yatırımlar ve performansları
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investmentsLoading ? (
            <div className="text-center py-8">Yatırımlar yükleniyor...</div>
          ) : filteredInvestments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Yatırım</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead>Alış Fiyatı</TableHead>
                  <TableHead>Güncel Fiyat</TableHead>
                  <TableHead>Toplam Değer</TableHead>
                  <TableHead>Kar/Zarar</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestments.map((investment) => {
                  const { gain, percentage } = calculateGainLoss(investment);
                  const currentValue = investment.currentPrice ? investment.quantity * investment.currentPrice : 0;

                  return (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(investment.type)}
                          <div>
                            <div className="font-medium">{investment.title}</div>
                            {investment.symbol && (
                              <div className="text-sm text-muted-foreground">{investment.symbol}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(investment.type)}</Badge>
                      </TableCell>
                      <TableCell>{investment.quantity}</TableCell>
                      <TableCell>{formatCurrency(investment.purchasePrice)}</TableCell>
                      <TableCell>
                        {investment.currentPrice
                          ? formatCurrency(investment.currentPrice)
                          : 'Güncel değil'
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(currentValue)}</TableCell>
                      <TableCell>
                        <div className={`font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(gain)}
                        </div>
                        <div className={`text-sm ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskColor(investment.riskLevel)}>
                            {getRiskLabel(investment.riskLevel)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditInvestment(investment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold mb-2">Yatırım Bulunamadı</h3>
              <p className="text-muted-foreground">
                Henüz yatırımınız bulunmuyor. Yeni yatırım ekleyebilirsiniz.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investment Dialog */}
      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={selectedInvestment ? { ...selectedInvestment, accountId: (selectedInvestment as any).accountId || '' } : null}
        mode={dialogMode}
      />
    </div>
  );
}
