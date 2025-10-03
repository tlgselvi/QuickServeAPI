import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordService, PASSWORD_POLICY } from '../../server/services/auth/password-service.js';
import { MockFactory } from '../utils/mock-factory.js';

describe('PasswordService', () => {
  let service: PasswordService;
  const mockUserId = 'test-user-id';
  const mockUser = MockFactory.createMockUser({ id: mockUserId });
  const mockUserProfile = MockFactory.createMockUserProfile({ userId: mockUserId });

  beforeEach(() => {
    service = new PasswordService();
    MockFactory.resetAllMocks();
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';
      
      const result = service.validatePassword(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Ab1!';
      
      const result = service.validatePassword(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Şifre en az ${PASSWORD_POLICY.MIN_LENGTH} karakter olmalı`);
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(PASSWORD_POLICY.MAX_LENGTH + 1) + '1!';
      
      const result = service.validatePassword(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Şifre en fazla ${PASSWORD_POLICY.MAX_LENGTH} karakter olmalı`);
    });

    it('should reject password without uppercase letter', () => {
      const password = 'lowercase123!';
      
      const result = service.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir büyük harf içermeli');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!';
      
      const result = service.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir küçük harf içermeli');
    });

    it('should reject password without number', () => {
      const password = 'NoNumbers!';
      
      const result = service.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir rakam içermeli');
    });

    it('should reject password without special character', () => {
      const password = 'NoSpecialChars123';
      
      const result = service.validatePassword(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir özel karakter içermeli (!@#$%^&*)');
    });

    it('should reject common weak patterns', () => {
      const weakPasswords = [
        'password123!',
        '123456Ab!',
        'qwerty123!',
        'admin123!',
        'letmein123!'
      ];

      weakPasswords.forEach(password => {
        const result = service.validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Şifre yaygın kullanılan kelimeler içeremez');
      });
    });

    it('should collect multiple validation errors', () => {
      const weakPassword = 'abc';
      
      const result = service.validatePassword(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('isPasswordExpired', () => {
    it('should return true for expired password', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - (PASSWORD_POLICY.EXPIRY_DAYS + 1));

      const mockProfile = [{
        userId: mockUserId,
        passwordChangedAt: expiredDate
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

      const result = await service.isPasswordExpired(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false for non-expired password', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const mockProfile = [{
        userId: mockUserId,
        passwordChangedAt: recentDate
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

      const result = await service.isPasswordExpired(mockUserId);

      expect(result).toBe(false);
    });

    it('should return true when profile does not exist', async () => {
      // Mock database calls - return empty array
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      } as any);

      const result = await service.isPasswordExpired(mockUserId);

      expect(result).toBe(true);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed_password_hash';

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashed_password_hash';

      vi.mocked(bcrypt.compare).mockResolvedValue(true);

      const result = await service.verifyPassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should reject incorrect password', async () => {
      const password = 'WrongPassword123!';
      const hashedPassword = 'hashed_password_hash';

      vi.mocked(bcrypt.compare).mockResolvedValue(false);

      const result = await service.verifyPassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const hashedPassword = 'new_hashed_password';

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword);

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      await expect(service.changePassword(mockUserId, changeData)).resolves.not.toThrow();

      expect(mockDb.db.update).toHaveBeenCalled();
    });

    it('should reject password that does not meet policy', async () => {
      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
        confirmPassword: 'weak'
      };

      await expect(service.changePassword(mockUserId, changeData)).rejects.toThrow('Şifre gereksinimleri karşılanmıyor');
    });

    it('should reject password that does not match confirmation', async () => {
      const changeData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      };

      await expect(service.changePassword(mockUserId, changeData)).rejects.toThrow('Şifreler eşleşmiyor');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate reset token and send email', async () => {
      const requestData = {
        email: 'test@example.com'
      };

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.insert).mockReturnValue({
        values: vi.fn(() => Promise.resolve())
      } as any);

      await expect(service.requestPasswordReset(requestData)).resolves.not.toThrow();

      expect(mockDb.db.insert).toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const requestData = {
        email: 'invalid-email'
      };

      await expect(service.requestPasswordReset(requestData)).rejects.toThrow('Geçerli bir email adresi giriniz');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const hashedPassword = 'new_hashed_password';
      const mockResetToken = [{
        id: '1',
        userId: mockUserId,
        token: 'valid-reset-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        used: false
      }];

      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword);

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockResetToken))
          }))
        }))
      } as any);

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      await expect(service.resetPassword(resetData)).resolves.not.toThrow();

      expect(mockDb.db.update).toHaveBeenCalledTimes(2); // Update password and mark token as used
    });

    it('should reject reset with invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      // Mock database calls - return empty array (no token found)
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      } as any);

      await expect(service.resetPassword(resetData)).rejects.toThrow('Geçersiz veya süresi dolmuş reset token');
    });

    it('should reject reset with expired token', async () => {
      const resetData = {
        token: 'expired-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const mockResetToken = [{
        id: '1',
        userId: mockUserId,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        used: false
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockResetToken))
          }))
        }))
      } as any);

      await expect(service.resetPassword(resetData)).rejects.toThrow('Geçersiz veya süresi dolmuş reset token');
    });

    it('should reject reset with used token', async () => {
      const resetData = {
        token: 'used-token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      };

      const mockResetToken = [{
        id: '1',
        userId: mockUserId,
        token: 'used-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        used: true
      }];

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockResetToken))
          }))
        }))
      } as any);

      await expect(service.resetPassword(resetData)).rejects.toThrow('Geçersiz veya süresi dolmuş reset token');
    });
  });

  describe('handleFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      const mockProfile = [{
        userId: mockUserId,
        failedLoginAttempts: 2
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

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      await service.handleFailedLogin(mockUserId);

      expect(mockDb.db.update).toHaveBeenCalled();
    });

    it('should lock account after max failed attempts', async () => {
      const mockProfile = [{
        userId: mockUserId,
        failedLoginAttempts: PASSWORD_POLICY.MAX_ATTEMPTS - 1
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

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      await service.handleFailedLogin(mockUserId);

      expect(mockDb.db.update).toHaveBeenCalled();
    });
  });

  describe('resetFailedLoginAttempts', () => {
    it('should reset failed login attempts on successful login', async () => {
      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve())
        }))
      } as any);

      await service.resetFailedLoginAttempts(mockUserId);

      expect(mockDb.db.update).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired and used tokens', async () => {
      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn(() => Promise.resolve())
      } as any);

      await service.cleanupExpiredTokens();

      expect(mockDb.db.delete).toHaveBeenCalled();
    });
  });
});
