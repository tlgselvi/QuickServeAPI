import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  PieChart,
  BarChart3,
  Lightbulb,
  Shield,
  Zap
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { toast } from '@/hooks/use-toast';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Pie, Tooltip, Legend } from 'recharts';

type RiskProfile = 'low' | 'medium' | 'high';

interface PortfolioInput {
  cash: number;
  deposits: number;
  forex: number;
  stocks: number;
  bonds: number;
  crypto: number;
  commodities: number;
  realEstate: number;
}

interface AdvisorResult {
  riskScore: number;
  riskLevel: RiskProfile;
  tips: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    action?: string;
    formattedDescription: string;
  }>;
  currentAllocation: PortfolioInput & { formatted: Record<string, string> };
  targetAllocation: PortfolioInput & { formatted: Record<string, string> };
  recommendations: {
    rebalance: boolean;
    actionItems: string[];
    expectedReturn: number;
    expectedReturnFormatted: string;
    actionItemsCount: number;
  };
  chartData: {
    current: Array<{ name: string; value: number; color: string }>;
    target: Array<{ name: string; value: number; color: string }>;
  };
  summary: {
    riskScoreText: string;
    rebalanceNeeded: boolean;
    topRecommendation: string;
  };
}

interface RiskProfileInfo {
  name: string;
  description: string;
  characteristics: string[];
  targetAllocation: PortfolioInput;
  suitableFor: string[];
}

