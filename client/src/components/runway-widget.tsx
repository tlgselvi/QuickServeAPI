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
import { AlertTriangle, Clock, CheckCircle, TrendingDown } from 'lucide-react';

interface RunwayAnalysis {
  currentCash: number;
  monthlyExpenses: number;
  runwayMonths: number;
  runwayDays: number;
  status: 'critical' | 'warning' | 'healthy';
  recommendations: string[];
  monthlyBreakdown: Array<{
    month: string;
    projectedCash: number;
    expenses: number;
    netCash: number;
  }>;
}

interface RunwayWidgetProps {
  months?: number;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'healthy':
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'critical':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'warning':
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-600" />;
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'critical':
      return 'Kritik';
    case 'warning':
      return 'Dikkat';
    case 'healthy':
      return 'Sağlıklı';
    default:
      return status;
  }
};

const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'healthy':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  }
};

export function RunwayWidget({ months = 12 }: RunwayWidgetProps) {
  const [runway, setRunway] = useState<RunwayAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchRunwayAnalysis();
  }, [months]);

  const fetchRunwayAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/runway?months=${months}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRunway(data.data);
      } else {
        throw new Error(data.error || 'Veri alınırken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      logger.error('Runway analysis fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Runway Analizi
          </CardTitle>
          <CardDescription>Nakit tükenme süresi analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
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
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Runway Analizi
          </CardTitle>
          <CardDescription>Nakit tükenme süresi analizi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!runway) {
    return null;
  }

  const progressPercentage = Math.min((runway.runwayMonths / 12) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-blue-600" />
            Runway Analizi
          </div>
          <Badge className={getStatusBadgeColor(runway.status)}>
            {getStatusIcon(runway.status)}
            <span className="ml-1">{getStatusText(runway.status)}</span>
          </Badge>
        </CardTitle>
        <CardDescription>Nakit tükenme süresi analizi</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Runway Display */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {runway.runwayMonths.toFixed(1)} ay
            </p>
            <p className="text-sm text-muted-foreground">
              ({runway.runwayDays} gün)
            </p>
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-3"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 ay</span>
            <span>12 ay</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">Mevcut Nakit</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(runway.currentCash)}
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">Aylık Gider</p>
            <p className="text-xl font-bold text-red-900 dark:text-red-100">
              {formatCurrency(runway.monthlyExpenses)}
            </p>
          </div>
        </div>

        {/* Monthly Breakdown (First 6 months) */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Aylık Projeksiyon (İlk 6 Ay)
          </h4>
          <div className="space-y-2">
            {runway.monthlyBreakdown.slice(0, 6).map((month, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-950/30 rounded">
                <span className="text-sm font-medium">{month.month}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Gider: {formatCurrency(month.expenses)}
                  </span>
                  <span className={`text-sm font-medium ${
                    month.projectedCash > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(month.projectedCash)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Öneriler
          </h4>
          <ul className="space-y-1">
            {runway.recommendations.slice(0, 3).map((recommendation, index) => (
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
