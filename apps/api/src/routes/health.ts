/**
 * Health Check Routes
 * Monitors Redis connections, rate limiting, and overall system health
 */

import { Router, Request, Response } from 'express';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import ResponseBuilder from '../utils/ResponseBuilder';

const router = Router();

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    redis: {
      status: 'healthy' | 'unhealthy';
      connections?: { [key: string]: boolean };
      error?: string;
      latency?: number;
    };
    rateLimit: {
      status: 'healthy' | 'unhealthy' | 'disabled';
      enabled: boolean;
      error?: string;
    };
    database: {
      status: 'healthy' | 'unhealthy';
      error?: string;
    };
    memory: {
      usage: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
      };
      percentage: number;
    };
  };
}

/**
 * Basic health check - lightweight endpoint for load balancers
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Basic health check - just return OK if the service is running
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: config.app.appName,
      version: config.app.version
    });
  } catch (error) {
    logger.error('Health check endpoint error', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

/**
 * Detailed health check - comprehensive system status
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const healthResult: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: config.app.version,
      environment: config.app.nodeEnv,
      checks: {
        redis: {
          status: 'unhealthy'
        },
        rateLimit: {
          status: 'unhealthy',
          enabled: config.rateLimit.enabled
        },
        database: {
          status: 'healthy' // We'll assume database is healthy if the service is running
        },
        memory: {
          usage: process.memoryUsage(),
          percentage: 0
        }
      }
    };

    // Calculate memory percentage (assuming 1GB limit for example)
    const memoryLimit = 1024 * 1024 * 1024; // 1GB
    healthResult.checks.memory.percentage = 
      (healthResult.checks.memory.usage.heapUsed / memoryLimit) * 100;

    // Check Redis health
    try {
      const redisStartTime = Date.now();
      const redisHealth = await redisManager.healthCheck();
      const redisLatency = Date.now() - redisStartTime;
      
      const allConnectionsHealthy = Object.values(redisHealth).every(status => status);
      
      healthResult.checks.redis = {
        status: allConnectionsHealthy ? 'healthy' : 'unhealthy',
        connections: redisHealth,
        latency: redisLatency
      };
    } catch (error) {
      healthResult.checks.redis = {
        status: 'unhealthy',
        error: error.message || 'Redis connection failed'
      };
    }

    // Check rate limiting health
    try {
      if (config.rateLimit.enabled) {
        // Try to create a test rate limiter to verify Redis connection works
        const testConnection = await redisManager.getRateLimitConnection();
        await testConnection.ping();
        
        healthResult.checks.rateLimit = {
          status: 'healthy',
          enabled: true
        };
      } else {
        healthResult.checks.rateLimit = {
          status: 'disabled',
          enabled: false
        };
      }
    } catch (error) {
      healthResult.checks.rateLimit = {
        status: 'unhealthy',
        enabled: config.rateLimit.enabled,
        error: error.message || 'Rate limiting check failed'
      };
    }

    // Determine overall health status
    const unhealthyChecks = Object.values(healthResult.checks).filter(
      check => check.status === 'unhealthy'
    );
    
    if (unhealthyChecks.length === 0) {
      healthResult.status = 'healthy';
    } else if (unhealthyChecks.length < Object.keys(healthResult.checks).length) {
      healthResult.status = 'degraded';
    } else {
      healthResult.status = 'unhealthy';
    }

    // Log health check results
    logger.info('Health check completed', {
      status: healthResult.status,
      duration: Date.now() - startTime,
      checks: Object.keys(healthResult.checks).reduce((acc, key) => {
        acc[key] = healthResult.checks[key as keyof typeof healthResult.checks].status;
        return acc;
      }, {} as Record<string, string>)
    });

    // Return appropriate HTTP status
    const httpStatus = healthResult.status === 'healthy' ? 200 : 
                      healthResult.status === 'degraded' ? 200 : 503;

    return ResponseBuilder.success(res, healthResult, 'Health check completed');
    
  } catch (error) {
    logger.error('Detailed health check error', error);
    
    return ResponseBuilder.internalError(res, 'Health check failed', {
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Redis-specific health check
 */
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const connections = await redisManager.healthCheck();
    const latency = Date.now() - startTime;
    
    const allHealthy = Object.values(connections).every(status => status);
    
    const result = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      latency,
      connections,
      config: {
        host: config.redis.host,
        port: config.redis.port,
        db: config.redis.db,
        enabled: true
      }
    };

    if (allHealthy) {
      return ResponseBuilder.success(res, result, 'Redis is healthy');
    } else {
      logger.warn('Redis health check failed', { connections });
      return ResponseBuilder.internalError(res, 'Redis health check failed', result);
    }
    
  } catch (error) {
    logger.error('Redis health check error', error);
    
    return ResponseBuilder.internalError(res, 'Redis health check error', {
      timestamp: new Date().toISOString(),
      error: error.message,
      config: {
        host: config.redis.host,
        port: config.redis.port,
        enabled: true
      }
    });
  }
});

/**
 * Rate limiting health check
 */
router.get('/rate-limit', async (req: Request, res: Response) => {
  try {
    if (!config.rateLimit.enabled) {
      return ResponseBuilder.success(res, {
        status: 'disabled',
        enabled: false,
        timestamp: new Date().toISOString()
      }, 'Rate limiting is disabled');
    }

    const startTime = Date.now();
    
    // Test rate limiting functionality
    const testConnection = await redisManager.getRateLimitConnection();
    await testConnection.ping();
    
    const latency = Date.now() - startTime;
    
    const result = {
      status: 'healthy',
      enabled: true,
      timestamp: new Date().toISOString(),
      latency,
      config: {
        namespace: config.rateLimit.namespace,
        defaultInterval: config.rateLimit.defaultInterval,
        defaultMax: config.rateLimit.defaultMax,
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          db: config.redis.db
        }
      }
    };

    return ResponseBuilder.success(res, result, 'Rate limiting is healthy');
    
  } catch (error) {
    logger.error('Rate limiting health check error', error);
    
    return ResponseBuilder.internalError(res, 'Rate limiting health check failed', {
      status: 'unhealthy',
      enabled: config.rateLimit.enabled,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * Memory usage check
 */
router.get('/memory', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryLimit = 1024 * 1024 * 1024; // 1GB assumption
    
    const result = {
      status: memoryUsage.heapUsed < memoryLimit * 0.8 ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      usage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100, // MB
      },
      percentage: Math.round((memoryUsage.heapUsed / memoryLimit) * 100 * 100) / 100
    };

    return ResponseBuilder.success(res, result, 'Memory usage retrieved');
    
  } catch (error) {
    logger.error('Memory health check error', error);
    return ResponseBuilder.internalError(res, 'Memory health check failed');
  }
});

export default router;