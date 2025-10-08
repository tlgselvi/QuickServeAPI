import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFormatCurrency } from '@/contexts/CurrencyContext';
import { 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Activity
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorDisplay } from '@/components/ui/error-display';

interface FinancialHealthSummary {
  healthScore: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  insights: string[];
  keyMetrics: {
    runwayMonths: number;
    runwayStatus: string;
    cashGap: number;
    cashGapRisk: string;
    totalCash: number;
    totalAR: number;
    totalAP: number;
    netPosition: number;
  };
  recommendations: string[];
}

interface FinancialHealthWidgetProps {}

const getHealthColor = (status: string): string => {
  switch (status) {
    case 'excellent':
      return 'text-green-600 dark:text-green-400';
    case 'good':
      return 'text-blue-600 dark:text-blue-400';
    case 'fair':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'poor':
      return 'text-orange-600 dark:text-orange-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getHealthIcon = (status: string) => {
  switch (status) {
    case 'excellent':
      return <Heart className="h-6 w-6 text-green-600" />;
    case 'good':
      return <CheckCircle className="h-6 w-6 text-blue-600" />;
    case 'fair':
      return <Activity className="h-6 w-6 text-yellow-600" />;
    case 'poor':
      return <AlertTriangle className="h-6 w-6 text-orange-600" />;
    case 'critical':
      return <AlertTriangle className="h-6 w-6 text-red-600" />;
    default:
      return <Activity className="h-6 w-6 text-gray-600" />;
  }
};

const getHealthText = (status: string): string => {
  switch (status) {
    case 'excellent':
      return 'Mükemmel';
    case 'good':
      return 'İyi';
    case 'fair':
      return 'Orta';
    case 'poor':
      return 'Zayıf';
    case 'critical':
      return 'Kritik';
    default:
      return status;
  }
};

const getHealthBadgeColor = (status: string): string => {
  switch (status) {
    case 'excellent':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case 'good':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'fair':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'poor':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  }
};

export function FinancialHealthWidget({}: FinancialHealthWidgetProps) {
  const [health, setHealth] = useState<FinancialHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchFinancialHealth();
  }, []);

  const fetchFinancialHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/financial-health');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setHealth(data.data);
      } else {
        throw new Error(data.error || 'Veri alınırken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      logger.error('Financial health fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-600" />
            Finansal Sağlık
          </CardTitle>
          <CardDescription>Genel finansal durum analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" text="Yükleniyor..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-600" />
            Finansal Sağlık
          </CardTitle>
          <CardDescription>Genel finansal durum analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorDisplay
            error={error}
            onRetry={fetchFinancialHealth}
            variant="minimal"
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getHealthIcon(health.healthStatus)}
            Finansal Sağlık
          </div>
          <Badge className={getHealthBadgeColor(health.healthStatus)}>
            {getHealthText(health.healthStatus)}
          </Badge>
        </CardTitle>
        <CardDescription>Genel finansal durum analizi</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Health Score */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <p className={`text-4xl font-bold ${getHealthColor(health.healthStatus)}`}>
              {health.healthScore}/100
            </p>
            <p className="text-sm text-muted-foreground">
              Sağlık Skoru
            </p>
          </div>
          
          <Progress 
            value={health.healthScore} 
            className="h-4"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">Runway</p>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {health.keyMetrics.runwayMonths.toFixed(1)} ay
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {health.keyMetrics.runwayStatus}
            </Badge>
          </div>
          
          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300">Net Pozisyon</p>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              {formatCurrency(health.keyMetrics.netPosition)}
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {health.keyMetrics.cashGapRisk}
            </Badge>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
            <p className="text-xs text-purple-700 dark:text-purple-300">Toplam Nakit</p>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(health.keyMetrics.totalCash)}
            </p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
            <p className="text-xs text-orange-700 dark:text-orange-300">Cash Gap</p>
            <p className={`text-lg font-bold ${
              health.keyMetrics.cashGap >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(health.keyMetrics.cashGap)}
            </p>
          </div>
        </div>

        {/* AR vs AP Summary */}
        <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Alacak vs Borç Özeti
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-sm text-green-700 dark:text-green-300">Toplam Alacak</p>
              </div>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {formatCurrency(health.keyMetrics.totalAR)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700 dark:text-red-300">Toplam Borç</p>
              </div>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">
                {formatCurrency(health.keyMetrics.totalAP)}
              </p>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Finansal Durum Değerlendirmesi
          </h4>
          <ul className="space-y-1">
            {health.insights.map((insight, index) => (
              <li key={index} className="text-sm text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* Top Recommendations */}
        <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Öncelikli Öneriler
          </h4>
          <ul className="space-y-1">
            {health.recommendations.slice(0, 3).map((recommendation, index) => (
              <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
