import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, X, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { SystemAlert } from '@shared/schema';

const severityConfig = {
  low: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Info,
    bgColor: 'border-blue-200 dark:border-blue-800',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    icon: AlertTriangle,
    bgColor: 'border-yellow-200 dark:border-yellow-800',
  },
  high: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    icon: AlertTriangle,
    bgColor: 'border-red-200 dark:border-red-800',
  },
};

const alertTypeLabels = {
  low_balance: 'Düşük Bakiye',
  recurring_payment: 'Tekrarlanan Ödeme',
  budget_exceeded: 'Bütçe Aşımı',
  monthly_summary: 'Aylık Özet',
} as const;

export function AlertsNotification () {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['/api/alerts'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('POST', `/api/alerts/${alertId}/dismiss`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: 'Uyarı kapatıldı',
        description: 'Uyarı başarıyla kapatıldı',
      });
    },
    onError: () => {
      toast({
        title: 'Hata',
        description: 'Uyarı kapatılırken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  const activeAlerts = (alerts as SystemAlert[]).filter(alert => alert.isActive && !alert.isDismissed);
  const alertCount = activeAlerts.length;

  const handleDismiss = (alertId: string) => {
    dismissMutation.mutate(alertId);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlertMetadata = (alert: SystemAlert) => {
    if (!alert.metadata) {
      return null;
    }

    try {
      return JSON.parse(alert.metadata);
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled data-testid="alerts-loading">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="button-alerts"
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              data-testid="badge-alert-count"
            >
              {alertCount > 9 ? '9+' : alertCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end" data-testid="popover-alerts">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" data-testid="text-alerts-title">
              Sistem Uyarıları
            </h3>
            <Badge variant="secondary" data-testid="badge-total-alerts">
              {alertCount} aktif
            </Badge>
          </div>

          {alertCount === 0 ? (
            <div className="text-center py-6" data-testid="text-no-alerts">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Hiç aktif uyarınız yok
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {activeAlerts.map((alert, index) => {
                  const config = severityConfig[alert.severity as keyof typeof severityConfig];
                  const Icon = config.icon;
                  const metadata = getAlertMetadata(alert);

                  return (
                    <div key={alert.id}>
                      <Card
                        className={`${config.bgColor} transition-all duration-200 hover:shadow-md`}
                        data-testid={`card-alert-${alert.id}`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <CardTitle className="text-sm" data-testid={`text-alert-title-${alert.id}`}>
                                  {alert.title}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${config.color}`}
                                    data-testid={`badge-alert-type-${alert.id}`}
                                  >
                                    {alertTypeLabels[alert.type as keyof typeof alertTypeLabels] || alert.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground" data-testid={`text-alert-date-${alert.id}`}>
                                    {formatDate(alert.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                              onClick={() => handleDismiss(alert.id)}
                              disabled={dismissMutation.isPending}
                              data-testid={`button-dismiss-${alert.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm" data-testid={`text-alert-description-${alert.id}`}>
                            {alert.description}
                          </CardDescription>

                          {metadata && (
                            <div className="mt-2 text-xs text-muted-foreground" data-testid={`text-alert-metadata-${alert.id}`}>
                              {alert.type === 'budget_exceeded' && metadata.category && (
                                <span>Kategori: {metadata.category} • Harcanan: {parseFloat(metadata.spent).toLocaleString('tr-TR')} TL</span>
                              )}
                              {alert.type === 'low_balance' && metadata.currentBalance && (
                                <span>Güncel Bakiye: {parseFloat(metadata.currentBalance).toLocaleString('tr-TR')} TL</span>
                              )}
                              {alert.type === 'recurring_payment' && metadata.amount && (
                                <span>Tutar: {parseFloat(metadata.amount).toLocaleString('tr-TR')} TL</span>
                              )}
                              {alert.type === 'monthly_summary' && metadata.net && (
                                <span>Net: {parseFloat(metadata.net).toLocaleString('tr-TR')} TL</span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      {index < activeAlerts.length - 1 && <Separator />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {alertCount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center" data-testid="text-alerts-footer">
                Uyarıları kapatmak için X butonuna tıklayın
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
