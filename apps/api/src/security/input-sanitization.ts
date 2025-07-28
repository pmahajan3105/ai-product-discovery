/**
 * Input Sanitization and Validation Utilities
 * Provides comprehensive input sanitization for security
 */

import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  stripWhitespace?: boolean;
  preventXss?: boolean;
  preventSqlInjection?: boolean;
}

export class InputSanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    const {
      allowHtml = false,
      maxLength = 10000,
      stripWhitespace = true,
      preventXss = true,
      preventSqlInjection = true
    } = options;

    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    let sanitized = input;

    // Trim whitespace if requested
    if (stripWhitespace) {
      sanitized = sanitized.trim();
    }

    // Enforce length limits
    if (sanitized.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
    }

    // Prevent XSS attacks
    if (preventXss) {
      if (allowHtml) {
        // Allow safe HTML tags only
        sanitized = DOMPurify.sanitize(sanitized, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: []
        });
      } else {
        // Strip all HTML
        sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
      }
    }

    // Prevent SQL injection patterns
    if (preventSqlInjection) {
      const sqlPatterns = [
        /('|(\\'))|(;|\s)(exec|execute|sp_executesql|xp_cmdshell)\s/gi,
        /(union\s+(all\s+)?select|insert\s+into|delete\s+from|update\s+.+set|drop\s+(table|database))/gi,
        /('|(\\'))(\s*;\s*|\s+)(drop|delete|update|insert|exec|execute|union)/gi,
        /(script|javascript|vbscript|onload|onerror|onclick)/gi
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(sanitized)) {
          throw new Error('Input contains potentially malicious content');
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    return validator.normalizeEmail(email) || email.toLowerCase().trim();
  }

  /**
   * Sanitize UUID input
   */
  static sanitizeUuid(uuid: string): string {
    const sanitized = this.sanitizeString(uuid, { 
      maxLength: 36, 
      preventXss: true,
      preventSqlInjection: true 
    });

    if (!validator.isUUID(sanitized)) {
      throw new Error('Invalid UUID format');
    }

    return sanitized;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(
    input: string | number, 
    options: { min?: number; max?: number; isInteger?: boolean } = {}
  ): number {
    const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, isInteger = false } = options;

    let num: number;

    if (typeof input === 'string') {
      if (!validator.isNumeric(input, { no_symbols: true })) {
        throw new Error('Input is not a valid number');
      }
      num = parseFloat(input);
    } else if (typeof input === 'number') {
      num = input;
    } else {
      throw new Error('Input must be a string or number');
    }

    if (isNaN(num)) {
      throw new Error('Input is not a valid number');
    }

    if (isInteger && !Number.isInteger(num)) {
      throw new Error('Input must be an integer');
    }

    if (num < min || num > max) {
      throw new Error(`Number must be between ${min} and ${max}`);
    }

    return num;
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: string, maxDepth: number = 10): any {
    if (typeof input !== 'string') {
      throw new Error('JSON input must be a string');
    }

    if (input.length > 100000) { // 100KB limit
      throw new Error('JSON input too large');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    // Check depth to prevent deeply nested attacks
    const checkDepth = (obj: any, depth: number = 0): void => {
      if (depth > maxDepth) {
        throw new Error('JSON structure too deeply nested');
      }

      if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => {
          checkDepth(value, depth + 1);
        });
      }
    };

    checkDepth(parsed);
    return parsed;
  }

  /**
   * Sanitize search query
   */
  static sanitizeSearchQuery(query: string): string {
    // Allow reasonable search characters but prevent injections
    const sanitized = this.sanitizeString(query, {
      maxLength: 1000,
      allowHtml: false,
      preventXss: true,
      preventSqlInjection: true
    });

    // Remove excessive special characters that might be used for injection
    const cleaned = sanitized.replace(/[<>{}[\]\\]/g, '');

    if (cleaned.length === 0) {
      throw new Error('Search query cannot be empty after sanitization');
    }

    return cleaned;
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    const sanitized = this.sanitizeString(filename, {
      maxLength: 255,
      allowHtml: false,
      preventXss: true
    });

    // Remove dangerous characters for filenames
    const cleaned = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

    // Prevent directory traversal
    if (cleaned.includes('..') || cleaned.includes('./') || cleaned.includes('.\\')) {
      throw new Error('Filename contains invalid path components');
    }

    if (cleaned.length === 0) {
      throw new Error('Filename cannot be empty after sanitization');
    }

    return cleaned;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(url: string): string {
    const sanitized = this.sanitizeString(url, {
      maxLength: 2000,
      allowHtml: false,
      preventXss: true
    });

    if (!validator.isURL(sanitized, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL format');
    }

    return sanitized;
  }

  /**
   * Bulk sanitize object properties
   */
  static sanitizeObject(
    obj: Record<string, any>, 
    schema: Record<string, SanitizationOptions & { type: 'string' | 'number' | 'email' | 'uuid' | 'url' | 'json' }>
  ): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fieldSchema = schema[key];
      
      if (!fieldSchema) {
        // Skip unknown fields for security
        continue;
      }

      try {
        switch (fieldSchema.type) {
          case 'string':
            sanitized[key] = this.sanitizeString(value, fieldSchema);
            break;
          case 'number':
            sanitized[key] = this.sanitizeNumber(value);
            break;
          case 'email':
            sanitized[key] = this.sanitizeEmail(value);
            break;
          case 'uuid':
            sanitized[key] = this.sanitizeUuid(value);
            break;
          case 'url':
            sanitized[key] = this.sanitizeUrl(value);
            break;
          case 'json':
            sanitized[key] = this.sanitizeJson(value);
            break;
          default:
            throw new Error(`Unknown sanitization type: ${fieldSchema.type}`);
        }
      } catch (error) {
        throw new Error(`Validation failed for field '${key}': ${error.message}`);
      }
    }

    return sanitized;
  }
}

/**
 * Express middleware for request sanitization
 */
export const sanitizeRequest = (
  schema: Record<string, { type: string; options?: SanitizationOptions }>
) => {
  return (req: any, res: any, next: any) => {
    try {
      // Sanitize body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = InputSanitizer.sanitizeObject(req.body, schema);
      }

      // Sanitize query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = InputSanitizer.sanitizeObject(req.query, schema);
      }

      // Sanitize URL parameters
      if (req.params && Object.keys(req.params).length > 0) {
        req.params = InputSanitizer.sanitizeObject(req.params, schema);
      }

      next();
    } catch (error) {
      res.status(400).json({
        error: 'Input validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message
      });
    }
  };
};

/**
 * Rate limiting helpers
 */
export const createRateLimiter = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: any, res: any, next: any) => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or create new window
      requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
    } else if (clientData.count < max) {
      // Increment counter
      clientData.count++;
      next();
    } else {
      // Rate limit exceeded
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
  };
};