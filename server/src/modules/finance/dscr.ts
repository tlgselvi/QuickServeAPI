export function calculateDSCR (operatingCF: number, debtService: number): number {
  if (debtService === 0) return Infinity;
  return operatingCF / debtService;
}

export function mapDSCRStatus (dscr: number): 'ok' | 'warning' | 'critical' {
  if (dscr >= 1.5) return 'ok';
  if (dscr >= 1.0) return 'warning';
  return 'critical';
}

