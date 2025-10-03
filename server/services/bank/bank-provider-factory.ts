/**
 * Bank Provider Factory
 * Creates and manages bank integration providers
 */

import { BaseBankProvider, BankCredentials } from './providers/base-provider.js';
import { OpenBankingProvider } from './providers/open-banking-provider.js';
import { TurkishBankProvider } from './providers/turkish-bank-provider.js';

export type ProviderType = 'open-banking' | 'turkish-bank' | 'mock';

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  credentials: BankCredentials;
  isActive: boolean;
  sandbox?: boolean;
}

export class BankProviderFactory {
  private static providers = new Map<string, BaseBankProvider>();

  /**
   * Create a bank provider instance
   */
  static async createProvider(config: ProviderConfig): Promise<BaseBankProvider> {
    const providerKey = this.getProviderKey(config);

    // Return existing provider if available
    if (this.providers.has(providerKey)) {
      return this.providers.get(providerKey)!;
    }

    let provider: BaseBankProvider;

    switch (config.type) {
      case 'open-banking':
        provider = new OpenBankingProvider(config.credentials);
        break;
      case 'turkish-bank':
        provider = new TurkishBankProvider(config.credentials);
        break;
      case 'mock':
        provider = await this.createMockProvider(config.credentials);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Validate credentials
    const validation = await provider.validateCredentials();
    if (!validation.success) {
      throw new Error(`Invalid credentials for provider ${config.name}: ${validation.error?.message}`);
    }

    // Cache the provider
    this.providers.set(providerKey, provider);

    return provider;
  }

  /**
   * Get existing provider by key
   */
  static getProvider(key: string): BaseBankProvider | undefined {
    return this.providers.get(key);
  }

  /**
   * Remove provider from cache
   */
  static removeProvider(key: string): boolean {
    return this.providers.delete(key);
  }

  /**
   * Clear all cached providers
   */
  static clearProviders(): void {
    this.providers.clear();
  }

  /**
   * Get list of supported provider types
   */
  static getSupportedProviders(): Array<{
    type: ProviderType;
    name: string;
    features: string[];
    supportedCurrencies: string[];
    supportedAccountTypes: string[];
  }> {
    return [
      {
        type: 'open-banking',
        name: 'Open Banking (PSD2)',
        features: ['accounts', 'transactions', 'transfers', 'balance', 'statements', 'webhooks', 'oauth'],
        supportedCurrencies: ['TRY', 'USD', 'EUR', 'GBP'],
        supportedAccountTypes: ['checking', 'savings', 'credit', 'loan']
      },
      {
        type: 'turkish-bank',
        name: 'Turkish Banks',
        features: ['accounts', 'transactions', 'transfers', 'balance', 'statements', 'cards', 'webhooks'],
        supportedCurrencies: ['TRY', 'USD', 'EUR'],
        supportedAccountTypes: ['checking', 'savings', 'credit', 'loan']
      },
      {
        type: 'mock',
        name: 'Mock Provider (Testing)',
        features: ['accounts', 'transactions', 'transfers', 'balance', 'statements'],
        supportedCurrencies: ['TRY', 'USD', 'EUR'],
        supportedAccountTypes: ['checking', 'savings', 'credit', 'loan']
      }
    ];
  }

  /**
   * Validate provider configuration
   */
  static validateProviderConfig(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Provider type is required');
    }

    if (!config.name) {
      errors.push('Provider name is required');
    }

    if (!config.credentials) {
      errors.push('Provider credentials are required');
    }

    // Validate credentials based on provider type
    switch (config.type) {
      case 'open-banking':
        if (!config.credentials.clientId) {
          errors.push('Client ID is required for Open Banking provider');
        }
        if (!config.credentials.clientSecret) {
          errors.push('Client Secret is required for Open Banking provider');
        }
        break;
      case 'turkish-bank':
        if (!config.credentials.username) {
          errors.push('Username is required for Turkish Bank provider');
        }
        if (!config.credentials.password) {
          errors.push('Password is required for Turkish Bank provider');
        }
        break;
      case 'mock':
        // Mock provider doesn't require specific credentials
        break;
      default:
        errors.push(`Unsupported provider type: ${config.type}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get provider key for caching
   */
  private static getProviderKey(config: ProviderConfig): string {
    return `${config.type}:${config.name}:${config.credentials.clientId || config.credentials.username}`;
  }

  /**
   * Create mock provider for testing
   */
  private static async createMockProvider(credentials: BankCredentials): Promise<BaseBankProvider> {
    return new MockBankProvider(credentials);
  }
}

/**
 * Mock Bank Provider for testing
 */
class MockBankProvider extends BaseBankProvider {
  protected getProviderConfig() {
    return {
      name: 'Mock Provider',
      version: '1.0.0',
      supportedFeatures: ['accounts', 'transactions', 'transfers', 'balance', 'statements'],
      rateLimits: {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
        requestsPerDay: 100000
      },
      supportedCurrencies: ['TRY', 'USD', 'EUR'],
      supportedAccountTypes: ['checking', 'savings', 'credit', 'loan'],
      webhookSupported: false,
      oauthSupported: false,
      sandboxSupported: true
    };
  }

  async validateCredentials(): Promise<BankApiResponse<boolean>> {
    return { success: true, data: true };
  }

  async getAccounts(): Promise<BankApiResponse<BankAccount[]>> {
    return {
      success: true,
      data: [
        {
          id: 'MOCK_001',
          name: 'Mock Checking Account',
          type: 'checking',
          balance: 15000.50,
          currency: 'TRY',
          accountNumber: '1234567890',
          iban: 'TR1234567890123456789012345',
          lastUpdated: new Date(),
          metadata: { source: 'mock' }
        },
        {
          id: 'MOCK_002',
          name: 'Mock Savings Account',
          type: 'savings',
          balance: 50000.00,
          currency: 'TRY',
          accountNumber: '0987654321',
          iban: 'TR0987654321098765432109876',
          lastUpdated: new Date(),
          metadata: { source: 'mock' }
        }
      ]
    };
  }

  async getAccount(accountId: string): Promise<BankApiResponse<BankAccount>> {
    const accounts = await this.getAccounts();
    if (!accounts.success || !accounts.data) {
      return accounts;
    }

    const account = accounts.data.find(acc => acc.id === accountId);
    if (!account) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account ${accountId} not found`
        }
      };
    }

