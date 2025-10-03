import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFormatCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react';

interface AgingBucket {
  bucket: string;
  days: string;
  amount: number;
  count: number;
  percentage: number;
}

interface AgingSummary {
  reportType: 'ar' | 'ap';
  totalAmount: number;
  totalCount: number;
  buckets: AgingBucket[];
  averageAgingDays: number;
  overdueAmount: number;
  overdueCount: number;
  overduePercentage: number;
}

interface AgingSummaryProps {
  reportType: 'ar' | 'ap';
  title: string;
  description: string;
}

const getBucketColor = (bucket: string): string => {
  switch (bucket) {
    case '0-30':
      return 'bg-green-500';
    case '30-60':
      return 'bg-yellow-500';
    case '60-90':
      return 'bg-orange-500';
    case '90+':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

const getBucketIcon = (bucket: string) => {
  switch (bucket) {
    case '0-30':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case '30-60':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case '60-90':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case '90+':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600" />;
  }
};

export function AgingSummary({ reportType, title, description }: AgingSummaryProps) {
  const [summary, setSummary] = useState<AgingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchAgingSummary();
  }, [reportType]);

  const fetchAgingSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aging/summary/${reportType}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
      } else {
        throw new Error(data.error || 'Veri alınırken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      console.error('Aging summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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

  if (!summary) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-green-500 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
          {reportType === 'ar' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          {title}
        </CardTitle>
        <CardDescription className="text-green-700 dark:text-green-300">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">Toplam Tutar</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(summary.totalAmount)}
            </p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">Gecikmiş Tutar</p>
            <p className="text-xl font-bold text-red-900 dark:text-red-100">
              {formatCurrency(summary.overdueAmount)}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              %{summary.overduePercentage.toFixed(1)}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">Toplam Kayıt</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {summary.totalCount}
            </p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-300">Ortalama Gün</p>
            <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
              {summary.averageAgingDays}
            </p>
          </div>
        </div>

        {/* Aging Buckets */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Yaşlandırma Dağılımı
          </h4>
          <div className="space-y-3">
            {summary.buckets.map((bucket) => (
              <div key={bucket.bucket} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getBucketIcon(bucket.bucket)}
                    <span className="text-sm font-medium">
                      {bucket.days}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {bucket.count} kayıt
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(bucket.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      %{bucket.percentage.toFixed(1)}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={bucket.percentage} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-gray-50 dark:bg-gray-950/30 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Risk Değerlendirmesi
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Gecikmiş Oranı</p>
              <div className="flex items-center gap-2">
                <Progress 
                  value={summary.overduePercentage} 
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium">
                  %{summary.overduePercentage.toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ortalama Gecikme</p>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  summary.averageAgingDays > 60 ? 'bg-red-500' :
                  summary.averageAgingDays > 30 ? 'bg-orange-500' :
                  summary.averageAgingDays > 0 ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="text-sm font-medium">
                  {summary.averageAgingDays > 0 ? `${summary.averageAgingDays} gün` : 'Güncel'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
