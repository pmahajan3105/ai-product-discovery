/**
 * Redis Connection Management - Enhanced version of Zeda's Redis patterns
 * Provides centralized Redis connection management for caching and rate limiting
 */

import { createClient } from 'redis';

type RedisClientType = ReturnType<typeof createClient>;
import { RollingRateLimiter } from 'rolling-rate-limiter';
import { logger } from './logger';
import { redisConfig, RedisConfig } from '../config/config';

export interface RateLimiterConfig {
  interval: number;        // Time window in milliseconds
  maxInInterval: number;   // Maximum requests per interval
  namespace: string;       // Redis key namespace
  connectionName: string;  // Connection identifier
}

class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private connections: Map<string, RedisClientType> = new Map();
  private config: RedisConfig;
  private isConnected: boolean = false;

  private constructor() {
    this.config = redisConfig;
  }

  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  /**
   * Get or create a Redis connection for a specific purpose
   */
  public async getConnection(connectionName: string = 'default'): Promise<RedisClientType> {
    if (this.connections.has(connectionName)) {
      return this.connections.get(connectionName)!;
    }

    const client = createClient({
      socket: {
        host: this.config.host,
        port: this.config.port,
        connectTimeout: this.config.connectTimeout,
        reconnectStrategy: (retries) => {
          if (retries >= (this.config.maxRetries || 3)) {
            logger.error('Redis connection failed after maximum retries', { 
              connectionName, 
              retries, 
              maxRetries: this.config.maxRetries 
            });
            return false;
          }
          return Math.min(retries * 50, 1000);
        }
      },
      password: this.config.password,
      database: this.config.db
    });

    // Event handlers
    client.on('connect', () => {
      logger.info(`Redis connection established`, { connectionName });
      this.isConnected = true;
    });

    client.on('ready', () => {
      logger.info(`Redis connection ready`, { connectionName });
    });

    client.on('error', (error) => {
      logger.error('Redis connection error', error, { connectionName });
      this.isConnected = false;
    });

    client.on('end', () => {
      logger.warn('Redis connection ended', { connectionName });
      this.isConnected = false;
    });

    client.on('reconnecting', () => {
      logger.info('Redis reconnecting', { connectionName });
    });

    try {
      await client.connect();
      this.connections.set(connectionName, client);
      logger.info(`Redis connection created and stored`, { connectionName });
      return client;
    } catch (error) {
      logger.error('Failed to connect to Redis', error, { connectionName });
      throw error;
    }
  }

  /**
   * Get Redis client specifically for rate limiting
   */
  public async getRateLimitConnection(): Promise<RedisClientType> {
    return this.getConnection('rate-limiter');
  }

  /**
   * Get Redis client for general caching
   */
  public async getCacheConnection(): Promise<RedisClientType> {
    return this.getConnection('cache');
  }

  /**
   * Close a specific connection
   */
  public async closeConnection(connectionName: string): Promise<void> {
    const client = this.connections.get(connectionName);
    if (client) {
      await client.quit();
      this.connections.delete(connectionName);
      logger.info(`Redis connection closed`, { connectionName });
    }
  }

  /**
   * Close all connections
   */
  public async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.entries()).map(
      async ([name, client]) => {
        try {
          await client.quit();
          logger.info(`Redis connection closed during shutdown`, { connectionName: name });
        } catch (error) {
          logger.error('Error closing Redis connection', error, { connectionName: name });
        }
      }
    );

    await Promise.all(closePromises);
    this.connections.clear();
    this.isConnected = false;
    logger.info('All Redis connections closed');
  }

  /**
   * Check if Redis is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection configuration
   */
  public getConfig(): RedisConfig {
    return { ...this.config };
  }

  /**
   * Health check for Redis connections
   */
  public async healthCheck(): Promise<{ [connectionName: string]: boolean }> {
    const results: { [connectionName: string]: boolean } = {};

    for (const [name, client] of this.connections) {
      try {
        await client.ping();
        results[name] = true;
      } catch (error) {
        logger.error('Redis health check failed', error, { connectionName: name });
        results[name] = false;
      }
    }

    return results;
  }
}

/**
 * Rate Limiter Factory - Creates rate limiters with Redis backend
 */
export class RateLimiterFactory {
  private static rateLimiters: Map<string, RollingRateLimiter> = new Map();

  /**
   * Create or get a rate limiter instance
   */
  public static async createRateLimiter(config: RateLimiterConfig): Promise<RollingRateLimiter> {
    const key = `${config.namespace}-${config.interval}-${config.maxInInterval}`;
    
    if (this.rateLimiters.has(key)) {
      return this.rateLimiters.get(key)!;
    }

    try {
      const redisManager = RedisConnectionManager.getInstance();
      const redisClient = await redisManager.getRateLimitConnection();

      const rateLimiter = new RollingRateLimiter({
        client: redisClient as any, // Type compatibility with rolling-rate-limiter
        namespace: config.namespace,
        interval: config.interval,
        maxInInterval: config.maxInInterval,
      });

      this.rateLimiters.set(key, rateLimiter);
      
      logger.info('Rate limiter created', {
        namespace: config.namespace,
        interval: config.interval,
        maxInInterval: config.maxInInterval,
        connectionName: config.connectionName
      });

      return rateLimiter;
    } catch (error) {
      logger.error('Failed to create rate limiter', error, { config });
      throw error;
    }
  }

  /**
   * Remove rate limiter from cache
   */
  public static removeRateLimiter(config: RateLimiterConfig): void {
    const key = `${config.namespace}-${config.interval}-${config.maxInInterval}`;
    this.rateLimiters.delete(key);
  }

  /**
   * Clear all rate limiters
   */
  public static clearAll(): void {
    this.rateLimiters.clear();
  }
}

// Singleton instances for easy access
export const redisManager = RedisConnectionManager.getInstance();

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connections...');
  await redisManager.closeAllConnections();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connections...');
  await redisManager.closeAllConnections();
});

export default redisManager;