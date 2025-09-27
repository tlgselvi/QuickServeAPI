import { useCurrency } from '@/contexts/CurrencyContext';

export function formatCurrency(
  value: number,
  currency?: 'TRY' | 'USD' | 'EUR',
  locale?: string
): string {
  // Eğer currency belirtilmişse, eski davranışı koru
  if (currency) {
    return value.toLocaleString(locale || 'tr-TR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  
  // Currency belirtilmemişse, context'ten al
  // Bu durumda hook kullanılması gerekiyor, bu yüzden hook versiyonunu export edelim
  throw new Error('formatCurrency must be used with currency parameter or within CurrencyContext');
}

// Hook versiyonu - component'ler içinde kullanım için
export function useFormatCurrency() {
  const { formatCurrency: contextFormatCurrency } = useCurrency();
  return contextFormatCurrency;
}
