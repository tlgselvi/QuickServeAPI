import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PasswordService } from '../../server/services/auth/password-service';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransporter: vi.fn(() => ({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    }))
  }
}));

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([])
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({})
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({})
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue({})
    }))
  }
}));

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
    vi.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('should validate password correctly', () => {
      const validPassword = 'Test123!@#';
      const result = passwordService.validatePassword(validPassword);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const weakPassword = '123';
      const result = passwordService.validatePassword(weakPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject common patterns', () => {
      const commonPassword = 'password123';
      const result = passwordService.validatePassword(commonPassword);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre yaygın kullanılan kelimeler içeremez');
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'Test123!@#';
      const hashedPassword = await passwordService.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'Test123!@#';
      const hashedPassword = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'Test123!@#';
      const wrongPassword = 'Wrong123!@#';
      const hashedPassword = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('requestPasswordReset', () => {
    it('should handle non-existent email gracefully', async () => {
      // Mock database to return empty result
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }));

      const result = await passwordService.requestPasswordReset({
        email: 'nonexistent@example.com'
      });

      expect(result).toBeUndefined(); // Should return without error
    });

    it('should create reset token for valid email', async () => {
      // Mock database to return user
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              userId: 'test-user-id',
              email: 'test@example.com'
            }])
          }))
        }))
      }));

      mockDb.db.insert = vi.fn(() => ({
        values: vi.fn().mockResolvedValue({})
      }));

      const result = await passwordService.requestPasswordReset({
        email: 'test@example.com'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // Mock database to return valid token
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'token-id',
              userId: 'user-id',
              token: 'valid-token',
              expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
            }])
          }))
        }))
      }));

      mockDb.db.update = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue({})
        }))
      }));

      const result = await passwordService.resetPassword({
        token: 'valid-token',
        newPassword: 'NewPassword123!@#'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });

    it('should reject invalid token', async () => {
      // Mock database to return empty result (invalid token)
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }));

      await expect(
        passwordService.resetPassword({
          token: 'invalid-token',
          newPassword: 'NewPassword123!@#'
        })
      ).rejects.toThrow('Geçersiz veya süresi dolmuş reset token');
    });
  });
});
