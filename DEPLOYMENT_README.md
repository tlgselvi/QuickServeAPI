# FinBot V3 – Deployment (Render + Neon)

- Create Neon Postgres → copy DATABASE_URL
- Push repo to GitHub (main branch)
- On Render → New Web Service → connect repo (root: QuickServeAPI)
- Set env vars:
  - NODE_VERSION=18
  - NODE_ENV=production
  - JWT_SECRET=your-strong-secret
  - DATABASE_URL=from Neon
  - CORS_ORIGIN=https://<your-render-app>.onrender.com (after first deploy)
- Build: `npm ci && npm run build && npx drizzle-kit push`
- Start: `node dist/index.js`
- Auto Deploy: push to main triggers build/migration
- Backups: `.github/workflows/db-backup.yml` (requires `DATABASE_URL` secret)
- Versioning: `npm version patch|minor|major` + Git tags/releases
