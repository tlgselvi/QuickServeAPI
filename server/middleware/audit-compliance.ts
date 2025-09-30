import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { userActivityLogs } from '../../shared/schema';
import { eq, and, lt, desc } from 'drizzle-orm';
import * as crypto from 'crypto';

// GDPR/KVKK Compliance Configuration
export const COMPLIANCE_CONFIG = {
  // Data retention periods (in days)
  retention: {
    userActivityLogs: 2555, // 7 years for audit logs
    loginAttempts: 90, // 3 months
    passwordResetTokens: 1, // 1 day
    sessionData: 30, // 30 days
    cspReports: 30, // 30 days
    errorLogs: 90 // 3 months
  },

  // PII fields that need special handling
  piiFields: [
    'email',
    'phone',
    'ip_address',
    'user_agent',
    'personal_data',
    'financial_data'
  ],

  // Data minimization rules
  dataMinimization: {
    maxLogSize: 1000, // Maximum characters per log entry
    excludeFields: ['password', 'token', 'secret', 'key'],
    hashFields: ['ip_address', 'user_agent']
  },

  // Audit log categories
  categories: {
    AUTHENTICATION: 'authentication',
    AUTHORIZATION: 'authorization',
    DATA_ACCESS: 'data_access',
    DATA_MODIFICATION: 'data_modification',
    SYSTEM_OPERATION: 'system_operation',
    SECURITY_EVENT: 'security_event',
    COMPLIANCE_EVENT: 'compliance_event'
  }
};

// PII Detection and Masking
export class PIIProcessor {
  // Email regex pattern
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Phone regex pattern (Turkish format)
  private static readonly PHONE_REGEX = /(\+90|0)?[5][0-9]{9}/g;
  
  // IP address regex
  private static readonly IP_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;

