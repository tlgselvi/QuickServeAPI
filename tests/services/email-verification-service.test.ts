import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailVerificationService } from '../../server/services/email-verification-service';

// Mock email service
vi.mock('../../server/services/email-service', () => ({
  emailService: {
    generateEmailVerificationTemplate: vi.fn(() => ({
      subject: 'Test Verification',
      html: '<p>Test HTML</p>',
      text: 'Test Text'
    })),
    generateTeamInviteTemplate: vi.fn(() => ({
      subject: 'Test Invite',
      html: '<p>Test HTML</p>',
      text: 'Test Text'
    })),
    sendEmail: vi.fn().mockResolvedValue(true)
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

describe('EmailVerificationService', () => {
  let emailVerificationService: EmailVerificationService;

  beforeEach(() => {
    emailVerificationService = new EmailVerificationService();
    vi.clearAllMocks();
  });

  describe('requestEmailVerification', () => {
    it('should create verification code for new email', async () => {
      // Mock database to return empty result (email not verified)
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }));

      mockDb.db.insert = vi.fn(() => ({
        values: vi.fn().mockResolvedValue({})
      }));

      const result = await emailVerificationService.requestEmailVerification({
        email: 'test@example.com'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });

    it('should throw error for already verified email', async () => {
      // Mock database to return verified user
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              emailVerified: true
            }])
          }))
        }))
      }));

      await expect(
        emailVerificationService.requestEmailVerification({
          email: 'verified@example.com'
        })
      ).rejects.toThrow('Bu e-posta adresi zaten doğrulanmış');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid code', async () => {
      // Mock database to return valid verification code
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'code-id',
              email: 'test@example.com',
              code: '123456',
              expiresAt: new Date(Date.now() + 600000) // 10 minutes from now
            }])
          }))
        }))
      }));

      mockDb.db.update = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue({})
        }))
      }));

      const result = await emailVerificationService.verifyEmail({
        code: '123456'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });

    it('should reject invalid verification code', async () => {
      // Mock database to return empty result (invalid code)
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }));

      await expect(
        emailVerificationService.verifyEmail({
          code: 'invalid-code'
        })
      ).rejects.toThrow('Geçersiz veya süresi dolmuş doğrulama kodu');
    });
  });

  describe('createTeamInvite', () => {
    it('should create team invitation successfully', async () => {
      // Mock database to return empty result (no existing invite)
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([])
          }))
        }))
      }));

      mockDb.db.insert = vi.fn(() => ({
        values: vi.fn().mockResolvedValue({})
      }));

      const result = await emailVerificationService.createTeamInvite({
        teamId: 'team-uuid',
        email: 'invitee@example.com',
        inviterName: 'John Doe',
        teamName: 'Test Team'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });

    it('should reject duplicate invitation', async () => {
      // Mock database to return existing invitation
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'existing-invite-id',
              email: 'invitee@example.com',
              teamId: 'team-uuid'
            }])
          }))
        }))
      }));

      await expect(
        emailVerificationService.createTeamInvite({
          teamId: 'team-uuid',
          email: 'invitee@example.com',
          inviterName: 'John Doe',
          teamName: 'Test Team'
        })
      ).rejects.toThrow('Bu e-posta adresine zaten bir davet gönderilmiş');
    });
  });

  describe('acceptTeamInvite', () => {
    it('should accept valid team invitation', async () => {
      // Mock database to return valid invitation
      const mockDb = await import('../../server/db');
      mockDb.db.select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{
              id: 'invite-id',
              email: 'invitee@example.com',
              teamId: 'team-uuid',
              token: 'valid-token',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            }])
          }))
        }))
      }));

      mockDb.db.update = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue({})
        }))
      }));

      const result = await emailVerificationService.acceptTeamInvite({
        token: 'valid-token'
      });

      expect(result).toBeUndefined(); // Should complete without error
    });

    it('should reject invalid invitation token', async () => {
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
        emailVerificationService.acceptTeamInvite({
          token: 'invalid-token'
        })
      ).rejects.toThrow('Geçersiz veya süresi dolmuş davet');
    });
  });
});
