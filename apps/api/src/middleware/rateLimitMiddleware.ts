/**
 * Rate Limiting Middleware - Enhanced version of Zeda's rate limiting patterns
 * Provides Redis-based rate limiting with multiple strategies and configurable limits
 */

import { Request, Response, NextFunction } from 'express';
import { SessionRequest } from 'supertokens-node/framework/express';
import { RateLimiterFactory, RateLimiterConfig } from '../utils/redis';
import ResponseBuilder from '../utils/ResponseBuilder';
import { logger } from '../utils/logger';

// Rate limiting strategies
export enum RateLimitEntity {
  IP = 'ip',
  USER = 'user',
  ORGANIZATION = 'organization',
  API_KEY = 'api_key'
}

// Rate limit configurations
export interface RateLimitOptions {
  interval: number;        // Time window in milliseconds  
  maxInInterval: number;   // Maximum requests per interval
  entity: RateLimitEntity; // What to rate limit on
  namespace?: string;      // Redis namespace (defaults to feedbackhub-api)
  skipPaths?: string[];    // Paths to skip rate limiting
  skipSuccessfulAuth?: boolean; // Skip rate limiting for authenticated users
  customMessage?: string;  // Custom error message
  headers?: boolean;       // Include rate limit headers in response
}

// Extended request interface for rate limiting context
export interface RateLimitRequest extends Request {
  rateLimitInfo?: {
    entity: string;
    entityType: RateLimitEntity;
    limit: number;
    remaining: number;
    resetTime: number;
  };
}

/**
 * Default rate limit configurations based on Zeda's production settings
 */
export const DEFAULT_RATE_LIMITS = {
  // General API endpoints
  API_GENERAL: {
    interval: 60000,      // 1 minute
    maxInInterval: 100,   // 100 requests per minute
    entity: RateLimitEntity.IP
  },
  
  // Authentication endpoints (stricter)
  AUTH: {
    interval: 300000,     // 5 minutes
    maxInInterval: 10,    // 10 attempts per 5 minutes
    entity: RateLimitEntity.IP
  },
  
  // Public API endpoints
  PUBLIC_API: {
    interval: 3600000,    // 1 hour
    maxInInterval: 1000,  // 1000 requests per hour
    entity: RateLimitEntity.API_KEY
  },
  
  // User-specific actions
  USER_ACTIONS: {
    interval: 60000,      // 1 minute
    maxInInterval: 50,    // 50 requests per minute
    entity: RateLimitEntity.USER
  },
  
  // Organization-level limits
  ORGANIZATION: {
    interval: 3600000,    // 1 hour
    maxInInterval: 5000,  // 5000 requests per hour
    entity: RateLimitEntity.ORGANIZATION
  }
} as const;

/**
 * Extract rate limiting entity from request based on strategy
 */
function extractRateLimitEntity(req: Request, entity: RateLimitEntity): string | null {
  switch (entity) {
    case RateLimitEntity.IP:
      return extractClientIP(req);
      
    case RateLimitEntity.USER:
      // Try to get user ID from session or custom property
      const sessionReq = req as SessionRequest;
      if (sessionReq.session) {
        try {
          return sessionReq.session.getUserId();
        } catch (error) {
          // Session might not be available
        }
      }
      
      // Fallback to custom user ID property
      if ((req as any).userId) {
        return (req as any).userId;
      }
      
      // If no user ID available, fall back to IP
      logger.warn('User-based rate limiting requested but no user ID available, falling back to IP', {
        path: req.originalUrl,
        method: req.method
      });
      return extractClientIP(req);
      
    case RateLimitEntity.ORGANIZATION:
      // Try to get organization ID from session or custom property
      if (sessionReq.session) {
        try {
          const payload = sessionReq.session.getAccessTokenPayload();
          if (payload.organizationId) {
            return payload.organizationId;
          }
        } catch (error) {
          // Session might not be available
        }
      }
      
      // Fallback to custom organization ID property
      if ((req as any).organizationId) {
        return (req as any).organizationId;
      }
      
      // Fallback to user ID, then IP
      const userId = extractRateLimitEntity(req, RateLimitEntity.USER);
      return userId;
      
    case RateLimitEntity.API_KEY:
      // Extract API key from authorization header
      const authHeader = req.headers.authorization;
      if (authHeader) {
        return authHeader.replace(/^Bearer\s+/i, '').substring(0, 32); // Truncate for privacy
      }
      
      // Fallback to IP if no API key
      return extractClientIP(req);
      
    default:
      logger.error('Unknown rate limit entity type', { entity });
      return extractClientIP(req);
  }
}

/**
 * Extract client IP address with proxy support
 */
