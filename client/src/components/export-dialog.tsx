import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Globe,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ExportDialogProps {
  trigger?: React.ReactNode;
  dataType: 'aging' | 'runway' | 'cashgap' | 'combined';
  title: string;
  description: string;
}

interface ExportOptions {
  format: 'csv' | 'pdf';
  language: 'tr' | 'en';
  dateRange?: {
    start: string;
    end: string;
  };
  includeCharts?: boolean;
  includeSummary?: boolean;
}

const getDataTypeIcon = (type: string) => {
  switch (type) {
    case 'aging':
      return <Clock className="h-5 w-5 text-orange-600" />;
    case 'runway':
      return <TrendingDown className="h-5 w-5 text-blue-600" />;
    case 'cashgap':
      return <BarChart3 className="h-5 w-5 text-green-600" />;
    case 'combined':
      return <FileSpreadsheet className="h-5 w-5 text-purple-600" />;
    default:
      return <FileText className="h-5 w-5 text-gray-600" />;
  }
};

const getDataTypeTitle = (type: string): string => {
  switch (type) {
    case 'aging':
      return 'Yaşlandırma Raporları';
    case 'runway':
      return 'Runway Analizi';
    case 'cashgap':
      return 'Cash Gap Analizi';
    case 'combined':
      return 'Kapsamlı Rapor';
    default:
      return 'Veri Dışa Aktarımı';
  }
};

const getDataTypeDescription = (type: string): string => {
  switch (type) {
    case 'aging':
      return 'Alacak ve borç yaşlandırma raporlarını dışa aktar';
    case 'runway':
      return 'Nakit tükenme süresi analizini dışa aktar';
    case 'cashgap':
      return 'Alacak-borç karşılaştırma analizini dışa aktar';
    case 'combined':
      return 'Tüm finansal verileri kapsamlı rapor olarak dışa aktar';
    default:
      return 'Seçili verileri dışa aktar';
  }
};

export function ExportDialog({ 
  trigger, 
  dataType, 
  title, 
  description 
}: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    language: 'tr',
    includeCharts: true,
    includeSummary: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportStatus('idle');
      setErrorMessage('');

      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: dataType,
          format: exportOptions.format,
          language: exportOptions.language,
          options: exportOptions,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${dataType}_export_${timestamp}.${exportOptions.format}`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus('success');
      
      // Auto close after success
      setTimeout(() => {
        setOpen(false);
        setExportStatus('idle');
      }, 2000);

    } catch (error) {
      setExportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Bilinmeyen hata');
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Dışa Aktar
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDataTypeIcon(dataType)}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Type Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Dışa Aktarılacak Veri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{getDataTypeTitle(dataType)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getDataTypeDescription(dataType)}
                  </p>
                </div>
                <Badge variant="outline">{dataType.toUpperCase()}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Dışa Aktarım Seçenekleri</h4>
            
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dosya Formatı</label>
              <Select 
                value={exportOptions.format} 
                onValueChange={(value: 'csv' | 'pdf') => handleOptionChange('format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      CSV (Excel uyumlu)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-600" />
                      PDF (Yazdırılabilir)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dil</label>
              <Select 
                value={exportOptions.language} 
                onValueChange={(value: 'tr' | 'en') => handleOptionChange('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      Türkçe
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-600" />
                      English
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Options */}
            {dataType === 'combined' && (
              <div className="space-y-3">
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ek Seçenekler</label>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Özet bilgileri dahil et</span>
                    <input
                      type="checkbox"
                      checked={exportOptions.includeSummary}
                      onChange={(e) => handleOptionChange('includeSummary', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  {exportOptions.format === 'pdf' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Grafikleri dahil et</span>
                      <input
                        type="checkbox"
                        checked={exportOptions.includeCharts}
                        onChange={(e) => handleOptionChange('includeCharts', e.target.checked)}
                        className="rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export Status */}
          {exportStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-300">
                Dosya başarıyla indirildi!
              </p>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Dışa aktarım hatası
                </p>
                {errorMessage && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Dışa Aktarılıyor...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Dışa Aktar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
