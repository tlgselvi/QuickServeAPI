import { formatCurrency } from '../../client/src/lib/utils/formatCurrency';

test('TRY format', () => {
  expect(formatCurrency(1234.5, 'TRY')).toBe('₺1.234,50');
});

test('USD format', () => {
  expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50');
});

test('EUR format', () => {
  const out = formatCurrency(1234.5, 'EUR', 'de-DE');
  // Normalize NBSP vs regular space for cross-platform consistency
  expect(out.replace(/\u00A0/g, ' ')).toBe('1.234,50 €');
});
