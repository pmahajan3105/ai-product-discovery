/**
 * Error Messages - Centralized error message constants
 * Enhanced version of Zeda's error message system with better organization and i18n support
 */

// ===== VALIDATION ERRORS =====
export const VALIDATION_ERRORS = {
  INVALID_ID: 'Invalid ID provided',
  INVALID_EMAIL: 'Invalid email address format',
  INVALID_URL: 'Invalid URL format',
  REQUIRED_FIELD_MISSING: 'Required field is missing',
  FIELD_TOO_SHORT: 'Field value is too short',
  FIELD_TOO_LONG: 'Field value is too long',
  INVALID_DATE_FORMAT: 'Invalid date format',
  INVALID_ENUM_VALUE: 'Invalid value provided',
  MALFORMED_JSON: 'Malformed JSON data',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_PAGINATION: 'Invalid pagination parameters'
} as const;

// ===== AUTHENTICATION ERRORS =====
export const AUTH_ERRORS = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  INVALID_TOKEN: 'Invalid or expired authentication token',
  TOKEN_EXPIRED: 'Authentication token has expired',
  REFRESH_TOKEN_INVALID: 'Invalid refresh token',
  SESSION_EXPIRED: 'User session has expired',
  ACCOUNT_LOCKED: 'Account has been locked due to multiple failed attempts',
  ACCOUNT_NOT_VERIFIED: 'Account email has not been verified',
  USER_NOT_FOUND: 'User account not found',
  INCORRECT_PASSWORD: 'Incorrect password provided',
  PASSWORD_TOO_WEAK: 'Password does not meet security requirements',
  PASSWORD_REUSE: 'Password has been used recently',
  EMAIL_NOT_VERIFIED: 'Email address has not been verified',
  USER_ALREADY_EXISTS: 'User already exists with this email',
  MAGIC_LINK_EXPIRED: 'Magic link has expired',
  MAGIC_LINK_INVALID: 'Invalid magic link provided'
} as const;

// ===== AUTHORIZATION ERRORS =====
export const AUTHORIZATION_ERRORS = {
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
  ACCESS_DENIED: 'Access denied to requested resource',
  ORGANIZATION_ACCESS_REQUIRED: 'Organization membership required',
  ADMIN_PERMISSIONS_REQUIRED: 'Administrator permissions required',
  RESOURCE_OWNER_ONLY: 'Only resource owner can perform this action',
  PERMISSION_NOT_FOUND: 'Permission does not exist',
  ROLE_NOT_FOUND: 'Role does not exist',
  SCOPE_INVALID: 'Invalid access scope',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded for this action'
} as const;

// ===== ORGANIZATION ERRORS =====
export const ORGANIZATION_ERRORS = {
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  ORGANIZATION_NAME_REQUIRED: 'Organization name is required',
  ORGANIZATION_NAME_EXISTS: 'Organization name already exists',
  ORGANIZATION_CREATION_FAILED: 'Failed to create organization',
  ORGANIZATION_UPDATE_FAILED: 'Failed to update organization',
  ORGANIZATION_DELETE_FAILED: 'Failed to delete organization',
  MEMBER_NOT_FOUND: 'Organization member not found',
  MEMBER_ALREADY_EXISTS: 'User is already a member of this organization',
  INVITATION_NOT_FOUND: 'Invitation not found',
  INVITATION_EXPIRED: 'Invitation has expired',
  INVITATION_ALREADY_ACCEPTED: 'Invitation has already been accepted',
  CANNOT_REMOVE_OWNER: 'Cannot remove organization owner',
  MINIMUM_ADMIN_REQUIRED: 'At least one administrator is required',
  BILLING_SETUP_REQUIRED: 'Billing setup is required for this action',
  SUBSCRIPTION_EXPIRED: 'Organization subscription has expired',
  USAGE_LIMIT_EXCEEDED: 'Organization usage limit exceeded'
} as const;

