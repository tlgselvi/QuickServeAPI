import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Currency = 'TRY' | 'USD' | 'EUR';

export interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRates: Record<Currency, number>;
  convertAmount: (amount: number, fromCurrency?: Currency) => number;
  formatCurrency: (amount: number, locale?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<Currency>('TRY');
  
  // Döviz kurları (örnek değerler - gerçek uygulamada API'den gelecek)
  const [exchangeRates] = useState<Record<Currency, number>>({
    TRY: 1,
    USD: 0.033, // 1 TRY = 0.033 USD (yaklaşık 30.3 TRY = 1 USD)
    EUR: 0.030  // 1 TRY = 0.030 EUR (yaklaşık 33.3 TRY = 1 EUR)
  });

  // Local storage'dan currency'yi yükle
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency') as Currency;
    if (savedCurrency && ['TRY', 'USD', 'EUR'].includes(savedCurrency)) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Currency değiştiğinde local storage'a kaydet
  useEffect(() => {
    localStorage.setItem('selectedCurrency', currency);
  }, [currency]);

  // Para birimi dönüştürme
  const convertAmount = (amount: number, fromCurrency: Currency = 'TRY'): number => {
    if (fromCurrency === currency) return amount;
    
    // TRY'den diğer para birimlerine dönüştür
    if (fromCurrency === 'TRY') {
      return amount * exchangeRates[currency];
    }
    
    // Diğer para birimlerinden TRY'ye dönüştür, sonra hedef para birimine
    const amountInTRY = amount / exchangeRates[fromCurrency];
    return amountInTRY * exchangeRates[currency];
  };

  // Para birimi formatlama
  const formatCurrency = (amount: number, locale?: string): string => {
    const convertedAmount = convertAmount(amount);
    
    const locales: Record<Currency, string> = {
      TRY: 'tr-TR',
      USD: 'en-US',
      EUR: 'de-DE'
    };

    const selectedLocale = locale || locales[currency];

    try {
      return convertedAmount.toLocaleString(selectedLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (error) {
      // Fallback formatting
      const symbols: Record<Currency, string> = {
        TRY: '₺',
        USD: '$',
        EUR: '€'
      };
      return `${symbols[currency]}${convertedAmount.toFixed(2)}`;
    }
  };

  const value: CurrencyContextType = {
    currency,
    setCurrency,
    exchangeRates,
    convertAmount,
    formatCurrency
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Convenience hook for formatting currency
export function useFormatCurrency() {
  const { formatCurrency } = useCurrency();
  return formatCurrency;
}