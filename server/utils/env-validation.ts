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

// Environment validation schema with sensible defaults for production
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  
  // Database - Use SQLite for Render if DATABASE_URL not provided
  DATABASE_URL: z.string().default('file:./dev.db'),
  
  // JWT - Generate default secret if not provided
  JWT_SECRET: z.string().default('0736cf1c727b56e277fb82a46491b0bca8d0aa6fa10f8a147170a2ab8fb4874c'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // API - Use Render's PORT or default to 10000
  API_PORT: z.union([
    z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
    z.number().min(1000).max(65535)
  ]).default(10000),
  API_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
  
  // Security - Use production-safe defaults
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(10).max(15)).default(12),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().min(1)).default(15),
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().min(1)).default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Feature flags
  ENABLE_ALERTS: coerceBoolean.default(true),
  ENABLE_NOTIFICATIONS: coerceBoolean.default(true),
  ENABLE_MONTE_CARLO: coerceBoolean.default(true),
  ENABLE_SCENARIOS: coerceBoolean.default(true),
  ENABLE_REPORTS: coerceBoolean.default(true),
  
  // Turkey specific - Use Turkish defaults
  DEFAULT_CURRENCY: z.string().default('TRY'),
  VAT_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)).default(0.20),
  SGK_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)).default(0.15),
  
  // Performance - Production-safe defaults
  MAX_CONCURRENT_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default(100),
  REQUEST_TIMEOUT: z.string().transform(Number).pipe(z.number().min(1000)).default(30000),
  CACHE_TTL: z.string().transform(Number).pipe(z.number().min(60)).default(3600),
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
