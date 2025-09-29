import { useState } from 'react';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Info,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { toast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SimulationParameters {
  fxDelta: number;
  rateDelta: number;
  inflationDelta: number;
  horizonMonths: 3 | 6 | 12;
}

interface SimulationResult {
  id: string;
  parameters: SimulationParameters;
  currentState: {
    cash: number;
    debt: number;
    netWorth: number;
    formattedCash: string;
    formattedDebt: string;
    formattedNetWorth: string;
  };
  projections: Array<{
    month: number;
    cash: number;
    debt: number;
    netWorth: number;
    formattedCash: string;
    formattedDebt: string;
    formattedNetWorth: string;
  }>;
  summary: {
    text: string;
    formattedSummary: string;
    cashDeficitMonth?: number;
    totalCashChange: number;
    totalDebtChange: number;
    totalNetWorthChange: number;
    formattedCashChange: string;
    formattedDebtChange: string;
    formattedNetWorthChange: string;
  };
  createdAt: string;
}

export default function SimulationPanel() {
  const formatCurrency = useFormatCurrency();
  const [parameters, setParameters] = useState<SimulationParameters>({
    fxDelta: 0,
    rateDelta: 0,
    inflationDelta: 0,
    horizonMonths: 6
  });

  const [lastResult, setLastResult] = useState<SimulationResult | null>(null);

  // Simülasyon çalıştırma mutation
  const runSimulationMutation = useMutation({
    mutationFn: async (params: SimulationParameters) => {
      const response = await apiRequest('POST', '/api/simulation/run', params);
      const data = await response.json();
      return data;
    },
    onSuccess: (data: SimulationResult) => {
      setLastResult(data);
      toast({
        title: "Simülasyon tamamlandı",
        description: data.summary.formattedSummary,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Simülasyon hatası",
        description: error.message || "Simülasyon çalıştırılırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Simülasyon geçmişi
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['simulation-history'],
    queryFn: async () => {
      const response = await apiRequest('/api/simulation/history');
      const data = await response.json();
      return data.runs || [];
    },
  });

  // Parametre güncelleme
  const updateParameter = (key: keyof SimulationParameters, value: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Simülasyon çalıştırma
  const handleRunSimulation = () => {
    runSimulationMutation.mutate(parameters);
  };

  // Grafik verisi hazırlama
  const prepareChartData = (result: SimulationResult) => {
    return result.projections.map(proj => ({
      month: `${proj.month}. Ay`,
      nakit: proj.cash,
      borç: proj.debt,
      netDeğer: proj.netWorth,
      formattedNakit: proj.formattedCash,
      formattedBorç: proj.formattedDebt,
      formattedNetDeğer: proj.formattedNetWorth
    }));
  };

  // Risk seviyesi belirleme
  const getRiskLevel = (params: SimulationParameters) => {
    const totalImpact = Math.abs(params.fxDelta) + Math.abs(params.rateDelta) + Math.abs(params.inflationDelta);
    if (totalImpact > 20) return { level: 'Yüksek', color: 'destructive' };
    if (totalImpact > 10) return { level: 'Orta', color: 'default' };
    return { level: 'Düşük', color: 'secondary' };
  };

  const riskLevel = getRiskLevel(parameters);

  return (
    <div className="space-y-6">
      {/* Parametre Girişi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Simülasyon Parametreleri
          </CardTitle>
          <CardDescription>
            Finansal senaryoları test etmek için parametreleri ayarlayın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Döviz Kuru Değişimi */}
            <div className="space-y-2">
              <Label htmlFor="fxDelta">Döviz Kuru Değişimi</Label>
              <div className="relative">
                <Input
                  id="fxDelta"
                  type="number"
                  value={parameters.fxDelta}
                  onChange={(e) => updateParameter('fxDelta', Number(e.target.value))}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                USD/TRY kurundaki yıllık değişim
              </p>
            </div>

            {/* Faiz Oranı Değişimi */}
            <div className="space-y-2">
              <Label htmlFor="rateDelta">Faiz Oranı Değişimi</Label>
              <div className="relative">
                <Input
                  id="rateDelta"
                  type="number"
                  value={parameters.rateDelta}
                  onChange={(e) => updateParameter('rateDelta', Number(e.target.value))}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Faiz oranlarındaki yıllık değişim
              </p>
            </div>

            {/* Enflasyon Değişimi */}
            <div className="space-y-2">
              <Label htmlFor="inflationDelta">Enflasyon Değişimi</Label>
              <div className="relative">
                <Input
                  id="inflationDelta"
                  type="number"
                  value={parameters.inflationDelta}
                  onChange={(e) => updateParameter('inflationDelta', Number(e.target.value))}
                  placeholder="0"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enflasyon oranındaki değişim
              </p>
            </div>

            {/* Simülasyon Süresi */}
            <div className="space-y-2">
              <Label htmlFor="horizonMonths">Simülasyon Süresi</Label>
              <Select
                value={parameters.horizonMonths.toString()}
                onValueChange={(value) => updateParameter('horizonMonths', Number(value) as 3 | 6 | 12)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Süre seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Ay</SelectItem>
                  <SelectItem value="6">6 Ay</SelectItem>
                  <SelectItem value="12">12 Ay</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Projeksiyon süresi
              </p>
            </div>
          </div>

          {/* Risk Seviyesi ve Çalıştır Butonu */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Badge variant={riskLevel.color as any}>
                Risk Seviyesi: {riskLevel.level}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Toplam etki: {Math.abs(parameters.fxDelta) + Math.abs(parameters.rateDelta) + Math.abs(parameters.inflationDelta)}%
              </span>
            </div>
            
            <Button 
              onClick={handleRunSimulation}
              disabled={runSimulationMutation.isPending}
              className="flex items-center gap-2"
            >
              {runSimulationMutation.isPending ? (
                <Zap className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {runSimulationMutation.isPending ? 'Çalıştırılıyor...' : 'Simülasyonu Çalıştır'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simülasyon Sonuçları */}
      {lastResult && (
        <div className="space-y-6">
          {/* Özet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Simülasyon Sonuçları
              </CardTitle>
              <CardDescription>
                {lastResult.summary.formattedSummary}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mevcut Durum */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Mevcut Durum</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Nakit:</span>
                      <span className="font-medium">{lastResult.currentState.formattedCash}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Borç:</span>
                      <span className="font-medium">{lastResult.currentState.formattedDebt}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Değer:</span>
                      <span className="font-medium">{lastResult.currentState.formattedNetWorth}</span>
                    </div>
                  </div>
                </div>

                {/* Değişimler */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Değişimler</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Nakit:</span>
                      <span className={`font-medium ${lastResult.summary.totalCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {lastResult.summary.formattedCashChange}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Borç:</span>
                      <span className={`font-medium ${lastResult.summary.totalDebtChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {lastResult.summary.formattedDebtChange}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Değer:</span>
                      <span className={`font-medium ${lastResult.summary.totalNetWorthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {lastResult.summary.formattedNetWorthChange}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Uyarılar */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Uyarılar</h4>
                  {lastResult.summary.cashDeficitMonth ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {lastResult.summary.cashDeficitMonth}. ayda nakit açığı riski
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Nakit açığı riski düşük
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grafik */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Projeksiyon Grafiği
              </CardTitle>
              <CardDescription>
                {parameters.horizonMonths} aylık nakit, borç ve net değer projeksiyonu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareChartData(lastResult)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'nakit' ? 'Nakit' : name === 'borç' ? 'Borç' : 'Net Değer'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="nakit" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      name="Nakit"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="borç" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Borç"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netDeğer" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Net Değer"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simülasyon Geçmişi */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Simülasyon Geçmişi
            </CardTitle>
            <CardDescription>
              Son simülasyon çalıştırmalarınız
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice(0, 5).map((run: any) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{run.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>FX: {run.parameters.fxDelta}%</span>
                      <span>Rate: {run.parameters.rateDelta}%</span>
                      <span>Inf: {run.parameters.inflationDelta}%</span>
                      <span>{run.parameters.horizonMonths} ay</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.formattedCreatedAt}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
