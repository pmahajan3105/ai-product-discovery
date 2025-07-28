/**
 * Error System Index - Central export for all error handling functionality
 * Enhanced error system with structured handling, logging, and recovery
 */

// Core error classes
export { BaseError, ErrorContext, ErrorDetails } from './BaseError';
export { ErrorHandler } from './ErrorHandler';

// Error messages and constants
export {
  ERROR_MESSAGES,
  ERROR_CATEGORIES,
  ERROR_STATUS_MAPPINGS,
  ErrorCode,
  ErrorCategory,
  ErrorMessage,
  getErrorMessage,
  getErrorStatusCode,
  isValidErrorCode,
  getErrorCategory,
  // Categorized error messages
  VALIDATION_ERRORS,
  AUTH_ERRORS,
  AUTHORIZATION_ERRORS,
  ORGANIZATION_ERRORS,
  FEEDBACK_ERRORS,
  CUSTOMER_ERRORS,
  INTEGRATION_ERRORS,
  DATABASE_ERRORS,
  API_ERRORS,
  SYSTEM_ERRORS,
  ANALYTICS_ERRORS,
  CUSTOM_FIELD_ERRORS,
  GENERAL_ERRORS
} from './ErrorMessages';

// Specific error classes
export {
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  SessionExpiredError,
  AuthorizationError,
  InsufficientPermissionsError,
  AccessDeniedError,
  RateLimitExceededError,
  ResourceNotFoundError,
  ResourceAlreadyExistsError,
  OrganizationError,
  OrganizationNotFoundError,
  MemberNotFoundError,
  FeedbackError,
  FeedbackNotFoundError,
  FeedbackCreationFailedError,
  CustomerError,
  CustomerNotFoundError,
  CustomerAlreadyExistsError,
  IntegrationError,
  IntegrationNotFoundError,
  IntegrationConnectionFailedError,
  IntegrationSyncFailedError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTransactionError,
  DatabaseConstraintError,
  ApiError,
  ApiKeyError,
  WebhookError,
  SystemError,
  ServiceUnavailableError,
  MaintenanceModeError,
  TimeoutError,
  AnalyticsError,
  ReportGenerationError
} from './SpecificErrors';

// Utility functions for common error scenarios
export const createError = {
  validation: (field: string, value: any, expectedType: string) => 
    BaseError.validationError('INVALID_ENUM_VALUE', field, value),
  
  notFound: (resourceType: string, resourceId?: string) => 
    BaseError.notFoundError(`${resourceType.toUpperCase()}_NOT_FOUND` as ErrorCode, resourceId),
  
  unauthorized: (reason?: string) => 
    BaseError.authenticationError('AUTHENTICATION_REQUIRED'),
  
  forbidden: (requiredPermissions?: string[]) => 
    BaseError.authorizationError('INSUFFICIENT_PERMISSIONS', requiredPermissions),
  
  conflict: (resource: string, conflictingValue?: string) => 
    BaseError.conflictError('RESOURCE_ALREADY_EXISTS', conflictingValue),
  
  serverError: (message?: string, cause?: Error) => 
    BaseError.serverError('INTERNAL_SERVER_ERROR', cause),
  
  rateLimit: (retryAfter?: number) => 
    BaseError.rateLimitError(retryAfter)
};

export default {
  BaseError,
  ErrorHandler,
  ERROR_MESSAGES,
  createError
};