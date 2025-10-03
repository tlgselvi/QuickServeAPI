/**
 * Test Setup Configuration
 * Global test configuration and mock setup
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MockFactory } from '../utils/mock-factory.js';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/finbot_test';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.PORT = '3001';
});

afterAll(() => {
  // Cleanup after all tests
  MockFactory.resetAllMocks();
  MockFactory.restoreRealDate();
});

beforeEach(() => {
  // Reset mocks before each test
  MockFactory.resetAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
});

// Global mocks for common dependencies
vi.mock('../../server/db.js', () => ({
  db: MockFactory.createMockDatabase()
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  compare: vi.fn((password: string, hash: string) => Promise.resolve(hash === `hashed_${password}`))
}));

vi.mock('argon2', () => ({
  hash: vi.fn((password: string) => Promise.resolve(`argon2_${password}`)),
  verify: vi.fn((hash: string, password: string) => Promise.resolve(hash === `argon2_${password}`))
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn((payload: any) => `mock.jwt.token.${JSON.stringify(payload)}`),
  verify: vi.fn((token: string) => {
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        return JSON.parse(parts[2]);
      } catch {
        return null;
      }
    }
    return null;
  })
}));

vi.mock('nodemailer', () => ({
  createTransporter: vi.fn(() => ({
    sendMail: vi.fn(() => Promise.resolve({ messageId: 'test-message-id' }))
  }))
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid'),
  randomBytes: vi.fn((size: number) => Buffer.alloc(size, 'test')),
  createHmac: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'test-hash')
  })),
  timingSafeEqual: vi.fn(() => true)
}));

// Mock external APIs
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve('mock response'),
    headers: new Headers({
      'content-type': 'application/json',
      'x-request-id': 'test-request-id'
    })
  })
) as any;

// Mock file system operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(() => Promise.resolve('mock file content')),
  writeFile: vi.fn(() => Promise.resolve()),
  unlink: vi.fn(() => Promise.resolve()),
  mkdir: vi.fn(() => Promise.resolve()),
  access: vi.fn(() => Promise.resolve())
}));

// Mock path operations
vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  resolve: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: vi.fn((path: string) => path.split('/').pop() || ''),
  extname: vi.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  })
}));

// Mock Express
vi.mock('express', () => ({
  default: vi.fn(() => ({
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    listen: vi.fn(),
    set: vi.fn()
  }))
}));

// Mock Multer
vi.mock('multer', () => ({
  default: vi.fn(() => ({
    single: vi.fn(() => (req: any, res: any, next: any) => next()),
    array: vi.fn(() => (req: any, res: any, next: any) => next()),
    fields: vi.fn(() => (req: any, res: any, next: any) => next())
  }))
}));

// Mock rate limiting
vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

vi.mock('express-slow-down', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock session
vi.mock('express-session', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock CORS
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock Helmet
vi.mock('helmet', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock compression
vi.mock('compression', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock morgan
vi.mock('morgan', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

// Mock winston logger
vi.mock('winston', () => ({
  createLogger: vi.fn(() => MockFactory.createMockLogger()),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    printf: vi.fn(),
    colorize: vi.fn(),
    json: vi.fn()
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn()
  }
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: vi.fn(() => Promise.resolve({ data: { success: true } })),
      get: vi.fn(() => Promise.resolve({ data: { success: true } })),
      post: vi.fn(() => Promise.resolve({ data: { success: true } })),
      put: vi.fn(() => Promise.resolve({ data: { success: true } })),
      delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    })),
    request: vi.fn(() => Promise.resolve({ data: { success: true } })),
    get: vi.fn(() => Promise.resolve({ data: { success: true } })),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
    put: vi.fn(() => Promise.resolve({ data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { success: true } }))
  }
}));

// Mock OpenAI
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }]
        }))
      }
    },
    embeddings: {
      create: vi.fn(() => Promise.resolve({
        data: [{
          embedding: new Array(1536).fill(0.1)
        }]
      }))
    }
  }))
}));

// Mock PDF generation
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve({
      newPage: vi.fn(() => Promise.resolve({
        setContent: vi.fn(),
        pdf: vi.fn(() => Promise.resolve(Buffer.from('mock pdf'))),
        close: vi.fn()
      })),
      close: vi.fn()
    }))
  }
}));

// Mock QR code generation
vi.mock('qrcode', () => ({
  toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
  toString: vi.fn(() => Promise.resolve('mock-qr-string'))
}));

// Mock 2FA
vi.mock('speakeasy', () => ({
  generateSecret: vi.fn(() => ({
    ascii: 'mock-secret',
    hex: 'mock-hex-secret',
    base32: 'mock-base32-secret',
    otpauth_url: 'mock-otpauth-url'
  })),
  generateToken: vi.fn(() => '123456'),
  verifyToken: vi.fn(() => true),
  totp: {
    verify: vi.fn(() => true)
  }
}));

// Mock CSV parsing
vi.mock('csv-parser', () => ({
  default: vi.fn(() => ({
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'data') {
        callback({ column1: 'value1', column2: 'value2' });
      } else if (event === 'end') {
        callback();
      }
    }),
    write: vi.fn(),
    end: vi.fn()
  }))
}));

// Mock Excel parsing
vi.mock('xlsx', () => ({
  readFile: vi.fn(() => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:B2',
        A1: { v: 'Header1' },
        B1: { v: 'Header2' },
        A2: { v: 'Value1' },
        B2: { v: 'Value2' }
      }
    }
  })),
  utils: {
    sheet_to_json: vi.fn(() => [
      { Header1: 'Value1', Header2: 'Value2' }
    ])
  }
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, format: string) => date.toISOString()),
  parse: vi.fn((dateString: string, format: string) => new Date(dateString)),
  addDays: vi.fn((date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  subDays: vi.fn((date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  isAfter: vi.fn((date1: Date, date2: Date) => date1 > date2),
  isBefore: vi.fn((date1: Date, date2: Date) => date1 < date2),
  differenceInDays: vi.fn((date1: Date, date2: Date) => Math.floor((date1.getTime() - date2.getTime()) / (24 * 60 * 60 * 1000)))
}));

// Mock simple-statistics
vi.mock('simple-statistics', () => ({
  mean: vi.fn((arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length),
  median: vi.fn((arr: number[]) => arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)]),
  standardDeviation: vi.fn((arr: number[]) => Math.sqrt(arr.reduce((a, b) => a + b * b, 0) / arr.length)),
  variance: vi.fn((arr: number[]) => arr.reduce((a, b) => a + b * b, 0) / arr.length),
  linearRegression: vi.fn(() => ({ m: 1, b: 0, r2: 0.95 }))
}));

export { MockFactory };
