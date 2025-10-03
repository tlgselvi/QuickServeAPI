import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';
import { db } from '../db';
import { auditLogs } from '@shared/schema';
import { randomUUID } from 'crypto';
import { eq, desc, sql } from 'drizzle-orm';

export interface AuditContext {
  tableName: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: any;
  newValues?: any;
  changedFields?: string[];
  reason?: string;
  metadata?: any;
}

// Audit middleware factory
export const createAuditMiddleware = (context: Partial<AuditContext>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    const originalStatus = res.status;

    // Override response methods to capture the response
    res.status = function(code: number) {
      this.statusCode = code;
      return this;
    };

    res.json = async function(body: any) {
      // Only log successful operations
      if (this.statusCode >= 200 && this.statusCode < 300) {
        try {
          await logAuditEvent(req, {
            ...context,
            newValues: body,
          });
        } catch (error) {
          console.error('Audit logging failed:', error);
        }
      }

      return originalJson.call(this, body);
    };

    next();
  };
};

// Log audit event
export const logAuditEvent = async (
  req: AuthenticatedRequest,
  context: AuditContext
): Promise<void> => {
  try {
    const auditData = {
      id: randomUUID(),
      tableName: context.tableName,
      recordId: context.recordId,
      operation: context.operation,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      oldValues: context.oldValues,
      newValues: context.newValues,
      changedFields: context.changedFields,
      reason: context.reason,
      sessionId: req.sessionID,
      requestId: req.headers['x-request-id'] as string || randomUUID(),
      metadata: {
        ...context.metadata,
        method: req.method,
        path: req.path,
        query: req.query,
        timestamp: new Date().toISOString(),
      },
    };

    await db.insert(auditLogs).values(auditData);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Audit decorator for storage methods
export const auditDecorator = <T extends (...args: any[]) => any>(
  fn: T,
  context: Partial<AuditContext>
): T => {
  return (async (...args: any[]) => {
    const result = await fn(...args);
    
    // Log audit event if we have a request context
    if (args[0] && typeof args[0] === 'object' && args[0].user) {
      try {
        await logAuditEvent(args[0], {
          ...context,
          newValues: result,
        });
      } catch (error) {
        console.error('Audit decorator failed:', error);
      }
    }

    return result;
  }) as T;
};

// Get audit logs for a specific record
export const getAuditLogs = async (
  tableName: string,
  recordId: string,
  limit: number = 50
) => {
  try {
    return await db
      .select()
      .from(auditLogs)
      .where(
        sql`${auditLogs.tableName} = ${tableName} AND ${auditLogs.recordId} = ${recordId}`
      )
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
};

// Get audit logs for a user
export const getUserAuditLogs = async (
  userId: string,
  limit: number = 50
) => {
  try {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get user audit logs:', error);
    return [];
  }
};

// Clean up old audit logs
export const cleanupAuditLogs = async (daysToKeep: number = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(auditLogs)
      .where(sql`${auditLogs.timestamp} < ${cutoffDate.toISOString()}`);

    console.log(`Cleaned up ${result.rowCount} old audit logs`);
    return result.rowCount;
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error);
    return 0;
  }
};

export default {
  createAuditMiddleware,
  logAuditEvent,
  auditDecorator,
  getAuditLogs,
  getUserAuditLogs,
  cleanupAuditLogs,
};
