import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Building2, User } from 'lucide-react';

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

interface BreakdownChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface BreakdownChartProps {
  chartData: BreakdownChartData;
  isLoading?: boolean;
}

// Recharts için veri formatını dönüştür
function transformChartData(chartData: BreakdownChartData) {
  const { labels, datasets } = chartData;
  
  return labels.map((label, index) => {
    const dataPoint: any = { category: label };
    
    datasets.forEach(dataset => {
      dataPoint[dataset.label] = dataset.data[index];
    });
    
    return dataPoint;
  });
}

// Özel tooltip komponenti
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span> ₺{entry.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Özel legend komponenti
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function BreakdownChart({ chartData, isLoading }: BreakdownChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Breakdown Grafik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">Grafik yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const transformedData = transformChartData(chartData);
  
  // Renk paleti
  const colors = {
    'Şirket': '#3b82f6', // blue-500
    'Kişisel': '#10b981'  // emerald-500
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Konsolidasyon Dağılımı
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Şirket Hesapları</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-green-600" />
            <span>Kişisel Hesaplar</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={transformedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
                tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
              <Bar 
                dataKey="Şirket" 
                fill={colors['Şirket']} 
                name="Şirket"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Kişisel" 
                fill={colors['Kişisel']} 
                name="Kişisel"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Grafik Açıklaması */}
        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Grafik Açıklaması</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Banka:</strong> Ana hesap bakiyeleri</p>
            <p>• <strong>Nakit:</strong> Vadesiz hesaplar ve nakit</p>
            <p>• <strong>Kredi:</strong> Kredi kartları, krediler ve KMH</p>
            <p>• <strong>Yatırım:</strong> Vadeli hesaplar ve yatırımlar</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
