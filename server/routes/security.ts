import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
  userProfiles,
  userActivityLogs,
  userTwoFactorAuth,
  passwordResetTokens,
  hasPermissionV2,
  PermissionV2,
  UserRoleV2,
  insertUserProfileSchema,
  updateUserProfileSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordV2Schema,
  checkPermissionSchema
} from '../../shared/schema';
import { securityMiddleware } from '../middleware/security-v2';
import { twoFactorAuthService } from '../services/auth/two-factor-auth';
import { passwordService } from '../services/auth/password-service';
import { z } from 'zod';

const router = Router();

// =====================
// USER MANAGEMENT
// =====================

// Get user profile
router.get('/profile', 
  securityMiddleware.securityContext,
  securityMiddleware.requirePermission(PermissionV2.VIEW_USERS),
  async (req: any, res) => {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      res.json({
        success: true,
        profile: profile[0]
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  }
);

// Update user profile
router.put('/profile',
  securityMiddleware.securityContext,
  securityMiddleware.requirePermission(PermissionV2.MANAGE_USERS),
  async (req: any, res) => {
    try {
      const updateData = updateUserProfileSchema.parse(req.body);

      await db
        .update(userProfiles)
        .set({ 
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(userProfiles.userId, req.user.id));

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: 'profile_updated',
        resource: 'user_profile',
        metadata: { updates: Object.keys(updateData) }
      }, req);

      res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }
);

// Change password
router.post('/change-password',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const changeData = changePasswordSchema.parse(req.body);
      
      await passwordService.changePassword(req.user.id, changeData);

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: 'password_changed',
        resource: 'user_account',
        metadata: { timestamp: new Date().toISOString() }
      }, req);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(400).json({ error: error.message || 'Failed to change password' });
    }
  }
);

// =====================
// PASSWORD RESET
// =====================

// Request password reset
router.post('/request-password-reset',
  async (req, res) => {
    try {
      const requestData = requestPasswordResetSchema.parse(req.body);
      
      await passwordService.requestPasswordReset(requestData);

      res.json({ 
        success: true, 
        message: 'Password reset email sent if account exists' 
      });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(400).json({ error: error.message || 'Failed to request password reset' });
    }
  }
);

// Reset password with token
router.post('/reset-password',
  async (req, res) => {
    try {
      const resetData = resetPasswordV2Schema.parse(req.body);
      
      await passwordService.resetPassword(resetData);

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
  }
);

// =====================
// TWO-FACTOR AUTHENTICATION
// =====================

// Setup 2FA
router.post('/2fa/setup',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const setupData = req.body;
      
      const result = await twoFactorAuthService.setupTwoFactorAuth(req.user.id, setupData);

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: '2fa_setup_initiated',
        resource: 'two_factor_auth',
        metadata: { timestamp: new Date().toISOString() }
      }, req);

      res.json({
        success: true,
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      res.status(500).json({ error: 'Failed to setup 2FA' });
    }
  }
);

// Enable 2FA
router.post('/2fa/enable',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const enableData = req.body;
      
      await twoFactorAuthService.enableTwoFactorAuth(req.user.id, enableData);

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: '2fa_enabled',
        resource: 'two_factor_auth',
        metadata: { timestamp: new Date().toISOString() }
      }, req);

      res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(400).json({ error: error.message || 'Failed to enable 2FA' });
    }
  }
);

// Disable 2FA
router.post('/2fa/disable',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const disableData = req.body;
      
      await twoFactorAuthService.disableTwoFactorAuth(req.user.id, disableData);

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: '2fa_disabled',
        resource: 'two_factor_auth',
        metadata: { timestamp: new Date().toISOString() }
      }, req);

      res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(400).json({ error: error.message || 'Failed to disable 2FA' });
    }
  }
);

// Verify 2FA token
router.post('/2fa/verify',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const verifyData = req.body;
      
      const isValid = await twoFactorAuthService.verifyTwoFactorAuth(req.user.id, verifyData);

      if (isValid) {
        await securityMiddleware.logUserActivity({
          userId: req.user.id,
          action: '2fa_verified',
          resource: 'two_factor_auth',
          metadata: { timestamp: new Date().toISOString() }
        }, req);

        res.json({ success: true, message: '2FA verified successfully' });
      } else {
        res.status(400).json({ error: 'Invalid 2FA token' });
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      res.status(400).json({ error: 'Failed to verify 2FA' });
    }
  }
);

// Get 2FA status
router.get('/2fa/status',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const status = await twoFactorAuthService.getTwoFactorStatus(req.user.id);

      res.json({
        success: true,
        status
      });
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      res.status(500).json({ error: 'Failed to get 2FA status' });
    }
  }
);