// ===== FEEDBACK ERRORS =====
export const FEEDBACK_ERRORS = {
  FEEDBACK_NOT_FOUND: 'Feedback not found',
  FEEDBACK_TITLE_REQUIRED: 'Feedback title is required',
  FEEDBACK_DESCRIPTION_REQUIRED: 'Feedback description is required',
  FEEDBACK_CREATION_FAILED: 'Failed to create feedback',
  FEEDBACK_UPDATE_FAILED: 'Failed to update feedback',
  FEEDBACK_DELETE_FAILED: 'Failed to delete feedback',
  FEEDBACK_ALREADY_ARCHIVED: 'Feedback is already archived',
  FEEDBACK_NOT_ARCHIVED: 'Feedback is not archived',
  FEEDBACK_ASSIGNMENT_FAILED: 'Failed to assign feedback',
  FEEDBACK_UNASSIGNMENT_FAILED: 'Failed to unassign feedback',
  FEEDBACK_STATUS_INVALID: 'Invalid feedback status',
  FEEDBACK_PRIORITY_INVALID: 'Invalid feedback priority',
  FEEDBACK_SOURCE_INVALID: 'Invalid feedback source',
  FEEDBACK_EXPORT_FAILED: 'Failed to export feedback data',
  FEEDBACK_IMPORT_FAILED: 'Failed to import feedback data',
  FEEDBACK_BULK_UPDATE_FAILED: 'Failed to bulk update feedback',
  FEEDBACK_DUPLICATE_DETECTION_FAILED: 'Failed to detect duplicate feedback',
  FEEDBACK_LINKING_FAILED: 'Failed to link feedback items',
  FEEDBACK_UNLINKING_FAILED: 'Failed to unlink feedback items'
} as const;

// ===== CUSTOMER ERRORS =====
export const CUSTOMER_ERRORS = {
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_EMAIL_REQUIRED: 'Customer email is required',
  CUSTOMER_CREATION_FAILED: 'Failed to create customer',
  CUSTOMER_UPDATE_FAILED: 'Failed to update customer',
  CUSTOMER_DELETE_FAILED: 'Failed to delete customer',
  CUSTOMER_MERGE_FAILED: 'Failed to merge customer profiles',
  CUSTOMER_ALREADY_EXISTS: 'Customer already exists with this email',
  CUSTOMER_PROFILE_INCOMPLETE: 'Customer profile is incomplete',
  CUSTOMER_ANALYTICS_FAILED: 'Failed to generate customer analytics',
  CUSTOMER_IDENTIFICATION_FAILED: 'Failed to identify customer',
  CUSTOMER_SEGMENTATION_FAILED: 'Failed to segment customer data'
} as const;

// ===== INTEGRATION ERRORS =====
export const INTEGRATION_ERRORS = {
  INTEGRATION_NOT_FOUND: 'Integration not found',
  INTEGRATION_NOT_SUPPORTED: 'Integration type not supported',
  INTEGRATION_ALREADY_CONNECTED: 'Integration is already connected',
  INTEGRATION_CONNECTION_FAILED: 'Failed to connect integration',
  INTEGRATION_DISCONNECTION_FAILED: 'Failed to disconnect integration',
  INTEGRATION_SYNC_FAILED: 'Integration synchronization failed',
  INTEGRATION_AUTH_FAILED: 'Integration authentication failed',
  INTEGRATION_INACTIVE: 'Integration is inactive',
  INTEGRATION_RATE_LIMITED: 'Integration rate limit exceeded',
  INTEGRATION_QUOTA_EXCEEDED: 'Integration quota exceeded',
  INTEGRATION_CONFIG_INVALID: 'Invalid integration configuration',
  INTEGRATION_WEBHOOK_FAILED: 'Webhook processing failed',
  INTEGRATION_DATA_MAPPING_FAILED: 'Data mapping configuration failed',
  THIRD_PARTY_SERVICE_UNAVAILABLE: 'Third-party service is currently unavailable',
  INTEGRATION_VERSION_UNSUPPORTED: 'Integration version is no longer supported'
} as const;

// ===== DATABASE ERRORS =====
export const DATABASE_ERRORS = {
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  DATABASE_QUERY_FAILED: 'Database query execution failed',
  DATABASE_TRANSACTION_FAILED: 'Database transaction failed',
  DATABASE_CONSTRAINT_VIOLATION: 'Database constraint violation',
  DATABASE_UNIQUE_VIOLATION: 'Unique constraint violation',
  DATABASE_FOREIGN_KEY_VIOLATION: 'Foreign key constraint violation',
  DATABASE_TIMEOUT: 'Database operation timed out',
  DATABASE_DEADLOCK: 'Database deadlock detected',
  MIGRATION_FAILED: 'Database migration failed',
  SEED_DATA_FAILED: 'Failed to seed database with initial data',
  BACKUP_FAILED: 'Database backup failed',
  RESTORE_FAILED: 'Database restore failed'
} as const;

// ===== API ERRORS =====
export const API_ERRORS = {
  API_KEY_NOT_FOUND: 'API key not found',
  API_KEY_INVALID: 'Invalid API key',
  API_KEY_EXPIRED: 'API key has expired',
  API_KEY_REVOKED: 'API key has been revoked',
  API_KEY_CREATION_FAILED: 'Failed to create API key',
  API_QUOTA_EXCEEDED: 'API quota exceeded',
  API_VERSION_UNSUPPORTED: 'API version is no longer supported',
  WEBHOOK_URL_INVALID: 'Invalid webhook URL',
  WEBHOOK_DELIVERY_FAILED: 'Webhook delivery failed',
  WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
  API_ENDPOINT_NOT_FOUND: 'API endpoint not found',
  API_METHOD_NOT_ALLOWED: 'HTTP method not allowed for this endpoint'
} as const;

