import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  BarChart3,
  Info,
  Zap,
  Droplets
} from 'lucide-react';

interface RiskScenario {
  cash: number;
  score: number;
  formattedCash: string;
  factors: {
    fxImpact: number;
    rateImpact: number;
    inflationImpact: number;
    liquidityImpact: number;
  };
}

interface RiskTableData {
  best: RiskScenario;
  base: RiskScenario;
  worst: RiskScenario;
  factors: {
    fx: string;
    rate: string;
    inflation: string;
    liquidity: string;
  };
  riskLevel: {
    level: string;
    color: string;
    description: string;
  };
}

interface RiskTableProps {
  data?: RiskTableData;
  isLoading?: boolean;
}

export default function RiskTable({ data, isLoading }: RiskTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Risk Analizi Tablosu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-12 bg-muted rounded w-full" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    if (score >= 60) return <TrendingUp className="w-4 h-4" />;
    if (score >= 40) return <AlertTriangle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const getImpactColor = (impact: number) => {
    if (impact <= 5) return 'text-green-600 bg-green-50';
    if (impact <= 15) return 'text-yellow-600 bg-yellow-50';
    if (impact <= 30) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const calculateTotalImpact = (factors: any) => {
    return factors.fxImpact + factors.rateImpact + factors.inflationImpact + factors.liquidityImpact;
  };

  const scenarios = [
    { key: 'best', label: 'En İyi Senaryo', icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600' },
    { key: 'base', label: 'Temel Senaryo', icon: <BarChart3 className="w-4 h-4" />, color: 'text-blue-600' },
    { key: 'worst', label: 'En Kötü Senaryo', icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-600' }
  ];

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Risk Analizi Tablosu
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Risk faktörlerinin her senaryodaki etkisini ve skora katkısını görüntüleyin</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Senaryo</th>
                  <th className="text-center p-3 font-semibold">Nakit Değer</th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Risk Skoru
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>100 - (Toplam Risk Etkisi)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Döviz Etkisi
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>|fxDelta| × 2</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      Faiz Etkisi
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>|rateDelta| × 1</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4" />
                      Enflasyon Etkisi
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>|inflationDelta| × 1.5</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      <Droplets className="w-4 h-4" />
                      Likidite Riski
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>liquidityGap × 2</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="text-center p-3 font-semibold">
                    <div className="flex items-center justify-center gap-1">
                      Toplam Etki
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tüm faktörlerin toplamı</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => {
                  const scenarioData = data?.[scenario.key as keyof RiskTableData] as RiskScenario;
                  const totalImpact = scenarioData ? calculateTotalImpact(scenarioData.factors) : 0;
                  
                  return (
                    <tr key={scenario.key} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={scenario.color}>{scenario.icon}</span>
                          <span className="font-medium">{scenario.label}</span>
                        </div>
                      </td>
                      
                      <td className="p-3 text-center">
                        <div className="font-semibold text-lg">
                          {scenarioData?.formattedCash || '₺0,00'}
                        </div>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${getScoreColor(scenarioData?.score || 0)} border`}>
                              {getScoreIcon(scenarioData?.score || 0)}
                              <span className="ml-1">{scenarioData?.score || 0}</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Skor Hesaplama:</p>
                              <p>100 - {totalImpact.toFixed(1)} = {(100 - totalImpact).toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground mt-2">Yüksek skor = Düşük risk</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${getImpactColor(scenarioData?.factors.fxImpact || 0)} border`}>
                              {(scenarioData?.factors.fxImpact || 0).toFixed(1)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Döviz Kuru Etkisi</p>
                              <p>Parametre: {data?.factors.fx}</p>
                              <p>Hesaplama: |{data?.factors.fx.replace('%', '')}| × 2 = {(scenarioData?.factors.fxImpact || 0).toFixed(1)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${getImpactColor(scenarioData?.factors.rateImpact || 0)} border`}>
                              {(scenarioData?.factors.rateImpact || 0).toFixed(1)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Faiz Oranı Etkisi</p>
                              <p>Parametre: {data?.factors.rate}</p>
                              <p>Hesaplama: |{data?.factors.rate.replace('%', '')}| × 1 = {(scenarioData?.factors.rateImpact || 0).toFixed(1)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${getImpactColor(scenarioData?.factors.inflationImpact || 0)} border`}>
                              {(scenarioData?.factors.inflationImpact || 0).toFixed(1)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Enflasyon Etkisi</p>
                              <p>Parametre: {data?.factors.inflation}</p>
                              <p>Hesaplama: |{data?.factors.inflation.replace('%', '')}| × 1.5 = {(scenarioData?.factors.inflationImpact || 0).toFixed(1)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`${getImpactColor(scenarioData?.factors.liquidityImpact || 0)} border`}>
                              {(scenarioData?.factors.liquidityImpact || 0).toFixed(1)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Likidite Riski</p>
                              <p>Parametre: {data?.factors.liquidity}</p>
                              <p>Hesaplama: {data?.factors.liquidity.replace('%', '')} × 2 = {(scenarioData?.factors.liquidityImpact || 0).toFixed(1)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      
                      <td className="p-3 text-center">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="font-bold">
                              {totalImpact.toFixed(1)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">Toplam Risk Etkisi</p>
                              <p>Döviz: {(scenarioData?.factors.fxImpact || 0).toFixed(1)}</p>
                              <p>Faiz: {(scenarioData?.factors.rateImpact || 0).toFixed(1)}</p>
                              <p>Enflasyon: {(scenarioData?.factors.inflationImpact || 0).toFixed(1)}</p>
                              <p>Likidite: {(scenarioData?.factors.liquidityImpact || 0).toFixed(1)}</p>
                              <p className="font-semibold border-t pt-1">Toplam: {totalImpact.toFixed(1)}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Özet Bilgi */}
          <div className="mt-6 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Skor Hesaplama Açıklaması
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-2">Risk Faktörleri:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>Döviz Etkisi:</strong> |fxDelta| × 2</li>
                  <li>• <strong>Faiz Etkisi:</strong> |rateDelta| × 1</li>
                  <li>• <strong>Enflasyon Etkisi:</strong> |inflationDelta| × 1.5</li>
                  <li>• <strong>Likidite Riski:</strong> liquidityGap × 2</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Skor Formülü:</p>
                <div className="bg-background p-3 rounded border">
                  <code className="text-sm">
                    Skor = 100 - Toplam Risk Etkisi
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Skor 0-100 arasında, yüksek skor düşük risk anlamına gelir.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
