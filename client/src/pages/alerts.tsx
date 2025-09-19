import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, Info, CheckCircle, Bell, Trash2, Calendar, User, Settings, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SystemAlert } from "@shared/schema";

const severityConfig = {
  low: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    icon: Info,
    bgColor: "border-blue-200 dark:border-blue-800",
    name: "Düşük"
  },
  medium: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", 
    icon: AlertTriangle,
    bgColor: "border-yellow-200 dark:border-yellow-800",
    name: "Orta"
  },
  high: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: AlertTriangle,
    bgColor: "border-red-200 dark:border-red-800",
    name: "Yüksek"
  }
};

const alertTypeLabels = {
  low_balance: "Düşük Bakiye",
  recurring_payment: "Tekrarlanan Ödeme",
  budget_exceeded: "Bütçe Aşımı", 
  monthly_summary: "Aylık Özet"
} as const;

export default function AlertsPage() {
  const [showDismissed, setShowDismissed] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery<SystemAlert[]>({
    queryKey: ['/api/alerts/all'],
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await apiRequest('POST', `/api/alerts/${alertId}/dismiss`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/all'] });
      toast({
        title: "Uyarı kapatıldı",
        description: "Uyarı başarıyla kapatıldı",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Uyarı kapatılırken bir hata oluştu",
        variant: "destructive",
      });
    }
  });

  const runChecksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/alerts/run-checks');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/all'] });
      toast({
        title: "Kontroller tamamlandı",
        description: "Sistem uyarı kontrolleri başarıyla çalıştırıldı",
      });
    },
    onError: () => {
      toast({
        title: "Hata", 
        description: "Uyarı kontrolleri çalıştırılırken bir hata oluştu",
        variant: "destructive",
      });
    }
  });

  const filteredAlerts = (alerts as SystemAlert[]).filter(alert => {
    const typeMatch = filterType === "all" || alert.type === filterType;
    const severityMatch = filterSeverity === "all" || alert.severity === filterSeverity;
    const dismissedMatch = showDismissed ? true : !alert.isDismissed;
    
    return typeMatch && severityMatch && dismissedMatch;
  });

  const activeAlerts = (alerts as SystemAlert[]).filter(alert => alert.isActive && !alert.isDismissed);
  const dismissedAlerts = (alerts as SystemAlert[]).filter(alert => alert.isDismissed);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAlertMetadata = (alert: SystemAlert) => {
    if (!alert.metadata) return null;
    
    try {
      return JSON.parse(alert.metadata);
    } catch {
      return null;
    }
  };

  const handleDismiss = (alertId: string) => {
    dismissMutation.mutate(alertId);
  };

  const handleRunChecks = () => {
    runChecksMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sistem Uyarıları</h1>
        </div>
        <div className="text-center py-8">
          Uyarılar yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="alerts-title">Sistem Uyarıları</h1>
          <p className="text-muted-foreground mt-1" data-testid="alerts-description">
            Finansal durum uyarılarını yönetin ve takip edin
          </p>
        </div>
        <Button 
          onClick={handleRunChecks}
          disabled={runChecksMutation.isPending}
          data-testid="button-run-checks"
        >
          <Play className="w-4 h-4 mr-2" />
          {runChecksMutation.isPending ? "Kontrol Ediliyor..." : "Kontrolleri Çalıştır"}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-active-alerts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Uyarılar</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-count">{activeAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeAlerts.filter(a => a.severity === 'high').length} yüksek öncelikli
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-dismissed-alerts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kapatılan Uyarılar</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dismissed-count">{dismissedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Geçmiş uyarılar
            </p>
          </CardContent>
        </Card>
        
        <Card data-testid="card-total-alerts">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Uyarılar</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Tüm uyarılar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card data-testid="card-filters">
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-dismissed"
                checked={showDismissed}
                onCheckedChange={setShowDismissed}
                data-testid="switch-show-dismissed"
              />
              <Label htmlFor="show-dismissed">Kapatılan uyarıları göster</Label>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48" data-testid="select-filter-type">
                <SelectValue placeholder="Uyarı türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                {Object.entries(alertTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48" data-testid="select-filter-severity">
                <SelectValue placeholder="Önem derecesi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Dereceler</SelectItem>
                {Object.entries(severityConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card data-testid="card-no-alerts">
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Hiç uyarı yok</h3>
              <p className="text-muted-foreground">
                {showDismissed 
                  ? "Seçili filtrelere uygun uyarı bulunamadı"
                  : "Aktif uyarınız bulunmuyor"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig];
            const Icon = config.icon;
            const metadata = getAlertMetadata(alert);

            return (
              <Card 
                key={alert.id}
                className={`${config.bgColor} ${alert.isDismissed ? 'opacity-60' : ''} transition-all duration-200 hover:shadow-md`}
                data-testid={`card-alert-${alert.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <CardTitle className="text-lg" data-testid={`text-alert-title-${alert.id}`}>
                          {alert.title}
                        </CardTitle>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge 
                            variant="secondary" 
                            className={`${config.color}`}
                            data-testid={`badge-alert-severity-${alert.id}`}
                          >
                            {config.name}
                          </Badge>
                          <Badge 
                            variant="outline"
                            data-testid={`badge-alert-type-${alert.id}`}
                          >
                            {alertTypeLabels[alert.type as keyof typeof alertTypeLabels] || alert.type}
                          </Badge>
                          {alert.isDismissed && (
                            <Badge 
                              variant="secondary"
                              className="bg-gray-100 text-gray-600"
                              data-testid={`badge-alert-dismissed-${alert.id}`}
                            >
                              Kapatılmış
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1" data-testid={`text-alert-created-${alert.id}`}>
                          <Calendar className="h-3 w-3" />
                          {formatDate(alert.createdAt)}
                        </div>
                        {alert.dismissedAt && (
                          <div className="text-xs mt-1" data-testid={`text-alert-dismissed-at-${alert.id}`}>
                            Kapatıldı: {formatDate(alert.dismissedAt)}
                          </div>
                        )}
                      </div>
                      {!alert.isDismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-red-100 dark:hover:bg-red-900/20"
                          onClick={() => handleDismiss(alert.id)}
                          disabled={dismissMutation.isPending}
                          data-testid={`button-dismiss-${alert.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-3" data-testid={`text-alert-description-${alert.id}`}>
                    {alert.description}
                  </CardDescription>
                  
                  {metadata && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm" data-testid={`text-alert-metadata-${alert.id}`}>
                      <h4 className="font-medium mb-2">Detaylar:</h4>
                      <div className="space-y-1 text-muted-foreground">
                        {alert.type === 'budget_exceeded' && metadata.category && (
                          <div>
                            <span className="font-medium">Kategori:</span> {metadata.category}
                            <br />
                            <span className="font-medium">Harcanan:</span> {parseFloat(metadata.spent).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">Limit:</span> {parseFloat(metadata.limit).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">İşlem Sayısı:</span> {metadata.transactionCount}
                          </div>
                        )}
                        {alert.type === 'low_balance' && metadata.currentBalance && (
                          <div>
                            <span className="font-medium">Güncel Bakiye:</span> {parseFloat(metadata.currentBalance).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">Eşik Değer:</span> {parseFloat(metadata.threshold).toLocaleString('tr-TR')} TL
                          </div>
                        )}
                        {alert.type === 'recurring_payment' && metadata.amount && (
                          <div>
                            <span className="font-medium">Tutar:</span> {parseFloat(metadata.amount).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">Son Ödeme:</span> {metadata.daysSinceLastPayment} gün önce
                          </div>
                        )}
                        {alert.type === 'monthly_summary' && metadata.net && (
                          <div>
                            <span className="font-medium">Gelir:</span> {parseFloat(metadata.income).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">Gider:</span> {parseFloat(metadata.expenses).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">Net:</span> {parseFloat(metadata.net).toLocaleString('tr-TR')} TL
                            <br />
                            <span className="font-medium">İşlem Sayısı:</span> {metadata.transactionCount}
                          </div>
                        )}
                        {alert.accountId && (
                          <div>
                            <span className="font-medium">Hesap ID:</span> {alert.accountId}
                          </div>
                        )}
                        {alert.transactionId && (
                          <div>
                            <span className="font-medium">İşlem ID:</span> {alert.transactionId}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}