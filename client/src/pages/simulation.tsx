import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Play,
  BarChart3,
  PieChart,
  Target,
  Info,
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SimulationParameter {
  name: string;
  currentValue: number;
  minValue: number;
  maxValue: number;
  step: number;
  unit: string;
  description: string;
}

interface SimulationScenario {
  name: string;
  parameters: {
    [key: string]: number;
  };
  results: {
    portfolioValue: number;
    totalGain: number;
    gainPercentage: number;
    riskScore: number;
    monthlyCashFlow: number;
  };
  summary: string;
}

interface SimulationResult {
  scenarios: SimulationScenario[];
  bestCase: SimulationScenario;
  baseCase: SimulationScenario;
  worstCase: SimulationScenario;
  insights: string[];
  recommendations: string[];
}

export default function Simulation () {
  const [selectedParam1, setSelectedParam1] = useState<string>('exchange_rate');
  const [selectedParam2, setSelectedParam2] = useState<string>('interest_rate');
  const [param1Value, setParam1Value] = useState<number>(30.5);
  const [param2Value, setParam2Value] = useState<number>(45.0);
  const [isRunning, setIsRunning] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Fetch simulation parameters
  const { data: parameters = [], isLoading: parametersLoading } = useQuery<SimulationParameter[]>({
    queryKey: ['/api/ai-agents/simulation/parameters'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai-agents/simulation/parameters');
      const data = await response.json();
      return data.data;
    },
    staleTime: 300000, // 5 minutes
  });

  // Update parameter values when selection changes
  const updateParameterValues = () => {
    const param1 = parameters.find(p => p.name === selectedParam1);
    const param2 = parameters.find(p => p.name === selectedParam2);

    if (param1) {
      setParam1Value(param1.currentValue);
    }
    if (param2) {
      setParam2Value(param2.currentValue);
    }
  };

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const response = await apiRequest('POST', '/api/ai-agents/simulation/run', {
        param1: {
          name: selectedParam1,
          value: param1Value,
        },
        param2: {
          name: selectedParam2,
          value: param2Value,
        },
        timeHorizon: 12,
      });

      const data = await response.json();
      setSimulationResult(data.data);

      toast({
        title: 'Simülasyon Tamamlandı',
        description: 'Senaryo analizi başarıyla oluşturuldu',
      });
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Simülasyon çalıştırılırken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getParameterLabel = (name: string) => {
    switch (name) {
      case 'exchange_rate': return 'Döviz Kuru (USD/TRY)';
      case 'interest_rate': return 'Faiz Oranı';
      case 'inflation_rate': return 'Enflasyon Oranı';
      case 'stock_market_return': return 'Borsa Getiri Oranı';
      case 'crypto_volatility': return 'Kripto Para Volatilitesi';
      default: return name;
    }
  };

  const getParameterIcon = (name: string) => {
    switch (name) {
      case 'exchange_rate': return <DollarSign className="w-4 h-4" />;
      case 'interest_rate': return <TrendingUp className="w-4 h-4" />;
      case 'inflation_rate': return <TrendingUp className="w-4 h-4" />;
      case 'stock_market_return': return <BarChart3 className="w-4 h-4" />;
      case 'crypto_volatility': return <AlertTriangle className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getScenarioColor = (scenario: SimulationScenario) => {
    if (scenario.name === 'Best Case') {
      return 'border-green-200 bg-green-50';
    }
    if (scenario.name === 'Worst Case') {
      return 'border-red-200 bg-red-50';
    }
    if (scenario.name === 'Base Case') {
      return 'border-blue-200 bg-blue-50';
    }
    return 'border-gray-200 bg-gray-50';
  };

  const getGainColor = (gain: number) => {
    if (gain > 0) {
      return 'text-green-600';
    }
    if (gain < 0) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Simülasyon Analizi</h1>
          <p className="text-muted-foreground mt-2">
            "Ne olursa ne olur" senaryoları ile portföy performansını analiz edin
          </p>
        </div>
        <Button
          onClick={handleRunSimulation}
          disabled={isRunning || parametersLoading}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Çalışıyor...' : 'Simülasyon Çalıştır'}
        </Button>
      </div>

      {/* Parameter Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Simülasyon Parametreleri
          </CardTitle>
          <CardDescription>
            2 parametre seçerek portföyünüzün farklı senaryolardaki performansını analiz edin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {parametersLoading ? (
            <div className="text-center py-8">Parametreler yükleniyor...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Parameter 1 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">1. Parametre</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {getParameterIcon(selectedParam1)}
                    <span className="font-medium">{getParameterLabel(selectedParam1)}</span>
                  </div>
                </div>

                {parameters.find(p => p.name === selectedParam1) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Mevcut: {param1Value.toFixed(1)}</span>
                      <span>
                        {parameters.find(p => p.name === selectedParam1)?.unit}
                      </span>
                    </div>
                    <Slider
                      value={[param1Value]}
                      onValueChange={([value]) => setParam1Value(value)}
                      min={parameters.find(p => p.name === selectedParam1)?.minValue || 0}
                      max={parameters.find(p => p.name === selectedParam1)?.maxValue || 100}
                      step={parameters.find(p => p.name === selectedParam1)?.step || 0.1}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={param1Value}
                      onChange={(e) => setParam1Value(Number(e.target.value))}
                      min={parameters.find(p => p.name === selectedParam1)?.minValue}
                      max={parameters.find(p => p.name === selectedParam1)?.maxValue}
                      step={parameters.find(p => p.name === selectedParam1)?.step}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Parameter 2 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">2. Parametre</Label>
                  <div className="flex items-center gap-2 mt-2">
                    {getParameterIcon(selectedParam2)}
                    <span className="font-medium">{getParameterLabel(selectedParam2)}</span>
                  </div>
                </div>

                {parameters.find(p => p.name === selectedParam2) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Mevcut: {param2Value.toFixed(1)}</span>
                      <span>
                        {parameters.find(p => p.name === selectedParam2)?.unit}
                      </span>
                    </div>
                    <Slider
                      value={[param2Value]}
                      onValueChange={([value]) => setParam2Value(value)}
                      min={parameters.find(p => p.name === selectedParam2)?.minValue || 0}
                      max={parameters.find(p => p.name === selectedParam2)?.maxValue || 100}
                      step={parameters.find(p => p.name === selectedParam2)?.step || 0.1}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={param2Value}
                      onChange={(e) => setParam2Value(Number(e.target.value))}
                      min={parameters.find(p => p.name === selectedParam2)?.minValue}
                      max={parameters.find(p => p.name === selectedParam2)?.maxValue}
                      step={parameters.find(p => p.name === selectedParam2)?.step}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parameter Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium">Seçilen Parametreler:</Label>
              <div className="mt-2 space-y-2">
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  {getParameterIcon(selectedParam1)}
                  {getParameterLabel(selectedParam1)}: {param1Value.toFixed(1)}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  {getParameterIcon(selectedParam2)}
                  {getParameterLabel(selectedParam2)}: {param2Value.toFixed(1)}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Mevcut Değerler:</Label>
              <div className="mt-2 text-sm text-muted-foreground">
                <div>{getParameterLabel(selectedParam1)}: {parameters.find(p => p.name === selectedParam1)?.currentValue.toFixed(1)}</div>
                <div>{getParameterLabel(selectedParam2)}: {parameters.find(p => p.name === selectedParam2)?.currentValue.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Results */}
      {simulationResult && (
        <div className="space-y-6">
          {/* Scenario Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Best Case */}
            <Card className={getScenarioColor(simulationResult.bestCase)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <TrendingUp className="w-5 h-5" />
                  En İyi Senaryo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(simulationResult.bestCase.results.portfolioValue, 'TRY')}
                  </div>
                  <div className={`text-lg font-medium ${getGainColor(simulationResult.bestCase.results.totalGain)}`}>
                    {simulationResult.bestCase.results.totalGain >= 0 ? '+' : ''}
                    {formatCurrency(simulationResult.bestCase.results.totalGain, 'TRY')}
                  </div>
                  <div className={`text-sm ${getGainColor(simulationResult.bestCase.results.gainPercentage)}`}>
                    {simulationResult.bestCase.results.gainPercentage >= 0 ? '+' : ''}
                    {simulationResult.bestCase.results.gainPercentage.toFixed(2)}% getiri
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Risk: {simulationResult.bestCase.results.riskScore}/10
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Base Case */}
            <Card className={getScenarioColor(simulationResult.baseCase)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <PieChart className="w-5 h-5" />
                  Temel Senaryo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(simulationResult.baseCase.results.portfolioValue, 'TRY')}
                  </div>
                  <div className={`text-lg font-medium ${getGainColor(simulationResult.baseCase.results.totalGain)}`}>
                    {simulationResult.baseCase.results.totalGain >= 0 ? '+' : ''}
                    {formatCurrency(simulationResult.baseCase.results.totalGain, 'TRY')}
                  </div>
                  <div className={`text-sm ${getGainColor(simulationResult.baseCase.results.gainPercentage)}`}>
                    {simulationResult.baseCase.results.gainPercentage >= 0 ? '+' : ''}
                    {simulationResult.baseCase.results.gainPercentage.toFixed(2)}% getiri
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Risk: {simulationResult.baseCase.results.riskScore}/10
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Worst Case */}
            <Card className={getScenarioColor(simulationResult.worstCase)}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <TrendingDown className="w-5 h-5" />
                  En Kötü Senaryo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(simulationResult.worstCase.results.portfolioValue, 'TRY')}
                  </div>
                  <div className={`text-lg font-medium ${getGainColor(simulationResult.worstCase.results.totalGain)}`}>
                    {simulationResult.worstCase.results.totalGain >= 0 ? '+' : ''}
                    {formatCurrency(simulationResult.worstCase.results.totalGain, 'TRY')}
                  </div>
                  <div className={`text-sm ${getGainColor(simulationResult.worstCase.results.gainPercentage)}`}>
                    {simulationResult.worstCase.results.gainPercentage >= 0 ? '+' : ''}
                    {simulationResult.worstCase.results.gainPercentage.toFixed(2)}% getiri
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Risk: {simulationResult.worstCase.results.riskScore}/10
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  AI Analizi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {simulationResult.insights.map((insight, index) => (
                    <Alert key={index}>
                      <AlertDescription>{insight}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Öneriler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {simulationResult.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Simülasyon, seçtiğiniz parametrelerin portföyünüz üzerindeki etkilerini analiz eder.
          Sonuçlar tahmini değerlerdir ve gerçek piyasa koşulları farklı olabilir.
        </AlertDescription>
      </Alert>
    </div>
  );
}
