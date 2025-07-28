/**
 * Middleware Index - Centralized middleware exports and setup
 * Provides easy access to all middleware including rate limiting
 */

// Import all middleware
export * from './authMiddleware';
export * from './loggingMiddleware';
export * from './rateLimitMiddleware';

// Re-export commonly used middleware configurations
export { 
  createRateLimitMiddleware,
  rateLimitMiddleware,
  RateLimitEntity,
  DEFAULT_RATE_LIMITS
} from './rateLimitMiddleware';

export {
  setupLogging,
  requestContextMiddleware,
  userContextMiddleware,
  requestLoggingMiddleware,
  responseLoggingMiddleware,
  errorLoggingMiddleware,
  performanceMiddleware
} from './loggingMiddleware';

// Combined middleware setup for easy application integration
import { Express } from 'express';
import { setupLogging } from './loggingMiddleware';
import { rateLimitMiddleware } from './rateLimitMiddleware';
import { config } from '../config/config';

/**
 * Setup core middleware for the application
 * This includes logging, rate limiting, and other essential middleware
 */
export function setupCoreMiddleware(app: Express): void {
  // Setup logging middleware (should be first)
  const loggingMiddleware = setupLogging();
  loggingMiddleware.forEach(middleware => {
    app.use(middleware);
  });

  // Setup rate limiting if enabled
  if (config.rateLimit.enabled) {
    // Apply general rate limiting to all routes
    // Individual routes can apply more specific rate limiting as needed
    app.use(rateLimitMiddleware.general);
  }
}

/**
 * Setup authentication-specific middleware
 * Applied to authentication routes for enhanced security
 */
export function setupAuthMiddleware(app: Express): void {
  if (config.rateLimit.enabled) {
    // Apply stricter rate limiting to auth routes
    app.use('/auth', rateLimitMiddleware.auth);
  }
}

/**
 * Setup API-specific middleware
 * Applied to API routes for proper rate limiting and logging
 */
export function setupAPIMiddleware(app: Express): void {
  if (config.rateLimit.enabled) {
    // Apply user-based rate limiting to authenticated API routes
    app.use('/api', rateLimitMiddleware.user);
  }
}

/**
 * Setup public API middleware
 * Applied to public API routes with API key-based rate limiting  
 */
export function setupPublicAPIMiddleware(app: Express): void {
  if (config.rateLimit.enabled) {
    // Apply API key-based rate limiting to public APIs
    app.use('/public-api', rateLimitMiddleware.publicAPI);
  }
}

export default {
  setupCoreMiddleware,
  setupAuthMiddleware,
  setupAPIMiddleware,
  setupPublicAPIMiddleware
};