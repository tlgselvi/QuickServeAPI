import { formatCurrency } from '../../../lib/utils/formatCurrency';

// Desteklenen locale'ler
export type SupportedLocale = 'tr-TR' | 'en-US' | 'de-DE';

// Locale ayarları
const localeSettings: Record<SupportedLocale, {
  currency: 'TRY' | 'USD' | 'EUR';
  headers: {
    id: string;
    description: string;
    category: string;
    amount: string;
    type: string;
    date: string;
    bankName: string;
    accountName: string;
    balance: string;
    summary: string;
    totalBalance: string;
    totalCash: string;
    totalDebt: string;
    totalIncome: string;
    totalExpense: string;
  };
}> = {
  'tr-TR': {
    currency: 'TRY',
    headers: {
      id: 'ID',
      description: 'Açıklama',
      category: 'Kategori',
      amount: 'Tutar',
      type: 'Tür',
      date: 'Tarih',
      bankName: 'Banka Adı',
      accountName: 'Hesap Adı',
      balance: 'Bakiye',
      summary: 'Özet',
      totalBalance: 'Toplam Bakiye',
      totalCash: 'Toplam Nakit',
      totalDebt: 'Toplam Borç',
      totalIncome: 'Toplam Gelir',
      totalExpense: 'Toplam Gider'
    }
  },
  'en-US': {
    currency: 'USD',
    headers: {
      id: 'ID',
      description: 'Description',
      category: 'Category',
      amount: 'Amount',
      type: 'Type',
      date: 'Date',
      bankName: 'Bank Name',
      accountName: 'Account Name',
      balance: 'Balance',
      summary: 'Summary',
      totalBalance: 'Total Balance',
      totalCash: 'Total Cash',
      totalDebt: 'Total Debt',
      totalIncome: 'Total Income',
      totalExpense: 'Total Expense'
    }
  },
  'de-DE': {
    currency: 'EUR',
    headers: {
      id: 'ID',
      description: 'Beschreibung',
      category: 'Kategorie',
      amount: 'Betrag',
      type: 'Typ',
      date: 'Datum',
      bankName: 'Bankname',
      accountName: 'Kontoname',
      balance: 'Saldo',
      summary: 'Zusammenfassung',
      totalBalance: 'Gesamtsaldo',
      totalCash: 'Gesamtbargeld',
      totalDebt: 'Gesamtschulden',
      totalIncome: 'Gesamteinkommen',
      totalExpense: 'Gesamtausgaben'
    }
  }
};

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
}

interface Account {
  id: string;
  balance: number;
  bankName: string;
  accountName: string;
}

export class CSVExporter {
  /**
   * Locale desteği ile transaction export
   */
  static exportTransactions(transactions: Transaction[], locale: SupportedLocale = 'tr-TR'): string {
    const settings = localeSettings[locale];
    const headers = [
      settings.headers.id,
      settings.headers.description,
      settings.headers.category,
      settings.headers.amount,
      settings.headers.type,
      settings.headers.date
    ];
    const csvRows = [headers.join(',')];

    transactions.forEach(transaction => {
      const row = [
        transaction.id,
        `"${transaction.description}"`,
        `"${transaction.category}"`,
        formatCurrency(transaction.amount, settings.currency, locale),
        `"${transaction.type}"`,
        new Date(transaction.date).toLocaleDateString(locale)
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Locale desteği ile account export
   */
  static exportAccounts(accounts: Account[], locale: SupportedLocale = 'tr-TR'): string {
    const settings = localeSettings[locale];
    const headers = [
      settings.headers.id,
      settings.headers.bankName,
      settings.headers.accountName,
      settings.headers.balance
    ];
    const csvRows = [headers.join(',')];

    accounts.forEach(account => {
      const row = [
        account.id,
        `"${account.bankName}"`,
        `"${account.accountName}"`,
        formatCurrency(account.balance, settings.currency, locale)
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Locale desteği ile financial summary export
   */
  static exportFinancialSummary(
    data: {
      totalBalance: number;
      totalCash: number;
      totalDebt: number;
      totalIncome: number;
      totalExpense: number;
    },
    locale: SupportedLocale = 'tr-TR'
  ): string {
    const settings = localeSettings[locale];
    const headers = [settings.headers.summary, settings.headers.amount];
    const csvRows = [headers.join(',')];

    const summaryData = [
      [settings.headers.totalBalance, formatCurrency(data.totalBalance, settings.currency, locale)],
      [settings.headers.totalCash, formatCurrency(data.totalCash, settings.currency, locale)],
      [settings.headers.totalDebt, formatCurrency(data.totalDebt, settings.currency, locale)],
      [settings.headers.totalIncome, formatCurrency(data.totalIncome, settings.currency, locale)],
      [settings.headers.totalExpense, formatCurrency(data.totalExpense, settings.currency, locale)]
    ];

    summaryData.forEach(([label, value]) => {
      csvRows.push([`"${label}"`, value].join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Locale doğrulama ve default değer
   */
  static validateLocale(locale: string): SupportedLocale {
    const supportedLocales: SupportedLocale[] = ['tr-TR', 'en-US', 'de-DE'];
    return supportedLocales.includes(locale as SupportedLocale) ? locale as SupportedLocale : 'tr-TR';
  }

  /**
   * Desteklenen locale'leri listeler
   */
  static getSupportedLocales(): Array<{ code: SupportedLocale; name: string; currency: string }> {
    return [
      { code: 'tr-TR', name: 'Türkçe', currency: 'TRY' },
      { code: 'en-US', name: 'English', currency: 'USD' },
      { code: 'de-DE', name: 'Deutsch', currency: 'EUR' }
    ];
  }
}