function extractClientIP(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = (forwardedFor as string).split(',').map(ip => ip.trim());
    return ips[0];
  }
  
  const realIP = req.headers['x-real-ip'] as string;
  if (realIP) {
    return realIP;
  }
  
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    return remoteAddress;
  }
  
  return 'unknown';
}

/**
 * Check if path should skip rate limiting
 */
function shouldSkipPath(path: string, skipPaths: string[] = []): boolean {
  const defaultSkipPaths = [
    '/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt'
  ];
  
  const allSkipPaths = [...defaultSkipPaths, ...skipPaths];
  return allSkipPaths.some(skipPath => path.startsWith(skipPath));
}

/**
 * Add rate limit headers to response
 */
function addRateLimitHeaders(res: Response, rateLimitInfo: any, maxInInterval: number): void {
  const remaining = Math.max(0, maxInInterval - rateLimitInfo.totalHits);
  const resetTime = Math.ceil((rateLimitInfo.msBeforeNext || 0) / 1000);
  
  res.setHeader('X-RateLimit-Limit', maxInInterval);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetTime);
  
  if (rateLimitInfo.blocked) {
    res.setHeader('Retry-After', resetTime);
  }
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (req: RateLimitRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting for certain paths
      if (shouldSkipPath(req.path, options.skipPaths)) {
        return next();
      }

      // Extract the entity to rate limit on
      const entity = extractRateLimitEntity(req, options.entity);
      if (!entity) {
        logger.warn('Could not extract rate limit entity, skipping rate limiting', {
          entityType: options.entity,
          path: req.originalUrl,
          method: req.method
        });
        return next();
      }

      // Create rate limiter configuration
      const rateLimiterConfig: RateLimiterConfig = {
        interval: options.interval,
        maxInInterval: options.maxInInterval,
        namespace: options.namespace || 'feedbackhub-api',
        connectionName: 'rate-limiter'
      };

      // Get or create rate limiter
      const rateLimiter = await RateLimiterFactory.createRateLimiter(rateLimiterConfig);

      // Check rate limit
      const rateLimitInfo = await new Promise((resolve, reject) => {
        rateLimiter.limitWithInfo(entity, (error: any, result: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        });
      });

      // Add rate limit headers if requested
      if (options.headers) {
        addRateLimitHeaders(res, rateLimitInfo, options.maxInInterval);
      }

      // Store rate limit info in request for potential logging
      req.rateLimitInfo = {
        entity,
        entityType: options.entity,
        limit: options.maxInInterval,
        remaining: Math.max(0, options.maxInInterval - (rateLimitInfo as any).totalHits),
        resetTime: Math.ceil(((rateLimitInfo as any).msBeforeNext || 0) / 1000)
      };

      // Check if request is blocked
      if ((rateLimitInfo as any).blocked) {
        logger.warn('Rate limit exceeded', {
          entity,
          entityType: options.entity,
          limit: options.maxInInterval,
          interval: options.interval,
          path: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent')
        });

        return ResponseBuilder.tooManyRequests(
          res,
          options.customMessage || 'Too many requests. Please try again later.'
        );
      }

      // Log rate limit info for monitoring
      logger.debug('Rate limit check passed', {
        entity: entity.substring(0, 8), // Truncate for privacy
        entityType: options.entity,
        totalHits: (rateLimitInfo as any).totalHits,
        limit: options.maxInInterval,
        remaining: req.rateLimitInfo.remaining,
        path: req.originalUrl,
        method: req.method
      });

      next();
    } catch (error) {
      logger.error('Rate limiting middleware error', error, {
        path: req.originalUrl,
        method: req.method,
        entityType: options.entity
      });
      
      // Don't fail the request if rate limiting fails
      next();
    }
  };
}

/**
 * Predefined rate limit middleware for common use cases
 */
export const rateLimitMiddleware = {
  // General API rate limiting
  general: createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.API_GENERAL,
    headers: true,
    customMessage: 'Too many requests from this IP. Please try again later.'
  }),

  // Authentication endpoints
  auth: createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.AUTH,
    headers: true,
    customMessage: 'Too many authentication attempts from this IP. Please try again in 5 minutes.'
  }),

  // User-specific actions
  user: createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.USER_ACTIONS,
    headers: true,
    customMessage: 'Too many requests from this user. Please try again later.'
  }),

  // Organization-level limits
  organization: createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.ORGANIZATION,
    headers: true,
    customMessage: 'Organization rate limit exceeded. Please try again later.'
  }),

  // Public API limits
  publicAPI: createRateLimitMiddleware({
    ...DEFAULT_RATE_LIMITS.PUBLIC_API,
    headers: true,
    customMessage: 'API rate limit exceeded. Please check your usage or upgrade your plan.'
  })
};

export default rateLimitMiddleware;