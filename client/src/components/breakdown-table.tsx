import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, User, TrendingUp, TrendingDown } from 'lucide-react';

interface BreakdownItem {
  category: string;
  amount: number;
  formattedAmount: string;
  percentage: number;
}

interface BreakdownTableData {
  company: BreakdownItem[];
  personal: BreakdownItem[];
  total: BreakdownItem[];
}

interface BreakdownSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  companyRatio: number;
  personalRatio: number;
}

interface BreakdownTableProps {
  tableData: BreakdownTableData;
  summary: BreakdownSummary;
  isLoading?: boolean;
}

export default function BreakdownTable({ tableData, summary, isLoading }: BreakdownTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Konsolidasyon Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderBreakdownRow = (items: BreakdownItem[], type: 'company' | 'personal' | 'total') => {
    const getIcon = () => {
      switch (type) {
        case 'company': return <Building2 className="w-4 h-4 text-blue-600" />;
        case 'personal': return <User className="w-4 h-4 text-green-600" />;
        case 'total': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      }
    };

    const getTitle = () => {
      switch (type) {
        case 'company': return 'Şirket Hesapları';
        case 'personal': return 'Kişisel Hesaplar';
        case 'total': return 'Toplam';
      }
    };

    const getBadgeVariant = () => {
      switch (type) {
        case 'company': return 'default';
        case 'personal': return 'secondary';
        case 'total': return 'outline';
      }
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <h3 className="font-semibold text-lg">{getTitle()}</h3>
          <Badge variant={getBadgeVariant()}>
            {type === 'company' ? `${summary.companyRatio}%` : 
             type === 'personal' ? `${summary.personalRatio}%` : '100%'}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className={`text-sm font-bold ${
                    item.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.formattedAmount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={item.percentage} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Konsolidasyon Breakdown
        </CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              ₺{summary.totalAssets.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Toplam Varlık</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              ₺{summary.totalLiabilities.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Toplam Yükümlülük</div>
          </div>
          <div className={`text-center p-3 rounded-lg ${
            summary.netWorth >= 0 ? 'bg-blue-50' : 'bg-orange-50'
          }`}>
            <div className={`text-2xl font-bold ${
              summary.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'
            }`}>
              ₺{summary.netWorth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">Net Değer</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {renderBreakdownRow(tableData.company, 'company')}
          {renderBreakdownRow(tableData.personal, 'personal')}
          {renderBreakdownRow(tableData.total, 'total')}
        </div>
        
        {/* Özet Bilgi */}
        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Özet
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Şirket hesapları toplam varlıkların <strong>{summary.companyRatio}%</strong>'ini oluşturuyor</p>
            <p>• Kişisel hesaplar toplam varlıkların <strong>{summary.personalRatio}%</strong>'ini oluşturuyor</p>
            <p>• Net değer: <strong className={summary.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
              ₺{summary.netWorth.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </strong></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
