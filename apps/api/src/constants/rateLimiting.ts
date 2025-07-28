/**
 * Rate Limiting Constants and Configuration
 * Based on Zeda's production-tested rate limiting patterns
 */

export const RATE_LIMIT_ENTITIES = {
  IP: 'ip',
  USER_ID: 'user',
  ORGANIZATION: 'organization',
  API_KEY: 'api_key'
} as const;

export const RATE_LIMITER_NAMESPACES = {
  API_GENERAL: 'feedbackhub-api-general',
  AUTH: 'feedbackhub-auth',
  PUBLIC_API: 'feedbackhub-public-api',
  USER_ACTIONS: 'feedbackhub-user-actions',
  ORGANIZATION: 'feedbackhub-organization',
  INTEGRATIONS: 'feedbackhub-integrations',
  WEBHOOK: 'feedbackhub-webhook'
} as const;

export const RATE_LIMITER_CONNECTION_NAMES = {
  GENERAL: 'rate-limiter-general',
  AUTH: 'rate-limiter-auth',
  PUBLIC_API: 'rate-limiter-public-api',
  USER: 'rate-limiter-user',
  ORGANIZATION: 'rate-limiter-org',
  INTEGRATIONS: 'rate-limiter-int',
  WEBHOOK: 'rate-limiter-webhook'
} as const;

// Production-tested rate limit configurations
export const PRODUCTION_RATE_LIMITS = {
  // Authentication endpoints - strict limits to prevent brute force
  AUTH_LOGIN: {
    interval: 15 * 60 * 1000,  // 15 minutes
    maxInInterval: 5,          // 5 attempts per 15 minutes
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'Login attempts per IP'
  },

  AUTH_SIGNUP: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 3,          // 3 signups per hour per IP
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'Signup attempts per IP'
  },

  AUTH_RESET_PASSWORD: {  
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 5,          // 5 password reset attempts per hour
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'Password reset attempts per IP'
  },

  // General API endpoints
  API_READ: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 100,        // 100 requests per minute
    entity: RATE_LIMIT_ENTITIES.USER_ID,
    description: 'Read API requests per user'
  },

  API_WRITE: {
    interval: 60 * 1000,       // 1 minute  
    maxInInterval: 30,         // 30 write requests per minute
    entity: RATE_LIMIT_ENTITIES.USER_ID,
    description: 'Write API requests per user'
  },

  API_DELETE: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 10,         // 10 delete requests per minute
    entity: RATE_LIMIT_ENTITIES.USER_ID,
    description: 'Delete API requests per user'
  },

  // Public API endpoints (for external integrations)
  PUBLIC_API_FREE: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 100,        // 100 requests per hour for free tier
    entity: RATE_LIMIT_ENTITIES.API_KEY,
    description: 'Public API requests for free tier'
  },

  PUBLIC_API_PAID: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 10000,      // 10,000 requests per hour for paid tier
    entity: RATE_LIMIT_ENTITIES.API_KEY,
    description: 'Public API requests for paid tier'
  },

  // Organization-level limits
  ORG_FEEDBACK_CREATE: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 1000,       // 1000 feedback items per hour per org
    entity: RATE_LIMIT_ENTITIES.ORGANIZATION,
    description: 'Feedback creation per organization'
  },

  ORG_INTEGRATION_SYNC: {
    interval: 60 * 60 * 1000,  // 1 hour
    maxInInterval: 100,        // 100 integration syncs per hour per org
    entity: RATE_LIMIT_ENTITIES.ORGANIZATION,
    description: 'Integration sync requests per organization'
  },

  // Integration-specific limits
  SLACK_WEBHOOK: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 60,         // 60 webhook calls per minute (aligned with Slack limits)
    entity: RATE_LIMIT_ENTITIES.ORGANIZATION,
    description: 'Slack webhook calls per organization'
  },

  ZENDESK_API: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 200,        // 200 API calls per minute (under Zendesk limit of 700)
    entity: RATE_LIMIT_ENTITIES.ORGANIZATION,
    description: 'Zendesk API calls per organization'
  },

  INTERCOM_API: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 300,        // 300 API calls per minute (under Intercom limit of 1000)
    entity: RATE_LIMIT_ENTITIES.ORGANIZATION,
    description: 'Intercom API calls per organization'
  },

  // Webhook endpoints
  WEBHOOK_RECEIVE: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 1000,       // 1000 webhook receives per minute per IP
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'Webhook receive calls per IP'
  },

  // Admin/system endpoints
  ADMIN_ACTIONS: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 10,         // 10 admin actions per minute
    entity: RATE_LIMIT_ENTITIES.USER_ID,
    description: 'Admin actions per user'
  }
} as const;

// Development rate limits (more permissive)
export const DEVELOPMENT_RATE_LIMITS = {
  AUTH_LOGIN: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 20,         // 20 attempts per minute (more permissive for testing)
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'Login attempts per IP (dev)'
  },

  API_GENERAL: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 1000,       // 1000 requests per minute (very permissive)
    entity: RATE_LIMIT_ENTITIES.IP,
    description: 'General API requests per IP (dev)'
  },

  PUBLIC_API: {
    interval: 60 * 1000,       // 1 minute
    maxInInterval: 500,        // 500 requests per minute (permissive for testing)
    entity: RATE_LIMIT_ENTITIES.API_KEY,
    description: 'Public API requests (dev)'
  }
} as const;

// Helper function to get rate limits based on environment
export function getRateLimits() {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? PRODUCTION_RATE_LIMITS : DEVELOPMENT_RATE_LIMITS;
}

// Error messages for rate limiting
export const RATE_LIMIT_MESSAGES = {
  AUTH: 'Too many authentication attempts. Please try again later.',
  API_GENERAL: 'API rate limit exceeded. Please slow down your requests.',
  PUBLIC_API: 'Public API rate limit exceeded. Please check your usage or upgrade your plan.',
  ORGANIZATION: 'Organization rate limit exceeded. Please contact support if this continues.',
  INTEGRATION: 'Integration rate limit exceeded. Please reduce the frequency of sync operations.',
  WEBHOOK: 'Webhook rate limit exceeded. Please check your webhook configuration.',
  ADMIN: 'Admin action rate limit exceeded. Please wait before performing more administrative actions.'
} as const;

// Rate limit error codes
export const RATE_LIMIT_ERROR_CODES = {
  TOO_MANY_REQUESTS: 'RATE_LIMIT_EXCEEDED',
  REDIS_CONNECTION_ERROR: 'RATE_LIMIT_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'RATE_LIMIT_CONFIG_ERROR'
} as const;

export default {
  RATE_LIMIT_ENTITIES,
  RATE_LIMITER_NAMESPACES,
  RATE_LIMITER_CONNECTION_NAMES,
  PRODUCTION_RATE_LIMITS,
  DEVELOPMENT_RATE_LIMITS,
  getRateLimits,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_ERROR_CODES
};