    return { success: true, data: account };
  }

  async getTransactions(
    accountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<BankApiResponse<BankTransaction[]>> {
    const mockTransactions: BankTransaction[] = [
      {
        id: 'TXN_001',
        accountId,
        date: new Date(Date.now() - 86400000), // 1 day ago
        amount: 1000.00,
        currency: 'TRY',
        description: 'Mock Credit Transaction',
        reference: 'MOCK_REF_001',
        category: 'Income',
        balance: 15000.50,
        type: 'credit',
        status: 'completed',
        metadata: { source: 'mock' }
      },
      {
        id: 'TXN_002',
        accountId,
        date: new Date(Date.now() - 172800000), // 2 days ago
        amount: 500.00,
        currency: 'TRY',
        description: 'Mock Debit Transaction',
        reference: 'MOCK_REF_002',
        category: 'Expense',
        balance: 14000.50,
        type: 'debit',
        status: 'completed',
        metadata: { source: 'mock' }
      }
    ];

    return { success: true, data: mockTransactions };
  }

  async getTransaction(
    accountId: string,
    transactionId: string
  ): Promise<BankApiResponse<BankTransaction>> {
    const transactions = await this.getTransactions(accountId);
    if (!transactions.success || !transactions.data) {
      return transactions;
    }

    const transaction = transactions.data.find(txn => txn.id === transactionId);
    if (!transaction) {
      return {
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction ${transactionId} not found`
        }
      };
    }

    return { success: true, data: transaction };
  }

  async syncData(options?: {
    includeTransactions?: boolean;
    transactionDaysBack?: number;
    forceRefresh?: boolean;
  }): Promise<BankApiResponse<SyncResult>> {
    return {
      success: true,
      data: {
        success: true,
        accountsUpdated: 2,
        transactionsCount: 10,
        lastSyncDate: new Date()
      }
    };
  }

  async createTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BankApiResponse<BankTransfer>> {
    return {
      success: true,
      data: {
        id: `TRANSFER_${Date.now()}`,
        fromAccountId,
        toAccountId,
        amount,
        currency: 'TRY',
        description,
        status: 'completed',
        initiatedAt: new Date(),
        completedAt: new Date(),
        reference: `MOCK_REF_${Date.now()}`,
        metadata: { ...metadata, source: 'mock' }
      }
    };
  }

  async getTransfer(transferId: string): Promise<BankApiResponse<BankTransfer>> {
    return {
      success: true,
      data: {
        id: transferId,
        fromAccountId: 'MOCK_001',
        toAccountId: 'MOCK_002',
        amount: 1000.00,
        currency: 'TRY',
        description: 'Mock Transfer',
        status: 'completed',
        initiatedAt: new Date(Date.now() - 3600000), // 1 hour ago
        completedAt: new Date(Date.now() - 3000000), // 50 minutes ago
        reference: `MOCK_REF_${transferId}`,
        metadata: { source: 'mock' }
      }
    };
  }

  async getCards(accountId: string): Promise<BankApiResponse<BankCard[]>> {
    return {
      success: true,
      data: [
        {
          id: 'CARD_001',
          accountId,
          cardNumber: '****1234',
          cardType: 'debit',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'Mock User',
          status: 'active',
          limit: 10000,
          availableLimit: 8500,
          metadata: { source: 'mock' }
        }
      ]
    };
  }

  async updateCardStatus(
    cardId: string,
    status: 'active' | 'blocked' | 'cancelled'
  ): Promise<BankApiResponse<BankCard>> {
    const cards = await this.getCards('MOCK_001');
    if (!cards.success || !cards.data) {
      return cards;
    }

    const card = cards.data[0];
    return {
      success: true,
      data: {
        ...card,
        status,
        metadata: { ...card.metadata, statusUpdatedAt: new Date() }
      }
    };
  }

  async getBalance(accountId: string): Promise<BankApiResponse<number>> {
    const account = await this.getAccount(accountId);
    if (!account.success || !account.data) {
      return account;
    }

    return { success: true, data: account.data.balance };
  }

  async getStatement(
    accountId: string,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' | 'ofx'
  ): Promise<BankApiResponse<Buffer>> {
    const mockStatement = `Mock Statement for Account ${accountId}\nFrom: ${startDate.toISOString()}\nTo: ${endDate.toISOString()}\nFormat: ${format}`;
    return { success: true, data: Buffer.from(mockStatement, 'utf-8') };
  }

  async setupWebhook(
    webhookUrl: string,
    events: string[]
  ): Promise<BankApiResponse<{ webhookId: string; secret: string }>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Webhooks are not supported by mock provider'
      }
    };
  }

  async verifyWebhook(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    return false;
  }

  async handleWebhook(
    eventType: string,
    payload: any
  ): Promise<BankApiResponse<any>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Webhooks are not supported by mock provider'
      }
    };
  }

  async refreshToken(): Promise<BankApiResponse<{ token: string; expiresAt: Date }>> {
    return {
      success: true,
      data: {
        token: 'mock_token',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      }
    };
  }

  async revokeAuth(): Promise<BankApiResponse<boolean>> {
    return { success: true, data: true };
  }

  protected getErrorMessage(error: any): string {
    return error?.message || 'Mock provider error';
  }

  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<BankApiResponse<T>> {
    // Mock implementation - always succeeds
    return {
      success: true,
      data: {} as T,
      metadata: {
        requestId: `mock_${Date.now()}`,
        timestamp: new Date()
      }
    };
  }
}

// Import types from base provider
import type { BankApiResponse, BankAccount, BankTransaction, BankTransfer, BankCard, SyncResult } from './providers/base-provider.js';
