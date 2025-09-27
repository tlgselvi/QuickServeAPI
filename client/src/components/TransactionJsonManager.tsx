import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Upload, FileCheck, Calendar, BarChart3, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

interface JsonStatus {
  exists: boolean;
  isValid: boolean;
  transactionCount?: number;
  lastExport?: string;
}

export function TransactionJsonManager () {
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const { toast } = useToast();

  // JSON dosya durumu sorgula
  const { data: jsonStatus, refetch: refetchStatus } = useQuery<JsonStatus>({
    queryKey: ['/api/transactions/json-status'],
  });

  // JSON'a dışa aktarma
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/transactions/export-json');
      return response.json();
    },
    onSuccess: (data) => {
      refetchStatus();
      toast({
        title: 'Dışa aktarma başarılı',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'Dışa aktarma hatası',
        description: "İşlemler JSON'a aktarılırken bir hata oluştu",
        variant: 'destructive',
      });
    },
  });

  // JSON'dan içe aktarma
  const importMutation = useMutation({
    mutationFn: async (overwrite: boolean) => {
      const response = await apiRequest('POST', '/api/transactions/import-json', {
        overwriteExisting: overwrite,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      refetchStatus();
      toast({
        title: 'İçe aktarma başarılı',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'İçe aktarma hatası',
        description: "JSON'dan işlemler içe aktarılırken bir hata oluştu",
        variant: 'destructive',
      });
    },
  });

  // Tarih aralığına göre dışa aktarma
  const exportByDateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/transactions/export-json-by-date', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Tarihli dışa aktarma başarılı',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'Dışa aktarma hatası',
        description: 'Tarihli işlemler dışa aktarılırken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  // Kategori analizi dışa aktarma
  const exportCategoryAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/transactions/export-category-analysis');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Kategori analizi başarılı',
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: 'Analiz hatası',
        description: 'Kategori analizi dışa aktarılırken bir hata oluştu',
        variant: 'destructive',
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleImport = () => {
    importMutation.mutate(overwriteExisting);
  };

  const handleExportByDate = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      toast({
        title: 'Tarih aralığı gerekli',
        description: 'Lütfen başlangıç ve bitiş tarihleri seçin',
        variant: 'destructive',
      });
      return;
    }
    exportByDateMutation.mutate();
  };

  const handleExportCategoryAnalysis = () => {
    exportCategoryAnalysisMutation.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" data-testid="json-manager-title">
          İşlem Takibi (transactions.json)
        </h2>
        <p className="text-muted-foreground" data-testid="json-manager-description">
          İşlem verilerinizi JSON formatında yedekleyin ve geri yükleyin
        </p>
      </div>

      {/* JSON Dosya Durumu */}
      <Card data-testid="card-json-status">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              JSON Dosya Durumu
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              data-testid="button-refresh-status"
            >
              Yenile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {jsonStatus?.exists ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Badge variant="default" data-testid="badge-file-exists">
                  Dosya Mevcut
                </Badge>
                {jsonStatus.isValid && (
                  <Badge variant="secondary" data-testid="badge-file-valid">
                    {jsonStatus.transactionCount} İşlem
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <Badge variant="outline" data-testid="badge-file-not-exists">
                  Dosya Bulunamadı
                </Badge>
              </div>
            )}

            {jsonStatus?.lastExport && (
              <span className="text-sm text-muted-foreground" data-testid="text-last-export">
                Son Dışa Aktarma: {formatDate(jsonStatus.lastExport)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Temel Dışa/İçe Aktarma */}
      <Card data-testid="card-basic-operations">
        <CardHeader>
          <CardTitle>Temel İşlemler</CardTitle>
          <CardDescription>
            Tüm işlem verilerinizi dışa aktarın veya mevcut JSON dosyasından içe aktarın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              data-testid="button-export-json"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? 'Dışa Aktarılıyor...' : "JSON'a Dışa Aktar"}
            </Button>

            <Button
              variant="outline"
              onClick={handleImport}
              disabled={importMutation.isPending || !jsonStatus?.exists}
              data-testid="button-import-json"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importMutation.isPending ? 'İçe Aktarılıyor...' : "JSON'dan İçe Aktar"}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="overwrite-existing"
              checked={overwriteExisting}
              onCheckedChange={setOverwriteExisting}
              data-testid="switch-overwrite-existing"
            />
            <Label htmlFor="overwrite-existing" className="text-sm">
              Mevcut işlemlerin üzerine yaz
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Tarih Aralığına Göre Dışa Aktarma */}
      <Card data-testid="card-date-range-export">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tarih Aralığına Göre Dışa Aktarma
          </CardTitle>
          <CardDescription>
            Belirli bir tarih aralığındaki işlemleri ayrı bir JSON dosyasına aktarın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Başlangıç Tarihi</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label htmlFor="end-date">Bitiş Tarihi</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>

          <Button
            onClick={handleExportByDate}
            disabled={exportByDateMutation.isPending || !dateRange.startDate || !dateRange.endDate}
            data-testid="button-export-by-date"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {exportByDateMutation.isPending ? 'Dışa Aktarılıyor...' : 'Tarihli Dışa Aktarma'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Kategori Analizi Dışa Aktarma */}
      <Card data-testid="card-category-analysis">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Kategori Analizi
          </CardTitle>
          <CardDescription>
            İşlemlerinizi kategorilere göre analiz edin ve detaylı rapor oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExportCategoryAnalysis}
            disabled={exportCategoryAnalysisMutation.isPending}
            variant="secondary"
            data-testid="button-export-category-analysis"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {exportCategoryAnalysisMutation.isPending ? 'Analiz Ediliyor...' : 'Kategori Analizi Oluştur'}
          </Button>
        </CardContent>
      </Card>

      {/* Kullanım Notları */}
      <Card data-testid="card-usage-notes">
        <CardHeader>
          <CardTitle>Kullanım Notları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• JSON dışa aktarma işlemi tüm işlem verilerinizi ve hesap bilgilerini içerir</p>
            <p>• İçe aktarma sırasında eksik hesaplar atlanır ve hata raporlanır</p>
            <p>• Tarihli dışa aktarma ile belirli dönemler için yedek alabilirsiniz</p>
            <p>• Kategori analizi harcama alışkanlıklarınız hakkında detaylı bilgi sunar</p>
            <p>• JSON dosyaları manuel olarak düzenlenebilir ancak dikkatli olun</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
