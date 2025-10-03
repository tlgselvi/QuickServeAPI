import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormatCurrency } from '@/contexts/CurrencyContext';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AgingReport {
  id: string;
  reportType: 'ar' | 'ap';
  customerVendorName: string;
  invoiceNumber?: string;
  invoiceDate: string;
  dueDate: string;
  currentAmount: string;
  agingDays: number;
  agingBucket: string;
  status: 'outstanding' | 'paid' | 'overdue';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  paymentTerms?: string;
}

interface AgingTableProps {
  reportType: 'ar' | 'ap';
  title: string;
  description: string;
}

const getBucketColor = (bucket: string): string => {
  switch (bucket) {
    case '0-30':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case '30-60':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case '60-90':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case '90+':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'outstanding':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <XCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusText = (status: string): string => {
  switch (status) {
    case 'outstanding':
      return 'Beklemede';
    case 'paid':
      return 'Ödenmiş';
    case 'overdue':
      return 'Gecikmiş';
    default:
      return status;
  }
};

const getRiskBadgeColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

export function AgingTable({ reportType, title, description }: AgingTableProps) {
  const [reports, setReports] = useState<AgingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredReports, setFilteredReports] = useState<AgingReport[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    agingBucket: 'all',
    customer: '',
  });
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    fetchAgingReports();
  }, [reportType]);

  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchAgingReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aging/${reportType}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setReports(data.data);
      } else {
        throw new Error(data.error || 'Veri alınırken hata oluştu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      console.error('Aging reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    if (filters.status !== 'all') {
      filtered = filtered.filter(report => report.status === filters.status);
    }

    if (filters.agingBucket !== 'all') {
      filtered = filtered.filter(report => report.agingBucket === filters.agingBucket);
    }

    if (filters.customer) {
      filtered = filtered.filter(report =>
        report.customerVendorName.toLowerCase().includes(filters.customer.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const totalAmount = filteredReports.reduce((sum, report) => {
    return sum + parseFloat(report.currentAmount);
  }, 0);

  const overdueAmount = filteredReports
    .filter(report => report.status === 'overdue')
    .reduce((sum, report) => sum + parseFloat(report.currentAmount), 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
              <Button 
                onClick={fetchAgingReports} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Tekrar Dene
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Clock className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">{description}</CardDescription>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">Toplam Tutar</p>
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">Gecikmiş Tutar</p>
            <p className="text-lg font-semibold text-red-900 dark:text-red-100">
              {formatCurrency(overdueAmount)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950/30 p-3 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">Toplam Kayıt</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {filteredReports.length}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Müşteri/Tedarikçi ara..."
              value={filters.customer}
              onChange={(e) => handleFilterChange('customer', e.target.value)}
              className="w-full"
            />
          </div>
          
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Durum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="outstanding">Beklemede</SelectItem>
              <SelectItem value="overdue">Gecikmiş</SelectItem>
              <SelectItem value="paid">Ödenmiş</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.agingBucket} onValueChange={(value) => handleFilterChange('agingBucket', value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Yaşlandırma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Dönemler</SelectItem>
              <SelectItem value="0-30">0-30 gün</SelectItem>
              <SelectItem value="30-60">30-60 gün</SelectItem>
              <SelectItem value="60-90">60-90 gün</SelectItem>
              <SelectItem value="90+">90+ gün</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri/Tedarikçi</TableHead>
                <TableHead>Fatura No</TableHead>
                <TableHead>Fatura Tarihi</TableHead>
                <TableHead>Vade Tarihi</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Gün</TableHead>
                <TableHead>Yaşlandırma</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Kayıt bulunamadı</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.customerVendorName}
                    </TableCell>
                    <TableCell>{report.invoiceNumber || '-'}</TableCell>
                    <TableCell>{formatDate(report.invoiceDate)}</TableCell>
                    <TableCell>{formatDate(report.dueDate)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(parseFloat(report.currentAmount))}
                    </TableCell>
                    <TableCell>
                      <span className={report.agingDays > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                        {report.agingDays > 0 ? `+${report.agingDays}` : report.agingDays}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getBucketColor(report.agingBucket)}>
                        {report.agingBucket} gün
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span>{getStatusText(report.status)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskBadgeColor(report.riskLevel)}>
                        {report.riskLevel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
