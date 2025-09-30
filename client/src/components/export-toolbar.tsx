import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExportDialog } from './export-dialog';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown,
  Clock,
  TrendingDown,
  BarChart3,
  FileSpreadsheet as CombinedIcon
} from 'lucide-react';

interface ExportToolbarProps {
  className?: string;
  showLabel?: boolean;
}

const exportOptions = [
  {
    type: 'aging' as const,
    title: 'Yaşlandırma Raporları',
    description: 'Alacak ve borç yaşlandırma raporlarını dışa aktar',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-orange-600',
  },
  {
    type: 'runway' as const,
    title: 'Runway Analizi',
    description: 'Nakit tükenme süresi analizini dışa aktar',
    icon: <TrendingDown className="h-4 w-4" />,
    color: 'text-blue-600',
  },
  {
    type: 'cashgap' as const,
    title: 'Cash Gap Analizi',
    description: 'Alacak-borç karşılaştırma analizini dışa aktar',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'text-green-600',
  },
  {
    type: 'combined' as const,
    title: 'Kapsamlı Rapor',
    description: 'Tüm finansal verileri kapsamlı rapor olarak dışa aktar',
    icon: <CombinedIcon className="h-4 w-4" />,
    color: 'text-purple-600',
  },
];

export function ExportToolbar({ className = '', showLabel = true }: ExportToolbarProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Dışa Aktar:
        </span>
      )}
      
      {/* Quick Export Buttons */}
      <div className="flex items-center gap-1">
        {exportOptions.map((option) => (
          <ExportDialog
            key={option.type}
            dataType={option.type}
            title={option.title}
            description={option.description}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <span className={option.color}>{option.icon}</span>
                {showLabel && (
                  <span className="hidden sm:inline">{option.title}</span>
                )}
              </Button>
            }
          />
        ))}
      </div>

      {/* Dropdown Menu for Additional Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            {showLabel && <span className="hidden sm:inline">Daha Fazla</span>}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
            <span>Tüm Raporları CSV olarak</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileText className="h-4 w-4 mr-2 text-red-600" />
            <span>Tüm Raporları PDF olarak</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Clock className="h-4 w-4 mr-2 text-orange-600" />
            <span>Yaşlandırma Özeti</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <TrendingDown className="h-4 w-4 mr-2 text-blue-600" />
            <span>Runway Projeksiyonu</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
            <span>Cash Gap Analizi</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <CombinedIcon className="h-4 w-4 mr-2 text-purple-600" />
            <span>Finansal Sağlık Raporu</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Compact version for smaller spaces
export function ExportToolbarCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {exportOptions.map((option) => (
        <ExportDialog
          key={option.type}
          dataType={option.type}
          title={option.title}
          description={option.description}
          trigger={
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-1 p-2 ${option.color} hover:bg-gray-100 dark:hover:bg-gray-800`}
              title={option.title}
            >
              {option.icon}
            </Button>
          }
        />
      ))}
    </div>
  );
}
