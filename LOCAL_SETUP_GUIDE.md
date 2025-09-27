# FinBot Local Setup Guide

## Prerequisites

1. **Node.js** (version 18 or higher)
2. **PostgreSQL** database (local or cloud)

## Setup Steps

### 1. Environment Configuration

Create a `.env` file in the root directory with the following content:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/finbot_db"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-in-production"

# Environment
NODE_ENV="development"

# Optional: Port configuration (defaults to 5000 if not set)
PORT=5000
```

**Important:** Replace the DATABASE_URL with your actual PostgreSQL connection string.

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

The application uses PostgreSQL with Drizzle ORM. Make sure you have a PostgreSQL database running and accessible.

### 4. Run Database Migrations

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Database Options

### Option 1: Local PostgreSQL

- Install PostgreSQL locally
- Create a database named `finbot_db`
- Update the DATABASE_URL in your .env file

### Option 2: Cloud Database (Recommended)

- Use Neon, Supabase, or similar PostgreSQL cloud service
- Get the connection string from your cloud provider
- Update the DATABASE_URL in your .env file

## Troubleshooting

- Make sure PostgreSQL is running and accessible
- Verify the DATABASE_URL is correct
- Check that all dependencies are installed
- Ensure the port 5000 is not in use by another application

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check
- `npm run db:push` - Push database schema changes