// ===== SYSTEM ERRORS =====
export const SYSTEM_ERRORS = {
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable',
  MAINTENANCE_MODE: 'System is currently under maintenance',
  FEATURE_NOT_AVAILABLE: 'Feature is not available in your plan',
  RESOURCE_EXHAUSTED: 'System resources are exhausted',
  TIMEOUT_ERROR: 'Operation timed out',
  EXTERNAL_SERVICE_ERROR: 'External service error',
  CONFIGURATION_ERROR: 'System configuration error',
  CACHE_ERROR: 'Cache operation failed',
  QUEUE_ERROR: 'Message queue operation failed',
  STORAGE_ERROR: 'File storage operation failed',
  NETWORK_ERROR: 'Network communication error'
} as const;

// ===== ANALYTICS ERRORS =====
export const ANALYTICS_ERRORS = {
  REPORT_GENERATION_FAILED: 'Failed to generate report',
  ANALYTICS_DATA_UNAVAILABLE: 'Analytics data is not available',
  DASHBOARD_CONFIG_INVALID: 'Invalid dashboard configuration',
  METRIC_CALCULATION_FAILED: 'Failed to calculate metrics',
  DATA_EXPORT_FAILED: 'Failed to export analytics data',
  CHART_RENDERING_FAILED: 'Failed to render chart',
  FILTER_INVALID: 'Invalid filter parameters',
  DATE_RANGE_INVALID: 'Invalid date range specified'
} as const;

// ===== CUSTOM FIELD ERRORS =====
export const CUSTOM_FIELD_ERRORS = {
  CUSTOM_FIELD_NOT_FOUND: 'Custom field not found',
  CUSTOM_FIELD_NAME_REQUIRED: 'Custom field name is required',
  CUSTOM_FIELD_TYPE_INVALID: 'Invalid custom field type',
  CUSTOM_FIELD_OPTIONS_INVALID: 'Invalid custom field options',
  CUSTOM_FIELD_VALUE_INVALID: 'Invalid value for custom field',
  CUSTOM_FIELD_CREATION_FAILED: 'Failed to create custom field',
  CUSTOM_FIELD_UPDATE_FAILED: 'Failed to update custom field',
  CUSTOM_FIELD_DELETE_FAILED: 'Failed to delete custom field',
  CUSTOM_FIELD_IN_USE: 'Custom field is currently in use and cannot be deleted',
  CUSTOM_FIELD_LIMIT_EXCEEDED: 'Maximum number of custom fields exceeded'
} as const;

// ===== GENERAL ERRORS =====
export const GENERAL_ERRORS = {
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
  OPERATION_FAILED: 'Operation failed to complete',
  RESOURCE_NOT_FOUND: 'Requested resource not found',
  RESOURCE_ALREADY_EXISTS: 'Resource already exists',
  OPERATION_NOT_ALLOWED: 'Operation not allowed',
  DEPENDENCY_MISSING: 'Required dependency is missing',
  CONFLICT_ERROR: 'Conflict occurred during operation',
  PRECONDITION_FAILED: 'Precondition for operation not met',
  REQUEST_TOO_LARGE: 'Request payload is too large',
  UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type',
  UNPROCESSABLE_ENTITY: 'Request contains invalid data'
} as const;

// ===== COMBINED ERROR MESSAGES =====
export const ERROR_MESSAGES = {
  ...VALIDATION_ERRORS,
  ...AUTH_ERRORS,
  ...AUTHORIZATION_ERRORS,
  ...ORGANIZATION_ERRORS,
  ...FEEDBACK_ERRORS,
  ...CUSTOMER_ERRORS,
  ...INTEGRATION_ERRORS,
  ...DATABASE_ERRORS,
  ...API_ERRORS,
  ...SYSTEM_ERRORS,
  ...ANALYTICS_ERRORS,
  ...CUSTOM_FIELD_ERRORS,
  ...GENERAL_ERRORS
} as const;

// ===== ERROR CATEGORIES =====
export const ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  ORGANIZATION: 'ORGANIZATION',
  FEEDBACK: 'FEEDBACK',
  CUSTOMER: 'CUSTOMER',
  INTEGRATION: 'INTEGRATION',
  DATABASE: 'DATABASE',
  API: 'API',
  SYSTEM: 'SYSTEM',
  ANALYTICS: 'ANALYTICS',
  CUSTOM_FIELD: 'CUSTOM_FIELD',
  GENERAL: 'GENERAL'
} as const;

