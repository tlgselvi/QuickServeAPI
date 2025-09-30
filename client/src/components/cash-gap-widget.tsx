import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFormatCurrency } from '@/contexts/CurrencyContext';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface CashGapAnalysis {
  totalAR: number;
  totalAP: number;
  cashGap: number;
  arDueIn30Days: number;
  apDueIn30Days: number;
  netGap30Days: number;
  arDueIn60Days: number;
  apDueIn60Days: number;
  netGap60Days: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timeline: Array<{
    period: string;
    arAmount: number;
    apAmount: number;
    netCashFlow: number;
    cumulativeCash: number;
  }>;
}

interface CashGapWidgetProps {
  months?: number;
}

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low':
      return 'text-green-600 dark:text-green-400';
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'high':
      return 'text-orange-600 dark:text-orange-400';
    case 'critical':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low':
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    case 'medium':
      return <BarChart3 className="h-5 w-5 text-yellow-600" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    case 'critical':
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    default:
      return <BarChart3 className="h-5 w-5 text-gray-600" />;
  }
};

const getRiskText = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low':
      return 'Düşük Risk';
    case 'medium':
      return 'Orta Risk';
    case 'high':
      return 'Yüksek Risk';
    case 'critical':
      return 'Kritik Risk';
    default:
      return riskLevel;
  }
};

const getRiskBadgeColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  }
};

export function CashGapWidget({ months = 6 }: CashGapWidgetProps) {
  const [cashGap, setCashGap] = useState<CashGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchCashGapAnalysis();
  }, [months]);

  const fetchCashGapAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/cashgap?months=${months}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCashGap(data.data);
      } else {
        throw new Error(data.error || 'Veri alınırken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      console.error('Cash gap analysis fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Cash Gap Analizi
          </CardTitle>
          <CardDescription>Alacak ve borç karşılaştırması</CardDescription>
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
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Cash Gap Analizi
          </CardTitle>
          <CardDescription>Alacak ve borç karşılaştırması</CardDescription>
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

  if (!cashGap) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Cash Gap Analizi
          </div>
          <Badge className={getRiskBadgeColor(cashGap.riskLevel)}>
            {getRiskIcon(cashGap.riskLevel)}
            <span className="ml-1">{getRiskText(cashGap.riskLevel)}</span>
          </Badge>
        </CardTitle>
        <CardDescription>Alacak ve borç karşılaştırması</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Cash Gap Display */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {cashGap.cashGap >= 0 ? (
              <ArrowUpRight className="h-6 w-6 text-green-600" />
            ) : (
              <ArrowDownRight className="h-6 w-6 text-red-600" />
            )}
            <p className={`text-3xl font-bold ${getRiskColor(cashGap.riskLevel)}`}>
              {formatCurrency(cashGap.cashGap)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Net Pozisyon (AR - AP)
          </p>
        </div>

        {/* AR vs AP Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-300">Toplam Alacak</p>
            </div>
            <p className="text-xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(cashGap.totalAR)}
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700 dark:text-red-300">Toplam Borç</p>
            </div>
            <p className="text-xl font-bold text-red-900 dark:text-red-100">
              {formatCurrency(cashGap.totalAP)}
            </p>
          </div>
        </div>

        {/* Timeline Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">30 Günlük Net Gap</p>
            <div className="flex items-center gap-2">
              {cashGap.netGap30Days >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <p className={`text-lg font-bold ${
                cashGap.netGap30Days >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(cashGap.netGap30Days)}
              </p>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              AR: {formatCurrency(cashGap.arDueIn30Days)} - AP: {formatCurrency(cashGap.apDueIn30Days)}
            </p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-2">60 Günlük Net Gap</p>
            <div className="flex items-center gap-2">
              {cashGap.netGap60Days >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <p className={`text-lg font-bold ${
                cashGap.netGap60Days >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(cashGap.netGap60Days)}
              </p>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              AR: {formatCurrency(cashGap.arDueIn60Days)} - AP: {formatCurrency(cashGap.apDueIn60Days)}
            </p>
          </div>
        </div>

        {/* Timeline Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Zaman Çizelgesi Analizi
          </h4>
          <div className="space-y-2">
            {cashGap.timeline.slice(0, 6).map((period, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/30 rounded">
                <span className="text-sm font-medium">{period.period}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600 dark:text-green-400">
                    AR: {formatCurrency(period.arAmount)}
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    AP: {formatCurrency(period.apAmount)}
                  </span>
                  <span className={`text-sm font-medium ${
                    period.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    Net: {formatCurrency(period.netCashFlow)}
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
            {cashGap.recommendations.slice(0, 3).map((recommendation, index) => (
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
