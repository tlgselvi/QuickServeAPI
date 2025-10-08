import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db';
import { userProfiles, emailVerificationCodes, teamInvitations } from '../../shared/schema';
import { z } from 'zod';
import * as crypto from 'crypto';
import { emailService } from './email-service';
import { logger } from '../utils/logger';

// Email verification schemas
export const requestEmailVerificationSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz')
});

export const verifyEmailSchema = z.object({
  code: z.string().min(6, 'Doğrulama kodu en az 6 karakter olmalı')
});

export const createTeamInviteSchema = z.object({
  teamId: z.string().uuid('Geçerli bir takım ID giriniz'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  inviterName: z.string().min(1, 'Davet eden kişi adı gerekli'),
  teamName: z.string().min(1, 'Takım adı gerekli')
});

export const acceptTeamInviteSchema = z.object({
  token: z.string().min(1, 'Davet token gerekli')
});

// Email Verification Service
export class EmailVerificationService {
  // Generate verification code
  private generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate invite token
  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Request email verification
  async requestEmailVerification(requestData: z.infer<typeof requestEmailVerificationSchema>): Promise<void> {
    try {
      // Check if email is already verified
      const existingUser = await db
        .select({ emailVerified: userProfiles.emailVerified })
        .from(userProfiles)
        .where(eq(userProfiles.email, requestData.email))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].emailVerified) {
        throw new Error('Bu e-posta adresi zaten doğrulanmış');
      }

      // Generate verification code
      const code = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code
      await db.insert(emailVerificationCodes).values({
        email: requestData.email,
        code,
        expiresAt,
        used: false
      });

      // Send verification email
      const template = emailService.generateEmailVerificationTemplate(code);
      await emailService.sendEmail(requestData.email, template);

      logger.info(`Email verification code sent to ${requestData.email}`);

    } catch (error) {
      logger.error('Error requesting email verification:', error);
      throw new Error('E-posta doğrulama talebi oluşturulamadı');
    }
  }

  // Verify email with code
  async verifyEmail(verifyData: z.infer<typeof verifyEmailSchema>): Promise<void> {
    try {
      // Find valid verification code
      const verificationCode = await db
        .select()
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.code, verifyData.code),
            eq(emailVerificationCodes.used, false),
            gt(emailVerificationCodes.expiresAt, new Date())
          )
        )
        .limit(1);

      if (verificationCode.length === 0) {
        throw new Error('Geçersiz veya süresi dolmuş doğrulama kodu');
      }

      // Mark code as used
      await db
        .update(emailVerificationCodes)
        .set({ 
          used: true,
          usedAt: new Date()
        })
        .where(eq(emailVerificationCodes.id, verificationCode[0].id));

      // Update user email as verified
      await db
        .update(userProfiles)
        .set({ 
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProfiles.email, verificationCode[0].email));

      logger.info(`Email verified for: ${verificationCode[0].email}`);

    } catch (error) {
      logger.error('Error verifying email:', error);
      throw new Error('E-posta doğrulanamadı');
    }
  }

  // Create team invitation
  async createTeamInvite(inviteData: z.infer<typeof createTeamInviteSchema>): Promise<void> {
    try {
      // Check if user is already in team
      const existingInvite = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.teamId, inviteData.teamId),
            eq(teamInvitations.email, inviteData.email),
            eq(teamInvitations.accepted, false)
          )
        )
        .limit(1);

      if (existingInvite.length > 0) {
        throw new Error('Bu e-posta adresine zaten bir davet gönderilmiş');
      }

      // Generate invite token
      const token = this.generateInviteToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Store invitation
      await db.insert(teamInvitations).values({
        teamId: inviteData.teamId,
        email: inviteData.email,
        token,
        expiresAt,
        inviterName: inviteData.inviterName,
        accepted: false
      });

      // Send invitation email
      const template = emailService.generateTeamInviteTemplate(
        inviteData.teamName,
        token,
        inviteData.inviterName
      );
      await emailService.sendEmail(inviteData.email, template);

      logger.info(`Team invitation sent to ${inviteData.email} for team ${inviteData.teamName}`);

    } catch (error) {
      logger.error('Error creating team invite:', error);
      throw new Error('Takım daveti oluşturulamadı');
    }
  }

  // Accept team invitation
  async acceptTeamInvite(acceptData: z.infer<typeof acceptTeamInviteSchema>): Promise<void> {
    try {
      // Find valid invitation
      const invitation = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.token, acceptData.token),
            eq(teamInvitations.accepted, false),
            gt(teamInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (invitation.length === 0) {
        throw new Error('Geçersiz veya süresi dolmuş davet');
      }

      // Mark invitation as accepted
      await db
        .update(teamInvitations)
        .set({ 
          accepted: true,
          acceptedAt: new Date()
        })
        .where(eq(teamInvitations.id, invitation[0].id));

      // Add user to team (this would need to be implemented based on your team structure)
      // For now, we'll just log the acceptance
      logger.info(`Team invitation accepted by ${invitation[0].email} for team ${invitation[0].teamId}`);

    } catch (error) {
      logger.error('Error accepting team invite:', error);
      throw new Error('Takım daveti kabul edilemedi');
    }
  }

  // Clean up expired codes and invitations
  async cleanupExpiredItems(): Promise<void> {
    try {
      // Clean up expired verification codes
      await db
        .delete(emailVerificationCodes)
        .where(
          and(
            gt(emailVerificationCodes.expiresAt, new Date()),
            eq(emailVerificationCodes.used, true)
          )
        );

      // Clean up expired invitations
      await db
        .delete(teamInvitations)
        .where(
          and(
            gt(teamInvitations.expiresAt, new Date()),
            eq(teamInvitations.accepted, false)
          )
        );

      logger.info('Expired verification codes and invitations cleaned up');

    } catch (error) {
      logger.error('Error cleaning up expired items:', error);
    }
  }
}

export const emailVerificationService = new EmailVerificationService();
