/**
 * CSRF Utilities - Helper functions for CSRF token management
 * Provides utilities for token generation, validation, and form integration
 */

import crypto from 'crypto';
import { Request } from 'express';
import { redisManager } from './redis';
import { logger } from './logger';

export interface CsrfTokenOptions {
  expiryMinutes?: number;
  includeUserContext?: boolean;
  includeOrgContext?: boolean;
  customData?: Record<string, any>;
}

export interface StoredCsrfToken {
  token: string;
  secret: string;
  userId?: string;
  organizationId?: string;
  createdAt: number;
  expiresAt: number;
  customData?: Record<string, any>;
  requestCount: number;
}

/**
 * CSRF Token Manager with Redis backing
 */
export class CsrfTokenManager {
  private static readonly TOKEN_PREFIX = 'feedbackhub:csrf:';
  private static readonly DEFAULT_EXPIRY = 30 * 60; // 30 minutes in seconds
  private static readonly MAX_TOKENS_PER_USER = 5;
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate a new CSRF token with Redis storage
   */
  static async generateToken(
    req: Request,
    options: CsrfTokenOptions = {}
  ): Promise<{ token: string; secret: string }> {
    try {
      const tokenId = this.generateTokenId();
      const secret = this.generateSecret();
      const token = this.generateTokenFromSecret(secret, tokenId);
      
      const expiryMinutes = options.expiryMinutes || 30;
      const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
      
      const tokenData: StoredCsrfToken = {
        token,
        secret,
        userId: options.includeUserContext ? req.user_id : undefined,
        organizationId: options.includeOrgContext ? req.organization_id : undefined,
        createdAt: Date.now(),
        expiresAt,
        customData: options.customData,
        requestCount: 0
      };

      // Store in Redis
      const redisClient = await redisManager.getCacheConnection();
      const redisKey = `${this.TOKEN_PREFIX}${tokenId}`;
      
      await redisClient.setEx(
        redisKey,
        this.DEFAULT_EXPIRY,
        JSON.stringify(tokenData)
      );

      // Clean up old tokens for this user
      if (req.user_id) {
        await this.cleanupUserTokens(req.user_id);
      }

      logger.debug('CSRF token generated and stored', {
        tokenId,
        userId: req.user_id,
        organizationId: req.organization_id,
        expiresAt: new Date(expiresAt).toISOString()
      });

      return { token, secret };

    } catch (error) {
      logger.error('Failed to generate CSRF token', error, {
        userId: req.user_id,
        organizationId: req.organization_id
      });
      throw error;
    }
  }

  /**
   * Validate CSRF token against stored data
   */
  static async validateToken(
    token: string,
    req: Request
  ): Promise<{ valid: boolean; reason?: string; tokenData?: StoredCsrfToken }> {
    try {
      // Extract token ID from token
      const tokenId = this.extractTokenId(token);
      if (!tokenId) {
        return { valid: false, reason: 'Invalid token format' };
      }

      // Retrieve from Redis
      const redisClient = await redisManager.getCacheConnection();
      const redisKey = `${this.TOKEN_PREFIX}${tokenId}`;
      const storedData = await redisClient.get(redisKey);

      if (!storedData) {
        return { valid: false, reason: 'Token not found or expired' };
      }

      const tokenData: StoredCsrfToken = JSON.parse(storedData);

      // Verify token matches
      if (tokenData.token !== token) {
        return { valid: false, reason: 'Token mismatch' };
      }

      // Check expiration
      if (Date.now() > tokenData.expiresAt) {
        await redisClient.del(redisKey);
        return { valid: false, reason: 'Token expired' };
      }

      // Validate user context if stored
      if (tokenData.userId && tokenData.userId !== req.user_id) {
        return { valid: false, reason: 'User context mismatch' };
      }

      // Validate organization context if stored
      if (tokenData.organizationId && tokenData.organizationId !== req.organization_id) {
        return { valid: false, reason: 'Organization context mismatch' };
      }

      // Update usage count
      tokenData.requestCount++;
      await redisClient.setEx(
        redisKey,
        Math.ceil((tokenData.expiresAt - Date.now()) / 1000),
        JSON.stringify(tokenData)
      );

      logger.debug('CSRF token validated successfully', {
        tokenId,
        userId: req.user_id,
        organizationId: req.organization_id,
        requestCount: tokenData.requestCount
      });

      return { valid: true, tokenData };

    } catch (error) {
      logger.error('CSRF token validation error', error, {
        tokenLength: token?.length,
        userId: req.user_id
      });
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * Revoke a specific CSRF token
   */
  static async revokeToken(token: string): Promise<boolean> {
    try {
      const tokenId = this.extractTokenId(token);
      if (!tokenId) {
        return false;
      }

      const redisClient = await redisManager.getCacheConnection();
      const redisKey = `${this.TOKEN_PREFIX}${tokenId}`;
      const deleted = await redisClient.del(redisKey);

      logger.debug('CSRF token revoked', { tokenId, success: deleted > 0 });
      return deleted > 0;

    } catch (error) {
      logger.error('Failed to revoke CSRF token', error);
      return false;
    }
  }

  /**
   * Clean up expired tokens for a user
   */
  static async cleanupUserTokens(userId: string): Promise<number> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const pattern = `${this.TOKEN_PREFIX}*`;
      const keys = await redisClient.keys(pattern);
      
      let cleanedCount = 0;
      const userTokens: { key: string; data: StoredCsrfToken }[] = [];

      // Find user's tokens
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const tokenData: StoredCsrfToken = JSON.parse(data);
          if (tokenData.userId === userId) {
            userTokens.push({ key, data: tokenData });
          }
        }
      }

