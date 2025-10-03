import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../db';
import { 
  userProfiles,
  passwordResetTokens,
  insertPasswordResetTokenSchema,
  requestPasswordResetSchema,
  resetPasswordV2Schema,
  changePasswordSchema
} from '../../../shared/schema';
import { z } from 'zod';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import nodemailer from 'nodemailer';

// Password Policy Configuration
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  EXPIRY_DAYS: 90,
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  HISTORY_COUNT: 5 // Remember last 5 passwords
};

// Argon2id Configuration for password hashing
export const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 1,
  hashLength: 32,
  saltLength: 16
};

// Password Service
export class PasswordService {
  // Validate password against policy
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
      errors.push(`Şifre en az ${PASSWORD_POLICY.MIN_LENGTH} karakter olmalı`);
    }

    if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
      errors.push(`Şifre en fazla ${PASSWORD_POLICY.MAX_LENGTH} karakter olmalı`);
    }

    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermeli');
    }

    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermeli');
    }

    if (PASSWORD_POLICY.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
      errors.push('Şifre en az bir rakam içermeli');
    }

    if (PASSWORD_POLICY.REQUIRE_SPECIAL_CHARS && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Şifre en az bir özel karakter içermeli (!@#$%^&*)');
    }

    // Check for common weak patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Şifre yaygın kullanılan kelimeler içeremez');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if password is expired
  async isPasswordExpired(userId: string): Promise<boolean> {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return true;
      }

      const passwordChangedAt = new Date(profile[0].passwordChangedAt);
      const expiryDate = new Date(passwordChangedAt.getTime() + (PASSWORD_POLICY.EXPIRY_DAYS * 24 * 60 * 60 * 1000));
      
      return new Date() > expiryDate;
    } catch (error) {
      console.error('Error checking password expiry:', error);
      return true;
    }
  }

  // Check if password is in history
  async isPasswordInHistory(userId: string, newPassword: string): Promise<boolean> {
    try {
      // In a real implementation, you would store password history
      // For now, we'll just return false
      return false;
    } catch (error) {
      console.error('Error checking password history:', error);
      return false;
    }
  }

  // Hash password with Argon2id
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: ARGON2_CONFIG.type,
        memoryCost: ARGON2_CONFIG.memoryCost,
        timeCost: ARGON2_CONFIG.timeCost,
        parallelism: ARGON2_CONFIG.parallelism,
        hashLength: ARGON2_CONFIG.hashLength,
        saltLength: ARGON2_CONFIG.saltLength
      });
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Şifre hash\'lenemedi');
    }
  }

  // Verify password with Argon2id
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      // Handle both Argon2id and legacy bcrypt hashes
      if (hashedPassword.startsWith('$2b$') || hashedPassword.startsWith('$2a$')) {
        // Legacy bcrypt hash - for backward compatibility
        const bcrypt = await import('bcryptjs');
        return await bcrypt.compare(password, hashedPassword);
      } else {
        // Argon2id hash
        return await argon2.verify(hashedPassword, password);
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // Migrate bcrypt password to Argon2id
  async migratePasswordToArgon2id(userId: string, plainPassword: string, bcryptHash: string): Promise<string> {
    try {
      // Verify the bcrypt password first
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(plainPassword, bcryptHash);
      
      if (!isValid) {
        throw new Error('Invalid current password');
      }

      // Hash with Argon2id
      const argon2Hash = await this.hashPassword(plainPassword);
      
      // Update user password in database
      await db
        .update(userProfiles)
        .set({ 
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

      return argon2Hash;
    } catch (error) {
      console.error('Error migrating password:', error);
      throw new Error('Şifre migrasyonu başarısız');
    }
  }

  // Change password
  async changePassword(userId: string, changeData: z.infer<typeof changePasswordSchema>): Promise<void> {
    try {
      // Validate new password
      const validation = this.validatePassword(changeData.newPassword);
      if (!validation.isValid) {
        throw new Error(`Şifre gereksinimleri karşılanmıyor: ${validation.errors.join(', ')}`);
      }

      // Check if password is in history
      const isInHistory = await this.isPasswordInHistory(userId, changeData.newPassword);
      if (isInHistory) {
        throw new Error('Bu şifre daha önce kullanılmış');
      }

      // Verify current password (this would need to be implemented with user authentication)
      // For now, we'll assume it's verified by the caller

      // Hash new password
      const hashedPassword = await this.hashPassword(changeData.newPassword);

      // Update password in user profile (this would need to be implemented)
      // For now, we'll update the password changed timestamp
      await db
        .update(userProfiles)
        .set({ 
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));

    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Şifre değiştirilemedi');
    }
  }

  // Request password reset
  async requestPasswordReset(requestData: z.infer<typeof requestPasswordResetSchema>): Promise<void> {
    try {
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token (in a real implementation, you would find user by email)
      const resetTokenData = insertPasswordResetTokenSchema.parse({
        userId: 'temp-user-id', // This should be the actual user ID from email lookup
        token,
        expiresAt
      });

      await db.insert(passwordResetTokens).values(resetTokenData);

      // Send reset email
      await this.sendPasswordResetEmail(requestData.email, token);

    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw new Error('Şifre sıfırlama talebi oluşturulamadı');
    }
  }

  // Reset password with token
  async resetPassword(resetData: z.infer<typeof resetPasswordV2Schema>): Promise<void> {
    try {
      // Validate new password
      const validation = this.validatePassword(resetData.newPassword);
      if (!validation.isValid) {
        throw new Error(`Şifre gereksinimleri karşılanmıyor: ${validation.errors.join(', ')}`);
      }

      // Find valid reset token
      const resetToken = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, resetData.token),
            eq(passwordResetTokens.used, false),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (resetToken.length === 0) {
        throw new Error('Geçersiz veya süresi dolmuş reset token');
      }

      // Check if password is in history
      const isInHistory = await this.isPasswordInHistory(resetToken[0].userId, resetData.newPassword);
      if (isInHistory) {
        throw new Error('Bu şifre daha önce kullanılmış');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(resetData.newPassword);

      // Update password in user profile
      await db
        .update(userProfiles)
        .set({ 
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, resetToken[0].userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ 
          used: true,
          usedAt: new Date()
        })
        .where(eq(passwordResetTokens.id, resetToken[0].id));

    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Şifre sıfırlanamadı');
    }
  }

  // Check failed login attempts and lock account if necessary
  async handleFailedLogin(userId: string): Promise<void> {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return;
      }

      const currentAttempts = profile[0].failedLoginAttempts + 1;

      if (currentAttempts >= PASSWORD_POLICY.MAX_ATTEMPTS) {
        // Lock account
        const lockoutUntil = new Date(Date.now() + (PASSWORD_POLICY.LOCKOUT_DURATION_MINUTES * 60 * 1000));
        
        await db
          .update(userProfiles)
          .set({ 
            failedLoginAttempts: currentAttempts,
            lockedUntil: lockoutUntil,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, userId));
      } else {
        // Increment failed attempts
        await db
          .update(userProfiles)
          .set({ 
            failedLoginAttempts: currentAttempts,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.userId, userId));
      }
    } catch (error) {
      console.error('Error handling failed login:', error);
    }
  }

  // Reset failed login attempts on successful login
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await db
        .update(userProfiles)
        .set({ 
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, userId));
    } catch (error) {
      console.error('Error resetting failed login attempts:', error);
    }
  }

  // Send password reset email
  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      // In production, use proper email service
      const transporter = nodemailer.createTransporter({
        // Configure with your email service
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@finbot.com',
        to: email,
        subject: 'FinBot - Şifre Sıfırlama',
        html: `
          <h2>Şifre Sıfırlama</h2>
          <p>Aşağıdaki linke tıklayarak şifrenizi sıfırlayabilirsiniz:</p>
          <p><a href="${resetUrl}">Şifre Sıfırla</a></p>
          <p>Bu link 1 saat geçerlidir.</p>
          <p>Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        `
      });

      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Şifre sıfırlama e-postası gönderilemedi');
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await db
        .delete(passwordResetTokens)
        .where(
          and(
            gt(passwordResetTokens.expiresAt, new Date()),
            eq(passwordResetTokens.used, true)
          )
        );
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}

export const passwordService = new PasswordService();
