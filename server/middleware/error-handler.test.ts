import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError,
  ConflictError,
  RateLimitError,
  asyncHandler,
  notFoundHandler,
  requestIdMiddleware
} from './error-handler';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Error Handler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': 'test-request-id'
      },
      ip: '127.0.0.1',
      body: {},
      query: {},
      params: {}
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn()
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle ValidationError', () => {
      const error = new ValidationError('Validation failed');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Not authenticated');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not authenticated',
        code: 'AUTHENTICATION_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Access denied');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        code: 'AUTHORIZATION_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle ConflictError', () => {
      const error = new ConflictError('Resource conflict');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource conflict',
        code: 'CONFLICT_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle RateLimitError', () => {
      const error = new RateLimitError('Too many requests');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });
  });

  describe('ZodError', () => {
    it('should handle ZodError correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        }
      ]);

      errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id',
        details: [
          {
            field: 'name',
            message: 'Expected string, received number',
            code: 'invalid_type'
          }
        ]
      });
    });
  });

  describe('JWT Errors', () => {
    it('should handle TokenExpiredError', () => {
      const error = new TokenExpiredError('Token expired', new Date());
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle JsonWebTokenError', () => {
      const error = new JsonWebTokenError('Invalid token');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });
  });

  describe('Generic Errors', () => {
    it('should handle generic Error', () => {
      const error = new Error('Generic error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle CastError', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid ID format',
        code: 'INVALID_ID',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });

    it('should handle SyntaxError for JSON', () => {
      const error = new SyntaxError('Unexpected token');
      (error as any).body = 'invalid json';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid JSON format',
        code: 'INVALID_JSON',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });
    });
  });

  describe('Production Environment', () => {
    it('should hide internal errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
        requestId: 'test-request-id'
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('asyncHandler', () => {
  it('should handle async function without errors', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
      res.json({ success: true });
    };

    const handler = asyncHandler(asyncFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle async function with errors', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    const asyncFn = async (req: Request, res: Response, next: NextFunction) => {
      throw new Error('Async error');
    };

    const handler = asyncHandler(asyncFn);
    await handler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('notFoundHandler', () => {
  it('should create NotFoundError for unknown routes', () => {
    const mockReq = {
      method: 'GET',
      path: '/unknown-route'
    } as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn();

    notFoundHandler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Route GET /unknown-route not found',
        statusCode: 404,
        code: 'NOT_FOUND_ERROR'
      })
    );
  });
});

describe('requestIdMiddleware', () => {
  it('should add request ID to headers', () => {
    const mockReq = {
      headers: {}
    } as Request;
    const mockRes = {
      setHeader: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn();

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.headers['x-request-id']).toBeDefined();
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', mockReq.headers['x-request-id']);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use existing request ID if provided', () => {
    const existingId = 'existing-request-id';
    const mockReq = {
      headers: {
        'x-request-id': existingId
      }
    } as Request;
    const mockRes = {
      setHeader: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn();

    requestIdMiddleware(mockReq, mockRes, mockNext);

    expect(mockReq.headers['x-request-id']).toBe(existingId);
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
    expect(mockNext).toHaveBeenCalled();
  });
});
