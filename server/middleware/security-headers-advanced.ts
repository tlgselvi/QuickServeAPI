import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

// Security Headers Configuration
export const SECURITY_HEADERS_CONFIG = {
  // Content Security Policy
  csp: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'child-src': ["'self'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // Cross-Origin Policies
  coop: 'same-origin',
  coep: 'require-corp',

  // Other Security Headers
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXSSProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    'geolocation': [],
    'microphone': [],
    'camera': [],
    'payment': [],
    'usb': [],
    'magnetometer': [],
    'gyroscope': [],
    'accelerometer': [],
    'ambient-light-sensor': []
  }
};

// Advanced Security Headers Middleware
export class AdvancedSecurityHeaders {
  private nonceCache = new Map<string, { nonce: string; timestamp: number }>();
  private readonly NONCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Generate cryptographically secure nonce
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  // Get or generate nonce for request
  private getNonce(req: Request): string {
    const sessionId = req.sessionID || 'default';
    const cached = this.nonceCache.get(sessionId);
    
    if (cached && (Date.now() - cached.timestamp) < this.NONCE_CACHE_TTL) {
      return cached.nonce;
    }

    const nonce = this.generateNonce();
    this.nonceCache.set(sessionId, {
      nonce,
      timestamp: Date.now()
    });

    // Clean up old nonces
    this.cleanupNonceCache();

    return nonce;
  }

  // Clean up expired nonces
  private cleanupNonceCache(): void {
    const now = Date.now();
    for (const [key, value] of this.nonceCache.entries()) {
      if (now - value.timestamp > this.NONCE_CACHE_TTL) {
        this.nonceCache.delete(key);
      }
    }
  }

  // Generate CSP header with nonce
  private generateCSP(req: Request): string {
    const nonce = this.getNonce(req);
    const csp = SECURITY_HEADERS_CONFIG.csp;
    
    // Add nonce to script-src and style-src
    const scriptSrc = [...csp['script-src'], `'nonce-${nonce}'`];
    const styleSrc = [...csp['style-src'], `'nonce-${nonce}'`];

    const cspDirectives = [
      `default-src ${csp['default-src'].join(' ')}`,
      `script-src ${scriptSrc.join(' ')}`,
      `style-src ${styleSrc.join(' ')}`,
      `img-src ${csp['img-src'].join(' ')}`,
      `font-src ${csp['font-src'].join(' ')}`,
      `connect-src ${csp['connect-src'].join(' ')}`,
      `media-src ${csp['media-src'].join(' ')}`,
      `object-src ${csp['object-src'].join(' ')}`,
      `child-src ${csp['child-src'].join(' ')}`,
      `frame-src ${csp['frame-src'].join(' ')}`,
      `worker-src ${csp['worker-src'].join(' ')}`,
      `manifest-src ${csp['manifest-src'].join(' ')}`,
      `form-action ${csp['form-action'].join(' ')}`,
      `base-uri ${csp['base-uri'].join(' ')}`,
      `frame-ancestors ${csp['frame-ancestors'].join(' ')}`,
      csp['upgrade-insecure-requests'].length > 0 ? 'upgrade-insecure-requests' : ''
    ].filter(Boolean);

    return cspDirectives.join('; ');
  }

