# Financial Management Dashboard

## Overview

This is a full-stack financial management application built with React and Express.js. The application allows users to manage personal and company bank accounts, track income and expense transactions, and perform transfers between accounts. It features a modern, responsive UI built with shadcn/ui components and Tailwind CSS, with data persistence using PostgreSQL and Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture

- **Runtime**: Node.js with Express.js server
- **API Design**: RESTful API with JSON responses
- **Language**: TypeScript with ES modules
- **Request Handling**: Express middleware for JSON parsing, CORS, and logging
- **Error Handling**: Centralized error handling middleware
- **Development**: Hot reload with Vite integration in development mode

### Data Storage Solutions

- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle migrations for database schema versioning
- **Connection Pooling**: Neon serverless connection pooling
- **Fallback Storage**: In-memory storage implementation for development/testing

### Database Schema

- **Accounts Table**: Stores bank account information (personal/company types, balances, currency)
- **Transactions Table**: Records all financial transactions with categories and transfer linking
- **Users Table**: User authentication and management (prepared for future use)

### API Structure

- **GET /api/accounts**: Retrieve all user accounts
- **POST /api/accounts**: Create new bank accounts
- **GET /api/transactions**: Retrieve transaction history
- **POST /api/transactions**: Create new transactions and update account balances
- **Transfer Operations**: Handled via transaction pairs with virman linking

### Authentication & Authorization

- **Current State**: Basic session handling prepared with connect-pg-simple
- **Future Ready**: User schema and authentication hooks in place
- **Session Storage**: PostgreSQL-based session storage configuration

### Development & Deployment

- **Environment**: Replit-optimized with cartographer and dev banner plugins
- **Build Process**: Vite for frontend, esbuild for backend bundling
- **Development Server**: Concurrent frontend/backend development with proxy setup
- **Production**: Static file serving with Express for SPA routing

## External Dependencies

### Core Framework Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless driver for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools
- **express**: Web application framework for the backend API
- **@tanstack/react-query**: Server state management and caching

### UI and Styling

- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx**: Conditional className utility
- **lucide-react**: Icon library for React components

### Development Tools

- **vite**: Frontend build tool and development server
- **typescript**: Type checking and enhanced developer experience
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **wouter**: Lightweight routing library for React

### Validation and Forms

- **zod**: Schema validation library
- **react-hook-form**: Performant forms with validation
- **@hookform/resolvers**: Resolvers for various validation libraries

### Database and Sessions

- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **ws**: WebSocket implementation for Neon database connections
