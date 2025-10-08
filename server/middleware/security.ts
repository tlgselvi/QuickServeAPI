import type { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

// Enhanced rate limiting implementation with IP + user + route tracking
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked: boolean }>();
const bruteForceStore = new Map<string, { attempts: number; lastAttempt: number; blocked: boolean }>();

export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Bypass rate limit for automated tests or explicit test header
    if (process.env.NODE_ENV === 'test' || req.headers['x-test-bypass'] === '1') {
      return next();
    }
    
    const now = Date.now();
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const routeKey = `${key}:${req.method}:${req.path}`;
    const userKey = req.user?.id ? `user:${req.user.id}` : null;

    // Clean up expired entries
    for (const [k, data] of Array.from(rateLimitStore.entries())) {
      if (data.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    // Check IP-based rate limit
    const ipLimit = checkRateLimit(key, windowMs, max, now);
    if (ipLimit.blocked) {
      return res.status(429).json({
        success: false,
        error: message || 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round((ipLimit.resetTime - now) / 1000),
        type: 'IP_LIMIT'
      });
    }

    // Check route-based rate limit
    const routeLimit = checkRateLimit(routeKey, windowMs, Math.floor(max * 0.5), now);
    if (routeLimit.blocked) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests to this endpoint, please try again later.',
        code: 'ROUTE_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round((routeLimit.resetTime - now) / 1000),
        type: 'ROUTE_LIMIT'
      });
    }

    // Check user-based rate limit (if authenticated)
    if (userKey) {
      const userLimit = checkRateLimit(userKey, windowMs, max * 2, now);
      if (userLimit.blocked) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests from this user, please try again later.',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round((userLimit.resetTime - now) / 1000),
          type: 'USER_LIMIT'
        });
      }
    }

    // Set rate limit headers
    res.setHeader('X-Rate-Limit-Remaining', Math.max(0, max - ipLimit.count));
    res.setHeader('X-Rate-Limit-Reset', new Date(ipLimit.resetTime).toISOString());

    next();
  };
};

// Helper function to check rate limit
function checkRateLimit(key: string, windowMs: number, max: number, now: number) {
  const current = rateLimitStore.get(key);

  if (!current) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs, blocked: false });
    return { count: 1, resetTime: now + windowMs, blocked: false };
  }

  if (current.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs, blocked: false });
    return { count: 1, resetTime: now + windowMs, blocked: false };
  }

  if (current.count >= max) {
    current.blocked = true;
    return { count: current.count, resetTime: current.resetTime, blocked: true };
  }

  current.count++;
  return { count: current.count, resetTime: current.resetTime, blocked: false };
}

// Brute force protection middleware
export const bruteForceGuard = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const userKey = req.user?.id ? `user:${req.user.id}` : null;

    // Clean up expired entries
    for (const [k, data] of Array.from(bruteForceStore.entries())) {
      if (now - data.lastAttempt > windowMs) {
        bruteForceStore.delete(k);
      }
    }

    // Check IP-based brute force
    const ipBruteForce = checkBruteForce(key, maxAttempts, windowMs, now);
    if (ipBruteForce.blocked) {
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts from this IP. Please try again later.',
        code: 'BRUTE_FORCE_BLOCKED',
        retryAfter: Math.round((ipBruteForce.resetTime - now) / 1000),
        type: 'IP_BRUTE_FORCE'
      });
    }

    // Check user-based brute force (if authenticated)
    if (userKey) {
      const userBruteForce = checkBruteForce(userKey, maxAttempts, windowMs, now);
      if (userBruteForce.blocked) {
        return res.status(429).json({
          success: false,
          error: 'Too many failed attempts from this user. Please try again later.',
          code: 'USER_BRUTE_FORCE_BLOCKED',
          retryAfter: Math.round((userBruteForce.resetTime - now) / 1000),
          type: 'USER_BRUTE_FORCE'
        });
      }
    }

    next();
  };
};

