import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface SecurityAuditEvent {
  timestamp: string;
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'sql_injection_attempt' | 'xss_attempt' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent: string;
  url: string;
  method: string;
  details: any;
  userId?: string;
}

class SecurityAuditor {
  private static instance: SecurityAuditor;
  private auditLog: SecurityAuditEvent[] = [];
  private suspiciousIPs = new Map<string, { count: number; lastSeen: Date; blocked: boolean }>();

  public static getInstance(): SecurityAuditor {
    if (!SecurityAuditor.instance) {
      SecurityAuditor.instance = new SecurityAuditor();
    }
    return SecurityAuditor.instance;
  }

  public logEvent(event: Omit<SecurityAuditEvent, 'timestamp'>) {
    const auditEvent: SecurityAuditEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    this.auditLog.push(auditEvent);

    // Log to console with appropriate level
    switch (event.severity) {
      case 'critical':
        logger.error({ event: auditEvent }, 'CRITICAL SECURITY EVENT');
        break;
      case 'high':
        logger.warn({ event: auditEvent }, 'HIGH SECURITY EVENT');
        break;
      case 'medium':
        logger.warn({ event: auditEvent }, 'MEDIUM SECURITY EVENT');
        break;
      case 'low':
        logger.info({ event: auditEvent }, 'LOW SECURITY EVENT');
        break;
    }

    // Track suspicious IPs
    if (event.severity === 'high' || event.severity === 'critical') {
      this.trackSuspiciousIP(event.ip);
    }

    // Keep only last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  private trackSuspiciousIP(ip: string) {
    const existing = this.suspiciousIPs.get(ip);
    if (existing) {
      existing.count++;
      existing.lastSeen = new Date();
      if (existing.count >= 5) {
        existing.blocked = true;
        logger.error(`IP ${ip} blocked due to suspicious activity (${existing.count} events)`);
      }
    } else {
      this.suspiciousIPs.set(ip, { count: 1, lastSeen: new Date(), blocked: false });
    }
  }

  public isIPBlocked(ip: string): boolean {
    // Skip IP blocking in development environment
    if (process.env.NODE_ENV === 'development') {
      return false;
    }
    
    const record = this.suspiciousIPs.get(ip);
    if (!record) return false;

    // Unblock after 24 hours
    if (Date.now() - record.lastSeen.getTime() > 24 * 60 * 60 * 1000) {
      this.suspiciousIPs.delete(ip);
      return false;
    }

    return record.blocked;
  }

  public getAuditLog(limit = 100): SecurityAuditEvent[] {
    return this.auditLog.slice(-limit);
  }

  public getSecurityStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = this.auditLog.filter(
      event => new Date(event.timestamp) > last24h
    );

    const stats = {
      totalEvents: this.auditLog.length,
      recentEvents: recentEvents.length,
      severityBreakdown: {
        critical: recentEvents.filter(e => e.severity === 'critical').length,
        high: recentEvents.filter(e => e.severity === 'high').length,
        medium: recentEvents.filter(e => e.severity === 'medium').length,
        low: recentEvents.filter(e => e.severity === 'low').length,
      },
      typeBreakdown: {
        suspicious_activity: recentEvents.filter(e => e.type === 'suspicious_activity').length,
        rate_limit_exceeded: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
        sql_injection_attempt: recentEvents.filter(e => e.type === 'sql_injection_attempt').length,
        xss_attempt: recentEvents.filter(e => e.type === 'xss_attempt').length,
        unauthorized_access: recentEvents.filter(e => e.type === 'unauthorized_access').length,
      },
      blockedIPs: Array.from(this.suspiciousIPs.entries())
        .filter(([_, record]) => record.blocked)
        .map(([ip, _]) => ip),
      suspiciousIPs: this.suspiciousIPs.size
    };

    return stats;
  }
}

