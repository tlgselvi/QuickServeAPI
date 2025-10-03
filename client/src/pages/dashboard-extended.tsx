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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FinBot V3 Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Yapay Zeka Destekli Finansal Analiz ve Yönetim Platformu
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Canlı Veri
            </Badge>
            <Badge variant="outline">
              Real-time Analytics
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ExportToolbar />
          <Button
            variant="outline"
            onClick={refreshDashboard}
            className="gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30"
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
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Finansal Sağlık Skoru</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">85/100</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">+5% bu ay</p>
                  </div>
                  <Heart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Nakit Runway</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">18 ay</p>
                    <p className="text-xs text-green-600 dark:text-green-400">Güvenli seviye</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Tahmin Doğruluğu</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">94%</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Machine Learning</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Risk Skoru</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">Düşük</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">İyi yönetim</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Panel */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
                Yapay Zeka Finansal Analiz
              </CardTitle>
              <CardDescription className="text-indigo-700 dark:text-indigo-300">
                FinBot V3'ün gelişmiş algoritmaları ile gerçek zamanlı finansal öngörüler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">Tahmin Edilen Trendler</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium">Nakit Akışı Artışı</p>
                        <p className="text-xs text-muted-foreground">Önümüzdeki 3 ay içinde %15 artış bekleniyor</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium">Dikkat Edilmesi Gereken Alan</p>
                        <p className="text-xs text-muted-foreground">Müşteri ödemelerinde 30+ gün gecikme riski</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-indigo-900 dark:text-indigo-100">AI Önerileri</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Otomatik Tahsilat Sistemi</p>
                      <p className="text-xs text-muted-foreground">Müşteri ödemelerini %25 hızlandırabilir</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Dinamik Fiyatlandırma</p>
                      <p className="text-xs text-muted-foreground">AI destekli fiyat optimizasyonu</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technology Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Teknoloji Altyapısı
              </CardTitle>
              <CardDescription>
                FinBot V3'ün güçlü teknoloji stack'i
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white font-bold">AI</span>
                  </div>
                  <p className="text-sm font-medium">Yapay Zeka</p>
                  <p className="text-xs text-muted-foreground">Machine Learning</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="w-12 h-12 bg-green-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white font-bold">RT</span>
                  </div>
                  <p className="text-sm font-medium">Real-time</p>
                  <p className="text-xs text-muted-foreground">Canlı Veri</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white font-bold">SC</span>
                  </div>
                  <p className="text-sm font-medium">Scalable</p>
                  <p className="text-xs text-muted-foreground">Ölçeklenebilir</p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white font-bold">SEC</span>
                  </div>
                  <p className="text-sm font-medium">Güvenli</p>
                  <p className="text-xs text-muted-foreground">Enterprise Grade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Executive Summary */}
          <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Executive Summary
              </CardTitle>
              <CardDescription className="text-emerald-700 dark:text-emerald-300">
                Yatırımcı sunumu için hazırlanmış özet raporlar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">₺2.5M</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Toplam Varlık</p>
                  <p className="text-xs text-muted-foreground">+12% YoY</p>
                </div>
                <div className="text-center p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">₺850K</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Nakit Pozisyon</p>
                  <p className="text-xs text-muted-foreground">Güçlü likidite</p>
                </div>
                <div className="text-center p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">18 ay</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Runway</p>
                  <p className="text-xs text-muted-foreground">Güvenli seviye</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Rapor Dışa Aktarım
              </CardTitle>
              <CardDescription>
                Yatırımcı sunumu için hazır rapor formatları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">PDF</span>
                  </div>
                  <p className="text-sm font-medium">PDF Raporu</p>
                  <p className="text-xs text-muted-foreground">Yatırımcı sunumu</p>
                </div>
                <div className="p-4 border-2 border-dashed border-green-200 dark:border-green-800 rounded-lg text-center hover:border-green-400 dark:hover:border-green-600 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-green-600 font-bold">XLS</span>
                  </div>
                  <p className="text-sm font-medium">Excel Raporu</p>
                  <p className="text-xs text-muted-foreground">Detaylı analiz</p>
                </div>
                <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-lg text-center hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-purple-600 font-bold">PPT</span>
                  </div>
                  <p className="text-sm font-medium">PowerPoint</p>
                  <p className="text-xs text-muted-foreground">Sunum formatı</p>
                </div>
                <div className="p-4 border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-lg text-center hover:border-orange-400 dark:hover:border-orange-600 transition-colors cursor-pointer">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-orange-600 font-bold">API</span>
                  </div>
                  <p className="text-sm font-medium">API Export</p>
                  <p className="text-xs text-muted-foreground">Entegrasyon</p>
                </div>
              </div>
              <ExportToolbar showLabel={true} />
            </CardContent>
          </Card>

          {/* Competitive Advantages */}
          <Card className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-900 dark:text-violet-100">
                <BarChart3 className="h-5 w-5 text-violet-600" />
                Rekabet Avantajları
              </CardTitle>
              <CardDescription className="text-violet-700 dark:text-violet-300">
                FinBot V3'ün piyasadaki benzersiz özellikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-violet-900 dark:text-violet-100">Teknoloji Avantajları</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                        <span className="text-violet-600 text-sm font-bold">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">AI Destekli Tahminler</p>
                        <p className="text-xs text-muted-foreground">%94 doğruluk oranı</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                        <span className="text-violet-600 text-sm font-bold">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Real-time Analytics</p>
                        <p className="text-xs text-muted-foreground">Anlık veri işleme</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center">
                        <span className="text-violet-600 text-sm font-bold">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Enterprise Security</p>
                        <p className="text-xs text-muted-foreground">Bank-level güvenlik</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-violet-900 dark:text-violet-100">Pazar Fırsatları</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">₺50B+ Pazar Büyüklüğü</p>
                      <p className="text-xs text-muted-foreground">Türkiye finansal teknoloji pazarı</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">%300 Büyüme Potansiyeli</p>
                      <p className="text-xs text-muted-foreground">3 yıllık projeksiyon</p>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">B2B SaaS Model</p>
                      <p className="text-xs text-muted-foreground">Yüksek kar marjları</p>
                    </div>
                  </div>
                </div>
              </div>
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
