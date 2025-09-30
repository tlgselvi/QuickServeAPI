import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid, GridItem } from '@/components/ui/grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgingTable } from '@/components/aging-table';
import { AgingSummary } from '@/components/aging-summary';
import { RunwayWidget } from '@/components/runway-widget';
import { CashGapWidget } from '@/components/cash-gap-widget';
import { FinancialHealthWidget } from '@/components/financial-health-widget';
import { ExportToolbar } from '@/components/export-toolbar';
import { 
  LayoutGrid, 
  Settings, 
  RefreshCw, 
  Eye, 
  EyeOff,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Heart,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface WidgetConfig {
  id: string;
  type: 'aging-summary' | 'aging-table' | 'runway' | 'cashgap' | 'financial-health';
  title: string;
  description: string;
  enabled: boolean;
  position: { row: number; col: number };
  size: { width: number; height: number };
  props?: Record<string, any>;
}

interface DashboardLayout {
  widgets: WidgetConfig[];
  lastUpdated: string;
}

const defaultWidgets: WidgetConfig[] = [
  {
    id: 'financial-health',
    type: 'financial-health',
    title: 'Finansal Sağlık',
    description: 'Genel finansal durum analizi',
    enabled: true,
    position: { row: 1, col: 1 },
    size: { width: 2, height: 2 },
  },
  {
    id: 'runway',
    type: 'runway',
    title: 'Runway Analizi',
    description: 'Nakit tükenme süresi analizi',
    enabled: true,
    position: { row: 1, col: 3 },
    size: { width: 2, height: 1 },
  },
  {
    id: 'cashgap',
    type: 'cashgap',
    title: 'Cash Gap Analizi',
    description: 'Alacak ve borç karşılaştırması',
    enabled: true,
    position: { row: 1, col: 5 },
    size: { width: 2, height: 1 },
  },
  {
    id: 'aging-summary-ar',
    type: 'aging-summary',
    title: 'Alacak Yaşlandırması',
    description: 'Müşteri alacaklarının yaşlandırma analizi',
    enabled: true,
    position: { row: 2, col: 1 },
    size: { width: 3, height: 1 },
    props: { reportType: 'ar' },
  },
  {
    id: 'aging-summary-ap',
    type: 'aging-summary',
    title: 'Borç Yaşlandırması',
    description: 'Tedarikçi borçlarının yaşlandırma analizi',
    enabled: true,
    position: { row: 2, col: 4 },
    size: { width: 3, height: 1 },
    props: { reportType: 'ap' },
  },
  {
    id: 'aging-table-ar',
    type: 'aging-table',
    title: 'Alacak Detayları',
    description: 'Müşteri alacaklarının detaylı listesi',
    enabled: true,
    position: { row: 3, col: 1 },
    size: { width: 6, height: 2 },
    props: { reportType: 'ar' },
  },
  {
    id: 'aging-table-ap',
    type: 'aging-table',
    title: 'Borç Detayları',
    description: 'Tedarikçi borçlarının detaylı listesi',
    enabled: true,
    position: { row: 5, col: 1 },
    size: { width: 6, height: 2 },
    props: { reportType: 'ap' },
  },
];

const getWidgetIcon = (type: string) => {
  switch (type) {
    case 'financial-health':
      return <Heart className="h-5 w-5 text-red-600" />;
    case 'runway':
      return <TrendingDown className="h-5 w-5 text-blue-600" />;
    case 'cashgap':
      return <BarChart3 className="h-5 w-5 text-green-600" />;
    case 'aging-summary':
      return <Clock className="h-5 w-5 text-orange-600" />;
    case 'aging-table':
      return <LayoutGrid className="h-5 w-5 text-purple-600" />;
    default:
      return <AlertTriangle className="h-5 w-5 text-gray-600" />;
  }
};

const getWidgetComponent = (config: WidgetConfig) => {
  const { type, props } = config;
  
  switch (type) {
    case 'financial-health':
      return <FinancialHealthWidget />;
    case 'runway':
      return <RunwayWidget months={12} />;
    case 'cashgap':
      return <CashGapWidget months={6} />;
    case 'aging-summary':
      return (
        <AgingSummary
          reportType={props?.reportType || 'ar'}
          title={config.title}
          description={config.description}
        />
      );
    case 'aging-table':
      return (
        <AgingTable
          reportType={props?.reportType || 'ar'}
          title={config.title}
          description={config.description}
        />
      );
    default:
      return <div>Bilinmeyen widget tipi</div>;
  }
};

export function DashboardExtended() {
  const [layout, setLayout] = useState<DashboardLayout>({
    widgets: defaultWidgets,
    lastUpdated: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardLayout();
  }, []);

  const loadDashboardLayout = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/layout');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLayout(data.data);
        }
      } else {
        // Use default layout if API fails
        console.warn('Dashboard layout API failed, using default layout');
      }
    } catch (err) {
      console.error('Dashboard layout load error:', err);
      setError('Dashboard yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const saveDashboardLayout = async (newLayout: DashboardLayout) => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLayout),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLayout(newLayout);
        }
      }
    } catch (err) {
      console.error('Dashboard layout save error:', err);
    }
  };

  const toggleWidget = async (widgetId: string) => {
    const newWidgets = layout.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    
    const newLayout = {
      ...layout,
      widgets: newWidgets,
      lastUpdated: new Date().toISOString(),
    };

    await saveDashboardLayout(newLayout);
  };

  const refreshDashboard = async () => {
    setLastRefresh(new Date());
    // Force refresh all widgets by reloading layout
    await loadDashboardLayout();
  };

  const enabledWidgets = layout.widgets.filter(widget => widget.enabled);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg">{error}</p>
          <Button onClick={loadDashboardLayout} className="mt-4">
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finansal Dashboard</h1>
          <p className="text-muted-foreground">
            Kapsamlı finansal analiz ve raporlama
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <ExportToolbar />
          <Button
            variant="outline"
            onClick={refreshDashboard}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Yenile
          </Button>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode(!editMode)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            {editMode ? 'Düzenleme Modu' : 'Düzenle'}
          </Button>
        </div>
      </div>

      {/* Last Refresh Info */}
      <div className="text-sm text-muted-foreground">
        Son güncelleme: {lastRefresh.toLocaleString('tr-TR')}
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="aging">Yaşlandırma</TabsTrigger>
          <TabsTrigger value="analytics">Analizler</TabsTrigger>
          <TabsTrigger value="reports">Raporlar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            {enabledWidgets
              .filter(widget => ['financial-health', 'runway', 'cashgap'].includes(widget.type))
              .map((widget) => (
                <div
                  key={widget.id}
                  className={`col-span-${widget.size.width} row-span-${widget.size.height}`}
                  data-testid={`widget-${widget.id}`}
                >
                  {editMode && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getWidgetIcon(widget.type)}
                        <span className="text-sm font-medium">{widget.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWidget(widget.id)}
                        className="gap-1"
                      >
                        {widget.enabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {getWidgetComponent(widget)}
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          {/* Aging Widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {enabledWidgets
              .filter(widget => widget.type === 'aging-summary')
              .map((widget) => (
                <div key={widget.id} data-testid={`widget-${widget.id}`}>
                  {editMode && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getWidgetIcon(widget.type)}
                        <span className="text-sm font-medium">{widget.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWidget(widget.id)}
                        className="gap-1"
                      >
                        {widget.enabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {getWidgetComponent(widget)}
                </div>
              ))}
          </div>

          <div className="space-y-6">
            {enabledWidgets
              .filter(widget => widget.type === 'aging-table')
              .map((widget) => (
                <div key={widget.id} data-testid={`widget-${widget.id}`}>
                  {editMode && (
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getWidgetIcon(widget.type)}
                        <span className="text-sm font-medium">{widget.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWidget(widget.id)}
                        className="gap-1"
                      >
                        {widget.enabled ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {getWidgetComponent(widget)}
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Gelişmiş Analizler
              </CardTitle>
              <CardDescription>
                Detaylı finansal analiz grafikleri ve trendler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Gelişmiş analiz grafikleri yakında eklenecek
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Raporlar
              </CardTitle>
              <CardDescription>
                Kapsamlı finansal raporlar ve dışa aktarım seçenekleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExportToolbar showLabel={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Widget Status Summary */}
      {editMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Widget Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {layout.widgets.map((widget) => (
                <Badge
                  key={widget.id}
                  variant={widget.enabled ? "default" : "secondary"}
                  className="gap-1"
                >
                  {getWidgetIcon(widget.type)}
                  {widget.title}
                  {widget.enabled ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
