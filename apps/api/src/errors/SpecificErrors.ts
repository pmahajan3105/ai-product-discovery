/**
 * Specific Error Classes - Domain-specific error classes extending BaseError
 * Enhanced error handling for different business domains
 */

import { BaseError, ErrorContext } from './BaseError';
import { ErrorCode } from './ErrorMessages';

// ===== VALIDATION ERRORS =====

export class ValidationError extends BaseError {
  constructor(
    code: ErrorCode,
    field?: string,
    value?: any,
    context?: ErrorContext
  ) {
    super({
      code,
      message: `Validation failed${field ? ` for field '${field}'` : ''}`,
      statusCode: 400,
      category: 'VALIDATION',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        field,
        value: typeof value === 'object' ? '[object]' : value
      }
    });
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(field: string, context?: ErrorContext) {
    super('REQUIRED_FIELD_MISSING', field, undefined, context);
  }
}

export class InvalidFormatError extends ValidationError {
  constructor(field: string, expectedFormat: string, actualValue?: any, context?: ErrorContext) {
    super('INVALID_ENUM_VALUE', field, actualValue, context);
    this.metadata = {
      ...this.metadata,
      expectedFormat
    };
  }
}

// ===== AUTHENTICATION ERRORS =====

export class AuthenticationError extends BaseError {
  constructor(code: ErrorCode, context?: ErrorContext) {
    super({
      code,
      message: 'Authentication failed',
      statusCode: 401,
      category: 'AUTHENTICATION',
      context,
      retryable: false,
      userFriendly: true
    });
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(context?: ErrorContext) {
    super('INVALID_CREDENTIALS', context);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(tokenType: string = 'access', context?: ErrorContext) {
    super('TOKEN_EXPIRED', context);
    this.metadata = { tokenType };
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor(context?: ErrorContext) {
    super('SESSION_EXPIRED', context);
  }
}

// ===== AUTHORIZATION ERRORS =====

export class AuthorizationError extends BaseError {
  constructor(
    code: ErrorCode,
    requiredPermissions?: string[],
    userPermissions?: string[],
    context?: ErrorContext
  ) {
    super({
      code,
      message: 'Access denied',
      statusCode: 403,
      category: 'AUTHORIZATION',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        requiredPermissions,
        userPermissions
      }
    });
  }
}

export class InsufficientPermissionsError extends AuthorizationError {
  constructor(
    requiredPermissions: string[],
    userPermissions?: string[],
    context?: ErrorContext
  ) {
    super('INSUFFICIENT_PERMISSIONS', requiredPermissions, userPermissions, context);
  }
}

export class AccessDeniedError extends AuthorizationError {
  constructor(resource: string, action: string, context?: ErrorContext) {
    super('ACCESS_DENIED', undefined, undefined, context);
    this.metadata = {
      ...this.metadata,
      resource,
      action
    };
  }
}

export class RateLimitExceededError extends BaseError {
  constructor(
    limit: number,
    windowMs: number,
    retryAfter?: number,
    context?: ErrorContext
  ) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      statusCode: 429,
      category: 'AUTHORIZATION',
      context,
      retryable: true,
      userFriendly: true,
      metadata: {
        limit,
        windowMs,
        retryAfter
      }
    });
  }
}

// ===== RESOURCE ERRORS =====

export class ResourceNotFoundError extends BaseError {
  constructor(
    resourceType: string,
    resourceId?: string,
    context?: ErrorContext
  ) {
    const code = `${resourceType.toUpperCase()}_NOT_FOUND` as ErrorCode;
    
    super({
      code,
      message: `${resourceType} not found${resourceId ? ` with ID: ${resourceId}` : ''}`,
      statusCode: 404,
      category: 'GENERAL',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        resourceType,
        resourceId
      }
    });
  }
}

export class ResourceAlreadyExistsError extends BaseError {
  constructor(
    resourceType: string,
    conflictingField?: string,
    conflictingValue?: string,
    context?: ErrorContext
  ) {
    const code = `${resourceType.toUpperCase()}_ALREADY_EXISTS` as ErrorCode;
    
    super({
      code,
      message: `${resourceType} already exists${conflictingField ? ` with ${conflictingField}: ${conflictingValue}` : ''}`,
      statusCode: 409,
      category: 'GENERAL',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        resourceType,
        conflictingField,
        conflictingValue
      }
    });
  }
}

