import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';

// Only use WebSocket in development - production uses HTTP
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

// Temporarily disable database requirement for local setup
// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
