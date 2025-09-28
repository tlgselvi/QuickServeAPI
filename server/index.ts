import express, { type Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { pool } from './db';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { requireAuth, requirePermission } from './middleware/auth';
import { Permission } from '@shared/schema';
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
  setupGlobalErrorHandlers,
} from './middleware/error-handler';
import {
  securityMiddleware,
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  requestSizeLimit,
} from './middleware/security';
import {
  performanceMonitor,
  queryOptimizer,
  memoryMonitor,
  cacheControl,
  getPerformanceMetrics,
} from './middleware/performance';

const app = express();

// Setup global error handlers
setupGlobalErrorHandlers();

// Request ID middleware
app.use(requestIdMiddleware);

// Security middleware
app.use(securityMiddleware);

// Input sanitization and protection
app.use(sanitizeInput);
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(requestSizeLimit('10mb'));

// Performance monitoring
app.use(performanceMonitor);
app.use(queryOptimizer);
app.use(memoryMonitor);
app.use(cacheControl(300)); // 5 minutes cache

// Session configuration - use default MemoryStore (ok for prototype on free tier)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const { path } = req;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)  }…`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Performance metrics endpoint (admin only)
  app.get('/api/admin/performance',
    requireAuth,
    requirePermission(Permission.MANAGE_SETTINGS),
    getPerformanceMetrics,
  );

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log('Environment:', app.get('env'));
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  if (app.get('env') === 'development') {
    console.log('Setting up Vite for development');
    await setupVite(app, server);
  } else {
    console.log('Setting up static serving for production');
    serveStatic(app);
  }

  // Error handling middleware (must be after static serving)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
