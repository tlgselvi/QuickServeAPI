import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

type Props = { dscr: number; status: 'ok' | 'warning' | 'critical' };

const statusToColor: Record<Props['status'], string> = {
  ok: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  critical: 'text-red-600 dark:text-red-400',
};

const statusToBgColor: Record<Props['status'], string> = {
  ok: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  critical: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
};

export function DSCRCard ({ dscr, status }: Props) {
  const getStatusText = (status: Props['status']) => {
    switch (status) {
      case 'ok': return 'Sağlıklı (>1.2)';
      case 'warning': return 'Dikkat (1.0-1.2)';
      case 'critical': return 'Risk (<1.0)';
      default: return status;
    }
  };

  return (
    <Card className={statusToBgColor[status]}>
      <CardHeader>
        <CardTitle className="text-gray-700 dark:text-gray-300">DSCR</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${statusToColor[status]}`}>
          {Number.isFinite(dscr) ? dscr.toFixed(2) : '∞'}
        </div>
        <div className={`text-sm ${statusToColor[status]} font-medium`}>
          {getStatusText(status)}
        </div>
      </CardContent>
    </Card>
  );
}

export default DSCRCard;

