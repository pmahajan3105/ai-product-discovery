/**
 * API Response Caching Middleware
 * Implements intelligent caching for API responses
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';

interface CacheEntry {
  data: any;
  headers: Record<string, string>;
  expires: number;
  etag: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  varyBy?: string[]; // Headers to vary cache by
  skipCache?: (req: Request) => boolean;
  generateKey?: (req: Request) => string;
}

export class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private hitCount = 0;
  private missCount = 0;

  /**
   * Create caching middleware
   */
  middleware(options: CacheOptions = {}) {
    const {
      ttl = 300, // 5 minutes default
      varyBy = ['authorization'],
      skipCache = () => false,
      generateKey = this.defaultKeyGenerator
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests or when explicitly skipped
      if (req.method !== 'GET' || skipCache(req)) {
        return next();
      }

      const cacheKey = generateKey(req);
      const cached = this.get(cacheKey);

      // Check if we have a valid cached response
      if (cached) {
        this.hitCount++;
        
        // Check if client has the same version (304 Not Modified)
        if (req.headers['if-none-match'] === cached.etag) {
          return res.status(304).end();
        }

        // Set cached headers
        Object.entries(cached.headers).forEach(([key, value]) => {
          res.set(key, value);
        });

        res.set('X-Cache', 'HIT');
        res.set('ETag', cached.etag);
        return res.json(cached.data);
      }

      this.missCount++;

      // Intercept response to cache it
      const originalJson = res.json;
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const etag = createHash('md5').update(JSON.stringify(data)).digest('hex');
          const headers: Record<string, string> = {};
          
          // Copy relevant headers
          varyBy.forEach(header => {
            const value = res.get(header);
            if (value) headers[header] = value;
          });

          const cacheEntry: CacheEntry = {
            data,
            headers,
            expires: Date.now() + (ttl * 1000),
            etag
          };

          res.set('X-Cache', 'MISS');
          res.set('ETag', etag);
          res.set('Cache-Control', `private, max-age=${ttl}`);
          
          // Cache the response
          apiCache.set(cacheKey, cacheEntry);
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Default cache key generator
   */
  private defaultKeyGenerator(req: Request): string {
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = (req as any).session?.getUserId() || 'anonymous';
    
    return createHash('md5')
      .update(`${method}:${url}:${userId}`)
      .digest('hex');
  }

  /**
   * Organization-specific cache key generator
   */
  organizationKeyGenerator(req: Request): string {
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userId = (req as any).session?.getUserId() || 'anonymous';
    const orgId = req.params.organizationId || 'no-org';
    
    return createHash('md5')
      .update(`${method}:${url}:${userId}:${orgId}`)
      .digest('hex');
  }

  /**
   * Get cached entry
   */
  private get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry;
    }
    
    if (entry) {
      this.cache.delete(key); // Remove expired entry
    }
    
    return null;
  }

  /**
   * Set cache entry
   */
  private set(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
    this.cleanup(); // Periodic cleanup
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Invalidate cache by organization
   */
  invalidateOrganization(organizationId: string): number {
    return this.invalidate(`:${organizationId}:`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;
    
    return {
      entries: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    // Run cleanup every 100 cache operations
    if ((this.hitCount + this.missCount) % 100 === 0) {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires <= now) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate (UTF-16)
    }
    return totalSize;
  }
}

// Global cache instance
export const apiCache = new ApiCache();

// Predefined cache configurations
export const cacheConfigs = {
  // Short cache for real-time data
  shortCache: {
    ttl: 60, // 1 minute
    generateKey: apiCache.organizationKeyGenerator.bind(apiCache)
  },

  // Medium cache for semi-static data
  mediumCache: {
    ttl: 300, // 5 minutes
    generateKey: apiCache.organizationKeyGenerator.bind(apiCache)
  },

  // Long cache for static data
  longCache: {
    ttl: 3600, // 1 hour
    generateKey: apiCache.organizationKeyGenerator.bind(apiCache)
  },

  // Analytics cache (longer for expensive queries)
  analyticsCache: {
    ttl: 900, // 15 minutes
    generateKey: apiCache.organizationKeyGenerator.bind(apiCache),
    skipCache: (req: Request) => {
      // Skip cache for real-time period requests
      return req.query.period === 'realtime';
    }
  },

  // Search cache (shorter due to frequent updates)
  searchCache: {
    ttl: 180, // 3 minutes
    generateKey: (req: Request) => {
      const baseKey = apiCache.organizationKeyGenerator(req);
      const searchQuery = req.body.query || req.query.q || '';
      return createHash('md5').update(`${baseKey}:search:${searchQuery}`).digest('hex');
    }
  }
};

/**
 * Cache invalidation middleware for write operations
 */
export const cacheInvalidation = {
  // Invalidate feedback-related cache on feedback changes
  feedback: (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function(data: any) {
      // Only invalidate on successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const orgId = req.params.organizationId;
        if (orgId) {
          apiCache.invalidateOrganization(orgId);
        }
      }
      return originalSend.call(this, data);
    };
    next();
  },

  // Invalidate specific patterns
  pattern: (pattern: string) => (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.invalidate(pattern);
      }
      return originalSend.call(this, data);
    };
    next();
  }
};