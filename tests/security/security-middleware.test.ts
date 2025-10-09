import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { securityMiddleware } from '../../server/middleware/security-v2';
import { PermissionV2, UserRoleV2 } from '../../shared/schema';

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
    }))
  }
}));

describe('Security Middleware V2', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: UserRoleV2.FINANCE
      },
      securityContext: {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      },
      path: '/api/test',
      method: 'GET',
      body: {},
      sessionID: 'test-session-id'
    };

    mockResponse = {
      status: vi.fn(() => mockResponse),
      json: vi.fn(() => mockResponse),
      setHeader: vi.fn()
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requirePermission', () => {
    it('should allow access when user has required permission', async () => {
      const middleware = securityMiddleware.requirePermission(PermissionV2.VIEW_CASHBOXES);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required permission', async () => {
      const middleware = securityMiddleware.requirePermission(PermissionV2.MANAGE_USERS);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: PermissionV2.MANAGE_USERS,
        current: UserRoleV2.FINANCE
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = null;
      const middleware = securityMiddleware.requirePermission(PermissionV2.VIEW_CASHBOXES);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it.skip('should handle permission check errors', async () => {
      // Mock hasPermissionV2 to throw error
      vi.doMock('../../shared/schema', async () => {
        const actual = await vi.importActual('../../shared/schema');
        return {
          ...actual,
          hasPermissionV2: vi.fn(() => {
            throw new Error('Permission check failed');
          })
        };
      });

      const middleware = securityMiddleware.requirePermission(PermissionV2.VIEW_CASHBOXES);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Permission check failed'
      });
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow access when user has any of the required permissions', async () => {
      const permissions = [
        PermissionV2.MANAGE_USERS,
        PermissionV2.VIEW_CASHBOXES
      ];
      const middleware = securityMiddleware.requireAnyPermission(permissions);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks all required permissions', async () => {
      const permissions = [
        PermissionV2.MANAGE_USERS,
        PermissionV2.ASSIGN_ROLES,
        PermissionV2.VIEW_SYSTEM_STATUS
      ];
      const middleware = securityMiddleware.requireAnyPermission(permissions);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: permissions,
        current: UserRoleV2.FINANCE
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = null;
      const permissions = [PermissionV2.VIEW_CASHBOXES];
      const middleware = securityMiddleware.requireAnyPermission(permissions);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', async () => {
      const roles = [UserRoleV2.FINANCE, UserRoleV2.ADMIN];
      const middleware = securityMiddleware.requireRole(roles);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', async () => {
      const roles = [UserRoleV2.ADMIN, UserRoleV2.AUDITOR];
      const middleware = securityMiddleware.requireRole(roles);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Insufficient role privileges',
        required: roles,
        current: UserRoleV2.FINANCE
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', async () => {
      mockRequest.user = null;
      const roles = [UserRoleV2.FINANCE];
      const middleware = securityMiddleware.requireRole(roles);

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Authentication required'
      });
    });
  });

  describe('checkAccountLockout', () => {
    it('should allow access when account is not locked', async () => {
      const mockProfile = [{
        userId: 'test-user-id',
        lockedUntil: null
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

      await securityMiddleware.checkAccountLockout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when account is locked', async () => {
      const lockoutUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const mockProfile = [{
        userId: 'test-user-id',
        lockedUntil: lockoutUntil
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

      await securityMiddleware.checkAccountLockout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(423);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Account is locked',
        lockedUntil: lockoutUntil
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access when lockout has expired', async () => {
      const expiredLockout = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const mockProfile = [{
        userId: 'test-user-id',
        lockedUntil: expiredLockout
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

      await securityMiddleware.checkAccountLockout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue on error', async () => {
      // Mock database to throw error
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await securityMiddleware.checkAccountLockout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkSessionTimeout', () => {
    it('should allow access when session is not expired', async () => {
      const lastLogin = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const mockProfile = [{
        userId: 'test-user-id',
        lastLogin: lastLogin,
        sessionTimeout: 3600 // 1 hour
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

      await securityMiddleware.checkSessionTimeout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access when session is expired', async () => {
      const lastLogin = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const mockProfile = [{
        userId: 'test-user-id',
        lastLogin: lastLogin,
        sessionTimeout: 3600 // 1 hour
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

      await securityMiddleware.checkSessionTimeout(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Session expired',
        message: 'Please log in again'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should continue when user is not authenticated', async () => {
      mockRequest.user = null;

      await securityMiddleware.checkSessionTimeout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error', async () => {
      // Mock database to throw error
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await securityMiddleware.checkSessionTimeout(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logActivity', () => {
    it('should log activity for authenticated user', async () => {
      const middleware = securityMiddleware.logActivity('test_action', 'test_resource');

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue when user is not authenticated', async () => {
      mockRequest.user = null;
      const middleware = securityMiddleware.logActivity('test_action', 'test_resource');

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on logging error', async () => {
      // Mock logUserActivity to throw error
      vi.doMock('../../server/middleware/security-v2', async () => {
        const actual = await vi.importActual('../../server/middleware/security-v2');
        return {
          ...actual,
          logUserActivity: vi.fn(() => {
            throw new Error('Logging failed');
          })
        };
      });

      const middleware = securityMiddleware.logActivity('test_action', 'test_resource');

      await middleware(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('securityContext', () => {
    it('should set security context from request headers', async () => {
      mockRequest.ip = '192.168.1.1';
      mockRequest.connection = { remoteAddress: '192.168.1.2' };
      mockRequest.get = vi.fn((header) => {
        if (header === 'User-Agent') return 'test-browser/1.0';
        return undefined;
      });

      await securityMiddleware.securityContext(mockRequest, mockResponse, mockNext);

      expect(mockRequest.securityContext).toEqual({
        ipAddress: '192.168.1.1',
        userAgent: 'test-browser/1.0',
        sessionId: 'test-session-id'
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it.skip('should load user profile when user is authenticated', async () => {
      const mockProfile = [{
        userId: 'test-user-id',
        role: 'finance',
        permissions: ['view_cashboxes']
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

      await securityMiddleware.securityContext(mockRequest, mockResponse, mockNext);

      expect(mockRequest.user.profile).toEqual(mockProfile[0]);
      expect(mockRequest.user.role).toBe('finance');
      expect(mockRequest.user.permissions).toEqual(['view_cashboxes']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on error', async () => {
      // Mock database to throw error
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      await securityMiddleware.securityContext(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      securityMiddleware.securityHeaders(mockRequest, mockResponse, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.stringContaining("default-src 'self'"));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logUserActivity', () => {
    it('should log user activity', async () => {
      const activity = {
        userId: 'test-user-id',
        action: 'test_action',
        resource: 'test_resource',
        metadata: { test: 'data' }
      };

      // Mock database calls
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.insert).mockReturnValue({
        values: vi.fn(() => Promise.resolve())
      } as any);

      await securityMiddleware.logUserActivity(activity, mockRequest);

      expect(mockDb.db.insert).toHaveBeenCalled();
    });

    it('should handle logging errors gracefully', async () => {
      const activity = {
        userId: 'test-user-id',
        action: 'test_action',
        resource: 'test_resource'
      };

      // Mock database to throw error
      const mockDb = await import('../../server/db');
      vi.mocked(mockDb.db.insert).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(securityMiddleware.logUserActivity(activity, mockRequest)).resolves.not.toThrow();
    });
  });
});