// ===== HTTP STATUS CODE MAPPINGS =====
export const ERROR_STATUS_MAPPINGS = {
  // 400 Bad Request
  INVALID_ID: 400,
  INVALID_EMAIL: 400,
  INVALID_URL: 400,
  REQUIRED_FIELD_MISSING: 400,
  FIELD_TOO_SHORT: 400,
  FIELD_TOO_LONG: 400,
  INVALID_DATE_FORMAT: 400,
  INVALID_ENUM_VALUE: 400,
  MALFORMED_JSON: 400,
  INVALID_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  INVALID_PAGINATION: 400,
  
  // 401 Unauthorized
  AUTHENTICATION_REQUIRED: 401,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  SESSION_EXPIRED: 401,
  API_KEY_INVALID: 401,
  API_KEY_EXPIRED: 401,
  
  // 403 Forbidden
  INSUFFICIENT_PERMISSIONS: 403,
  ACCESS_DENIED: 403,
  ORGANIZATION_ACCESS_REQUIRED: 403,
  ADMIN_PERMISSIONS_REQUIRED: 403,
  RESOURCE_OWNER_ONLY: 403,
  ACCOUNT_LOCKED: 403,
  API_KEY_REVOKED: 403,
  
  // 404 Not Found
  ORGANIZATION_NOT_FOUND: 404,
  FEEDBACK_NOT_FOUND: 404,
  CUSTOMER_NOT_FOUND: 404,
  INTEGRATION_NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  API_ENDPOINT_NOT_FOUND: 404,
  
  // 409 Conflict
  ORGANIZATION_NAME_EXISTS: 409,
  CUSTOMER_ALREADY_EXISTS: 409,
  MEMBER_ALREADY_EXISTS: 409,
  RESOURCE_ALREADY_EXISTS: 409,
  INTEGRATION_ALREADY_CONNECTED: 409,
  
  // 422 Unprocessable Entity
  FEEDBACK_STATUS_INVALID: 422,
  FEEDBACK_PRIORITY_INVALID: 422,
  CUSTOM_FIELD_TYPE_INVALID: 422,
  CUSTOM_FIELD_VALUE_INVALID: 422,
  UNPROCESSABLE_ENTITY: 422,
  
  // 429 Too Many Requests
  RATE_LIMIT_EXCEEDED: 429,
  API_QUOTA_EXCEEDED: 429,
  INTEGRATION_RATE_LIMITED: 429,
  
  // 500 Internal Server Error (default for unmapped errors)
  INTERNAL_SERVER_ERROR: 500,
  DATABASE_CONNECTION_FAILED: 500,
  DATABASE_QUERY_FAILED: 500,
  SYSTEM_ERRORS: 500
} as const;

// ===== TYPE DEFINITIONS =====
export type ErrorCode = keyof typeof ERROR_MESSAGES;
export type ErrorCategory = keyof typeof ERROR_CATEGORIES;
export type ErrorMessage = typeof ERROR_MESSAGES[ErrorCode];

// ===== UTILITY FUNCTIONS =====

/**
 * Get error message by code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.SOMETHING_WENT_WRONG;
}

/**
 * Get HTTP status code for error
 */
export function getErrorStatusCode(code: ErrorCode): number {
  return ERROR_STATUS_MAPPINGS[code] || 500;
}

/**
 * Check if error code exists
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return code in ERROR_MESSAGES;
}

/**
 * Get error category from code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory | null {
  // Simple categorization based on error code prefix/pattern
  const codeStr = code.toString();
  
  if (Object.values(VALIDATION_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.VALIDATION;
  }
  if (Object.values(AUTH_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.AUTHENTICATION;
  }
  if (Object.values(AUTHORIZATION_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.AUTHORIZATION;
  }
  if (Object.values(ORGANIZATION_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.ORGANIZATION;
  }
  if (Object.values(FEEDBACK_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.FEEDBACK;
  }
  if (Object.values(CUSTOMER_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.CUSTOMER;
  }
  if (Object.values(INTEGRATION_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.INTEGRATION;
  }
  if (Object.values(DATABASE_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.DATABASE;
  }
  if (Object.values(API_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.API;
  }
  if (Object.values(SYSTEM_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.SYSTEM;
  }
  if (Object.values(ANALYTICS_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.ANALYTICS;
  }
  if (Object.values(CUSTOM_FIELD_ERRORS).includes(ERROR_MESSAGES[code])) {
    return ERROR_CATEGORIES.CUSTOM_FIELD;
  }
  
  return ERROR_CATEGORIES.GENERAL;
}

export default {
  ERROR_MESSAGES,
  ERROR_CATEGORIES,
  ERROR_STATUS_MAPPINGS,
  getErrorMessage,
  getErrorStatusCode,
  isValidErrorCode,
  getErrorCategory
};