// Regenerate backup codes
router.post('/2fa/regenerate-backup-codes',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const backupCodes = await twoFactorAuthService.regenerateBackupCodes(req.user.id);

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: '2fa_backup_codes_regenerated',
        resource: 'two_factor_auth',
        metadata: { timestamp: new Date().toISOString() }
      }, req);

      res.json({
        success: true,
        backupCodes
      });
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
  }
);

// =====================
// PERMISSION MANAGEMENT
// =====================

// Check permission
router.post('/check-permission',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const checkData = checkPermissionSchema.parse(req.body);
      
      const hasPermission = hasPermissionV2(req.user.role, checkData.permission as PermissionV2);

      res.json({
        success: true,
        hasPermission,
        permission: checkData.permission,
        userRole: req.user.role
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(400).json({ error: 'Failed to check permission' });
    }
  }
);

// Get user permissions
router.get('/permissions',
  securityMiddleware.securityContext,
  async (req: any, res) => {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const userRole = profile[0].role as keyof typeof UserRoleV2;
      const rolePermissions = Object.keys(PermissionV2).filter(permission => 
        hasPermissionV2(userRole, PermissionV2[permission as keyof typeof PermissionV2])
      );

      res.json({
        success: true,
        role: userRole,
        permissions: rolePermissions,
        customPermissions: profile[0].permissions || []
      });
    } catch (error) {
      console.error('Error getting user permissions:', error);
      res.status(500).json({ error: 'Failed to get user permissions' });
    }
  }
);

// =====================
// ACTIVITY LOGGING
// =====================

// Get user activity logs
router.get('/activity-logs',
  securityMiddleware.securityContext,
  securityMiddleware.requirePermission(PermissionV2.VIEW_AUDIT_LOGS),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 50, action, resource } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db
        .select()
        .from(userActivityLogs)
        .where(eq(userActivityLogs.userId, req.user.id))
        .orderBy(desc(userActivityLogs.timestamp))
        .limit(parseInt(limit))
        .offset(offset);

      if (action) {
        query = query.where(eq(userActivityLogs.action, action));
      }

      if (resource) {
        query = query.where(eq(userActivityLogs.resource, resource));
      }

      const logs = await query;

      res.json({
        success: true,
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length
        }
      });
    } catch (error) {
      console.error('Error getting activity logs:', error);
      res.status(500).json({ error: 'Failed to get activity logs' });
    }
  }
);

// Get all activity logs (admin only)
router.get('/activity-logs/all',
  securityMiddleware.securityContext,
  securityMiddleware.requireRole([UserRoleV2.ADMIN]),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 100, userId, action, resource } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = db
        .select()
        .from(userActivityLogs)
        .orderBy(desc(userActivityLogs.timestamp))
        .limit(parseInt(limit))
        .offset(offset);

      if (userId) {
        query = query.where(eq(userActivityLogs.userId, userId));
      }

      if (action) {
        query = query.where(eq(userActivityLogs.action, action));
      }

      if (resource) {
        query = query.where(eq(userActivityLogs.resource, resource));
      }

      const logs = await query;

      await securityMiddleware.logUserActivity({
        userId: req.user.id,
        action: 'viewed_all_activity_logs',
        resource: 'audit_logs',
        metadata: { 
          filters: { userId, action, resource },
          timestamp: new Date().toISOString()
        }
      }, req);

      res.json({
        success: true,
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length
        }
      });
    } catch (error) {
      console.error('Error getting all activity logs:', error);
      res.status(500).json({ error: 'Failed to get activity logs' });
    }
  }
);

// =====================
// SYSTEM STATUS
// =====================

// Get security status
router.get('/status',
  securityMiddleware.securityContext,
  securityMiddleware.requirePermission(PermissionV2.VIEW_SYSTEM_STATUS),
  async (req: any, res) => {
    try {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, req.user.id))
        .limit(1);

      if (profile.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      const twoFactorStatus = await twoFactorAuthService.getTwoFactorStatus(req.user.id);
      const isPasswordExpired = await passwordService.isPasswordExpired(req.user.id);

      res.json({
        success: true,
        status: {
          accountLocked: profile[0].lockedUntil && new Date() < new Date(profile[0].lockedUntil),
          failedLoginAttempts: profile[0].failedLoginAttempts,
          passwordExpired: isPasswordExpired,
          twoFactorEnabled: twoFactorStatus.isEnabled,
          lastLogin: profile[0].lastLogin,
          sessionTimeout: profile[0].sessionTimeout
        }
      });
    } catch (error) {
      console.error('Error getting security status:', error);
      res.status(500).json({ error: 'Failed to get security status' });
    }
  }
);

export default router;
