export function formatCurrency(
  value: number,
  currency: 'TRY' | 'USD' | 'EUR' = 'TRY',
  locale: string = 'tr-TR'
): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
