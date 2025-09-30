import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { 
  userTwoFactorAuth, 
  userProfiles,
  insertUserTwoFactorAuthSchema,
  setupTwoFactorAuthSchema,
  enableTwoFactorAuthSchema,
  disableTwoFactorAuthSchema,
  verifyTwoFactorAuthSchema
} from '../../../shared/schema';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Two-Factor Authentication Service
export class TwoFactorAuthService {
  // Generate TOTP secret for user
  async generateSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    try {
      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `FinBot (${userId})`,
        issuer: 'FinBot',
        length: 32
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Generate QR code URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  // Setup 2FA for user
  async setupTwoFactorAuth(userId: string, setupData: z.infer<typeof setupTwoFactorAuthSchema>): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      const { secret, qrCodeUrl, backupCodes } = await this.generateSecret(userId);

      // Encrypt backup codes
      const encryptedBackupCodes = backupCodes.map(code => this.encryptBackupCode(code));

      // Store 2FA setup (not enabled yet)
      const twoFactorData = insertUserTwoFactorAuthSchema.parse({
        userId,
        secret,
        isEnabled: false,
        backupCodes: encryptedBackupCodes,
        phoneNumber: setupData.phoneNumber,
        smsEnabled: setupData.enableSMS
      });

      await db.insert(userTwoFactorAuth).values(twoFactorData);

      return {
        secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup 2FA');
    }
  }

  // Enable 2FA after verification
  async enableTwoFactorAuth(userId: string, enableData: z.infer<typeof enableTwoFactorAuthSchema>): Promise<void> {
    try {
      // Verify the token
      const isValid = await this.verifyToken(userId, enableData.token, enableData.secret);
      
      if (!isValid) {
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

    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  // Disable 2FA
  async disableTwoFactorAuth(userId: string, disableData: z.infer<typeof disableTwoFactorAuthSchema>): Promise<void> {
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
        const isValidBackupCode = this.verifyBackupCode(
          disableData.backupCode, 
          twoFactorRecord[0].backupCodes || []
        );
        
        if (!isValidBackupCode) {
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

    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  // Verify 2FA token
  async verifyTwoFactorAuth(userId: string, verifyData: z.infer<typeof verifyTwoFactorAuthSchema>): Promise<boolean> {
    try {
      const twoFactorRecord = await db
        .select()
        .from(userTwoFactorAuth)
        .where(eq(userTwoFactorAuth.userId, userId))
        .limit(1);

      if (twoFactorRecord.length === 0) {
        return false;
      }

      const record = twoFactorRecord[0];

      // Check backup code first
      if (verifyData.backupCode) {
        const isValidBackupCode = this.verifyBackupCode(verifyData.backupCode, record.backupCodes || []);
        if (isValidBackupCode) {
          // Update last used timestamp
          await db
            .update(userTwoFactorAuth)
            .set({ lastUsed: new Date() })
            .where(eq(userTwoFactorAuth.userId, userId));
          
          return true;
        }
      }

      // Verify TOTP token
      const isValid = await this.verifyToken(userId, verifyData.token, record.secret);
      
      if (isValid) {
        // Update last used timestamp
        await db
          .update(userTwoFactorAuth)
          .set({ lastUsed: new Date() })
          .where(eq(userTwoFactorAuth.userId, userId));
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      return false;
    }
  }

  // Check if user has 2FA enabled
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      return profile.length > 0 && profile[0].twoFactorEnabled;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Get 2FA status for user
  async getTwoFactorStatus(userId: string): Promise<{
    isEnabled: boolean;
    hasBackupCodes: boolean;
    lastUsed?: Date;
    phoneNumber?: string;
    smsEnabled: boolean;
  }> {
    try {
      const [profile, twoFactorRecord] = await Promise.all([
        db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1),
        db.select().from(userTwoFactorAuth).where(eq(userTwoFactorAuth.userId, userId)).limit(1)
      ]);

      return {
        isEnabled: profile.length > 0 && profile[0].twoFactorEnabled,
        hasBackupCodes: twoFactorRecord.length > 0 && (twoFactorRecord[0].backupCodes?.length || 0) > 0,
        lastUsed: twoFactorRecord[0]?.lastUsed,
        phoneNumber: twoFactorRecord[0]?.phoneNumber,
        smsEnabled: twoFactorRecord[0]?.smsEnabled || false
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      const encryptedBackupCodes = backupCodes.map(code => this.encryptBackupCode(code));

      await db
        .update(userTwoFactorAuth)
        .set({ 
          backupCodes: encryptedBackupCodes,
          updatedAt: new Date()
        })
        .where(eq(userTwoFactorAuth.userId, userId));

      return backupCodes;
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  // Private helper methods
  private async verifyToken(userId: string, token: string, secret: string): Promise<boolean> {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time windows for clock skew
      });

      return verified;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private encryptBackupCode(code: string): string {
    // Simple encryption (in production, use proper encryption)
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.BACKUP_CODE_KEY || 'default-key-32-chars-long!!', 'utf8');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(code, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private verifyBackupCode(code: string, encryptedCodes: string[]): boolean {
    try {
      return encryptedCodes.some(encryptedCode => {
        const decrypted = this.decryptBackupCode(encryptedCode);
        return decrypted === code;
      });
    } catch (error) {
      console.error('Backup code verification error:', error);
      return false;
    }
  }

  private decryptBackupCode(encryptedCode: string): string {
    try {
      // Simple decryption (in production, use proper decryption)
      const algorithm = 'aes-256-cbc';
      const key = Buffer.from(process.env.BACKUP_CODE_KEY || 'default-key-32-chars-long!!', 'utf8');
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encryptedCode.split(':')[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Backup code decryption error:', error);
      throw new Error('Invalid backup code format');
    }
  }

  // SMS 2FA (placeholder implementation)
  async sendSMSCode(phoneNumber: string): Promise<string> {
    // In production, integrate with SMS service like Twilio
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`SMS Code for ${phoneNumber}: ${code}`); // For development
    return code;
  }

  async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    // In production, verify with SMS service
    console.log(`Verifying SMS Code ${code} for ${phoneNumber}`); // For development
    return true;
  }
}

export const twoFactorAuthService = new TwoFactorAuthService();
