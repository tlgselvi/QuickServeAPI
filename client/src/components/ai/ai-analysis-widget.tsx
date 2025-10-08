import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Target, Heart, BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorDisplay } from '@/components/ui/error-display';
import { logger } from '@/lib/logger';

interface AIAnalysisResult {
  analysisType: string;
  data: any;
  metadata: {
    generatedAt: string;
    timeframe: string;
  };
}

interface AIAnalysisWidgetProps {
  userId: string;
  className?: string;
}

export function AIAnalysisWidget({ userId, className }: AIAnalysisWidgetProps) {
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('month');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);

  const analysisTypes = [
    { value: 'trend', label: 'Trend Analizi', icon: TrendingUp, color: 'blue' },
    { value: 'risk', label: 'Risk Değerlendirmesi', icon: AlertTriangle, color: 'red' },
    { value: 'recommendation', label: 'Öneriler', icon: Target, color: 'green' },
    { value: 'health', label: 'Finansal Sağlık', icon: Heart, color: 'purple' },
    { value: 'forecast', label: 'Tahmin', icon: BarChart3, color: 'orange' },
  ];

  const timeframes = [
    { value: 'week', label: 'Son Hafta' },
    { value: 'month', label: 'Son Ay' },
    { value: 'quarter', label: 'Son Çeyrek' },
    { value: 'year', label: 'Son Yıl' },
  ];

  const handleAnalysis = async () => {
    if (!selectedAnalysis) {
      setError('Lütfen bir analiz türü seçin');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          analysisType: selectedAnalysis,
          timeframe: selectedTimeframe,
          includeInvestments: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analiz sırasında hata oluştu');
      }

      setResult(data.data);
      logger.info('AI analysis completed', { analysisType: selectedAnalysis, timeframe: selectedTimeframe });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
      logger.error('AI analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysisResult = () => {
    if (!result) return null;

    const analysisType = analysisTypes.find(type => type.value === selectedAnalysis);
    const IconComponent = analysisType?.icon || Brain;

    switch (selectedAnalysis) {
      case 'trend':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Trend Analizi</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${result.data.totalIncome?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Toplam Gelir</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  ${result.data.totalExpenses?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Toplam Gider</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${(result.data.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${result.data.netCashFlow?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Net Nakit Akışı</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {result.data.confidence || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Güven Skoru</div>
              </div>
            </div>

            {result.data.trends && (
              <div className="space-y-2">
                <h4 className="font-medium">Trendler:</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={result.data.trends.income === 'increasing' ? 'default' : 'secondary'}>
                    Gelir: {result.data.trends.income === 'increasing' ? '📈 Artıyor' : 
                           result.data.trends.income === 'decreasing' ? '📉 Azalıyor' : '➡️ Sabit'}
                  </Badge>
                  <Badge variant={result.data.trends.expenses === 'decreasing' ? 'default' : 'secondary'}>
                    Gider: {result.data.trends.expenses === 'increasing' ? '📈 Artıyor' : 
                           result.data.trends.expenses === 'decreasing' ? '📉 Azalıyor' : '➡️ Sabit'}
                  </Badge>
                  <Badge variant={result.data.trends.savings === 'increasing' ? 'default' : 'secondary'}>
                    Tasarruf: {result.data.trends.savings === 'increasing' ? '📈 Artıyor' : 
                              result.data.trends.savings === 'decreasing' ? '📉 Azalıyor' : '➡️ Sabit'}
                  </Badge>
                </div>
              </div>
            )}

            {result.data.insights && result.data.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Öngörüler:</h4>
                <ul className="space-y-1">
                  {result.data.insights.map((insight: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">• {insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.data.recommendations && result.data.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Öneriler:</h4>
                <ul className="space-y-1">
                  {result.data.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">Risk Değerlendirmesi</h3>
            </div>

            <div className="text-center">
              <div className={`text-4xl font-bold ${result.data.riskScore <= 3 ? 'text-green-600' : 
                                                      result.data.riskScore <= 6 ? 'text-yellow-600' : 
                                                      result.data.riskScore <= 8 ? 'text-orange-600' : 'text-red-600'}`}>
                {result.data.riskScore || 0}/10
              </div>
              <div className="text-sm text-muted-foreground">Risk Skoru</div>
              <Badge variant={result.data.riskLevel === 'low' ? 'default' : 
                             result.data.riskLevel === 'medium' ? 'secondary' : 'destructive'}>
                {result.data.riskLevel === 'low' ? 'Düşük Risk' :
                 result.data.riskLevel === 'medium' ? 'Orta Risk' :
                 result.data.riskLevel === 'high' ? 'Yüksek Risk' : 'Kritik Risk'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold">{result.data.liquidityRisk || 0}/10</div>
                <div className="text-sm text-muted-foreground">Likidite Riski</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{result.data.creditRisk || 0}/10</div>
                <div className="text-sm text-muted-foreground">Kredi Riski</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{result.data.marketRisk || 0}/10</div>
                <div className="text-sm text-muted-foreground">Piyasa Riski</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{result.data.operationalRisk || 0}/10</div>
                <div className="text-sm text-muted-foreground">Operasyonel Risk</div>
              </div>
            </div>

            {result.data.riskFactors && result.data.riskFactors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Risk Faktörleri:</h4>
                <ul className="space-y-1">
                  {result.data.riskFactors.map((factor: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground">• {factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.data.mitigationStrategies && result.data.mitigationStrategies.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Risk Azaltma Stratejileri:</h4>
                <ul className="space-y-1">
                  {result.data.mitigationStrategies.map((strategy: string, index: number) => (
                    <li key={index} className="text-sm">• {strategy}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'health':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Finansal Sağlık</h3>
            </div>

            <div className="text-center">
              <div className={`text-4xl font-bold ${result.data.overallScore >= 80 ? 'text-green-600' : 
                                                      result.data.overallScore >= 60 ? 'text-yellow-600' : 
                                                      result.data.overallScore >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                {result.data.overallScore || 0}/100
              </div>
              <div className="text-sm text-muted-foreground">Genel Sağlık Skoru</div>
              <Badge variant={result.data.healthLevel === 'excellent' ? 'default' : 
                             result.data.healthLevel === 'good' ? 'secondary' : 'destructive'}>
                {result.data.healthLevel === 'excellent' ? 'Mükemmel' :
                 result.data.healthLevel === 'good' ? 'İyi' :
                 result.data.healthLevel === 'fair' ? 'Orta' :
                 result.data.healthLevel === 'poor' ? 'Zayıf' : 'Kritik'}
              </Badge>
            </div>

            {result.data.components && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{result.data.components.liquidity || 0}/100</div>
                  <div className="text-sm text-muted-foreground">Likidite</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{result.data.components.solvency || 0}/100</div>
                  <div className="text-sm text-muted-foreground">Ödeme Gücü</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{result.data.components.profitability || 0}/100</div>
                  <div className="text-sm text-muted-foreground">Karlılık</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{result.data.components.efficiency || 0}/100</div>
                  <div className="text-sm text-muted-foreground">Verimlilik</div>
                </div>
              </div>
            )}

            {result.data.strengths && result.data.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Güçlü Yönler:</h4>
                <ul className="space-y-1">
                  {result.data.strengths.map((strength: string, index: number) => (
                    <li key={index} className="text-sm text-green-700">• {strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.data.weaknesses && result.data.weaknesses.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Zayıf Yönler:</h4>
                <ul className="space-y-1">
                  {result.data.weaknesses.map((weakness: string, index: number) => (
                    <li key={index} className="text-sm text-red-700">• {weakness}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.data.improvementAreas && result.data.improvementAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">İyileştirme Alanları:</h4>
                <ul className="space-y-1">
                  {result.data.improvementAreas.map((area: string, index: number) => (
                    <li key={index} className="text-sm text-blue-700">• {area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconComponent className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                {analysisType?.label || 'AI Analizi'}
              </h3>
            </div>
            <div className="text-sm text-muted-foreground">
              <pre>{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          AI Finansal Analiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Analiz Türü:</label>
          <Select value={selectedAnalysis} onValueChange={setSelectedAnalysis}>
            <SelectTrigger>
              <SelectValue placeholder="Analiz türü seçin" />
            </SelectTrigger>
            <SelectContent>
              {analysisTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Zaman Aralığı:</label>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger>
              <SelectValue placeholder="Zaman aralığı seçin" />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((timeframe) => (
                <SelectItem key={timeframe.value} value={timeframe.value}>
                  {timeframe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Analyze Button */}
        <Button 
          onClick={handleAnalysis} 
          disabled={loading || !selectedAnalysis}
          className="w-full"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Analiz Ediliyor...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              AI Analiz Başlat
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            error={error}
            onRetry={() => setError(null)}
            variant="minimal"
            size="sm"
          />
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            {renderAnalysisResult()}
            
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
              Analiz: {result.metadata.timeframe} | 
              Oluşturulma: {new Date(result.metadata.generatedAt).toLocaleString('tr-TR')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
