/**
 * Open Banking Provider Implementation
 * Implements Open Banking API standards (PSD2, UK Open Banking, etc.)
 */

import { BaseBankProvider, BankCredentials, BankApiResponse, BankAccount, BankTransaction, BankTransfer, BankCard, SyncResult, BankProviderConfig } from './base-provider.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export class OpenBankingProvider extends BaseBankProvider {
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private refreshToken?: string;

  protected getProviderConfig(): BankProviderConfig {
    return {
      name: 'Open Banking',
      version: '3.1.2',
      supportedFeatures: [
        'accounts',
        'transactions',
        'transfers',
        'balance',
        'statements',
        'webhooks',
        'oauth'
      ],
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      supportedCurrencies: ['TRY', 'USD', 'EUR', 'GBP'],
      supportedAccountTypes: ['checking', 'savings', 'credit', 'loan'],
      webhookSupported: true,
      oauthSupported: true,
      sandboxSupported: true
    };
  }

  async validateCredentials(): Promise<BankApiResponse<boolean>> {
    try {
      // Validate OAuth credentials
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Client ID and Client Secret are required for Open Banking'
          }
        };
      }

      // Test authentication
      const authResult = await this.authenticate();
      return {
        success: authResult.success,
        data: authResult.success,
        error: authResult.error
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getAccounts(): Promise<BankApiResponse<BankAccount[]>> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest<{ accounts: any[] }>(
        'GET',
        '/open-banking/v3.1/accounts'
      );

      if (!response.success || !response.data) {
        return response;
      }

      const accounts: BankAccount[] = response.data.accounts.map((account: any) => ({
        id: account.AccountId,
        name: account.Nickname || account.Name,
        type: this.mapAccountType(account.AccountType),
        balance: parseFloat(account.Balance?.Amount || '0'),
        currency: account.Currency || 'TRY',
        accountNumber: account.Identification?.AccountNumber,
        iban: account.Identification?.IBAN,
        lastUpdated: new Date(account.LastUpdateTime || new Date()),
        metadata: {
          accountSubType: account.AccountSubType,
          openingDate: account.OpeningDate,
          maturityDate: account.MaturityDate
        }
      }));

      return {
        success: true,
        data: accounts
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ACCOUNTS_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getAccount(accountId: string): Promise<BankApiResponse<BankAccount>> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest<{ account: any }>(
        'GET',
        `/open-banking/v3.1/accounts/${accountId}`
      );

      if (!response.success || !response.data) {
        return response;
      }

      const account = response.data.account;
      const bankAccount: BankAccount = {
        id: account.AccountId,
        name: account.Nickname || account.Name,
        type: this.mapAccountType(account.AccountType),
        balance: parseFloat(account.Balance?.Amount || '0'),
        currency: account.Currency || 'TRY',
        accountNumber: account.Identification?.AccountNumber,
        iban: account.Identification?.IBAN,
        lastUpdated: new Date(account.LastUpdateTime || new Date()),
        metadata: {
          accountSubType: account.AccountSubType,
          openingDate: account.OpeningDate,
          maturityDate: account.MaturityDate
        }
      };

      return {
        success: true,
        data: bankAccount
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ACCOUNT_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
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
    try {
      await this.ensureAuthenticated();

      const queryParams = new URLSearchParams();
      if (options?.startDate) {
        queryParams.append('fromBookingDateTime', options.startDate.toISOString());
      }
      if (options?.endDate) {
        queryParams.append('toBookingDateTime', options.endDate.toISOString());
      }
      if (options?.limit) {
        queryParams.append('limit', options.limit.toString());
      }
      if (options?.offset) {
        queryParams.append('offset', options.offset.toString());
      }

      const endpoint = `/open-banking/v3.1/accounts/${accountId}/transactions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await this.makeRequest<{ transactions: any[] }>(
        'GET',
        endpoint
      );

      if (!response.success || !response.data) {
        return response;
      }

      const transactions: BankTransaction[] = response.data.transactions.map((txn: any) => ({
        id: txn.TransactionId,
        accountId: accountId,
        date: new Date(txn.BookingDateTime),
        amount: Math.abs(parseFloat(txn.Amount?.Amount || '0')),
        currency: txn.Amount?.Currency || 'TRY',
        description: txn.TransactionInformation || txn.ProprietaryBankTransactionCode?.Code,
        reference: txn.TransactionReference,
        category: txn.BankTransactionCode?.Code,
        balance: parseFloat(txn.Balance?.Amount || '0'),
        type: parseFloat(txn.Amount?.Amount || '0') >= 0 ? 'credit' : 'debit',
        status: this.mapTransactionStatus(txn.Status),
        merchant: txn.MerchantDetails ? {
          name: txn.MerchantDetails.MerchantName,
          category: txn.MerchantDetails.MerchantCategoryCode,
          location: txn.MerchantDetails.MerchantAddress
        } : undefined,
        metadata: {
          bookingDateTime: txn.BookingDateTime,
          valueDateTime: txn.ValueDateTime,
          bankTransactionCode: txn.BankTransactionCode,
          proprietaryBankTransactionCode: txn.ProprietaryBankTransactionCode
        }
      }));

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TRANSACTIONS_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getTransaction(
    accountId: string,
    transactionId: string
  ): Promise<BankApiResponse<BankTransaction>> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest<{ transaction: any }>(
        'GET',
        `/open-banking/v3.1/accounts/${accountId}/transactions/${transactionId}`
      );

      if (!response.success || !response.data) {
        return response;
      }

      const txn = response.data.transaction;
      const transaction: BankTransaction = {
        id: txn.TransactionId,
        accountId: accountId,
        date: new Date(txn.BookingDateTime),
        amount: Math.abs(parseFloat(txn.Amount?.Amount || '0')),
        currency: txn.Amount?.Currency || 'TRY',
        description: txn.TransactionInformation || txn.ProprietaryBankTransactionCode?.Code,
        reference: txn.TransactionReference,
        category: txn.BankTransactionCode?.Code,
        balance: parseFloat(txn.Balance?.Amount || '0'),
        type: parseFloat(txn.Amount?.Amount || '0') >= 0 ? 'credit' : 'debit',
        status: this.mapTransactionStatus(txn.Status),
        merchant: txn.MerchantDetails ? {
          name: txn.MerchantDetails.MerchantName,
          category: txn.MerchantDetails.MerchantCategoryCode,
          location: txn.MerchantDetails.MerchantAddress
        } : undefined,
        metadata: {
          bookingDateTime: txn.BookingDateTime,
          valueDateTime: txn.ValueDateTime,
          bankTransactionCode: txn.BankTransactionCode,
          proprietaryBankTransactionCode: txn.ProprietaryBankTransactionCode
        }
      };

      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TRANSACTION_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async syncData(options?: {
    includeTransactions?: boolean;
    transactionDaysBack?: number;
    forceRefresh?: boolean;
  }): Promise<BankApiResponse<SyncResult>> {
    try {
      await this.ensureAuthenticated();

      const { includeTransactions = true, transactionDaysBack = 90 } = options || {};
      
      // Get accounts
      const accountsResponse = await this.getAccounts();
      if (!accountsResponse.success) {
        return accountsResponse;
      }

      let transactionsCount = 0;
      const errors: string[] = [];

      if (includeTransactions && accountsResponse.data) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - transactionDaysBack);

        for (const account of accountsResponse.data) {
          try {
            const transactionsResponse = await this.getTransactions(account.id, {
              startDate,
              endDate,
              limit: 1000
            });

            if (transactionsResponse.success && transactionsResponse.data) {
              transactionsCount += transactionsResponse.data.length;
            } else if (transactionsResponse.error) {
              errors.push(`Failed to sync transactions for account ${account.id}: ${transactionsResponse.error.message}`);
            }
          } catch (error) {
            errors.push(`Error syncing transactions for account ${account.id}: ${this.getErrorMessage(error)}`);
          }
        }
      }

      return {
        success: true,
        data: {
          success: true,
          accountsUpdated: accountsResponse.data?.length || 0,
          transactionsCount,
          lastSyncDate: new Date(),
          errors: errors.length > 0 ? errors : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async createTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<BankApiResponse<BankTransfer>> {
    try {
      await this.ensureAuthenticated();

      const transferData = {
        Data: {
          Initiation: {
            InstructionIdentification: crypto.randomUUID(),
            EndToEndIdentification: crypto.randomUUID(),
            InstructedAmount: {
              Amount: amount.toString(),
              Currency: 'TRY'
            },
            DebtorAccount: {
              SchemeName: 'IBAN',
              Identification: fromAccountId
            },
            CreditorAccount: {
              SchemeName: 'IBAN',
              Identification: toAccountId
            },
            RemittanceInformation: {
              Unstructured: description
            }
          }
        }
      };

      const response = await this.makeRequest<{ transfer: any }>(
        'POST',
        '/open-banking/v3.1/domestic-payments',
        transferData
      );

      if (!response.success || !response.data) {
        return response;
      }

      const transfer = response.data.transfer;
      const bankTransfer: BankTransfer = {
        id: transfer.DomesticPaymentId,
        fromAccountId,
        toAccountId,
        amount,
        currency: 'TRY',
        description,
        status: this.mapTransferStatus(transfer.Status),
        initiatedAt: new Date(transfer.CreationDateTime),
        completedAt: transfer.StatusUpdateDateTime ? new Date(transfer.StatusUpdateDateTime) : undefined,
        reference: transfer.EndToEndIdentification,
        metadata: {
          ...metadata,
          instructionIdentification: transfer.InstructionIdentification,
          statusUpdateDateTime: transfer.StatusUpdateDateTime,
          charge: transfer.Charge
        }
      };

      return {
        success: true,
        data: bankTransfer
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_TRANSFER_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getTransfer(transferId: string): Promise<BankApiResponse<BankTransfer>> {
    try {
      await this.ensureAuthenticated();

      const response = await this.makeRequest<{ transfer: any }>(
        'GET',
        `/open-banking/v3.1/domestic-payments/${transferId}`
      );

      if (!response.success || !response.data) {
        return response;
      }

      const transfer = response.data.transfer;
      const bankTransfer: BankTransfer = {
        id: transfer.DomesticPaymentId,
        fromAccountId: transfer.Data?.Initiation?.DebtorAccount?.Identification,
        toAccountId: transfer.Data?.Initiation?.CreditorAccount?.Identification,
        amount: parseFloat(transfer.Data?.Initiation?.InstructedAmount?.Amount || '0'),
        currency: transfer.Data?.Initiation?.InstructedAmount?.Currency || 'TRY',
        description: transfer.Data?.Initiation?.RemittanceInformation?.Unstructured,
        status: this.mapTransferStatus(transfer.Status),
        initiatedAt: new Date(transfer.CreationDateTime),
        completedAt: transfer.StatusUpdateDateTime ? new Date(transfer.StatusUpdateDateTime) : undefined,
        reference: transfer.Data?.Initiation?.EndToEndIdentification,
        metadata: transfer.Data
      };

      return {
        success: true,
        data: bankTransfer
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TRANSFER_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getCards(accountId: string): Promise<BankApiResponse<BankCard[]>> {
    // Open Banking doesn't typically expose card details
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Card information is not available through Open Banking API'
      }
    };
  }

  async updateCardStatus(
    cardId: string,
    status: 'active' | 'blocked' | 'cancelled'
  ): Promise<BankApiResponse<BankCard>> {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message: 'Card management is not available through Open Banking API'
      }
    };
  }

  async getBalance(accountId: string): Promise<BankApiResponse<number>> {
    try {
      const accountResponse = await this.getAccount(accountId);
      if (!accountResponse.success || !accountResponse.data) {
        return accountResponse;
      }

      return {
        success: true,
        data: accountResponse.data.balance
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_BALANCE_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async getStatement(
    accountId: string,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' | 'ofx'
  ): Promise<BankApiResponse<Buffer>> {
    try {
      await this.ensureAuthenticated();

      const queryParams = new URLSearchParams();
      queryParams.append('fromBookingDateTime', startDate.toISOString());
      queryParams.append('toBookingDateTime', endDate.toISOString());
      queryParams.append('format', format);

      const response = await this.makeRequest<Buffer>(
        'GET',
        `/open-banking/v3.1/accounts/${accountId}/statements?${queryParams.toString()}`,
        undefined,
        { 'Accept': `application/${format}` }
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_STATEMENT_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async setupWebhook(
    webhookUrl: string,
    events: string[]
  ): Promise<BankApiResponse<{ webhookId: string; secret: string }>> {
    try {
      await this.ensureAuthenticated();

      const webhookData = {
        webhookUrl,
        events,
        isActive: true
      };

      const response = await this.makeRequest<{ webhookId: string; secret: string }>(
        'POST',
        '/open-banking/v3.1/webhooks',
        webhookData
      );

      return response;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SETUP_WEBHOOK_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async verifyWebhook(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  async handleWebhook(
    eventType: string,
    payload: any
  ): Promise<BankApiResponse<any>> {
    try {
      switch (eventType) {
        case 'account.update':
          return { success: true, data: { message: 'Account update processed' } };
        case 'transaction.create':
          return { success: true, data: { message: 'Transaction created' } };
        case 'transfer.update':
          return { success: true, data: { message: 'Transfer status updated' } };
        default:
          return {
            success: false,
            error: {
              code: 'UNKNOWN_EVENT_TYPE',
              message: `Unknown webhook event type: ${eventType}`
            }
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WEBHOOK_HANDLER_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async refreshToken(): Promise<BankApiResponse<{ token: string; expiresAt: Date }>> {
    try {
      if (!this.refreshToken) {
        return {
          success: false,
          error: {
            code: 'NO_REFRESH_TOKEN',
            message: 'No refresh token available'
          }
        };
      }

      const tokenResponse = await this.makeRequest<{
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      }>('POST', '/oauth2/token', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      });

      if (!tokenResponse.success || !tokenResponse.data) {
        return tokenResponse;
      }

      this.accessToken = tokenResponse.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + tokenResponse.data.expires_in * 1000);
      
      if (tokenResponse.data.refresh_token) {
        this.refreshToken = tokenResponse.data.refresh_token;
      }

      return {
        success: true,
        data: {
          token: this.accessToken,
          expiresAt: this.tokenExpiresAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REFRESH_TOKEN_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  async revokeAuth(): Promise<BankApiResponse<boolean>> {
    try {
      await this.makeRequest('POST', '/oauth2/revoke', {
        token: this.accessToken,
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret
      });

      this.accessToken = undefined;
      this.tokenExpiresAt = undefined;
      this.refreshToken = undefined;

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REVOKE_AUTH_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  protected getErrorMessage(error: any): string {
    if (error?.response?.data?.error_description) {
      return error.response.data.error_description;
    }
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<BankApiResponse<T>> {
    try {
      const baseUrl = this.credentials.baseUrl || 'https://api.openbanking.org.uk';
      const url = `${baseUrl}${endpoint}`;

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      };

      if (this.accessToken) {
        requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: responseData.error_description || responseData.error || `HTTP ${response.status}`,
            details: responseData
          }
        };
      }

      return {
        success: true,
        data: responseData,
        metadata: {
          requestId: response.headers.get('x-request-id') || crypto.randomUUID(),
          timestamp: new Date(),
          rateLimitRemaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
          rateLimitReset: response.headers.get('x-ratelimit-reset') ? 
            new Date(parseInt(response.headers.get('x-ratelimit-reset')!) * 1000) : undefined
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: this.getErrorMessage(error)
        }
      };
    }
  }

  private async authenticate(): Promise<BankApiResponse<{ access_token: string; expires_in: number; refresh_token: string }>> {
    const tokenData = {
      grant_type: 'client_credentials',
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      scope: 'accounts transactions payments'
    };

    const response = await this.makeRequest<{
      access_token: string;
      expires_in: number;
      refresh_token: string;
    }>('POST', '/oauth2/token', tokenData);

    if (response.success && response.data) {
      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      this.refreshToken = response.data.refresh_token;
    }

    return response;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt || this.tokenExpiresAt <= new Date()) {
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(authResult.error?.message || 'Authentication failed');
      }
    }
  }

  private mapAccountType(accountType: string): 'checking' | 'savings' | 'credit' | 'loan' | 'investment' {
    const typeMap: Record<string, 'checking' | 'savings' | 'credit' | 'loan' | 'investment'> = {
      'PersonalCurrentAccount': 'checking',
      'BusinessCurrentAccount': 'checking',
      'SavingsAccount': 'savings',
      'CreditCard': 'credit',
      'Loan': 'loan',
      'Investment': 'investment'
    };

    return typeMap[accountType] || 'checking';
  }

  private mapTransactionStatus(status: string): 'pending' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'completed' | 'failed' | 'cancelled'> = {
      'Booked': 'completed',
      'Pending': 'pending',
      'Failed': 'failed',
      'Cancelled': 'cancelled'
    };

    return statusMap[status] || 'pending';
  }

  private mapTransferStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'> = {
      'AcceptedSettlementInProcess': 'processing',
      'AcceptedSettlementCompleted': 'completed',
      'Rejected': 'failed',
      'Cancelled': 'cancelled',
      'Pending': 'pending'
    };

    return statusMap[status] || 'pending';
  }
}
