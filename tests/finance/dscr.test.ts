import { describe, expect, test } from 'vitest';
import { calculateDSCR, mapDSCRStatus } from '../../server/src/modules/finance/dscr';

describe('DSCR Calculations', () => {
  test('operatingCF=200, debtService=100 → dscr=2.0, status=ok', () => {
    const dscr = calculateDSCR(200, 100);
    expect(dscr).toBe(2);
    expect(mapDSCRStatus(dscr)).toBe('ok');
  });

  test('operatingCF=120, debtService=120 → dscr=1.0, status=warning', () => {
    const dscr = calculateDSCR(120, 120);
    expect(dscr).toBe(1);
    expect(mapDSCRStatus(dscr)).toBe('warning');
  });

  test('operatingCF=80, debtService=100 → dscr=0.8, status=critical', () => {
    const dscr = calculateDSCR(80, 100);
    expect(dscr).toBeCloseTo(0.8, 5);
    expect(mapDSCRStatus(dscr)).toBe('critical');
  });

  test('debtService=0 → Infinity', () => {
    const dscr = calculateDSCR(100, 0);
    expect(dscr).toBe(Infinity);
  });
});

