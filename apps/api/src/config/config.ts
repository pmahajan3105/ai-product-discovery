/**
 * Application Configuration - Centralized configuration management
 * Based on Zeda's configuration patterns with Redis and rate limiting support
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  url?: string;
  ssl?: boolean;
  logging?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  connectTimeout: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  namespace: string;
  defaultInterval: number;
  defaultMax: number;
  redis: RedisConfig;
}

export interface SuperTokensConfig {
  connectionURI: string;
  apiKey: string;
  appName: string;
  apiDomain: string;
  websiteDomain: string;
}

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
  };
  slack: {
    clientId: string;
    clientSecret: string;
    signingSecret: string;
  };
  zendesk: {
    clientId: string;
    clientSecret: string;
  };
  intercom: {
    clientId: string;
    clientSecret: string;
  };
}

export interface LoggingConfig {
  level: string;
  dir: string;
  console: boolean;
  file: boolean;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  version: string;
  corsOrigin: string;
  jwtSecret: string;
  apiSecretKey: string;
  webhookSecret: string;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  superTokens: SuperTokensConfig;
  oauth: OAuthConfig;
  logging: LoggingConfig;
}

/**
 * Validate required environment variables
 */
function validateRequiredEnvVars(): void {
  const required = [
    'DATABASE_URL',
    'SUPERTOKENS_CONNECTION_URI',
    'SUPERTOKENS_API_KEY',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get configuration with environment-specific defaults
 */
function createConfig(): Config {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate required environment variables in production
  if (isProduction) {
    validateRequiredEnvVars();
  }

  return {
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3001', 10),
      appName: process.env.APP_NAME || 'FeedbackHub API',
      version: process.env.APP_VERSION || '1.0.0',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      jwtSecret: process.env.JWT_SECRET || 'development-jwt-secret',
      apiSecretKey: process.env.API_SECRET_KEY || 'development-api-secret',
      webhookSecret: process.env.WEBHOOK_SECRET || 'development-webhook-secret'
    },

    database: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      database: process.env.DATABASE_NAME || 'feedbackhub',
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || '',
      url: process.env.DATABASE_URL,
      ssl: isProduction,
      logging: isDevelopment
    },

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
      retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10)
    },

    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      namespace: process.env.RATE_LIMIT_REDIS_NAMESPACE || 'feedbackhub-api',
      defaultInterval: parseInt(process.env.RATE_LIMIT_DEFAULT_INTERVAL || '60000', 10),
      defaultMax: parseInt(process.env.RATE_LIMIT_DEFAULT_MAX || '100', 10),
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10)
      }
    },

    superTokens: {
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || 'https://try.supertokens.com',
      apiKey: process.env.SUPERTOKENS_API_KEY || '',
      appName: process.env.SUPERTOKENS_APP_NAME || 'FeedbackHub',
      apiDomain: process.env.SUPERTOKENS_API_DOMAIN || 'http://localhost:3001',
      websiteDomain: process.env.SUPERTOKENS_WEBSITE_DOMAIN || 'http://localhost:3000'
    },

    oauth: {
      google: {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
      },
      slack: {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
        signingSecret: process.env.SLACK_SIGNING_SECRET || ''
      },
      zendesk: {
        clientId: process.env.ZENDESK_CLIENT_ID || '',
        clientSecret: process.env.ZENDESK_CLIENT_SECRET || ''
      },
      intercom: {
        clientId: process.env.INTERCOM_CLIENT_ID || '',
        clientSecret: process.env.INTERCOM_CLIENT_SECRET || ''
      }
    },

    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      dir: process.env.LOG_DIR || path.join(process.cwd(), 'logs'),
      console: isDevelopment,
      file: true
    }
  };
}

// Create and export configuration
export const config = createConfig();

// Export individual config sections for convenience
export const {
  app: appConfig,
  database: databaseConfig,
  redis: redisConfig,
  rateLimit: rateLimitConfig,
  superTokens: superTokensConfig,
  oauth: oauthConfig,
  logging: loggingConfig
} = config;

// Environment helpers
export const isDevelopment = config.app.nodeEnv === 'development';
export const isProduction = config.app.nodeEnv === 'production';
export const isTest = config.app.nodeEnv === 'test';

// Validation helper
export function validateConfig(): void {
  try {
    validateRequiredEnvVars();
    console.log('✅ Configuration validation passed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Configuration validation failed:', errorMessage);
    throw error;
  }
}

export default config;