// ===== ORGANIZATION ERRORS =====

export class OrganizationError extends BaseError {
  constructor(code: ErrorCode, organizationId?: string, context?: ErrorContext) {
    super({
      code,
      message: 'Organization operation failed',
      statusCode: 400,
      category: 'ORGANIZATION',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        organizationId
      }
    });
  }
}

export class OrganizationNotFoundError extends OrganizationError {
  constructor(organizationId: string, context?: ErrorContext) {
    super('ORGANIZATION_NOT_FOUND', organizationId, context);
    this.statusCode = 404;
  }
}

export class MemberNotFoundError extends OrganizationError {
  constructor(userId: string, organizationId: string, context?: ErrorContext) {
    super('MEMBER_NOT_FOUND', organizationId, context);
    this.statusCode = 404;
    this.metadata = {
      ...this.metadata,
      userId
    };
  }
}

// ===== FEEDBACK ERRORS =====

export class FeedbackError extends BaseError {
  constructor(code: ErrorCode, feedbackId?: string, context?: ErrorContext) {
    super({
      code,
      message: 'Feedback operation failed',
      statusCode: 400,
      category: 'FEEDBACK',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        feedbackId
      }
    });
  }
}

export class FeedbackNotFoundError extends FeedbackError {
  constructor(feedbackId: string, context?: ErrorContext) {
    super('FEEDBACK_NOT_FOUND', feedbackId, context);
    this.statusCode = 404;
  }
}

export class FeedbackCreationFailedError extends FeedbackError {
  constructor(reason?: string, context?: ErrorContext) {
    super('FEEDBACK_CREATION_FAILED', undefined, context);
    this.statusCode = 500;
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      reason
    };
  }
}

// ===== CUSTOMER ERRORS =====

export class CustomerError extends BaseError {
  constructor(code: ErrorCode, customerId?: string, context?: ErrorContext) {
    super({
      code,
      message: 'Customer operation failed',
      statusCode: 400,
      category: 'CUSTOMER',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        customerId
      }
    });
  }
}

export class CustomerNotFoundError extends CustomerError {
  constructor(customerId: string, context?: ErrorContext) {
    super('CUSTOMER_NOT_FOUND', customerId, context);
    this.statusCode = 404;
  }
}

export class CustomerAlreadyExistsError extends CustomerError {
  constructor(email: string, context?: ErrorContext) {
    super('CUSTOMER_ALREADY_EXISTS', undefined, context);
    this.statusCode = 409;
    this.metadata = {
      ...this.metadata,
      email
    };
  }
}

// ===== INTEGRATION ERRORS =====

export class IntegrationError extends BaseError {
  constructor(
    code: ErrorCode,
    integrationType?: string,
    integrationId?: string,
    context?: ErrorContext
  ) {
    super({
      code,
      message: 'Integration operation failed',
      statusCode: 400,
      category: 'INTEGRATION',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        integrationType,
        integrationId
      }
    });
  }
}

export class IntegrationNotFoundError extends IntegrationError {
  constructor(integrationId: string, context?: ErrorContext) {
    super('INTEGRATION_NOT_FOUND', undefined, integrationId, context);
    this.statusCode = 404;
  }
}

export class IntegrationConnectionFailedError extends IntegrationError {
  constructor(
    integrationType: string,
    reason?: string,
    context?: ErrorContext
  ) {
    super('INTEGRATION_CONNECTION_FAILED', integrationType, undefined, context);
    this.statusCode = 502;
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      reason
    };
  }
}

export class IntegrationSyncFailedError extends IntegrationError {
  constructor(
    integrationId: string,
    syncOperation: string,
    reason?: string,
    context?: ErrorContext
  ) {
    super('INTEGRATION_SYNC_FAILED', undefined, integrationId, context);
    this.statusCode = 500;
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      syncOperation,
      reason
    };
  }
}

// ===== DATABASE ERRORS =====

