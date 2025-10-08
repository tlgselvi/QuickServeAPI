import { z } from 'zod';
import { logger } from './logger.js';

// Coercion helpers
const coerceBoolean = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  return val;
}, z.boolean());

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // API
  API_PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  API_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().min(1)),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().min(1)),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Feature flags
  ENABLE_ALERTS: coerceBoolean.default(true),
  ENABLE_NOTIFICATIONS: coerceBoolean.default(true),
  ENABLE_MONTE_CARLO: coerceBoolean.default(true),
  ENABLE_SCENARIOS: coerceBoolean.default(true),
  ENABLE_REPORTS: coerceBoolean.default(true),
  
  // Turkey specific
  DEFAULT_CURRENCY: z.string().default('TRY'),
  VAT_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)),
  SGK_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)),
  
  // Performance
  MAX_CONCURRENT_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)),
  REQUEST_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)),
  CACHE_TTL: z.string().transform(Number).pipe(z.number().min(60)),
});

// Validate environment variables
export function validateEnvironment() {
  try {
    const env = envSchema.parse(process.env);
    logger.info('✅ Environment validation successful');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Mask sensitive values for logging
export function maskSensitiveValue(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, visibleChars) + '*'.repeat(value.length - visibleChars);
}

// Log environment configuration (with masked secrets)
export function logEnvironmentConfig(env: z.infer<typeof envSchema>) {
  logger.info('Environment Configuration:');
  logger.info(`  NODE_ENV: ${env.NODE_ENV}`);
  logger.info(`  API_PORT: ${env.API_PORT}`);
  logger.info(`  API_HOST: ${env.API_HOST}`);
  logger.info(`  CORS_ORIGIN: ${env.CORS_ORIGIN}`);
  logger.info(`  DATABASE_URL: ${env.DATABASE_URL.includes('file:') ? env.DATABASE_URL : '***masked***'}`);
  logger.info(`  JWT_SECRET: ${maskSensitiveValue(env.JWT_SECRET)}`);
  logger.info(`  BCRYPT_ROUNDS: ${env.BCRYPT_ROUNDS}`);
  logger.info(`  RATE_LIMIT: ${env.RATE_LIMIT_MAX}/${env.RATE_LIMIT_WINDOW}min`);
  logger.info(`  LOG_LEVEL: ${env.LOG_LEVEL}`);
  logger.info(`  Features: Alerts=${env.ENABLE_ALERTS}, Notifications=${env.ENABLE_NOTIFICATIONS}, MonteCarlo=${env.ENABLE_MONTE_CARLO}`);
  logger.info(`  Performance: MaxConcurrent=${env.MAX_CONCURRENT_REQUESTS}, Timeout=${env.REQUEST_TIMEOUT}ms, CacheTTL=${env.CACHE_TTL}s`);
}

export type ValidatedEnv = z.infer<typeof envSchema>;