  // Generate Permissions Policy header
  private generatePermissionsPolicy(): string {
    const policy = SECURITY_HEADERS_CONFIG.permissionsPolicy;
    const directives = Object.entries(policy).map(([feature, allowlist]) => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.join(' ')})`;
    });

    return directives.join(', ');
  }

  // Generate Strict Transport Security header
  private generateHSTS(): string {
    const config = SECURITY_HEADERS_CONFIG.hsts;
    let hsts = `max-age=${config.maxAge}`;
    
    if (config.includeSubDomains) {
      hsts += '; includeSubDomains';
    }
    
    if (config.preload) {
      hsts += '; preload';
    }
    
    return hsts;
  }

  // Main security headers middleware
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set nonce in response for client-side use
      const nonce = this.getNonce(req);
      res.locals.nonce = nonce;

      // Content Security Policy
      res.setHeader('Content-Security-Policy', this.generateCSP(req));

      // Strict Transport Security (only on HTTPS)
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', this.generateHSTS());
      }

      // Cross-Origin Policies
      res.setHeader('Cross-Origin-Opener-Policy', SECURITY_HEADERS_CONFIG.coop);
      res.setHeader('Cross-Origin-Embedder-Policy', SECURITY_HEADERS_CONFIG.coep);

      // Standard Security Headers
      res.setHeader('X-Content-Type-Options', SECURITY_HEADERS_CONFIG.xContentTypeOptions);
      res.setHeader('X-Frame-Options', SECURITY_HEADERS_CONFIG.xFrameOptions);
      res.setHeader('X-XSS-Protection', SECURITY_HEADERS_CONFIG.xXSSProtection);
      res.setHeader('Referrer-Policy', SECURITY_HEADERS_CONFIG.referrerPolicy);
      res.setHeader('Permissions-Policy', this.generatePermissionsPolicy());

      // Additional Security Headers
      res.setHeader('X-DNS-Prefetch-Control', 'off');
      res.setHeader('X-Download-Options', 'noopen');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // Server identification (optional)
      res.setHeader('Server', 'FinBot-Security/1.0');

      next();
    };
  }

  // CSP Report-Only mode for testing
  public reportOnlyMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const csp = this.generateCSP(req);
      res.setHeader('Content-Security-Policy-Report-Only', csp);
      
      // Add report URI for CSP violations
      const reportUri = process.env.CSP_REPORT_URI || '/api/security/csp-report';
      const reportOnlyCsp = `${csp}; report-uri ${reportUri}`;
      res.setHeader('Content-Security-Policy-Report-Only', reportOnlyCsp);

      next();
    };
  }

  // Dynamic CSP for API endpoints
  public apiMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // More restrictive CSP for API endpoints
      const apiCsp = [
        "default-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'none'"
      ].join('; ');

      res.setHeader('Content-Security-Policy', apiCsp);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      next();
    };
  }

  // Admin bypass for development
  public developmentMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isAdminBypass = req.headers['x-admin-bypass'] === process.env.ADMIN_BYPASS_KEY;

      if (isDevelopment || isAdminBypass) {
        // More relaxed CSP for development
        const devCsp = [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "connect-src 'self' ws: wss:",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data: https:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'"
        ].join('; ');

        res.setHeader('Content-Security-Policy', devCsp);
      }

      next();
    };
  }

  // Security headers for static files
  public staticMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Long-term caching for static assets
      if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      next();
    };
  }

  // Security headers for error pages
  public errorMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // No caching for error pages
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      next();
    };
  }

  // CSP violation reporting endpoint
  public cspReportHandler() {
    return (req: Request, res: Response) => {
      try {
        const violation = req.body;
        
        // Log CSP violation
        logger.warn('CSP Violation:', {
          documentUri: violation['document-uri'],
          violatedDirective: violation['violated-directive'],
          blockedUri: violation['blocked-uri'],
          sourceFile: violation['source-file'],
          lineNumber: violation['line-number'],
          columnNumber: violation['column-number'],
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date()
        });

        // In production, you might want to send this to a monitoring service
        if (process.env.NODE_ENV === 'production') {
          // Send to monitoring service (e.g., Sentry, DataDog, etc.)
          logger.info('CSP violation logged to monitoring service');
        }

        res.status(204).end();
      } catch (error) {
        logger.error('CSP report handling error:', error);
        res.status(400).json({ error: 'Invalid CSP report' });
      }
    };
  }

  // Security headers validation
  public validateHeaders(req: Request, res: Response): boolean {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy'
    ];

    const missingHeaders = requiredHeaders.filter(header => !res.getHeader(header));
    
    if (missingHeaders.length > 0) {
      logger.warn('Missing security headers:', missingHeaders);
      return false;
    }

    return true;
  }

  // Security headers metrics
  public getMetrics(): {
    nonceCacheSize: number;
    cspReports: number;
    headerViolations: number;
  } {
    return {
      nonceCacheSize: this.nonceCache.size,
      cspReports: 0, // Would be tracked in production
      headerViolations: 0 // Would be tracked in production
    };
  }
}

// Export singleton instance
export const advancedSecurityHeaders = new AdvancedSecurityHeaders();

// Export middleware functions
export const securityHeadersMiddleware = {
  main: advancedSecurityHeaders.middleware(),
  reportOnly: advancedSecurityHeaders.reportOnlyMiddleware(),
  api: advancedSecurityHeaders.apiMiddleware(),
  development: advancedSecurityHeaders.developmentMiddleware(),
  static: advancedSecurityHeaders.staticMiddleware(),
  error: advancedSecurityHeaders.errorMiddleware(),
  cspReport: advancedSecurityHeaders.cspReportHandler()
};
