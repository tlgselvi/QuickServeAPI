import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

import { useFormatCurrency } from '@/lib/utils/formatCurrency';

interface KPIBarProps {
  totalCash: number;
  totalDebt: number;
  totalBalance: number;
  isLoading?: boolean;
}

export default function KPIBar ({
  totalCash,
  totalDebt,
  totalBalance,
  isLoading,
}: KPIBarProps) {
  const formatCurrency = useFormatCurrency();
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-32 mb-1" />
              <div className="h-3 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiItems = [
    {
      title: 'Toplam Nakit',
      value: formatCurrency(totalCash),
      description: 'Pozitif bakiyeler',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      testId: 'kpi-total-cash',
    },
    {
      title: 'Toplam Borç',
      value: formatCurrency(totalDebt),
      description: 'Negatif bakiyeler',
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950',
      testId: 'kpi-total-debt',
    },
    {
      title: 'Net Bakiye',
      value: formatCurrency(totalBalance),
      description: 'Genel durum',
      icon: DollarSign,
      color: totalBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
      bgColor: totalBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-orange-50 dark:bg-orange-950',
      testId: 'kpi-net-balance',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {kpiItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="border-l-4 border-l-primary/20 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-muted-foreground" data-testid={`${item.testId}-title`}>
                    {item.title}
                  </p>
                  <p
                    className="text-2xl font-bold tracking-tight"
                    data-testid={`${item.testId}-value`}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`${item.testId}-description`}>
                    {item.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