export class DatabaseError extends BaseError {
  constructor(
    code: ErrorCode,
    operation?: string,
    table?: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super({
      code,
      message: 'Database operation failed',
      statusCode: 500,
      category: 'DATABASE',
      context,
      cause,
      retryable: true,
      userFriendly: false,
      metadata: {
        operation,
        table
      }
    });
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(cause?: Error, context?: ErrorContext) {
    super('DATABASE_CONNECTION_FAILED', 'connect', undefined, cause, context);
  }
}

export class DatabaseTransactionError extends DatabaseError {
  constructor(
    operation: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super('DATABASE_TRANSACTION_FAILED', operation, undefined, cause, context);
  }
}

export class DatabaseConstraintError extends DatabaseError {
  constructor(
    constraintType: 'unique' | 'foreign_key' | 'check',
    constraintName?: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    const code = constraintType === 'unique' ? 'DATABASE_UNIQUE_VIOLATION' :
                 constraintType === 'foreign_key' ? 'DATABASE_FOREIGN_KEY_VIOLATION' :
                 'DATABASE_CONSTRAINT_VIOLATION';
    
    super(code as ErrorCode, 'constraint_check', undefined, cause, context);
    this.statusCode = 400;
    this.retryable = false;
    this.userFriendly = true;
    this.metadata = {
      ...this.metadata,
      constraintType,
      constraintName
    };
  }
}

// ===== API ERRORS =====

export class ApiError extends BaseError {
  constructor(code: ErrorCode, endpoint?: string, context?: ErrorContext) {
    super({
      code,
      message: 'API operation failed',
      statusCode: 400,
      category: 'API',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        endpoint
      }
    });
  }
}

export class ApiKeyError extends ApiError {
  constructor(code: ErrorCode, keyId?: string, context?: ErrorContext) {
    super(code, undefined, context);
    this.statusCode = code === 'API_KEY_NOT_FOUND' ? 404 : 401;
    this.metadata = {
      ...this.metadata,
      keyId
    };
  }
}

export class WebhookError extends ApiError {
  constructor(
    code: ErrorCode,
    webhookUrl?: string,
    deliveryAttempt?: number,
    context?: ErrorContext
  ) {
    super(code, undefined, context);
    this.statusCode = 502;
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      webhookUrl,
      deliveryAttempt
    };
  }
}

// ===== SYSTEM ERRORS =====

export class SystemError extends BaseError {
  constructor(
    code: ErrorCode,
    service?: string,
    cause?: Error,
    context?: ErrorContext
  ) {
    super({
      code,
      message: 'System error occurred',
      statusCode: 500,
      category: 'SYSTEM',
      context,
      cause,
      retryable: true,
      userFriendly: false,
      metadata: {
        service
      }
    });
  }
}

export class ServiceUnavailableError extends SystemError {
  constructor(service: string, context?: ErrorContext) {
    super('SERVICE_UNAVAILABLE', service, undefined, context);
    this.statusCode = 503;
  }
}

export class MaintenanceModeError extends SystemError {
  constructor(estimatedDuration?: string, context?: ErrorContext) {
    super('MAINTENANCE_MODE', 'system', undefined, context);
    this.statusCode = 503;
    this.retryable = true;
    this.userFriendly = true;
    this.metadata = {
      ...this.metadata,
      estimatedDuration
    };
  }
}

export class TimeoutError extends SystemError {
  constructor(
    operation: string,
    timeoutMs: number,
    context?: ErrorContext
  ) {
    super('TIMEOUT_ERROR', operation, undefined, context);
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      timeoutMs
    };
  }
}

// ===== ANALYTICS ERRORS =====

export class AnalyticsError extends BaseError {
  constructor(
    code: ErrorCode,
    reportType?: string,
    context?: ErrorContext
  ) {
    super({
      code,
      message: 'Analytics operation failed',
      statusCode: 400,
      category: 'ANALYTICS',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        reportType
      }
    });
  }
}

export class ReportGenerationError extends AnalyticsError {
  constructor(reportType: string, reason?: string, context?: ErrorContext) {
    super('REPORT_GENERATION_FAILED', reportType, context);
    this.statusCode = 500;
    this.retryable = true;
    this.metadata = {
      ...this.metadata,
      reason
    };
  }
}

// Export all error classes
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
};