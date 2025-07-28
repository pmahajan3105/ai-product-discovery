/**
 * Logging Middleware
 * Automatically tracks requests, sets context, and logs request/response cycles
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger, Logger, requestNamespace } from '../utils/logger';
import { SessionRequest } from 'supertokens-node/framework/express';

// Interface for enhanced request with logging context
export interface LoggingRequest extends Request {
  requestId?: string;
  startTime?: number;
  logger?: typeof logger;
}

/**
 * Request context middleware - sets up request tracking and context
 */
export const requestContextMiddleware = (req: LoggingRequest, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  const requestId = uuidv4().substring(0, 8);
  const startTime = Date.now();

  // Set request properties
  req.requestId = requestId;
  req.startTime = startTime;
  req.logger = logger;

  // Run within request namespace context
  requestNamespace.run(() => {
    // Set initial context
    requestNamespace.set('requestId', requestId);
    requestNamespace.set('startTime', startTime);
    requestNamespace.set('method', req.method);
    requestNamespace.set('path', req.originalUrl);
    requestNamespace.set('clientIP', getClientIP(req));
    requestNamespace.set('userAgent', req.get('User-Agent'));

    // Set request ID header for client reference
    res.setHeader('X-Request-ID', requestId);

    next();
  });
};

/**
 * User context middleware - enriches logging context with user information
 * Should be used after authentication middleware
 */
export const userContextMiddleware = (req: SessionRequest & LoggingRequest, res: Response, next: NextFunction): void => {
  try {
    // Extract user information if session exists
    if (req.session) {
      const userId = req.session.getUserId();
      const payload = req.session.getAccessTokenPayload();

      // Set user context in namespace
      Logger.setContext({
        userId: userId.substring(0, 8), // Truncate for privacy
        organizationId: payload.organizationId?.substring(0, 8) // Truncate for privacy
      });
    }

    // Extract user from custom properties if available
    if ((req as any).userId) {
      Logger.setContext({
        userId: (req as any).userId.substring(0, 8)
      });
    }

    if ((req as any).organizationId) {
      Logger.setContext({
        organizationId: (req as any).organizationId.substring(0, 8)
      });
    }

    next();
  } catch (error) {
    // Don't fail the request if context setup fails
    logger.warn('Failed to set user context', { error: error.message });
    next();
  }
};

/**
 * Request logging middleware - logs incoming requests
 */
export const requestLoggingMiddleware = (req: LoggingRequest, res: Response, next: NextFunction): void => {
  // Skip logging for health checks and static assets
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  // Log the incoming request
  logger.http('Incoming Request', {
    method: req.method,
    path: req.originalUrl,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: shouldLogBody(req) ? sanitizeRequestBody(req.body) : undefined,
    headers: sanitizeHeaders(req.headers),
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type')
  });

  next();
};

/**
 * Response logging middleware - logs outgoing responses
 */
export const responseLoggingMiddleware = (req: LoggingRequest, res: Response, next: NextFunction): void => {
  // Skip logging for health checks and static assets
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;

  // Intercept res.send()
  res.send = function(body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Intercept res.json()
  res.json = function(body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Log response when request finishes
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    logger.http('Outgoing Response', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: duration,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type'),
      ...(shouldLogResponseBody(req, res) && responseBody && {
        responseBody: sanitizeResponseBody(responseBody)
      })
    });

    // Log slow requests as warnings
    if (duration > 5000) {
      logger.warn('Slow Request Detected', {
        method: req.method,
        path: req.originalUrl,
        responseTime: duration,
        statusCode: res.statusCode
      });
    }
  });

  next();
};

/**
 * Error logging middleware - logs unhandled errors
 */
export const errorLoggingMiddleware = (error: Error, req: LoggingRequest, res: Response, next: NextFunction): void => {
  // Log the error with full context
  logger.error('Unhandled Request Error', error, {
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    body: sanitizeRequestBody(req.body),
    headers: sanitizeHeaders(req.headers),
    stack: error.stack
  });

  next(error);
};

/**
 * Performance monitoring middleware - tracks and logs performance metrics
 */
export const performanceMiddleware = (req: LoggingRequest, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log performance metrics for analysis
    logger.debug('Performance Metrics', {
      method: req.method,
      path: req.originalUrl,
      duration,
      memoryDelta,
      statusCode: res.statusCode,
      startMemory: startMemory.heapUsed,
      endMemory: endMemory.heapUsed
    });

    // Log memory warnings for high usage
    if (memoryDelta > 50 * 1024 * 1024) { // 50MB
      logger.warn('High Memory Usage Detected', {
        method: req.method,
        path: req.originalUrl,
        memoryDelta,
        duration
      });
    }
  });

  next();
};

// Utility functions
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    'unknown'
  );
}

function shouldSkipLogging(path: string): boolean {
  const skipPaths = [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt'
  ];

  return skipPaths.some(skipPath => path.startsWith(skipPath));
}

function shouldLogBody(req: Request): boolean {
  // Don't log body for GET requests or file uploads
  if (req.method === 'GET' || req.method === 'DELETE') {
    return false;
  }

  const contentType = req.get('Content-Type') || '';
  
  // Skip file uploads and other binary content
  if (contentType.includes('multipart/form-data') || 
      contentType.includes('application/octet-stream')) {
    return false;
  }

  return true;
}

function shouldLogResponseBody(req: Request, res: Response): boolean {
  // Only log response body for errors or in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isError = res.statusCode >= 400;
  
  return isDevelopment || isError;
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sensitive = ['password', 'token', 'secret', 'key', 'authorization', 'credentials'];
  const sanitized = { ...body };

  sensitive.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Limit size
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > 2000) {
    return { 
      _truncated: true, 
      _originalSize: stringified.length,
      _preview: stringified.substring(0, 200) + '...'
    };
  }

  return sanitized;
}

function sanitizeResponseBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  // Limit response body logging size
  const stringified = JSON.stringify(body);
  if (stringified.length > 1000) {
    return { 
      _truncated: true, 
      _size: stringified.length,
      success: body.success,
      error: body.error,
      message: body.message
    };
  }

  return body;
}

function sanitizeHeaders(headers: any): any {
  const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-session-token'];
  const sanitized = { ...headers };

  sensitive.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

// Combined middleware for easy setup
export const setupLogging = () => [
  requestContextMiddleware,
  userContextMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
  performanceMiddleware
];

export default {
  requestContextMiddleware,
  userContextMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
  errorLoggingMiddleware,
  performanceMiddleware,
  setupLogging
};