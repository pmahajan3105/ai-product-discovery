/**
 * CSRF Protection Middleware - Enhanced version of Zeda's CSRF protection
 * Provides comprehensive Cross-Site Request Forgery protection for form submissions
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { BaseError } from '../errors/BaseError';
import { SCOPE_PUBLIC } from '../config/routeConstants';

export interface CsrfConfig {
  saltLength: number;
  secretLength: number;
  tokenExpiry: number; // in milliseconds
  cookieName: string;
  headerName: string;
  bodyFieldName: string;
  skipGetRequests: boolean;
  skipPublicRoutes: boolean;
  trustedOrigins: string[];
  sameSitePolicy: 'strict' | 'lax' | 'none';
  secureOnly: boolean;
}

export interface CsrfTokenData {
  token: string;
  secret: string;
  issuedAt: number;
  expiresAt: number;
  userId?: string;
  organizationId?: string;
}

const DEFAULT_CONFIG: CsrfConfig = {
  saltLength: 8,
  secretLength: 32,
  tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
  cookieName: '_csrf',
  headerName: 'x-csrf-token',
  bodyFieldName: '_csrf',
  skipGetRequests: true,
  skipPublicRoutes: true,
  trustedOrigins: [],
  sameSitePolicy: 'strict',
  secureOnly: process.env.NODE_ENV === 'production'
};

/**
 * Enhanced CSRF Protection class
 */
export class CsrfProtection {
  private config: CsrfConfig;
  private secretKey: string;

  constructor(config: Partial<CsrfConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.secretKey = process.env.CSRF_SECRET_KEY || this.generateSecretKey();
    
    if (!process.env.CSRF_SECRET_KEY) {
      // Use conditional logging to avoid issues in test environment
      if (logger && typeof logger.warn === 'function') {
        logger.warn('No CSRF_SECRET_KEY found in environment. Using generated key. This will cause issues in multi-instance deployments.');
      }
    }
  }

  /**
   * Main CSRF protection middleware
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip protection based on configuration
        if (this.shouldSkipProtection(req)) {
          return next();
        }

        // Validate CSRF token
        const isValid = await this.validateToken(req);
        
        if (!isValid) {
          logger.warn('CSRF token validation failed', {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user_id,
            organizationId: req.organization_id,
            hasToken: !!this.extractToken(req),
            tokenSource: this.getTokenSource(req)
          });

          return this.sendCsrfError(res, 'CSRF token validation failed');
        }

        logger.debug('CSRF token validated successfully', {
          path: req.path,
          method: req.method,
          userId: req.user_id,
          organizationId: req.organization_id
        });

        next();

      } catch (error) {
        logger.error('CSRF protection middleware error', error, {
          path: req.path,
          method: req.method,
          userId: req.user_id
        });

        return this.sendCsrfError(res, 'CSRF protection error');
      }
    };
  }

  /**
   * Generate CSRF token for a user session
   */
  public generateToken(userId?: string, organizationId?: string): CsrfTokenData {
    const secret = this.generateSecret();
    const salt = this.generateSalt();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + this.config.tokenExpiry;
    
    // Create token payload
    const payload = {
      secret,
      salt,
      issuedAt,
      expiresAt,
      userId,
      organizationId
    };

    // Generate token using HMAC
    const token = this.createTokenFromPayload(payload);

    return {
      token,
      secret,
      issuedAt,
      expiresAt,
      userId,
      organizationId
    };
  }

  /**
   * Middleware to set CSRF token in response
   */
  public setToken() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip for GET requests if configured
        if (this.config.skipGetRequests && req.method === 'GET') {
          return next();
        }

        // Generate token
        const tokenData = this.generateToken(req.user_id, req.organization_id);
        
        // Set token in cookie
        this.setCsrfCookie(res, tokenData.token);
        
        // Make token available in response locals for templates
        res.locals.csrfToken = tokenData.token;
        
        logger.debug('CSRF token set for request', {
          path: req.path,
          method: req.method,
          userId: req.user_id,
          organizationId: req.organization_id,
          tokenLength: tokenData.token.length
        });

