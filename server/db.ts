import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema.ts';

// Force HTTP for production - WebSocket causes issues on Render
neonConfig.fetchConnectionCache = true;

// Only use WebSocket in development
if (process.env.NODE_ENV !== 'production') {
  try {
    // Dynamic import for ESM compatibility
    import('ws').then((ws) => {
      neonConfig.webSocketConstructor = ws.default;
    }).catch(() => {
      console.warn('WebSocket support not available - using HTTP fallback');
    });
  } catch (error) {
    console.warn('WebSocket support not available:', error);
  }
}

// Check for database URL
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set - using fallback for development');
}

export const sql = neon(process.env.DATABASE_URL || 'postgresql://localhost:5432/finbot');
export const db = drizzle(sql, { schema });