// Helper function to check brute force
function checkBruteForce(key: string, maxAttempts: number, windowMs: number, now: number) {
  const current = bruteForceStore.get(key);

  if (!current) {
    bruteForceStore.set(key, { attempts: 1, lastAttempt: now, blocked: false });
    return { attempts: 1, resetTime: now + windowMs, blocked: false };
  }

  if (now - current.lastAttempt > windowMs) {
    bruteForceStore.set(key, { attempts: 1, lastAttempt: now, blocked: false });
    return { attempts: 1, resetTime: now + windowMs, blocked: false };
  }

  if (current.attempts >= maxAttempts) {
    current.blocked = true;
    return { attempts: current.attempts, resetTime: current.lastAttempt + windowMs, blocked: true };
  }

  current.attempts++;
  current.lastAttempt = now;
  return { attempts: current.attempts, resetTime: current.lastAttempt + windowMs, blocked: false };
}

// Record failed attempt for brute force tracking
export const recordFailedAttempt = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip || req.connection.remoteAddress || 'unknown';
  const userKey = req.user?.id ? `user:${req.user.id}` : null;
  const now = Date.now();

  // Record IP attempt
  const ipData = bruteForceStore.get(key);
  if (ipData) {
    ipData.attempts++;
    ipData.lastAttempt = now;
  } else {
    bruteForceStore.set(key, { attempts: 1, lastAttempt: now, blocked: false });
  }

  // Record user attempt (if authenticated)
  if (userKey) {
    const userData = bruteForceStore.get(userKey);
    if (userData) {
      userData.attempts++;
      userData.lastAttempt = now;
    } else {
      bruteForceStore.set(userKey, { attempts: 1, lastAttempt: now, blocked: false });
    }
  }

  next();
};

// Enhanced Security headers middleware with strict CSP
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // Strict Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" + generateNonce() + "'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "child-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  res.setHeader('Content-Security-Policy-Report-Only', cspDirectives);

  next();
};

// Generate nonce for CSP
function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Security middleware
export const securityMiddleware = [
  securityHeaders,
  createRateLimit(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  createRateLimit(60 * 1000, 20, 'Too many requests per minute'), // 20 requests per minute
];

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }
  next();
};

// Common validation rules
export const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  amount: body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0) {
        throw new Error('Amount cannot be negative');
      }
      if (num > 1000000) {
        throw new Error('Amount cannot exceed 1,000,000');
      }
      return true;
    }),

  description: body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
    .trim(),

  accountId: body('accountId')
    .isUUID()
    .withMessage('Valid account ID is required'),

  category: body('category')
    .isIn(['income', 'expense', 'transfer'])
    .withMessage('Valid category is required'),
};

// SQL injection protection
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/gi,
    /(UNION\s+SELECT)/gi,
    /(DROP\s+TABLE)/gi,
    /(DELETE\s+FROM)/gi,
    /(INSERT\s+INTO)/gi,
    /(UPDATE\s+SET)/gi,
    /(ALTER\s+TABLE)/gi,
    /(CREATE\s+TABLE)/gi,
    /(EXEC\s*\()/gi,
    /(SCRIPT\s*\()/gi,
    /(<\s*script)/gi,
    /(javascript\s*:)/gi,
    /(vbscript\s*:)/gi,
    /(onload\s*=)/gi,
    /(onerror\s*=)/gi,
    /(onclick\s*=)/gi,
  ];

  const checkForInjection = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(obj)) {
          logger.warn(`Potential SQL injection detected in ${path}:`, obj);
          return true;
        }
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => checkForInjection(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      return Object.entries(obj).some(([key, value]) =>
        checkForInjection(value, path ? `${path}.${key}` : key),
      );
    }
    return false;
  };

  if (checkForInjection(req.body, 'body') ||
      checkForInjection(req.query, 'query') ||
      checkForInjection(req.params, 'params')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'INVALID_INPUT',
    });
  }

  next();
};

// XSS protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi,
    /onchange\s*=/gi,
    /onsubmit\s*=/gi,
    /onreset\s*=/gi,
    /onselect\s*=/gi,
    /onkeydown\s*=/gi,
    /onkeyup\s*=/gi,
    /onkeypress\s*=/gi,
  ];

  const checkForXSS = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          logger.warn(`Potential XSS detected in ${path}:`, obj);
          return true;
        }
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, index) => checkForXSS(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      return Object.entries(obj).some(([key, value]) =>
        checkForXSS(value, path ? `${path}.${key}` : key),
      );
    }
    return false;
  };

  if (checkForXSS(req.body, 'body') ||
      checkForXSS(req.query, 'query') ||
      checkForXSS(req.params, 'params')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'XSS_DETECTED',
    });
  }

  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
      });
    }

    next();
  };
};