  // Hash sensitive data
  public static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // Mask email addresses
  public static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 2)}***@${domain}`;
  }

  // Mask phone numbers
  public static maskPhone(phone: string): string {
    if (phone.length <= 4) return '***';
    return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
  }

  // Mask IP addresses
  public static maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return '***.***.***.***';
  }

  // Process text for PII
  public static processText(text: string): string {
    let processed = text;

    // Mask emails
    processed = processed.replace(PIIProcessor.EMAIL_REGEX, (match) => 
      PIIProcessor.maskEmail(match)
    );

    // Mask phone numbers
    processed = processed.replace(PIIProcessor.PHONE_REGEX, (match) => 
      PIIProcessor.maskPhone(match)
    );

    // Mask IP addresses
    processed = processed.replace(PIIProcessor.IP_REGEX, (match) => 
      PIIProcessor.maskIP(match)
    );

    return processed;
  }

  // Check if field contains PII
  public static isPIIField(fieldName: string): boolean {
    return COMPLIANCE_CONFIG.piiFields.some(piiField => 
      fieldName.toLowerCase().includes(piiField.toLowerCase())
    );
  }

  // Anonymize data
  public static anonymizeData(data: any): any {
    if (typeof data === 'string') {
      return PIIProcessor.processText(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      const anonymized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (PIIProcessor.isPIIField(key)) {
          anonymized[key] = typeof value === 'string' 
            ? PIIProcessor.hashSensitiveData(value)
            : '[ANONYMIZED]';
        } else {
          anonymized[key] = PIIProcessor.anonymizeData(value);
        }
      }
      return anonymized;
    }

    return data;
  }
}

// Audit Log Compliance Manager
export class AuditComplianceManager {
  private static instance: AuditComplianceManager;
  private retentionJobs: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.startRetentionJobs();
  }

  public static getInstance(): AuditComplianceManager {
    if (!AuditComplianceManager.instance) {
      AuditComplianceManager.instance = new AuditComplianceManager();
    }
    return AuditComplianceManager.instance;
  }

  // Log user activity with compliance checks
  public async logActivity(data: {
    userId?: string;
    action: string;
    category: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      // Data minimization
      const minimizedDetails = this.minimizeData(data.details);
      const anonymizedMetadata = PIIProcessor.anonymizeData(data.metadata);

      // Create audit log entry
      const logEntry = {
        id: crypto.randomUUID(),
        userId: data.userId || null,
        action: data.action.substring(0, 255), // Truncate if too long
        category: data.category,
        details: minimizedDetails,
        ipAddress: data.ipAddress ? PIIProcessor.hashSensitiveData(data.ipAddress) : null,
        userAgent: data.userAgent ? PIIProcessor.hashSensitiveData(data.userAgent) : null,
        sessionId: data.sessionId || null,
        metadata: anonymizedMetadata,
        timestamp: new Date(),
        complianceFlags: this.generateComplianceFlags(data)
      };

      await db.insert(userActivityLogs).values(logEntry);

      // Log to console for monitoring
      console.log(`🔍 [AUDIT] ${data.category.toUpperCase()} - ${data.action} - User: ${data.userId || 'Anonymous'}`);
      
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  // Data minimization
  private minimizeData(data: any): string {
    if (!data) return '';
    
    const jsonString = JSON.stringify(data);
    
    // Remove sensitive fields
    const cleaned = this.removeSensitiveFields(JSON.parse(jsonString));
    
    // Truncate if too long
    const result = JSON.stringify(cleaned);
    return result.length > COMPLIANCE_CONFIG.dataMinimization.maxLogSize 
      ? result.substring(0, COMPLIANCE_CONFIG.dataMinimization.maxLogSize) + '...'
      : result;
  }

  // Remove sensitive fields
  private removeSensitiveFields(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.removeSensitiveFields(item));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = COMPLIANCE_CONFIG.dataMinimization.excludeFields.some(
        field => key.toLowerCase().includes(field.toLowerCase())
      );

      if (!isSensitive) {
        cleaned[key] = this.removeSensitiveFields(value);
      } else {
        cleaned[key] = '[REDACTED]';
      }
    }

    return cleaned;
  }

  // Generate compliance flags
  private generateComplianceFlags(data: any): string[] {
    const flags: string[] = [];
    
    if (data.userId) flags.push('USER_IDENTIFIED');
    if (data.ipAddress) flags.push('IP_LOGGED');
    if (data.userAgent) flags.push('USER_AGENT_LOGGED');
    if (data.sessionId) flags.push('SESSION_TRACKED');
    
    // Check for PII in details
    const detailsString = JSON.stringify(data.details || {});
    if (PIIProcessor.EMAIL_REGEX.test(detailsString)) flags.push('EMAIL_DETECTED');
    if (PIIProcessor.PHONE_REGEX.test(detailsString)) flags.push('PHONE_DETECTED');
    if (PIIProcessor.IP_REGEX.test(detailsString)) flags.push('IP_DETECTED');
    
    return flags;
  }

  // Start retention jobs
  private startRetentionJobs(): void {
    // Daily retention job
    const dailyJob = setInterval(async () => {
      await this.runRetentionJob();
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.retentionJobs.set('daily', dailyJob);

    // Immediate run for testing
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => this.runRetentionJob(), 5000);
    }
  }

  // Run retention job
  private async runRetentionJob(): Promise<void> {
    try {
      console.log('🔄 [COMPLIANCE] Running data retention job...');
      
      const now = new Date();
      let totalDeleted = 0;

      // Clean user activity logs
      const userActivityCutoff = new Date(now.getTime() - (COMPLIANCE_CONFIG.retention.userActivityLogs * 24 * 60 * 60 * 1000));
      const deletedActivityLogs = await db
        .delete(userActivityLogs)
        .where(lt(userActivityLogs.timestamp, userActivityCutoff));
      
      totalDeleted += deletedActivityLogs.rowCount || 0;
      console.log(`🗑️ [COMPLIANCE] Deleted ${deletedActivityLogs.rowCount || 0} expired activity logs`);

      // Add other table cleanups here as needed
      // Example: password reset tokens, session data, etc.

      console.log(`✅ [COMPLIANCE] Retention job completed. Total deleted: ${totalDeleted} records`);
      
    } catch (error) {
      console.error('❌ [COMPLIANCE] Retention job failed:', error);
    }
  }

  // Export audit data for compliance requests
  public async exportAuditData(userId: string, startDate?: Date, endDate?: Date): Promise<{
    userActivity: any[];
    summary: {
      totalRecords: number;
      dateRange: { start: Date; end: Date };
      categories: Record<string, number>;
    };
  }> {
    try {
      const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year default
      const end = endDate || new Date();

      // Get user activity logs
      const activityLogs = await db
        .select()
        .from(userActivityLogs)
        .where(
          and(
            eq(userActivityLogs.userId, userId),
            // Add date range filter if needed
          )
        )
        .orderBy(desc(userActivityLogs.timestamp));

      // Generate summary
      const categories: Record<string, number> = {};
      activityLogs.forEach(log => {
        categories[log.category] = (categories[log.category] || 0) + 1;
      });

      return {
        userActivity: activityLogs.map(log => ({
          ...log,
          // Ensure PII is properly masked in export
          ipAddress: log.ipAddress ? '[MASKED]' : null,
          userAgent: log.userAgent ? '[MASKED]' : null
        })),
        summary: {
          totalRecords: activityLogs.length,
          dateRange: { start, end },
          categories
        }
      };

    } catch (error) {
      console.error('Export audit data error:', error);
      throw new Error('Failed to export audit data');
    }
  }

  // Purge user data (GDPR Right to Erasure)
  public async purgeUserData(userId: string): Promise<{
    deletedRecords: number;
    tables: string[];
  }> {
    try {
      console.log(`🗑️ [COMPLIANCE] Purging data for user: ${userId}`);
      
      let totalDeleted = 0;
      const tables: string[] = [];

      // Delete user activity logs
      const deletedActivityLogs = await db
        .delete(userActivityLogs)
        .where(eq(userActivityLogs.userId, userId));
      
      totalDeleted += deletedActivityLogs.rowCount || 0;
      if (deletedActivityLogs.rowCount && deletedActivityLogs.rowCount > 0) {
        tables.push('userActivityLogs');
      }

      // Add other user data deletions here
      // Example: user profiles, sessions, etc.

      console.log(`✅ [COMPLIANCE] Purged ${totalDeleted} records for user ${userId}`);
      
      return {
        deletedRecords: totalDeleted,
        tables
      };

    } catch (error) {
      console.error('Purge user data error:', error);
      throw new Error('Failed to purge user data');
    }
  }

  // Get compliance metrics
  public async getComplianceMetrics(): Promise<{
    totalLogs: number;
    retentionStatus: {
      activityLogs: { count: number; oldestRecord: Date | null };
    };
    piiFlags: Record<string, number>;
  }> {
    try {
      // Get total log count
      const totalLogsResult = await db
        .select({ count: userActivityLogs.id })
        .from(userActivityLogs);
      
      const totalLogs = totalLogsResult.length;

      // Get oldest activity log
      const oldestLog = await db
        .select({ timestamp: userActivityLogs.timestamp })
        .from(userActivityLogs)
        .orderBy(userActivityLogs.timestamp)
        .limit(1);

      return {
        totalLogs,
        retentionStatus: {
          activityLogs: {
            count: totalLogs,
            oldestRecord: oldestLog[0]?.timestamp || null
          }
        },
        piiFlags: {} // Would be populated from actual data analysis
      };

    } catch (error) {
      console.error('Get compliance metrics error:', error);
      throw new Error('Failed to get compliance metrics');
    }
  }

  // Stop retention jobs
  public stopRetentionJobs(): void {
    this.retentionJobs.forEach((job, name) => {
      clearInterval(job);
      console.log(`🛑 [COMPLIANCE] Stopped retention job: ${name}`);
    });
    this.retentionJobs.clear();
  }
}

// Middleware for automatic audit logging
export const auditComplianceMiddleware = {
  // Log all API requests
  logRequests: (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      
      await AuditComplianceManager.getInstance().logActivity({
        userId: (req as any).user?.id,
        action: `${req.method} ${req.path}`,
        category: COMPLIANCE_CONFIG.categories.SYSTEM_OPERATION,
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          query: req.query,
          params: req.params
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.sessionID,
        metadata: {
          responseSize: res.get('Content-Length'),
          contentType: res.get('Content-Type')
        }
      });
    });

    next();
  },

  // Log authentication events
  logAuth: (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (res.statusCode === 200 && req.path.includes('/auth/')) {
        AuditComplianceManager.getInstance().logActivity({
          userId: (req as any).user?.id,
          action: `AUTH_${req.path.split('/').pop()?.toUpperCase()}`,
          category: COMPLIANCE_CONFIG.categories.AUTHENTICATION,
          details: {
            path: req.path,
            success: res.statusCode === 200
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  },

  // Log data access
  logDataAccess: (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (req.method === 'GET' && res.statusCode === 200) {
        AuditComplianceManager.getInstance().logActivity({
          userId: (req as any).user?.id,
          action: `DATA_ACCESS_${req.path.split('/').pop()?.toUpperCase()}`,
          category: COMPLIANCE_CONFIG.categories.DATA_ACCESS,
          details: {
            resource: req.path,
            method: req.method,
            dataSize: data ? data.length : 0
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID
        });
      }
      
      return originalSend.call(this, data);
    };

    next();
  }
};

// Export singleton instance
export const auditComplianceManager = AuditComplianceManager.getInstance();
