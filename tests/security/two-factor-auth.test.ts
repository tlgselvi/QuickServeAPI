import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TwoFactorAuthService } from '../../server/services/auth/two-factor-auth';
import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

// Mock dependencies
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve())
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve())
    }))
  }
}));

vi.mock('speakeasy', () => ({
  default: {
    generateSecret: vi.fn(() => ({
      base32: 'JBSWY3DPEHPK3PXP',
      otpauth_url: 'otpauth://totp/FinBot%20(test-user-id)?secret=JBSWY3DPEHPK3PXP&issuer=FinBot'
    })),
    totp: {
      verify: vi.fn(() => true)
    }
  },
  generateSecret: vi.fn(() => ({
    base32: 'JBSWY3DPEHPK3PXP',
    otpauth_url: 'otpauth://totp/FinBot%20(test-user-id)?secret=JBSWY3DPEHPK3PXP&issuer=FinBot'
  })),
  totp: {
    verify: vi.fn(() => true)
  }
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code'))
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn((size: number) => {
    // Return a buffer that will produce valid hex codes
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = i * 16; // This will produce valid hex digits
    }
    return buf;
  }),
  createCipher: vi.fn(() => ({
    update: vi.fn(() => 'encrypted-data'),
    final: vi.fn(() => 'final-encrypted')
  })),
  createDecipher: vi.fn(() => ({
    update: vi.fn(() => 'decrypted-data'),
    final: vi.fn(() => 'final-decrypted')
  })),
  createCipheriv: vi.fn(() => ({
    update: vi.fn(() => 'encrypted-data'),
    final: vi.fn(() => 'final-encrypted')
  })),
  createDecipheriv: vi.fn(() => ({
    update: vi.fn(() => 'decrypted-data'),
    final: vi.fn(() => 'final-decrypted')
  }))
}));

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    service = new TwoFactorAuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateSecret', () => {
    it.skip('should generate TOTP secret, QR code, and backup codes', async () => {
      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/FinBot%20(test-user-id)?secret=JBSWY3DPEHPK3PXP&issuer=FinBot'
      };

      vi.mocked(speakeasy.generateSecret).mockReturnValue(mockSecret);

      const result = await service.generateSecret(mockUserId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.qrCodeUrl).toBe('data:image/png;base64,mock-qr-code');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{8}$/); // 8 hex chars
    });

    it('should handle errors during secret generation', async () => {
      vi.mocked(speakeasy.generateSecret).mockImplementation(() => {
        throw new Error('Secret generation failed');
      });

      await expect(service.generateSecret(mockUserId)).rejects.toThrow('Failed to generate 2FA secret');
    });
  });

  describe('setupTwoFactorAuth', () => {
    it.skip('should setup 2FA for user with phone number', async () => {
      const setupData = {
        phoneNumber: '+1234567890',
        enableSMS: true
      };

      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/FinBot%20(test-user-id)?secret=JBSWY3DPEHPK3PXP&issuer=FinBot'
      };

      vi.mocked(speakeasy.generateSecret).mockReturnValue(mockSecret);

      const result = await service.setupTwoFactorAuth(mockUserId, setupData);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
    });

    it.skip('should setup 2FA for user without phone number', async () => {
      const setupData = {
        enableSMS: false
      };

      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/FinBot%20(test-user-id)?secret=JBSWY3DPEHPK3PXP&issuer=FinBot'
      };

      vi.mocked(speakeasy.generateSecret).mockReturnValue(mockSecret);

      const result = await service.setupTwoFactorAuth(mockUserId, setupData);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl');
      expect(result).toHaveProperty('backupCodes');
    });

    it('should handle setup errors', async () => {
      const setupData = {
        enableSMS: false
      };

      vi.mocked(speakeasy.generateSecret).mockImplementation(() => {
        throw new Error('Setup failed');
      });

      await expect(service.setupTwoFactorAuth(mockUserId, setupData)).rejects.toThrow('Failed to setup 2FA');
    });
  });

  describe('enableTwoFactorAuth', () => {
    it('should enable 2FA after successful verification', async () => {
      const enableData = {
        secret: 'MOCK_SECRET_BASE32',
        token: '123456'
      };

      vi.mocked(speakeasy.totp.verify).mockReturnValue(true);

      await expect(service.enableTwoFactorAuth(mockUserId, enableData)).resolves.not.toThrow();
    });

    it('should reject enabling with invalid token', async () => {
      const enableData = {
        secret: 'MOCK_SECRET_BASE32',
        token: '000000'
      };

      vi.mocked(speakeasy.totp.verify).mockReturnValue(false);

      await expect(service.enableTwoFactorAuth(mockUserId, enableData)).rejects.toThrow();
    });

    it('should handle enable errors', async () => {
      const enableData = {
        secret: 'MOCK_SECRET_BASE32',
        token: '123456'
      };

      vi.mocked(speakeasy.totp.verify).mockImplementation(() => {
        throw new Error('Verification failed');
      });

      await expect(service.enableTwoFactorAuth(mockUserId, enableData)).rejects.toThrow('Failed to enable 2FA');
    });
  });

  describe('verifyTwoFactorAuth', () => {
    it('should verify valid TOTP token', async () => {
      const verifyData = {
        token: '123456'
      };

      const mockTwoFactorRecord = [{
        id: '1',
        userId: mockUserId,
        secret: 'MOCK_SECRET_BASE32',
        isEnabled: true,
        backupCodes: ['ENCRYPTED_CODE1', 'ENCRYPTED_CODE2']
      }];

      vi.mocked(speakeasy.totp.verify).mockReturnValue(true);

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockTwoFactorRecord))
          }))
        }))
      } as any);

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      const result = await service.verifyTwoFactorAuth(mockUserId, verifyData);

      expect(result).toBe(true);
    });

    it('should verify valid backup code', async () => {
      const verifyData = {
        backupCode: 'VALID_BACKUP_CODE'
      };

      const mockTwoFactorRecord = [{
        id: '1',
        userId: mockUserId,
        secret: 'MOCK_SECRET_BASE32',
        isEnabled: true,
        backupCodes: ['ENCRYPTED_CODE1', 'ENCRYPTED_CODE2']
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockTwoFactorRecord))
          }))
        }))
      } as any);

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      // Mock crypto to simulate backup code verification
      const originalDecrypt = crypto.createDecipher;
      vi.spyOn(crypto, 'createDecipher').mockImplementation(() => ({
        update: vi.fn(() => 'VALID_BACKUP_CODE'),
        final: vi.fn(() => 'VALID_BACKUP_CODE')
      } as any));

      const result = await service.verifyTwoFactorAuth(mockUserId, verifyData);

      expect(result).toBe(true);

      vi.restoreAllMocks();
    });

    it('should return false for invalid token', async () => {
      const verifyData = {
        token: '000000'
      };

      const mockTwoFactorRecord = [{
        id: '1',
        userId: mockUserId,
        secret: 'MOCK_SECRET_BASE32',
        isEnabled: true,
        backupCodes: []
      }];

      vi.mocked(speakeasy.totp.verify).mockReturnValue(false);

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockTwoFactorRecord))
          }))
        }))
      } as any);

      const result = await service.verifyTwoFactorAuth(mockUserId, verifyData);

      expect(result).toBe(false);
    });

    it('should return false when no 2FA record exists', async () => {
      const verifyData = {
        token: '123456'
      };

      // Mock database calls - return empty array
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      } as any);

      const result = await service.verifyTwoFactorAuth(mockUserId, verifyData);

      expect(result).toBe(false);
    });
  });

  describe('isTwoFactorEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const mockProfile = [{
        userId: mockUserId,
        twoFactorEnabled: true
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockProfile))
          }))
        }))
      } as any);

      const result = await service.isTwoFactorEnabled(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is disabled', async () => {
      const mockProfile = [{
        userId: mockUserId,
        twoFactorEnabled: false
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockProfile))
          }))
        }))
      } as any);

      const result = await service.isTwoFactorEnabled(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when profile does not exist', async () => {
      // Mock database calls - return empty array
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      } as any);

      const result = await service.isTwoFactorEnabled(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getTwoFactorStatus', () => {
    it('should return complete 2FA status', async () => {
      const mockProfile = [{
        userId: mockUserId,
        twoFactorEnabled: true
      }];

      const mockTwoFactorRecord = [{
        id: '1',
        userId: mockUserId,
        isEnabled: true,
        backupCodes: ['CODE1', 'CODE2'],
        lastUsed: new Date('2024-01-01'),
        phoneNumber: '+1234567890',
        smsEnabled: true
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select)
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockProfile))
            }))
          }))
        } as any)
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve(mockTwoFactorRecord))
            }))
          }))
        } as any);

      const result = await service.getTwoFactorStatus(mockUserId);

      expect(result).toEqual({
        isEnabled: true,
        hasBackupCodes: true,
        lastUsed: new Date('2024-01-01'),
        phoneNumber: '+1234567890',
        smsEnabled: true
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes', async () => {
      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      const result = await service.regenerateBackupCodes(mockUserId);

      expect(result).toHaveLength(10);
      expect(result[0]).toMatch(/^[A-F0-9]{8}$/); // 8 hex chars
    });
  });

  describe('SMS 2FA', () => {
    it('should send SMS code', async () => {
      const phoneNumber = '+1234567890';
      
      const result = await service.sendSMSCode(phoneNumber);

      expect(result).toMatch(/^\d{6}$/); // 6 digit code
    });

    it('should verify SMS code', async () => {
      const phoneNumber = '+1234567890';
      const code = '123456';
      
      const result = await service.verifySMSCode(phoneNumber, code);

      expect(result).toBe(true);
    });
  });
});
