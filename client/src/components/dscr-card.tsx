import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

type Props = { dscr: number; status: 'ok' | 'warning' | 'critical' };

const statusToColor: Record<Props['status'], string> = {
  ok: 'text-green-600',
  warning: 'text-yellow-600',
  critical: 'text-red-600',
};

export function DSCRCard ({ dscr, status }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>DSCR</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${statusToColor[status]}`}>{Number.isFinite(dscr) ? dscr.toFixed(2) : '∞'}</div>
        <div className="text-sm text-muted-foreground capitalize">{status}</div>
      </CardContent>
    </Card>
  );
}

export default DSCRCard;