export default function AdvisorPanel() {
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('medium');
  const [portfolio, setPortfolio] = useState<PortfolioInput>({
    cash: 100000,
    deposits: 200000,
    forex: 50000,
    stocks: 150000,
    bonds: 100000,
    crypto: 25000,
    commodities: 15000,
    realEstate: 50000
  });

  const [lastResult, setLastResult] = useState<AdvisorResult | null>(null);

  // Risk profilleri bilgisi
  const { data: riskProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['risk-profiles'],
    queryFn: async () => {
      const response = await apiRequest('/api/advisor/risk-profiles');
      const data = await response.json();
      return data.profiles as Record<RiskProfile, RiskProfileInfo>;
    },
  });

  // Varlık sınıfları bilgisi
  const { data: assetClasses, isLoading: assetsLoading } = useQuery({
    queryKey: ['asset-classes'],
    queryFn: async () => {
      const response = await apiRequest('/api/advisor/asset-classes');
      const data = await response.json();
      return data.assetClasses;
    },
  });

  // Portföy analizi mutation
  const analyzePortfolioMutation = useMutation({
    mutationFn: async (input: { portfolio: PortfolioInput; riskProfile: RiskProfile }) => {
      const response = await apiRequest('POST', '/api/advisor/portfolio', input);
      const data = await response.json();
      return data;
    },
    onSuccess: (data: AdvisorResult) => {
      setLastResult(data);
      toast({
        title: "Portföy analizi tamamlandı",
        description: `Risk skoru: ${data.riskScore}/100 - ${data.summary.riskScoreText}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analiz hatası",
        description: error.message || "Portföy analizi yapılırken hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Portföy analizi çalıştırma
  const handleAnalyzePortfolio = () => {
    analyzePortfolioMutation.mutate({ portfolio, riskProfile });
  };

  // Risk profili değiştiğinde otomatik analiz
  useEffect(() => {
    if (lastResult) {
      handleAnalyzePortfolio();
    }
  }, [riskProfile]);

  // Risk skoru rengi
  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Öncelik rengi
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  // Kategori ikonu
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'allocation': return <Target className="w-4 h-4" />;
      case 'risk': return <Shield className="w-4 h-4" />;
      case 'diversification': return <PieChart className="w-4 h-4" />;
      case 'timing': return <Zap className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Profili Seçimi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Risk Profili Seçimi
          </CardTitle>
          <CardDescription>
            Yatırım hedeflerinize uygun risk profilini seçin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {riskProfiles && Object.entries(riskProfiles).map(([key, profile]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  riskProfile === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setRiskProfile(key as RiskProfile)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{profile.name}</h3>
                  <Badge variant={riskProfile === key ? 'default' : 'secondary'}>
                    {key === 'low' ? 'Düşük' : key === 'medium' ? 'Orta' : 'Yüksek'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{profile.description}</p>
                <div className="space-y-1">
                  {profile.characteristics.slice(0, 2).map((char, index) => (
                    <p key={index} className="text-xs text-muted-foreground">• {char}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portföy Analizi */}
      {lastResult && (
        <div className="space-y-6">
          {/* Risk Skoru ve Özet */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Portföy Analizi Sonuçları
              </CardTitle>
              <CardDescription>
                {lastResult.summary.riskScoreText}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Risk Skoru */}
                <div className="space-y-3">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getRiskScoreColor(lastResult.riskScore)}`}>
                      {lastResult.riskScore}
                    </div>
                    <p className="text-sm text-muted-foreground">Risk Skoru</p>
                  </div>
                  <Progress value={lastResult.riskScore} className="h-2" />
                </div>

                {/* Beklenen Getiri */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {lastResult.recommendations.expectedReturnFormatted}
                  </div>
                  <p className="text-sm text-muted-foreground">Beklenen Getiri</p>
                </div>

                {/* Yeniden Dengeleme */}
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {lastResult.summary.rebalanceNeeded ? (
                      <span className="text-orange-600">Gerekli</span>
                    ) : (
                      <span className="text-green-600">Uygun</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Yeniden Dengeleme</p>
                </div>

                {/* Aksiyon Öğeleri */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lastResult.recommendations.actionItemsCount}
                  </div>
                  <p className="text-sm text-muted-foreground">Öneri</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grafikler ve Detaylar */}
          <Tabs defaultValue="allocation" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="allocation">Dağılım Karşılaştırması</TabsTrigger>
              <TabsTrigger value="recommendations">Öneriler</TabsTrigger>
              <TabsTrigger value="details">Detaylı Analiz</TabsTrigger>
            </TabsList>

            {/* Dağılım Karşılaştırması */}
            <TabsContent value="allocation" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mevcut Dağılım */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Mevcut Dağılım
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={lastResult.chartData.current}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, value }) => `${name}: %${value.toFixed(1)}`}
                          >
                            {lastResult.chartData.current.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `%${value.toFixed(1)}`} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Hedef Dağılım */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Hedef Dağılım
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={lastResult.chartData.target}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, value }) => `${name}: %${value.toFixed(1)}`}
                          >
                            {lastResult.chartData.target.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `%${value.toFixed(1)}`} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Karşılaştırma Tablosu */}
              <Card>
                <CardHeader>
                  <CardTitle>Dağılım Karşılaştırması</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Varlık Sınıfı</th>
                          <th className="text-right p-2">Mevcut</th>
                          <th className="text-right p-2">Hedef</th>
                          <th className="text-right p-2">Fark</th>
                          <th className="text-center p-2">Aksiyon</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(lastResult.currentAllocation).filter(key => key !== 'formatted').map((key) => {
                          const current = lastResult.currentAllocation[key as keyof PortfolioInput];
                          const target = lastResult.targetAllocation[key as keyof PortfolioInput];
                          const difference = target - current;
                          const needsAction = Math.abs(difference) > 5;
                          
                          return (
                            <tr key={key} className="border-b">
                              <td className="p-2 font-medium">{key}</td>
                              <td className="p-2 text-right">%{current.toFixed(1)}</td>
                              <td className="p-2 text-right">%{target.toFixed(1)}</td>
                              <td className={`p-2 text-right ${difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {difference > 0 ? '+' : ''}{difference.toFixed(1)}%
                              </td>
                              <td className="p-2 text-center">
                                {needsAction ? (
                                  <Badge variant={difference > 0 ? 'default' : 'destructive'}>
                                    {difference > 0 ? 'Artır' : 'Azalt'}
                                  </Badge>
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Öneriler */}
            <TabsContent value="recommendations" className="space-y-4">
              <div className="space-y-4">
                {lastResult.tips.map((tip) => (
                  <Card key={tip.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <Badge variant={getPriorityColor(tip.priority)} className="flex items-center gap-1">
                            {getCategoryIcon(tip.category)}
                            {tip.priority === 'high' ? 'Yüksek' : tip.priority === 'medium' ? 'Orta' : 'Düşük'}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">{tip.title}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{tip.description}</p>
                          {tip.action && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-blue-900">Önerilen Aksiyon:</p>
                              <p className="text-sm text-blue-800">{tip.action}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Detaylı Analiz */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aksiyon Öğeleri */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Aksiyon Öğeleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {lastResult.recommendations.actionItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Profili Bilgisi */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Risk Profili: {riskProfiles?.[riskProfile]?.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {riskProfiles && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {riskProfiles[riskProfile].description}
                        </p>
                        <div>
                          <h5 className="font-medium mb-2">Özellikler:</h5>
                          <ul className="text-sm space-y-1">
                            {riskProfiles[riskProfile].characteristics.map((char, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-600" />
                                {char}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Analiz Çalıştır Butonu */}
      <div className="flex justify-center">
        <Button 
          onClick={handleAnalyzePortfolio}
          disabled={analyzePortfolioMutation.isPending}
          size="lg"
          className="flex items-center gap-2"
        >
          {analyzePortfolioMutation.isPending ? (
            <Zap className="w-5 h-5 animate-spin" />
          ) : (
            <BarChart3 className="w-5 h-5" />
          )}
          {analyzePortfolioMutation.isPending ? 'Analiz Ediliyor...' : 'Portföy Analizi Yap'}
        </Button>
      </div>
    </div>
  );
}
