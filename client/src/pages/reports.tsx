import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TransactionJsonManager } from '@/components/TransactionJsonManager';
import { Download, FileText, FileSpreadsheet, Calendar, AlertTriangle } from 'lucide-react';

export default function Reports () {
  const [exportLoading, setExportLoading] = useState<{ csv: boolean; pdf: boolean; sheets: boolean }>({
    csv: false,
    pdf: false,
    sheets: false,
  });

  const { toast } = useToast();

  // Function to handle file download
  const downloadFile = async (url: string, filename: string, type: 'csv' | 'pdf' | 'sheets') => {
    try {
      setExportLoading(prev => ({ ...prev, [type]: true }));

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include session cookies
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Başarılı',
        description: `${type.toUpperCase()} raporu başarıyla indirildi`,
      });
    } catch (error) {
      logger.error(`${type} export error:`, error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : `${type.toUpperCase()} raporu indirilemedi`,
        variant: 'destructive',
      });
    } finally {
      setExportLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const exportCsv = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile('/api/export/csv', `finbot-islemler-${timestamp}.csv`, 'csv');
  };

  const exportPdf = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile('/api/export/pdf', `finbot-rapor-${timestamp}.pdf`, 'pdf');
  };

  const exportGoogleSheets = async () => {
    try {
      setExportLoading(prev => ({ ...prev, sheets: true }));

      const response = await fetch('/api/export/google-sheets', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Bilinmeyen hata' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: 'Başarılı',
        description: `${result.recordCount} kayıt Google Sheets'e aktarıldı`,
      });

      // Open Google Sheets in a new tab
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (error) {
      logger.error('Google Sheets export error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Google Sheets export başarısız',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(prev => ({ ...prev, sheets: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Raporlar</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
        </div>
      </div>

      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Veri Dışa Aktarımı
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Finansal verilerinizi farklı formatlarda dışa aktarın ve kaydedin.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CSV Export */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto" />
                  <div>
                    <h3 className="font-semibold">CSV Formatında</h3>
                    <p className="text-sm text-muted-foreground">Excel uyumlu veri dosyası</p>
                  </div>
                  <Button
                    onClick={exportCsv}
                    disabled={exportLoading.csv}
                    className="w-full"
                    data-testid="button-export-csv"
                  >
                    {exportLoading.csv ? (
                      <>
                        <Download className="h-4 w-4 animate-spin mr-2" />
                        İndiriliyor...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        CSV İndir
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PDF Export */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <FileText className="h-12 w-12 text-red-600 mx-auto" />
                  <div>
                    <h3 className="font-semibold">PDF Raporu</h3>
                    <p className="text-sm text-muted-foreground">Detaylı finansal rapor</p>
                  </div>
                  <Button
                    onClick={exportPdf}
                    disabled={exportLoading.pdf}
                    className="w-full"
                    data-testid="button-export-pdf"
                  >
                    {exportLoading.pdf ? (
                      <>
                        <Download className="h-4 w-4 animate-spin mr-2" />
                        Hazırlanıyor...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        PDF İndir
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Google Sheets Export */}
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <FileSpreadsheet className="h-12 w-12 text-blue-600 mx-auto" />
                  <div>
                    <h3 className="font-semibold">Google Sheets</h3>
                    <p className="text-sm text-muted-foreground">Bulut tabanlı çalışma sayfası</p>
                  </div>
                  <Button
                    onClick={exportGoogleSheets}
                    disabled={exportLoading.sheets}
                    className="w-full"
                    data-testid="button-export-sheets"
                  >
                    {exportLoading.sheets ? (
                      <>
                        <Download className="h-4 w-4 animate-spin mr-2" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Sheets'e Gönder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Not:</strong> Dışa aktarılan veriler, kullanıcı rolünüze göre filtrelenir.</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>CSV dosyası Excel'de açılabilir ve düzenlenebilir</li>
              <li>PDF raporu yazdırılmaya hazır formattadır</li>
              <li>Tüm veriler güvenli şekilde işlenir</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rapor Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-600">CSV</p>
              <p className="text-sm text-muted-foreground">İşlem detayları</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-red-600">PDF</p>
              <p className="text-sm text-muted-foreground">Kapsamlı rapor</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-blue-600">Sheets</p>
              <p className="text-sm text-muted-foreground">Google Sheets</p>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-green-600">Güvenli</p>
              <p className="text-sm text-muted-foreground">Veri korunması</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Transaction JSON Manager */}
      <TransactionJsonManager />
    </div>
  );
}
