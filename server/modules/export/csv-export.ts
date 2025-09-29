import type { Account, Transaction } from '@shared/schema';

export interface CSVExportOptions {
  locale: 'tr-TR' | 'en-US';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  currency: 'TRY' | 'USD' | 'EUR';
  includeHeaders: boolean;
}

export interface CSVExportData {
  accounts?: Account[];
  transactions?: Transaction[];
  type: 'accounts' | 'transactions' | 'combined';
}

/**
 * Export data to CSV with locale support
 */
export function exportToCSV(
  data: CSVExportData,
  options: CSVExportOptions = {
    locale: 'tr-TR',
    dateFormat: 'DD/MM/YYYY',
    currency: 'TRY',
    includeHeaders: true,
  }
): string {
  const { locale, dateFormat, currency, includeHeaders } = options;

  // Locale-specific configurations
  const localeConfig = {
    'tr-TR': {
      separator: ';',
      decimalSeparator: ',',
      thousandSeparator: '.',
      encoding: 'UTF-8',
      headers: {
        accounts: ['ID', 'Banka Adı', 'Hesap Adı', 'Tip', 'Bakiye', 'Para Birimi', 'Oluşturma Tarihi'],
        transactions: ['ID', 'Hesap', 'Tutar', 'Açıklama', 'Kategori', 'Tarih', 'Tip'],
      },
    },
    'en-US': {
      separator: ',',
      decimalSeparator: '.',
      thousandSeparator: ',',
      encoding: 'UTF-8',
      headers: {
        accounts: ['ID', 'Bank Name', 'Account Name', 'Type', 'Balance', 'Currency', 'Created Date'],
        transactions: ['ID', 'Account', 'Amount', 'Description', 'Category', 'Date', 'Type'],
      },
    },
  };

  const config = localeConfig[locale];

  // Format number according to locale
  const formatNumber = (value: number): string => {
    if (config.decimalSeparator === ',') {
      return value.toString().replace('.', ',');
    }
    return value.toString();
  };

  // Format date according to locale
  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();

    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return d.toLocaleDateString(locale);
    }
  };

  // Format currency amount
  const formatCurrency = (amount: number): string => {
    const formatted = formatNumber(Math.abs(amount));
    return `${currency} ${formatted}`;
  };

  let csvContent = '';

  // Add BOM for UTF-8 encoding
  if (locale === 'tr-TR') {
    csvContent += '\uFEFF';
  }

  // Export accounts
  if (data.accounts && (data.type === 'accounts' || data.type === 'combined')) {
    if (includeHeaders) {
      csvContent += config.headers.accounts.join(config.separator) + '\n';
    }

    data.accounts.forEach(account => {
      const row = [
        account.id,
        account.bankName,
        account.accountName,
        account.type,
        formatCurrency(parseFloat(account.balance)),
        account.currency,
        formatDate(new Date(account.createdAt)),
      ];
      csvContent += row.join(config.separator) + '\n';
    });

    if (data.type === 'combined') {
      csvContent += '\n'; // Empty line between sections
    }
  }

  // Export transactions
  if (data.transactions && (data.type === 'transactions' || data.type === 'combined')) {
    if (includeHeaders && data.type === 'transactions') {
      csvContent += config.headers.transactions.join(config.separator) + '\n';
    } else if (includeHeaders && data.type === 'combined') {
      csvContent += config.headers.transactions.join(config.separator) + '\n';
    }

    data.transactions.forEach(transaction => {
      const accountName = data.accounts?.find(acc => acc.id === transaction.accountId)?.accountName || 'Unknown';
      
      const row = [
        transaction.id,
        accountName,
        formatCurrency(parseFloat(transaction.amount)),
        transaction.description || '',
        transaction.category || '',
        formatDate(new Date(transaction.createdAt)),
        transaction.type,
      ];
      csvContent += row.join(config.separator) + '\n';
    });
  }

  return csvContent;
}

/**
 * Generate CSV filename with locale and timestamp
 */
export function generateCSVFilename(
  type: 'accounts' | 'transactions' | 'combined',
  locale: 'tr-TR' | 'en-US' = 'tr-TR'
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const typeMap = {
    accounts: locale === 'tr-TR' ? 'hesaplar' : 'accounts',
    transactions: locale === 'tr-TR' ? 'islemler' : 'transactions',
    combined: locale === 'tr-TR' ? 'finansal-rapor' : 'financial-report',
  };

  return `${typeMap[type]}_${timestamp}.csv`;
}

/**
 * Get CSV export options for user's locale
 */
export function getCSVExportOptions(locale: string): CSVExportOptions {
  const isTurkish = locale.startsWith('tr');
  
  return {
    locale: isTurkish ? 'tr-TR' : 'en-US',
    dateFormat: isTurkish ? 'DD/MM/YYYY' : 'MM/DD/YYYY',
    currency: 'TRY', // TODO Tolga'dan teyit al - Default currency
    includeHeaders: true,
  };
}