      // Sort by creation time (oldest first)
      userTokens.sort((a, b) => a.data.createdAt - b.data.createdAt);

      // Remove excess tokens
      if (userTokens.length > this.MAX_TOKENS_PER_USER) {
        const tokensToRemove = userTokens.slice(0, userTokens.length - this.MAX_TOKENS_PER_USER);
        for (const { key } of tokensToRemove) {
          await redisClient.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug('Cleaned up excess CSRF tokens', {
          userId,
          cleanedCount,
          remainingTokens: Math.min(userTokens.length, this.MAX_TOKENS_PER_USER)
        });
      }

      return cleanedCount;

    } catch (error) {
      logger.error('Failed to cleanup user CSRF tokens', error, { userId });
      return 0;
    }
  }

  /**
   * Get token statistics for monitoring
   */
  static async getTokenStats(): Promise<{
    totalTokens: number;
    expiredTokens: number;
    tokensPerUser: Record<string, number>;
  }> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const pattern = `${this.TOKEN_PREFIX}*`;
      const keys = await redisClient.keys(pattern);
      
      let totalTokens = 0;
      let expiredTokens = 0;
      const tokensPerUser: Record<string, number> = {};

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const tokenData: StoredCsrfToken = JSON.parse(data);
          totalTokens++;
          
          if (Date.now() > tokenData.expiresAt) {
            expiredTokens++;
          }
          
          if (tokenData.userId) {
            tokensPerUser[tokenData.userId] = (tokensPerUser[tokenData.userId] || 0) + 1;
          }
        }
      }

      return {
        totalTokens,
        expiredTokens,
        tokensPerUser
      };

    } catch (error) {
      logger.error('Failed to get CSRF token stats', error);
      return {
        totalTokens: 0,
        expiredTokens: 0,
        tokensPerUser: {}
      };
    }
  }

  /**
   * Generate unique token ID
   */
  private static generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate cryptographically secure secret
   */
  private static generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate token from secret and ID
   */
  private static generateTokenFromSecret(secret: string, tokenId: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(tokenId);
    const signature = hmac.digest('hex');
    return `${tokenId}.${signature}`;
  }

  /**
   * Extract token ID from full token
   */
  private static extractTokenId(token: string): string | null {
    const parts = token.split('.');
    return parts.length === 2 ? parts[0] : null;
  }

  /**
   * Periodic cleanup of expired tokens
   */
  static startCleanupScheduler(): void {
    setInterval(async () => {
      try {
        const redisClient = await redisManager.getCacheConnection();
        const pattern = `${this.TOKEN_PREFIX}*`;
        const keys = await redisClient.keys(pattern);
        
        let cleanedCount = 0;
        
        for (const key of keys) {
          const data = await redisClient.get(key);
          if (data) {
            const tokenData: StoredCsrfToken = JSON.parse(data);
            if (Date.now() > tokenData.expiresAt) {
              await redisClient.del(key);
              cleanedCount++;
            }
          }
        }

        if (cleanedCount > 0) {
          logger.info('CSRF token cleanup completed', {
            cleanedTokens: cleanedCount,
            totalKeys: keys.length
          });
        }

      } catch (error) {
        logger.error('CSRF token cleanup failed', error);
      }
    }, this.CLEANUP_INTERVAL);

    logger.info('CSRF token cleanup scheduler started', {
      interval: this.CLEANUP_INTERVAL
    });
  }
}

/**
 * Express middleware helper functions
 */

/**
 * Add CSRF token to response locals and headers
 */
export async function addCsrfTokenToResponse(req: any, res: any, next: any): Promise<void> {
  try {
    const { token } = await CsrfTokenManager.generateToken(req, {
      includeUserContext: true,
      includeOrgContext: true
    });

    // Add to response locals for template rendering
    res.locals.csrfToken = token;
    
    // Add to headers for AJAX requests
    res.set('X-CSRF-Token', token);
    
    next();

  } catch (error) {
    logger.error('Failed to add CSRF token to response', error);
    next();
  }
}

/**
 * Form helper to generate hidden CSRF input
 */
export function csrfInput(token: string): string {
  return `<input type="hidden" name="_csrf" value="${token}" />`;
}

/**
 * Meta tag helper for AJAX requests
 */
export function csrfMetaTag(token: string): string {
  return `<meta name="csrf-token" content="${token}" />`;
}

/**
 * JavaScript helper to get token from meta tag
 */
export const csrfJavaScriptHelper = `
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : null;
}

function addCsrfToHeaders(headers = {}) {
  const token = getCsrfToken();
  if (token) {
    headers['X-CSRF-Token'] = token;
  }
  return headers;
}

function addCsrfToFormData(formData) {
  const token = getCsrfToken();
  if (token) {
    formData.append('_csrf', token);
  }
  return formData;
}
`;

// Start cleanup scheduler on module load
CsrfTokenManager.startCleanupScheduler();

export default CsrfTokenManager;