/**
 * Base Error Class - Enhanced version of Zeda's error handling
 * Provides structured error handling with context, logging, and recovery information
 */

import { logger } from '../utils/logger';
import { 
  ErrorCode, 
  ErrorCategory, 
  getErrorMessage, 
  getErrorStatusCode, 
  getErrorCategory 
} from './ErrorMessages';

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  requestId?: string;
  correlationId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: string;
  stack?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  category: ErrorCategory | null;
  context?: ErrorContext;
  cause?: Error;
  retryable?: boolean;
  userFriendly?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Enhanced Base Error class with structured error handling
 */
export class BaseError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly category: ErrorCategory | null;
  public readonly context?: ErrorContext;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly userFriendly: boolean;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: string;
  public readonly errorId: string;

  constructor(details: ErrorDetails) {
    // Set the error message
    const message = details.message || getErrorMessage(details.code);
    super(message);

    // Set error name to the class name
    this.name = this.constructor.name;

    // Core error properties
    this.code = details.code;
    this.statusCode = details.statusCode || getErrorStatusCode(details.code);
    this.category = details.category || getErrorCategory(details.code);
    this.context = details.context;
    this.cause = details.cause;
    this.retryable = details.retryable || false;
    this.userFriendly = details.userFriendly !== false; // Default to true
    this.metadata = details.metadata;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Include cause stack trace if available
    if (details.cause && details.cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${details.cause.stack}`;
    }

    // Log the error with appropriate level
    this.logError();
  }

  /**
   * Generate unique error ID for tracking
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Log the error with appropriate context
   */
  private logError(): void {
    const logLevel = this.getLogLevel();
    const logData = {
      errorId: this.errorId,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      category: this.category,
      retryable: this.retryable,
      context: this.context,
      metadata: this.metadata,
      cause: this.cause?.message,
      stack: this.stack
    };

    switch (logLevel) {
      case 'error':
        logger.error(`BaseError: ${this.message}`, this, logData);
        break;
      case 'warn':
        logger.warn(`BaseError: ${this.message}`, logData);
        break;
      case 'info':
        logger.info(`BaseError: ${this.message}`, logData);
        break;
      default:
        logger.debug(`BaseError: ${this.message}`, logData);
    }
  }

  /**
   * Determine appropriate log level based on error type
   */
  private getLogLevel(): 'error' | 'warn' | 'info' | 'debug' {
    if (this.statusCode >= 500) {
      return 'error';
    }
    if (this.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  }

  /**
   * Get user-friendly error message
   */
  public getUserFriendlyMessage(): string {
    if (!this.userFriendly) {
      return 'An error occurred. Please try again or contact support.';
    }
    return this.message;
  }

  /**
   * Get error response object for API responses
   */
  public toResponseObject(includeStack: boolean = false): {
    success: false;
    error: {
      code: ErrorCode;
      message: string;
      statusCode: number;
      category: ErrorCategory | null;
      errorId: string;
      timestamp: string;
      retryable?: boolean;
      metadata?: Record<string, any>;
      stack?: string;
    };
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.getUserFriendlyMessage(),
        statusCode: this.statusCode,
        category: this.category,
        errorId: this.errorId,
        timestamp: this.timestamp,
        retryable: this.retryable,
        metadata: this.metadata,
        ...(includeStack && { stack: this.stack })
      }
    };
  }

  /**
   * Get detailed error information for logging/debugging
   */
  public toDetailedObject(): {
    errorId: string;
    code: ErrorCode;
    message: string;
    statusCode: number;
    category: ErrorCategory | null;
    context?: ErrorContext;
    cause?: string;
    retryable: boolean;
    userFriendly: boolean;
    metadata?: Record<string, any>;
    timestamp: string;
    stack?: string;
  } {
    return {
      errorId: this.errorId,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      category: this.category,
      context: this.context,
      cause: this.cause?.message,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * Check if error is client error (4xx)
   */
  public isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is server error (5xx)
   */
  public isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Create error with additional context
   */
  public withContext(additionalContext: Partial<ErrorContext>): BaseError {
    return new BaseError({
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      category: this.category,
      context: { ...this.context, ...additionalContext },
      cause: this.cause,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      metadata: this.metadata
    });
  }

  /**
   * Create error with additional metadata
   */
  public withMetadata(additionalMetadata: Record<string, any>): BaseError {
    return new BaseError({
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      category: this.category,
      context: this.context,
      cause: this.cause,
      retryable: this.retryable,
      userFriendly: this.userFriendly,
      metadata: { ...this.metadata, ...additionalMetadata }
    });
  }

  /**
   * Create error from another error
   */
  public static fromError(
    error: Error, 
    code: ErrorCode, 
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: error.message,
      statusCode: getErrorStatusCode(code),
      category: getErrorCategory(code),
      context,
      cause: error,
      retryable: false,
      userFriendly: true
    });
  }

  /**
   * Create error from validation failure
   */
  public static validationError(
    code: ErrorCode,
    field?: string,
    value?: any,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
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

  /**
   * Create authentication error
   */
  public static authenticationError(
    code: ErrorCode,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
      statusCode: 401,
      category: 'AUTHENTICATION',
      context,
      retryable: false,
      userFriendly: true
    });
  }

  /**
   * Create authorization error
   */
  public static authorizationError(
    code: ErrorCode,
    requiredPermissions?: string[],
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
      statusCode: 403,
      category: 'AUTHORIZATION',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        requiredPermissions
      }
    });
  }

  /**
   * Create not found error
   */
  public static notFoundError(
    code: ErrorCode,
    resourceId?: string,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
      statusCode: 404,
      category: 'GENERAL',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        resourceId
      }
    });
  }

  /**
   * Create conflict error
   */
  public static conflictError(
    code: ErrorCode,
    conflictingResource?: string,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
      statusCode: 409,
      category: 'GENERAL',
      context,
      retryable: false,
      userFriendly: true,
      metadata: {
        conflictingResource
      }
    });
  }

  /**
   * Create server error
   */
  public static serverError(
    code: ErrorCode,
    cause?: Error,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code,
      message: getErrorMessage(code),
      statusCode: 500,
      category: 'SYSTEM',
      context,
      cause,
      retryable: true,
      userFriendly: false
    });
  }

  /**
   * Create rate limit error
   */
  public static rateLimitError(
    retryAfter?: number,
    context?: ErrorContext
  ): BaseError {
    return new BaseError({
      code: 'RATE_LIMIT_EXCEEDED',
      message: getErrorMessage('RATE_LIMIT_EXCEEDED'),
      statusCode: 429,
      category: 'AUTHORIZATION',
      context,
      retryable: true,
      userFriendly: true,
      metadata: {
        retryAfter
      }
    });
  }
}

export default BaseError;