        next();

      } catch (error) {
        logger.error('Error setting CSRF token', error, {
          path: req.path,
          method: req.method,
          userId: req.user_id
        });
        next();
      }
    };
  }

  /**
   * Get token endpoint for AJAX requests
   */
  public getTokenEndpoint() {
    return (req: Request, res: Response) => {
      try {
        const tokenData = this.generateToken(req.user_id, req.organization_id);
        
        // Set token in cookie
        this.setCsrfCookie(res, tokenData.token);
        
        return ResponseBuilder.success(res, {
          token: tokenData.token,
          expiresAt: tokenData.expiresAt
        }, 'CSRF token generated');

      } catch (error) {
        logger.error('Error generating CSRF token', error, {
          userId: req.user_id,
          organizationId: req.organization_id
        });

        return ResponseBuilder.internalServerError(res, 'Failed to generate CSRF token');
      }
    };
  }

  /**
   * Validate CSRF token from request
   */
  private async validateToken(req: Request): Promise<boolean> {
    const token = this.extractToken(req);
    
    if (!token) {
      return false;
    }

    try {
      // Parse and validate token
      const tokenData = this.parseToken(token);
      
      if (!tokenData) {
        return false;
      }

      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        logger.debug('CSRF token expired', {
          expiresAt: new Date(tokenData.expiresAt).toISOString(),
          now: new Date().toISOString()
        });
        return false;
      }

      // Validate user context
      if (tokenData.userId && tokenData.userId !== req.user_id) {
        logger.debug('CSRF token user mismatch', {
          tokenUserId: tokenData.userId,
          requestUserId: req.user_id
        });
        return false;
      }

      // Validate organization context
      if (tokenData.organizationId && tokenData.organizationId !== req.organization_id) {
        logger.debug('CSRF token organization mismatch', {
          tokenOrgId: tokenData.organizationId,
          requestOrgId: req.organization_id
        });
        return false;
      }

      return true;

    } catch (error) {
      logger.debug('CSRF token validation error', error);
      return false;
    }
  }

  /**
   * Extract CSRF token from request
   */
  private extractToken(req: Request): string | null {
    // Try header first
    const headerToken = req.get(this.config.headerName);
    if (headerToken) {
      return headerToken;
    }

    // Try body field
    const bodyToken = req.body?.[this.config.bodyFieldName];
    if (bodyToken) {
      return bodyToken;
    }

    // Try query parameter (least preferred)
    const queryToken = req.query[this.config.bodyFieldName] as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  /**
   * Get the source of the token for logging
   */
  private getTokenSource(req: Request): string {
    if (req.get(this.config.headerName)) return 'header';
    if (req.body?.[this.config.bodyFieldName]) return 'body';
    if (req.query[this.config.bodyFieldName]) return 'query';
    return 'none';
  }

  /**
   * Check if CSRF protection should be skipped
   */
  private shouldSkipProtection(req: Request): boolean {
    // Skip GET requests if configured
    if (this.config.skipGetRequests && req.method === 'GET') {
      return true;
    }

    // Skip public routes if configured
    if (this.config.skipPublicRoutes && req.routeDetails?.scope === SCOPE_PUBLIC) {
      return true;
    }

    // Skip if explicitly marked as public
    if ((req as any).isPublicURL) {
      return true;
    }

    // Skip for trusted origins
    const origin = req.get('Origin') || req.get('Referer');
    if (origin && this.isTrustedOrigin(origin)) {
      return true;
    }

    // Skip for API endpoints using API keys
    if (req.get('X-API-Key')) {
      return true;
    }

    return false;
  }

  /**
   * Check if origin is trusted
   */
  private isTrustedOrigin(origin: string): boolean {
    try {
      const originUrl = new URL(origin);
      return this.config.trustedOrigins.some(trusted => {
        const trustedUrl = new URL(trusted);
        return originUrl.hostname === trustedUrl.hostname &&
               originUrl.port === trustedUrl.port &&
               originUrl.protocol === trustedUrl.protocol;
      });
    } catch {
      return false;
    }
  }

  /**
   * Generate cryptographically secure secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(this.config.secretLength).toString('hex');
  }

  /**
   * Generate salt for token
   */
  private generateSalt(): string {
    return crypto.randomBytes(this.config.saltLength).toString('hex');
  }

  /**
   * Generate master secret key
   */
  private generateSecretKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create token from payload using HMAC
   */
  private createTokenFromPayload(payload: any): string {
    const data = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    // Combine data and signature
    const tokenData = Buffer.from(data).toString('base64');
    return `${tokenData}.${signature}`;
  }

  /**
   * Parse and verify token
   */
  private parseToken(token: string): any {
    try {
      const [tokenData, signature] = token.split('.');
      
      if (!tokenData || !signature) {
        return null;
      }

      // Verify signature
      const data = Buffer.from(tokenData, 'base64').toString();
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(data);
      const expectedSignature = hmac.digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        return null;
      }

      return JSON.parse(data);

    } catch {
      return null;
    }
  }

  /**
   * Set CSRF token in secure cookie
   */
  private setCsrfCookie(res: Response, token: string): void {
    res.cookie(this.config.cookieName, token, {
      httpOnly: true,
      secure: this.config.secureOnly,
      sameSite: this.config.sameSitePolicy,
      maxAge: this.config.tokenExpiry,
      path: '/'
    });
  }

  /**
   * Send CSRF error response
   */
  private sendCsrfError(res: Response, message: string): void {
    const error = BaseError.authorizationError('INSUFFICIENT_PERMISSIONS');
    error.message = message;
    
    return ResponseBuilder.forbidden(res, message, {
      code: 'CSRF_TOKEN_INVALID',
      suggestion: 'Please refresh the page and try again'
    });
  }
}

// Create default instance
const defaultCsrfProtection = new CsrfProtection();

// Export middleware functions
export const csrfProtection = defaultCsrfProtection.middleware();
export const setCsrfToken = defaultCsrfProtection.setToken();
export const getCsrfToken = defaultCsrfProtection.getTokenEndpoint();

// Export class for custom configurations
export default CsrfProtection;