// Security audit middleware
export const securityAudit = (req: Request, res: Response, next: NextFunction) => {
  const auditor = SecurityAuditor.getInstance();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Check if IP is blocked
  if (auditor.isIPBlocked(ip)) {
    auditor.logEvent({
      type: 'unauthorized_access',
      severity: 'high',
      ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      url: req.url,
      method: req.method,
      details: { reason: 'IP blocked due to suspicious activity' }
    });
    
    return res.status(403).json({ 
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }

  // Enhanced SQL injection detection - more specific patterns to reduce false positives
  const sqlInjectionPatterns = [
    /(\bUNION\s+SELECT\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(\b(DROP|CREATE|ALTER)\s+\b(TABLE|DATABASE|INDEX)\b)/i,
    /(\bEXEC\s*\()/i,
    /(\bSCRIPT\s*\()/i,
    /(\bWAITFOR\s+DELAY\b)/i,
    /(\bBENCHMARK\s*\()/i,
    /(\b(SELECT|INSERT|UPDATE|DELETE)\s+.*\bFROM\b.*\bWHERE\b.*\b(OR|AND)\b)/i
  ];

  // Check request body, query params, and headers for SQL injection
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(requestData)) {
      auditor.logEvent({
        type: 'sql_injection_attempt',
        severity: 'critical',
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        url: req.url,
        method: req.method,
        details: { 
          pattern: pattern.source,
          matchedData: requestData.match(pattern)?.[0]
        }
      });

      return res.status(400).json({
        error: 'Invalid request format',
        code: 'SECURITY_VIOLATION'
      });
    }
  }

  // XSS detection
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<link[^>]*>.*?<\/link>/gi,
    /<meta[^>]*>.*?<\/meta>/gi,
    /<style[^>]*>.*?<\/style>/gi,
    /expression\s*\(/gi
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(requestData)) {
      auditor.logEvent({
        type: 'xss_attempt',
        severity: 'critical',
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        url: req.url,
        method: req.method,
        details: { 
          pattern: pattern.source,
          matchedData: requestData.match(pattern)?.[0]
        }
      });

      return res.status(400).json({
        error: 'Invalid request format',
        code: 'SECURITY_VIOLATION'
      });
    }
  }

  // Suspicious user agent detection - only flag known attack tools
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /w3af/i,
    /acunetix/i,
    /nessus/i,
    /openvas/i
  ];

  const userAgent = req.headers['user-agent'] || '';
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      auditor.logEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        ip,
        userAgent,
        url: req.url,
        method: req.method,
        details: { 
          reason: 'Suspicious user agent',
          userAgent
        }
      });
      break;
    }
  }

  next();
};

// Rate limiting with security audit
export const rateLimitWithAudit = (windowMs: number, maxRequests: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  const auditor = SecurityAuditor.getInstance();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [key, value] of Array.from(requests.entries())) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    const userRequests = requests.get(ip);
    
    if (!userRequests || userRequests.resetTime < windowStart) {
      requests.set(ip, { count: 1, resetTime: now });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      auditor.logEvent({
        type: 'rate_limit_exceeded',
        severity: 'high',
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        url: req.url,
        method: req.method,
        details: { 
          requestCount: userRequests.count,
          limit: maxRequests,
          windowMs
        }
      });

      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    userRequests.count++;
    next();
  };
};

// Security audit endpoints
export const getSecurityAuditLog = (req: Request, res: Response) => {
  const auditor = SecurityAuditor.getInstance();
  const limit = parseInt(req.query.limit as string) || 100;
  const events = auditor.getAuditLog(limit);
  
  res.json({
    success: true,
    data: events,
    timestamp: new Date().toISOString()
  });
};

export const getSecurityStats = (req: Request, res: Response) => {
  const auditor = SecurityAuditor.getInstance();
  const stats = auditor.getSecurityStats();
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
};

export default {
  securityAudit,
  rateLimitWithAudit,
  getSecurityAuditLog,
  getSecurityStats,
  SecurityAuditor
};