// Helper function to parse size strings like "10mb"
function parseSize (size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    return 1024 * 1024;
  } // Default 1MB

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return value * (units[unit] || 1);
}

// IP whitelist middleware (for admin endpoints)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';

    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP',
        code: 'IP_NOT_ALLOWED',
      });
    }

    next();
  };
};

// Enhanced CORS configuration with whitelist and preflight cache
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const envOrigin = process.env.CORS_ORIGIN;
    const allowedOrigins = [
      'http://localhost:5000',
      'https://localhost:5000',
      ...(envOrigin ? [envOrigin] : []),
    ];

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Requested-With',
    'Idempotency-Key',
    'X-API-Key',
    'X-Client-Version',
    'X-Client-Platform'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Total-Pages',
    'X-Current-Page',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Request-ID'
  ],
  maxAge: 86400, // 24 hours preflight cache
  preflightContinue: false,
  preflightContinue: false
};

// CORS preflight cache middleware
export const corsPreflightCache = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    // Set preflight cache headers
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders?.join(', ') || '');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', corsOptions.exposedHeaders?.join(', ') || '');
    
    // Cache preflight response
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
    
    return res.status(200).end();
  }
  next();
};

// Idempotency-Key support for write operations
const idempotencyStore = new Map<string, { response: any; timestamp: number }>();

export const idempotencyKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only apply to write operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'Idempotency-Key header is required for write operations',
      code: 'IDEMPOTENCY_KEY_REQUIRED'
    });
  }

  // Validate idempotency key format
  if (!/^[a-zA-Z0-9_-]{1,255}$/.test(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Idempotency-Key format',
      code: 'INVALID_IDEMPOTENCY_KEY'
    });
  }

  // Check if we've seen this key before
  const existingResponse = idempotencyStore.get(idempotencyKey);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (existingResponse && (now - existingResponse.timestamp) < maxAge) {
    // Return cached response
    res.setHeader('Idempotency-Key', idempotencyKey);
    res.setHeader('Idempotency-Status', 'duplicate');
    return res.status(existingResponse.response.status || 200).json(existingResponse.response);
  }

  // Store the original response methods
  const originalJson = res.json;
  const originalStatus = res.status;

  // Override response methods to capture the response
  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(body: any) {
    // Store the response for idempotency
    idempotencyStore.set(idempotencyKey, {
      response: { status: this.statusCode, body },
      timestamp: now
    });

    // Set idempotency headers
    this.setHeader('Idempotency-Key', idempotencyKey);
    this.setHeader('Idempotency-Status', 'new');

    // Clean up old entries
    for (const [key, data] of Array.from(idempotencyStore.entries())) {
      if (now - data.timestamp > maxAge) {
        idempotencyStore.delete(key);
      }
    }

    return originalJson.call(this, body);
  };

  next();
};

// Endpoint-specific rate limiting
export const endpointRateLimits = {
  auth: createRateLimit(15 * 60 * 1000, 20), // 20 auth requests per 15 minutes
  ai: createRateLimit(60 * 1000, 10), // 10 AI requests per minute
  api: createRateLimit(60 * 1000, 50), // 50 API requests per minute
  upload: createRateLimit(60 * 1000, 5), // 5 upload requests per minute
  admin: createRateLimit(60 * 1000, 100), // 100 admin requests per minute
  default: createRateLimit(60 * 1000, 30) // 30 requests per minute default
};

// Enhanced security middleware with all protections
export const enhancedSecurityMiddleware = [
  securityHeaders,
  corsPreflightCache,
  createRateLimit(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  createRateLimit(60 * 1000, 20, 'Too many requests per minute'), // 20 requests per minute
  bruteForceGuard(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  requestSizeLimit('10mb'),
  idempotencyKeyMiddleware
];

export default {
  securityMiddleware,
  enhancedSecurityMiddleware,
  sanitizeInput,
  validateRequest,
  commonValidations,
  sqlInjectionProtection,
  xssProtection,
  requestSizeLimit,
  ipWhitelist,
  corsOptions,
  corsPreflightCache,
  createRateLimit,
  bruteForceGuard,
  recordFailedAttempt,
  idempotencyKeyMiddleware,
};
