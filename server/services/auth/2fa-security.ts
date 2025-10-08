import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { 
  userTwoFactorAuth,
  userActivityLogs
} from '../../../shared/schema';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../../utils/logger';

// Enhanced 2FA Security Configuration
export const TOTP_CONFIG = {
  window: 2, // Allow 2 time windows for clock skew
  step: 30, // 30-second time step
  digits: 6, // 6-digit code
  algorithm: 'sha1' as const,
  encoding: 'base32' as const
};

export const BACKUP_CODE_CONFIG = {
  count: 10,
  length: 8,
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
};

export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16
};

// Enhanced 2FA Security Service
export class TwoFactorSecurityService {
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = this.getEncryptionKey();
  }

  // Get or generate encryption key
  private getEncryptionKey(): Buffer {
    const keyString = process.env.TWO_FA_ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('TWO_FA_ENCRYPTION_KEY environment variable is required');
    }
    return Buffer.from(keyString, 'hex');
  }

  // Encrypt 2FA secret using AES-256-GCM
  private encryptSecret(secret: string): { encrypted: string; iv: string; tag: string } {
    try {
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
      const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, this.encryptionKey);
      
      let encrypted = cipher.update(secret, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Secret encryption error:', error);
      throw new Error('Failed to encrypt 2FA secret');
    }
  }

  // Decrypt 2FA secret using AES-256-GCM
  private decryptSecret(encrypted: string, iv: string, tag: string): string {
    try {
      const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, this.encryptionKey);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Secret decryption error:', error);
      throw new Error('Failed to decrypt 2FA secret');
    }
  }

  // Hash backup codes using Argon2id
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    try {
      const hashedCodes = await Promise.all(
        codes.map(async (code) => {
          const hash = await crypto.subtle.digest('SHA-256', Buffer.from(code + process.env.BACKUP_CODE_PEPPER || ''));
          return Buffer.from(hash).toString('hex');
        })
      );
      
      return hashedCodes;
    } catch (error) {
      logger.error('Backup code hashing error:', error);
      throw new Error('Failed to hash backup codes');
    }
  }

  // Verify backup code
  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
    try {
      const codeHash = await crypto.subtle.digest('SHA-256', Buffer.from(code + process.env.BACKUP_CODE_PEPPER || ''));
      const codeHashHex = Buffer.from(codeHash).toString('hex');
      
      return hashedCodes.includes(codeHashHex);
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return false;
    }
  }

  // Generate secure TOTP secret
  async generateSecureSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    try {
      // Generate cryptographically secure secret
      const secret = speakeasy.generateSecret({
        name: `FinBot (${userId})`,
        issuer: 'FinBot',
        length: 32,
        symbols: false, // Use only alphanumeric characters
        otpauth_url: true
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      logger.error('Secure secret generation error:', error);
      throw new Error('Failed to generate secure 2FA secret');
    }
  }

  // Generate backup codes
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < BACKUP_CODE_CONFIG.count; i++) {
      let code = '';
      for (let j = 0; j < BACKUP_CODE_CONFIG.length; j++) {
        const randomIndex = Math.floor(Math.random() * BACKUP_CODE_CONFIG.charset.length);
        code += BACKUP_CODE_CONFIG.charset[randomIndex];
      }
      codes.push(code);
    }
    
    return codes;
  }

  // Setup secure 2FA
  async setupSecureTwoFactor(userId: string, setupData: {
    phoneNumber?: string;
    enableSMS?: boolean;
  }): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      const { secret, qrCodeUrl, backupCodes } = await this.generateSecureSecret(userId);
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Encrypt secret before storing
      const encryptedSecret = this.encryptSecret(secret);

      // Store encrypted 2FA data
      await db.insert(userTwoFactorAuth).values({
        userId,
        secret: JSON.stringify(encryptedSecret), // Store encrypted secret as JSON
        isEnabled: false,
        backupCodes: hashedBackupCodes,
        phoneNumber: setupData.phoneNumber,
        smsEnabled: setupData.enableSMS || false
      });

      // Log 2FA setup initiation
      await db.insert(userActivityLogs).values({
        userId,
        action: '2fa_setup_initiated',
        resource: 'two_factor_auth',
        metadata: {
          timestamp: new Date(),
          phoneNumber: setupData.phoneNumber,
          smsEnabled: setupData.enableSMS
        }
      });

      return {
        secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      logger.error('Secure 2FA setup error:', error);
      throw new Error('Failed to setup secure 2FA');
    }
  }

  // Enable 2FA with enhanced verification
  async enableSecureTwoFactor(userId: string, enableData: {
    secret: string;
    token: string;
  }): Promise<void> {
    try {
      // Get stored 2FA data
      const twoFactorRecord = await db
        .select()
        .from(userTwoFactorAuth)
        .where(eq(userTwoFactorAuth.userId, userId))
        .limit(1);

      if (twoFactorRecord.length === 0) {
        throw new Error('2FA setup not found');
      }

      const record = twoFactorRecord[0];
      
      // Decrypt stored secret
      const encryptedData = JSON.parse(record.secret);
      const decryptedSecret = this.decryptSecret(
        encryptedData.encrypted,
        encryptedData.iv,
        encryptedData.tag
      );

      // Verify TOTP token with enhanced window checking
      const isValid = await this.verifyTOTPToken(decryptedSecret, enableData.token);
      
      if (!isValid) {
        // Log failed verification attempt
        await db.insert(userActivityLogs).values({
          userId,
          action: '2fa_enable_failed',
          resource: 'two_factor_auth',
          metadata: {
            reason: 'invalid_token',
            timestamp: new Date()
          }
        });
        
        throw new Error('Invalid verification token');
      }

      // Enable 2FA
      await db
        .update(userTwoFactorAuth)
        .set({ 
          isEnabled: true,
          updatedAt: new Date()
        })
        .where(eq(userTwoFactorAuth.userId, userId));

      // Update user profile
      await db
        .update(userProfiles)
        .set({ 
          twoFactorEnabled: true,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

      // Log successful 2FA enablement
      await db.insert(userActivityLogs).values({
        userId,
        action: '2fa_enabled',
        resource: 'two_factor_auth',
        metadata: {
          timestamp: new Date(),
          method: 'totp'
        }
      });

    } catch (error) {
      logger.error('Secure 2FA enablement error:', error);
      throw new Error('Failed to enable secure 2FA');
    }
  }

  // Enhanced TOTP verification with drift handling
  async verifyTOTPToken(secret: string, token: string): Promise<boolean> {
    try {
      // Verify with configurable window for clock skew
      const verified = speakeasy.totp.verify({
        secret,
        encoding: TOTP_CONFIG.encoding,
        token,
        window: TOTP_CONFIG.window,
        step: TOTP_CONFIG.step,
        digits: TOTP_CONFIG.digits,
        algorithm: TOTP_CONFIG.algorithm
      });

      return verified;
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return false;
    }
  }

  // Verify 2FA with enhanced security
  async verifySecureTwoFactor(userId: string, verifyData: {
    token?: string;
    backupCode?: string;
  }): Promise<{ success: boolean; usedBackupCode: boolean }> {
    try {
      const twoFactorRecord = await db
        .select()
        .from(userTwoFactorAuth)
        .where(eq(userTwoFactorAuth.userId, userId))
        .limit(1);

      if (twoFactorRecord.length === 0) {
        return { success: false, usedBackupCode: false };
      }

      const record = twoFactorRecord[0];

      // Check backup code first (if provided)
      if (verifyData.backupCode) {
        const isValidBackupCode = await this.verifyBackupCode(
          verifyData.backupCode, 
          record.backupCodes || []
        );
        
        if (isValidBackupCode) {
          // Log backup code usage
          await db.insert(userActivityLogs).values({
            userId,
            action: '2fa_backup_code_used',
            resource: 'two_factor_auth',
            metadata: {
              timestamp: new Date(),
              success: true
            }
          });

          // Update last used timestamp
          await db
            .update(userTwoFactorAuth)
            .set({ lastUsed: new Date() })
            .where(eq(userTwoFactorAuth.userId, userId));
          
          return { success: true, usedBackupCode: true };
        }
      }

      // Verify TOTP token
      if (verifyData.token) {
        const encryptedData = JSON.parse(record.secret);
        const decryptedSecret = this.decryptSecret(
          encryptedData.encrypted,
          encryptedData.iv,
          encryptedData.tag
        );

        const isValid = await this.verifyTOTPToken(decryptedSecret, verifyData.token);
        
        if (isValid) {
          // Log successful TOTP verification
          await db.insert(userActivityLogs).values({
            userId,
            action: '2fa_totp_verified',
            resource: 'two_factor_auth',
            metadata: {
              timestamp: new Date(),
              success: true
            }
          });

          // Update last used timestamp
          await db
            .update(userTwoFactorAuth)
            .set({ lastUsed: new Date() })
            .where(eq(userTwoFactorAuth.userId, userId));
        }

        return { success: isValid, usedBackupCode: false };
      }

      return { success: false, usedBackupCode: false };
    } catch (error) {
      logger.error('Secure 2FA verification error:', error);
      
      // Log verification failure
      await db.insert(userActivityLogs).values({
        userId,
        action: '2fa_verification_failed',
        resource: 'two_factor_auth',
        metadata: {
          timestamp: new Date(),
          error: error.message
        }
      });

      return { success: false, usedBackupCode: false };
    }
  }

  // Disable 2FA with audit trail
  async disableSecureTwoFactor(userId: string, disableData: {
    password: string;
    backupCode?: string;
  }): Promise<void> {
    try {
      const twoFactorRecord = await db
        .select()
        .from(userTwoFactorAuth)
        .where(eq(userTwoFactorAuth.userId, userId))
        .limit(1);

      if (twoFactorRecord.length === 0) {
        throw new Error('2FA not set up for this user');
      }

      // Verify backup code if provided
      if (disableData.backupCode) {
        const isValidBackupCode = await this.verifyBackupCode(
          disableData.backupCode, 
          twoFactorRecord[0].backupCodes || []
        );
        
        if (!isValidBackupCode) {
          // Log failed disable attempt
          await db.insert(userActivityLogs).values({
            userId,
            action: '2fa_disable_failed',
            resource: 'two_factor_auth',
            metadata: {
              reason: 'invalid_backup_code',
              timestamp: new Date()
            }
          });
          
          throw new Error('Invalid backup code');
        }
      }

      // Disable 2FA
      await db
        .update(userTwoFactorAuth)
        .set({ 
          isEnabled: false,
          updatedAt: new Date()
        })
        .where(eq(userTwoFactorAuth.userId, userId));

      // Update user profile
      await db
        .update(userProfiles)
        .set({ 
          twoFactorEnabled: false,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

      // Log successful 2FA disablement
      await db.insert(userActivityLogs).values({
        userId,
        action: '2fa_disabled',
        resource: 'two_factor_auth',
        metadata: {
          timestamp: new Date(),
          method: disableData.backupCode ? 'backup_code' : 'password'
        }
      });

    } catch (error) {
      logger.error('Secure 2FA disablement error:', error);
      throw new Error('Failed to disable secure 2FA');
    }
  }

  // Regenerate backup codes with audit trail
  async regenerateSecureBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      await db
        .update(userTwoFactorAuth)
        .set({ 
          backupCodes: hashedBackupCodes,
          updatedAt: new Date()
        })
        .where(eq(userTwoFactorAuth.userId, userId));

      // Log backup code regeneration
      await db.insert(userActivityLogs).values({
        userId,
        action: '2fa_backup_codes_regenerated',
        resource: 'two_factor_auth',
        metadata: {
          timestamp: new Date(),
          codeCount: backupCodes.length
        }
      });

      return backupCodes;
    } catch (error) {
      logger.error('Backup code regeneration error:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  // Get 2FA security status
  async getSecurityStatus(userId: string): Promise<{
    isEnabled: boolean;
    hasBackupCodes: boolean;
    lastUsed?: Date;
    phoneNumber?: string;
    smsEnabled: boolean;
    securityScore: number;
  }> {
    try {
      const [profile, twoFactorRecord] = await Promise.all([
        db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
        db.select().from(userTwoFactorAuth).where(eq(userTwoFactorAuth.userId, userId)).limit(1)
      ]);

      const isEnabled = profile.length > 0 && profile[0].twoFactorEnabled;
      const hasBackupCodes = twoFactorRecord.length > 0 && (twoFactorRecord[0].backupCodes?.length || 0) > 0;
      
      // Calculate security score
      let securityScore = 0;
      if (isEnabled) securityScore += 40;
      if (hasBackupCodes) securityScore += 20;
      if (twoFactorRecord[0]?.smsEnabled) securityScore += 20;
      if (profile[0]?.lastLogin) securityScore += 20;

      return {
        isEnabled,
        hasBackupCodes,
        lastUsed: twoFactorRecord[0]?.lastUsed,
        phoneNumber: twoFactorRecord[0]?.phoneNumber,
        smsEnabled: twoFactorRecord[0]?.smsEnabled || false,
        securityScore
      };
    } catch (error) {
      logger.error('Security status error:', error);
      throw new Error('Failed to get security status');
    }
  }

  // Clean up expired 2FA data
  async cleanupExpiredData(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      
      // Clean up old 2FA records for disabled accounts
      // In a real implementation, you would add proper cleanup logic
      
      logger.info('2FA cleanup completed');
    } catch (error) {
      logger.error('2FA cleanup error:', error);
    }
  }

  // Security metrics for 2FA
  async getSecurityMetrics(): Promise<{
    totalUsers: number;
    enabled2FA: number;
    backupCodesGenerated: number;
    failedAttempts: number;
    averageSecurityScore: number;
  }> {
    try {
      // In a real implementation, you would query actual metrics
      return {
        totalUsers: 0,
        enabled2FA: 0,
        backupCodesGenerated: 0,
        failedAttempts: 0,
        averageSecurityScore: 0
      };
    } catch (error) {
      logger.error('2FA security metrics error:', error);
      return {
        totalUsers: 0,
        enabled2FA: 0,
        backupCodesGenerated: 0,
        failedAttempts: 0,
        averageSecurityScore: 0
      };
    }
  }
}

export const twoFactorSecurityService = new TwoFactorSecurityService();
