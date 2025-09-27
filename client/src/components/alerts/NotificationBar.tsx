import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Zap,
  Shield,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useFormatCurrency } from '@/lib/utils/formatCurrency';

export interface FutureRiskAlert {
  id: string;
  type: 'futureRisk' | 'liquidityRisk' | 'cashDeficit' | 'highRisk' | 'inflationRisk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  probability: number; // 0-100
  timeHorizon: number; // months
  impact: number; // 0-100
  recommendedAction?: string;
  source: 'simulation' | 'risk' | 'advisor';
  createdAt: string;
}

interface NotificationBarProps {
  className?: string;
}

export default function NotificationBar({ className }: NotificationBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const formatCurrency = useFormatCurrency();

  // Simülasyon verilerinden gelecek risk uyarıları
  const { data: simulationAlerts, isLoading: simulationLoading } = useQuery({
    queryKey: ['simulation-alerts'],
    queryFn: async () => {
      try {
        // Son simülasyon çalıştırmasından risk uyarıları al
        const response = await apiRequest('/api/simulation/history?limit=1');
        const data = await response.json();
        const lastRun = data.runs?.[0];
        
        if (!lastRun) return [];

        const alerts: FutureRiskAlert[] = [];

        // Nakit açığı uyarısı
        if (lastRun.results?.cashDeficitMonth) {
          alerts.push({
            id: `cash-deficit-${lastRun.id}`,
            type: 'cashDeficit',
            severity: lastRun.results.cashDeficitMonth <= 2 ? 'critical' : 
                     lastRun.results.cashDeficitMonth <= 4 ? 'high' : 'medium',
            title: 'Nakit Açığı Riski',
            message: `${lastRun.results.cashDeficitMonth} ay içinde nakit açığı oluşabilir`,
            probability: lastRun.results.cashDeficitMonth <= 2 ? 85 : 
                        lastRun.results.cashDeficitMonth <= 4 ? 65 : 45,
            timeHorizon: lastRun.results.cashDeficitMonth,
            impact: 80,
            recommendedAction: 'Nakit pozisyonunu güçlendirin veya kısa vadeli borçlanma seçeneklerini değerlendirin',
            source: 'simulation',
            createdAt: lastRun.createdAt
          });
        }

        // Risk parametrelerine göre uyarılar
        const params = lastRun.parameters;
        const totalRisk = Math.abs(params.fxDelta) + Math.abs(params.rateDelta) + Math.abs(params.inflationDelta);
        
        if (totalRisk > 20) {
          alerts.push({
            id: `high-risk-${lastRun.id}`,
            type: 'highRisk',
            severity: totalRisk > 40 ? 'critical' : 'high',
            title: 'Yüksek Risk Senaryosu',
            message: `Toplam risk faktörü %${totalRisk.toFixed(1)} - portföyde önemli değişiklikler bekleniyor`,
            probability: Math.min(totalRisk * 2, 90),
            timeHorizon: params.horizonMonths,
            impact: 70,
            recommendedAction: 'Risk yönetimi stratejilerini gözden geçirin ve hedge pozisyonları değerlendirin',
            source: 'simulation',
            createdAt: lastRun.createdAt
          });
        }

        return alerts;
      } catch (error) {
        console.error('Simulation alerts error:', error);
        return [];
      }
    },
    refetchInterval: 30000, // 30 saniyede bir güncelle
  });

  // Risk analizi verilerinden uyarılar
  const { data: riskAlerts, isLoading: riskLoading } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/risk/analysis');
        const data = await response.json();

        const alerts: FutureRiskAlert[] = [];

        if (data?.riskScore < 40) {
          alerts.push({
            id: `low-risk-score-${Date.now()}`,
            type: 'futureRisk',
            severity: data.riskScore < 20 ? 'critical' : 'high',
            title: 'Düşük Risk Skoru',
            message: `Risk skoru ${data.riskScore}/100 - portföy risk profiline uygun değil`,
            probability: 90,
            timeHorizon: 1,
            impact: 60,
            recommendedAction: 'Portföy yeniden dengelemesi yapın',
            source: 'risk',
            createdAt: new Date().toISOString()
          });
        }

        return alerts;
      } catch (error) {
        console.error('Risk alerts error:', error);
        return [];
      }
    },
    refetchInterval: 60000, // 1 dakikada bir güncelle
  });

  // Tüm uyarıları birleştir
  const allAlerts = [
    ...(simulationAlerts || []),
    ...(riskAlerts || [])
  ].filter(alert => !dismissedAlerts.has(alert.id));

  // Kritik uyarıları ayır
  const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical');
  const otherAlerts = allAlerts.filter(alert => alert.severity !== 'critical');

  // Uyarı kapatma
  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...Array.from(prev), alertId]));
  };

  // Severity rengi
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  // Severity ikonu
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <TrendingDown className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <Shield className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // Alert tipi ikonu
  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'cashDeficit': return <DollarSign className="w-4 h-4" />;
      case 'liquidityRisk': return <TrendingDown className="w-4 h-4" />;
      case 'highRisk': return <AlertTriangle className="w-4 h-4" />;
      case 'inflationRisk': return <TrendingUp className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  if (allAlerts.length === 0) {
    return null;
  }

  return (
    <Card className={`border-l-4 border-l-orange-500 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-orange-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="font-semibold text-orange-900">
                    {criticalAlerts.length > 0 ? 'Kritik Uyarılar' : 'Finansal Uyarılar'}
                  </span>
                </div>
                <Badge variant="destructive" className="ml-2">
                  {allAlerts.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {criticalAlerts.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    Kritik
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </div>
            
            {!isExpanded && (
              <div className="mt-2 text-sm text-orange-800">
                {criticalAlerts.length > 0 ? (
                  <span className="font-medium">
                    {criticalAlerts[0].title}: {criticalAlerts[0].message}
                  </span>
                ) : (
                  <span>
                    {allAlerts.length} uyarı mevcut - detaylar için genişletin
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Kritik uyarılar */}
              {criticalAlerts.map((alert) => (
                <Alert key={alert.id} variant="destructive" className="border-red-200 bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getAlertTypeIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-red-900">{alert.title}</span>
                          <Badge variant="destructive" className="text-xs">
                            Kritik
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            %{alert.probability} olasılık
                          </Badge>
                        </div>
                        <AlertDescription className="text-red-800">
                          {alert.message}
                        </AlertDescription>
                        {alert.recommendedAction && (
                          <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                            <strong>Önerilen Aksiyon:</strong> {alert.recommendedAction}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-red-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.timeHorizon} ay
                          </span>
                          <span>Etki: %{alert.impact}</span>
                          <span className="capitalize">{alert.source}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Alert>
              ))}

              {/* Diğer uyarılar */}
              {otherAlerts.map((alert) => (
                <Alert 
                  key={alert.id} 
                  variant={alert.severity === 'high' ? 'destructive' : 'default'}
                  className={alert.severity === 'high' ? 'border-orange-200 bg-orange-50' : ''}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getAlertTypeIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{alert.title}</span>
                          <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                            {alert.severity === 'high' ? 'Yüksek' : 
                             alert.severity === 'medium' ? 'Orta' : 'Düşük'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            %{alert.probability} olasılık
                          </Badge>
                        </div>
                        <AlertDescription>
                          {alert.message}
                        </AlertDescription>
                        {alert.recommendedAction && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                            <strong>Önerilen Aksiyon:</strong> {alert.recommendedAction}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.timeHorizon} ay
                          </span>
                          <span>Etki: %{alert.impact}</span>
                          <span className="capitalize">{alert.source}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>

            {/* Özet bilgi */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {allAlerts.length} uyarı • 
                  {criticalAlerts.length} kritik • 
                  {otherAlerts.filter(a => a.severity === 'high').length} yüksek
                </span>
                <span className="text-xs">
                  Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
