/**
 * Route Configuration Constants - Enhanced version of Zeda's route management system
 * Defines HTTP methods, versions, scopes, and resource types for centralized route management
 */

// HTTP Methods
export const METHOD_GET = 'GET';
export const METHOD_POST = 'POST';
export const METHOD_PUT = 'PUT';
export const METHOD_PATCH = 'PATCH';
export const METHOD_DELETE = 'DELETE';

export const HTTP_METHODS = [
  METHOD_GET,
  METHOD_POST,
  METHOD_PUT,
  METHOD_PATCH,
  METHOD_DELETE
] as const;

export type HttpMethod = typeof HTTP_METHODS[number];

// API Versions
export const VERSION_V1 = 'v1';
export const VERSION_V2 = 'v2';

export const API_VERSIONS = [VERSION_V1, VERSION_V2] as const;
export type ApiVersion = typeof API_VERSIONS[number];

// Access Scopes - matching our permission system
export const SCOPE_PUBLIC = 'PUBLIC';
export const SCOPE_AUTHENTICATED = 'AUTHENTICATED';
export const SCOPE_ORGANIZATION = 'ORGANIZATION';
export const SCOPE_SYSTEM = 'SYSTEM';

export const ACCESS_SCOPES = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
} as const;

// Resource Types - for consistent resource identification
export const RESOURCE_TYPES = {
  FEEDBACK: 'feedback',
  CUSTOMER: 'customer',
  ORGANIZATION: 'organization',
  USER: 'user',
  INTEGRATION: 'integration',
  CUSTOM_FIELD: 'custom_field'
} as const;

// Rate Limiting Configurations
export const RATE_LIMIT_PRESETS = {
  STRICT: { windowMs: 60000, maxRequests: 5 },      // 5 requests per minute
  MODERATE: { windowMs: 60000, maxRequests: 30 },   // 30 requests per minute
  LENIENT: { windowMs: 60000, maxRequests: 100 },   // 100 requests per minute
  EXPORT: { windowMs: 300000, maxRequests: 3 },     // 3 requests per 5 minutes
  BULK: { windowMs: 60000, maxRequests: 10 },       // 10 requests per minute
  PUBLIC: { windowMs: 60000, maxRequests: 1000 }    // 1000 requests per minute
} as const;

// Logging Configurations
export const LOG_PRESETS = {
  NONE: { request: false, response: false },
  REQUEST_ONLY: { request: true, response: false },
  RESPONSE_ONLY: { request: false, response: true },
  BOTH: { request: true, response: true },
  SENSITIVE: { request: true, response: false, sanitize: true }
} as const;

// Route Categories for grouping and documentation
export const ROUTE_CATEGORIES = {
  AUTHENTICATION: 'Authentication',
  ORGANIZATION_MANAGEMENT: 'Organization Management',
  FEEDBACK_MANAGEMENT: 'Feedback Management',
  CUSTOMER_MANAGEMENT: 'Customer Management',
  INTEGRATION_MANAGEMENT: 'Integration Management',
  ANALYTICS_REPORTING: 'Analytics & Reporting',
  API_MANAGEMENT: 'API Management',
  SYSTEM_ADMINISTRATION: 'System Administration'
} as const;

// Environment-specific configurations
export const ENVIRONMENT_CONFIGS = {
  development: {
    enableDebugLogging: true,
    relaxedRateLimit: true,
    detailedErrorMessages: true
  },
  staging: {
    enableDebugLogging: true,
    relaxedRateLimit: false,
    detailedErrorMessages: true
  },
  production: {
    enableDebugLogging: false,
    relaxedRateLimit: false,
    detailedErrorMessages: false
  }
} as const;

// Route Status Codes for documentation and validation
export const ROUTE_STATUS_CODES = {
  SUCCESS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204
  },
  CLIENT_ERROR: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    RATE_LIMITED: 429
  },
  SERVER_ERROR: {
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
  }
} as const;

// Common endpoint patterns
export const ENDPOINT_PATTERNS = {
  ROOT: '/',
  ID_PARAM: '/:id',
  BULK_OPERATION: '/bulk',
  EXPORT: '/export',
  IMPORT: '/import',
  SEARCH: '/search',
  HEALTH: '/health',
  SETTINGS: '/settings',
  ASSIGN: '/:id/assign',
  ARCHIVE: '/archive',
  UNARCHIVE: '/unarchive'
} as const;

export default {
  // Methods
  METHOD_GET,
  METHOD_POST,
  METHOD_PUT,
  METHOD_PATCH,
  METHOD_DELETE,
  HTTP_METHODS,

  // Versions
  VERSION_V1,
  VERSION_V2,
  API_VERSIONS,

  // Scopes
  SCOPE_PUBLIC,
  SCOPE_AUTHENTICATED,
  SCOPE_ORGANIZATION,
  SCOPE_SYSTEM,
  ACCESS_SCOPES,

  // Resources
  RESOURCE_TYPES,

  // Configurations
  RATE_LIMIT_PRESETS,
  LOG_PRESETS,
  ROUTE_CATEGORIES,
  ENVIRONMENT_CONFIGS,
  ROUTE_STATUS_CODES,
  ENDPOINT_PATTERNS
};