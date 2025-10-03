/**
 * Bank Provider Factory Tests
 * Tests the bank provider factory and provider creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockFactory } from '../utils/mock-factory.js';
import { BankProviderFactory } from '../../server/services/bank/bank-provider-factory.js';

describe('BankProviderFactory', () => {
  beforeEach(() => {
    MockFactory.resetAllMocks();
    // Clear any cached providers
    BankProviderFactory.clearProviders();
  });

  describe('createProvider', () => {
    it('should create Open Banking provider', async () => {
      const config = {
        type: 'open-banking' as const,
        name: 'Open Banking Provider',
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          baseUrl: 'https://api.openbanking.org.uk'
        },
        isActive: true
      };

      const provider = await BankProviderFactory.createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Open Banking');
      expect(provider.supportsFeature('oauth')).toBe(true);
      expect(provider.supportsFeature('webhooks')).toBe(true);
    });

    it('should create Turkish Bank provider', async () => {
      const config = {
        type: 'turkish-bank' as const,
        name: 'Turkish Bank Provider',
        credentials: {
          username: 'test-username',
          password: 'test-password',
          baseUrl: 'https://api.turkishbank.com'
        },
        isActive: true
      };

      const provider = await BankProviderFactory.createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Turkish Bank');
      expect(provider.supportsFeature('cards')).toBe(true);
      expect(provider.supportsFeature('oauth')).toBe(false);
    });

    it('should create Mock provider', async () => {
      const config = {
        type: 'mock' as const,
        name: 'Mock Provider',
        credentials: {},
        isActive: true
      };

      const provider = await BankProviderFactory.createProvider(config);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Mock Provider');
    });

    it('should cache providers for reuse', async () => {
      const config = {
        type: 'mock' as const,
        name: 'Mock Provider',
        credentials: {},
        isActive: true
      };

      const provider1 = await BankProviderFactory.createProvider(config);
      const provider2 = await BankProviderFactory.createProvider(config);

      expect(provider1).toBe(provider2); // Same instance
    });

    it('should throw error for unsupported provider type', async () => {
      const config = {
        type: 'unsupported' as any,
        name: 'Unsupported Provider',
        credentials: {},
        isActive: true
      };

      await expect(BankProviderFactory.createProvider(config)).rejects.toThrow(
        'Unsupported provider type: unsupported'
      );
    });

    it('should validate credentials before creating provider', async () => {
      const config = {
        type: 'open-banking' as const,
        name: 'Open Banking Provider',
        credentials: {
          // Missing required clientId and clientSecret
          baseUrl: 'https://api.openbanking.org.uk'
        },
        isActive: true
      };

      await expect(BankProviderFactory.createProvider(config)).rejects.toThrow();
    });
  });

  describe('getProvider', () => {
    it('should get existing provider by key', async () => {
      const config = {
        type: 'mock' as const,
        name: 'Mock Provider',
        credentials: {},
        isActive: true
      };

      await BankProviderFactory.createProvider(config);
      const providerKey = `${config.type}:${config.name}:${config.credentials.clientId || config.credentials.username}`;
      const retrievedProvider = BankProviderFactory.getProvider(providerKey);

      expect(retrievedProvider).toBeDefined();
    });

    it('should return undefined for non-existent provider', () => {
      const provider = BankProviderFactory.getProvider('non-existent-key');
      expect(provider).toBeUndefined();
    });
  });

  describe('removeProvider', () => {
    it('should remove provider from cache', async () => {
      const config = {
        type: 'mock' as const,
        name: 'Mock Provider',
        credentials: {},
        isActive: true
      };

      await BankProviderFactory.createProvider(config);
      const providerKey = `${config.type}:${config.name}:${config.credentials.clientId || config.credentials.username}`;
      
      const removed = BankProviderFactory.removeProvider(providerKey);
      expect(removed).toBe(true);

      const provider = BankProviderFactory.getProvider(providerKey);
      expect(provider).toBeUndefined();
    });

    it('should return false for non-existent provider', () => {
      const removed = BankProviderFactory.removeProvider('non-existent-key');
      expect(removed).toBe(false);
    });
  });

  describe('clearProviders', () => {
    it('should clear all cached providers', async () => {
      const config1 = {
        type: 'mock' as const,
        name: 'Mock Provider 1',
        credentials: {},
        isActive: true
      };

      const config2 = {
        type: 'mock' as const,
        name: 'Mock Provider 2',
        credentials: {},
        isActive: true
      };

      await BankProviderFactory.createProvider(config1);
      await BankProviderFactory.createProvider(config2);

      BankProviderFactory.clearProviders();

      const provider1 = BankProviderFactory.getProvider(`${config1.type}:${config1.name}:`);
      const provider2 = BankProviderFactory.getProvider(`${config2.type}:${config2.name}:`);

      expect(provider1).toBeUndefined();
      expect(provider2).toBeUndefined();
    });
  });

  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = BankProviderFactory.getSupportedProviders();

      expect(providers).toHaveLength(3);
      expect(providers[0].type).toBe('open-banking');
      expect(providers[0].name).toBe('Open Banking (PSD2)');
      expect(providers[0].features).toContain('oauth');
      expect(providers[0].supportedCurrencies).toContain('TRY');

      expect(providers[1].type).toBe('turkish-bank');
      expect(providers[1].name).toBe('Turkish Banks');
      expect(providers[1].features).toContain('cards');
      expect(providers[1].supportedCurrencies).toContain('TRY');

      expect(providers[2].type).toBe('mock');
      expect(providers[2].name).toBe('Mock Provider (Testing)');
      expect(providers[2].features).toContain('accounts');
    });
  });

  describe('validateProviderConfig', () => {
    it('should validate correct Open Banking configuration', () => {
      const config = {
        type: 'open-banking' as const,
        name: 'Open Banking Provider',
        credentials: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate correct Turkish Bank configuration', () => {
      const config = {
        type: 'turkish-bank' as const,
        name: 'Turkish Bank Provider',
        credentials: {
          username: 'test-username',
          password: 'test-password'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate correct Mock configuration', () => {
      const config = {
        type: 'mock' as const,
        name: 'Mock Provider',
        credentials: {},
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject configuration with missing type', () => {
      const config = {
        name: 'Test Provider',
        credentials: {},
        isActive: true
      } as any;

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Provider type is required');
    });

    it('should reject configuration with missing name', () => {
      const config = {
        type: 'mock' as const,
        credentials: {},
        isActive: true
      } as any;

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Provider name is required');
    });

    it('should reject configuration with missing credentials', () => {
      const config = {
        type: 'mock' as const,
        name: 'Test Provider',
        isActive: true
      } as any;

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Provider credentials are required');
    });

    it('should reject Open Banking configuration without clientId', () => {
      const config = {
        type: 'open-banking' as const,
        name: 'Open Banking Provider',
        credentials: {
          clientSecret: 'test-client-secret'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Client ID is required for Open Banking provider');
    });

    it('should reject Open Banking configuration without clientSecret', () => {
      const config = {
        type: 'open-banking' as const,
        name: 'Open Banking Provider',
        credentials: {
          clientId: 'test-client-id'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Client Secret is required for Open Banking provider');
    });

    it('should reject Turkish Bank configuration without username', () => {
      const config = {
        type: 'turkish-bank' as const,
        name: 'Turkish Bank Provider',
        credentials: {
          password: 'test-password'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Username is required for Turkish Bank provider');
    });

    it('should reject Turkish Bank configuration without password', () => {
      const config = {
        type: 'turkish-bank' as const,
        name: 'Turkish Bank Provider',
        credentials: {
          username: 'test-username'
        },
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Password is required for Turkish Bank provider');
    });

    it('should reject unsupported provider type', () => {
      const config = {
        type: 'unsupported' as any,
        name: 'Unsupported Provider',
        credentials: {},
        isActive: true
      };

      const validation = BankProviderFactory.validateProviderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Unsupported provider type: unsupported');
    });
  });
});
