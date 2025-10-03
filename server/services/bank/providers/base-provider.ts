/**
 * Base Bank Integration Provider Interface
 * Defines the contract for all bank integration providers
 */

export interface BankCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  token?: string;
  certificate?: string;
  privateKey?: string;
  sandbox?: boolean;
  baseUrl?: string;
  [key: string]: any; // Allow additional provider-specific credentials
}

export interface BankAccount {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'loan' | 'investment';
  balance: number;
  currency: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swift?: string;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  category?: string;
  balance: number;
  type: 'debit' | 'credit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  merchant?: {
    name: string;
    category?: string;
    location?: string;
  };
  metadata?: Record<string, any>;
}

export interface BankTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  initiatedAt: Date;
  completedAt?: Date;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface BankCard {
  id: string;
  accountId: string;
  cardNumber: string; // Masked (e.g., "****1234")
  cardType: 'debit' | 'credit' | 'prepaid';
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
  status: 'active' | 'blocked' | 'expired' | 'cancelled';
  limit?: number;
  availableLimit?: number;
  metadata?: Record<string, any>;
}

export interface SyncResult {
  success: boolean;
  accountsUpdated: number;
  transactionsCount: number;
  lastSyncDate: Date;
  errors?: string[];
  warnings?: string[];
}

export interface BankApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
  };
}

export interface BankProviderConfig {
  name: string;
  version: string;
  supportedFeatures: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  supportedCurrencies: string[];
  supportedAccountTypes: string[];
  webhookSupported: boolean;
  oauthSupported: boolean;
  sandboxSupported: boolean;
}

/**
 * Abstract base class for all bank integration providers
 */
export abstract class BaseBankProvider {
  protected credentials: BankCredentials;
  protected config: BankProviderConfig;

  constructor(credentials: BankCredentials) {
    this.credentials = credentials;
    this.config = this.getProviderConfig();
  }

  /**
   * Get provider configuration
   */
  protected abstract getProviderConfig(): BankProviderConfig;

  /**
   * Validate credentials
   */
  abstract validateCredentials(): Promise<BankApiResponse<boolean>>;

  /**
   * Get all accounts for the authenticated user
   */
  abstract getAccounts(): Promise<BankApiResponse<BankAccount[]>>;

  /**
   * Get account details by ID
   */
  abstract getAccount(accountId: string): Promise<BankApiResponse<BankAccount>>;

  /**
   * Get transactions for a specific account
   */
  abstract getTransactions(
    accountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<BankApiResponse<BankTransaction[]>>;

  /**
   * Get transaction details by ID
   */
  abstract getTransaction(
    accountId: string,
    transactionId: string
  ): Promise<BankApiResponse<BankTransaction>>;

  /**
   * Sync all data (accounts and transactions)
   */
  abstract syncData(options?: {
    includeTransactions?: boolean;
    transactionDaysBack?: number;
    forceRefresh?: boolean;
  }): Promise<BankApiResponse<SyncResult>>;

  /**
   * Create a transfer between accounts
   */
  abstract createTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BankApiResponse<BankTransfer>>;

  /**
   * Get transfer status
   */
  abstract getTransfer(transferId: string): Promise<BankApiResponse<BankTransfer>>;

  /**
   * Get cards associated with an account
   */
  abstract getCards(accountId: string): Promise<BankApiResponse<BankCard[]>>;

  /**
   * Block/unblock a card
   */
  abstract updateCardStatus(
    cardId: string,
    status: 'active' | 'blocked' | 'cancelled'
  ): Promise<BankApiResponse<BankCard>>;

  /**
   * Get account balance
   */
  abstract getBalance(accountId: string): Promise<BankApiResponse<number>>;

  /**
   * Get account statement (PDF/CSV)
   */
  abstract getStatement(
    accountId: string,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' | 'ofx'
  ): Promise<BankApiResponse<Buffer>>;

  /**
   * Setup webhook for real-time updates
   */
  abstract setupWebhook(
    webhookUrl: string,
    events: string[]
  ): Promise<BankApiResponse<{ webhookId: string; secret: string }>>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhook(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean>;

  /**
   * Handle webhook event
   */
  abstract handleWebhook(
    eventType: string,
    payload: any
  ): Promise<BankApiResponse<any>>;

  /**
   * Refresh authentication token (for OAuth providers)
   */
  abstract refreshToken(): Promise<BankApiResponse<{ token: string; expiresAt: Date }>>;

  /**
   * Revoke authentication
   */
  abstract revokeAuth(): Promise<BankApiResponse<boolean>>;

  /**
   * Get provider-specific error message
   */
  protected abstract getErrorMessage(error: any): string;

  /**
   * Make authenticated API request
   */
  protected abstract makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<BankApiResponse<T>>;

  /**
   * Handle rate limiting
   */
  protected async handleRateLimit(): Promise<void> {
    // Default implementation - can be overridden by providers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Retry failed request with exponential backoff
   */
  protected async retryRequest<T>(
    requestFn: () => Promise<BankApiResponse<T>>,
    maxRetries: number = 3
  ): Promise<BankApiResponse<T>> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        if (result.success) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: this.getErrorMessage(lastError),
        details: lastError
      }
    };
  }

  /**
   * Validate transaction data
   */
  protected validateTransaction(transaction: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transaction.id) errors.push('Transaction ID is required');
    if (!transaction.accountId) errors.push('Account ID is required');
    if (!transaction.date) errors.push('Transaction date is required');
    if (!transaction.amount) errors.push('Transaction amount is required');
    if (!transaction.type) errors.push('Transaction type is required');
    if (!['debit', 'credit'].includes(transaction.type)) {
      errors.push('Transaction type must be debit or credit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate account data
   */
  protected validateAccount(account: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!account.id) errors.push('Account ID is required');
    if (!account.name) errors.push('Account name is required');
    if (!account.type) errors.push('Account type is required');
    if (!account.currency) errors.push('Account currency is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.config.name;
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): string[] {
    return this.config.supportedFeatures;
  }

  /**
   * Check if feature is supported
   */
  supportsFeature(feature: string): boolean {
    return this.config.supportedFeatures.includes(feature);
  }

  /**
   * Get rate limits
   */
  getRateLimits() {
    return this.config.rateLimits;
  }
}
