import pino from 'pino';

// PII redaction patterns
const piiPatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /credit/i,
  /card/i,
  /bank/i,
  /account/i,
];

// PII redaction function
function redactPII(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }

  const redacted = { ...obj };
  
  for (const key in redacted) {
    if (typeof redacted[key] === 'string') {
      // Check if key contains PII patterns
      const isPII = piiPatterns.some(pattern => pattern.test(key));
      if (isPII) {
        redacted[key] = '[REDACTED]';
      }
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactPII(redacted[key]);
    }
  }

  return redacted;
}

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  serializers: {
    req: (req) => {
      return {
        method: req.method,
        url: req.url,
        headers: redactPII(req.headers),
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort
      };
    },
    res: (res) => {
      return {
        statusCode: res.statusCode,
        headers: redactPII(res.headers)
      };
    },
    err: (err) => {
      return {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
        ...redactPII(err)
      };
    }
  }
});

// Custom log methods with PII redaction
export const log = {
  debug: (obj: any, msg?: string) => logger.debug(redactPII(obj), msg),
  info: (obj: any, msg?: string) => logger.info(redactPII(obj), msg),
  warn: (obj: any, msg?: string) => logger.warn(redactPII(obj), msg),
  error: (obj: any, msg?: string) => logger.error(redactPII(obj), msg),
  fatal: (obj: any, msg?: string) => logger.fatal(redactPII(obj), msg),
  
  // HTTP request logging
  request: (req: any, res: any, responseTime?: number) => {
    logger.info({
      req,
      res,
      responseTime: responseTime ? `${responseTime}ms` : undefined
    }, 'HTTP request');
  },
  
  // Authentication logging
  auth: (action: string, user: any, ip?: string) => {
    logger.info({
      action,
      userId: user?.id,
      username: user?.username,
      role: user?.role,
      ip
    }, `Auth: ${action}`);
  },
  
  // Business logic logging
  business: (module: string, action: string, data: any) => {
    logger.info({
      module,
      action,
      data: redactPII(data)
    }, `Business: ${module}.${action}`);
  },
  
  // Security logging
  security: (event: string, details: any) => {
    logger.warn({
      event,
      details: redactPII(details),
      timestamp: new Date().toISOString()
    }, `Security: ${event}`);
  },
  
  // Performance logging
  performance: (operation: string, duration: number, details?: any) => {
    logger.info({
      operation,
      duration: `${duration}ms`,
      details: redactPII(details || {})
    }, `Performance: ${operation}`);
  }
};

export default logger;
