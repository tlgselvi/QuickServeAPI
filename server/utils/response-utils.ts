import type { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Success response helper
export function sendSuccess<T> (
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(statusCode).json(response);
}

// Error response helper
export function sendError (
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string,
): void {
  const response: ApiResponse = {
    success: false,
    error,
    code,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(statusCode).json(response);
}

// Validation error response helper
export function sendValidationError (
  res: Response,
  errors: any[],
  message: string = 'Validation failed',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'VALIDATION_ERROR',
    data: { errors },
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(400).json(response);
}

// Not found response helper
export function sendNotFound (
  res: Response,
  resource: string = 'Resource',
): void {
  const response: ApiResponse = {
    success: false,
    error: `${resource} not found`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(404).json(response);
}

// Unauthorized response helper
export function sendUnauthorized (
  res: Response,
  message: string = 'Unauthorized access',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'UNAUTHORIZED',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(401).json(response);
}

// Forbidden response helper
export function sendForbidden (
  res: Response,
  message: string = 'Access forbidden',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'FORBIDDEN',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(403).json(response);
}

// Paginated response helper
export function sendPaginated<T> (
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  },
  message?: string,
): void {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    pagination,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(200).json(response);
}

// Created response helper
export function sendCreated<T> (
  res: Response,
  data: T,
  message: string = 'Resource created successfully',
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(201).json(response);
}

// No content response helper
export function sendNoContent (
  res: Response,
  message: string = 'Operation completed successfully',
): void {
  const response: ApiResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(204).json(response);
}

// Rate limit response helper
export function sendRateLimit (
  res: Response,
  retryAfter: number,
  message: string = 'Too many requests',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.setHeader('Retry-After', retryAfter.toString());
  res.status(429).json(response);
}

// Service unavailable response helper
export function sendServiceUnavailable (
  res: Response,
  message: string = 'Service temporarily unavailable',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'SERVICE_UNAVAILABLE',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(503).json(response);
}

// Conflict response helper
export function sendConflict (
  res: Response,
  message: string = 'Resource conflict',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'CONFLICT',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(409).json(response);
}

// Bad request response helper
export function sendBadRequest (
  res: Response,
  message: string = 'Bad request',
  code?: string,
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: code || 'BAD_REQUEST',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(400).json(response);
}

// Internal server error response helper
export function sendInternalError (
  res: Response,
  message: string = 'Internal server error',
): void {
  const response: ApiResponse = {
    success: false,
    error: message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID') as string,
  };

  res.status(500).json(response);
}

// Response middleware to standardize all responses
export function responseMiddleware (req: any, res: Response, next: any) {
  // Store original json method
  const originalJson = res.json;

  // Override json method to add standard fields
  res.json = function (obj: any) {
    // If response already has success field, don't modify
    if (obj && typeof obj === 'object' && 'success' in obj) {
      return originalJson.call(this, obj);
    }

    // Add standard fields to response
    const standardizedResponse: ApiResponse = {
      success: true,
      data: obj,
      timestamp: new Date().toISOString(),
      requestId: res.getHeader('X-Request-ID') as string,
    };

    return originalJson.call(this, standardizedResponse);
  };

  next();
}

export default {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendRateLimit,
  sendServiceUnavailable,
  sendConflict,
  sendBadRequest,
  sendInternalError,
  responseMiddleware,
};
