/**
 * Error Handler - Centralized error handling and response formatting
 * Enhanced error handling with monitoring, alerting, and recovery mechanisms
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, ErrorContext } from './BaseError';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { logger } from '../utils/logger';
import { ErrorCode, getErrorMessage, getErrorStatusCode } from './ErrorMessages';

export interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  alertOnServerErrors?: boolean;
  sanitizeErrorData?: boolean;
  enableErrorRecovery?: boolean;
}

export class ErrorHandler {
  private static options: ErrorHandlerOptions = {
    includeStack: process.env.NODE_ENV === 'development',
    logErrors: true,
    alertOnServerErrors: true,
    sanitizeErrorData: true,
    enableErrorRecovery: true
  };

  /**
   * Configure error handler options
   */
  static configure(options: Partial<ErrorHandlerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Main error handling middleware for Express
   */
  static middleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const context = this.extractRequestContext(req);
      const handledError = this.processError(error, context);
      
      // Send error response
      this.sendErrorResponse(res, handledError);
      
      // Perform post-error processing
      this.postErrorProcessing(handledError, req);
    };
  }

  /**
   * Process and normalize any error into a BaseError
   */
  static processError(error: Error, context?: ErrorContext): BaseError {
    // If already a BaseError, add context and return
    if (error instanceof BaseError) {
      return context ? error.withContext(context) : error;
    }

    // Handle specific Node.js errors
    if (this.isValidationError(error)) {
      return BaseError.validationError('INVALID_ENUM_VALUE', undefined, undefined, context);
    }

    if (this.isAuthenticationError(error)) {
      return BaseError.authenticationError('AUTHENTICATION_REQUIRED', context);
    }

    if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error, context);
    }

    if (this.isNetworkError(error)) {
      return BaseError.serverError('EXTERNAL_SERVICE_ERROR', error, context);
    }

    // Default to internal server error
    return BaseError.serverError('INTERNAL_SERVER_ERROR', error, context);
  }

  /**
   * Handle errors in async route handlers
   */
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle errors in async middleware
   */
  static asyncMiddleware(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error: Error) => {
        const context = this.extractRequestContext(req);
        const handledError = this.processError(error, context);
        next(handledError);
      });
    };
  }

  /**
   * Send structured error response
   */
  static sendErrorResponse(res: Response, error: BaseError): void {
    const responseObject = error.toResponseObject(this.options.includeStack);
    
    // Set appropriate HTTP status code
    res.status(error.statusCode);
    
    // Set error headers
    this.setErrorHeaders(res, error);
    
    // Send response using ResponseBuilder pattern
    res.json(responseObject);
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException(error: Error): void {
    logger.error('Uncaught Exception', error, {
      type: 'uncaught_exception',
      stack: error.stack
    });

    // Attempt graceful shutdown
    this.gracefulShutdown('Uncaught Exception');
  }

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    logger.error('Unhandled Promise Rejection', reason, {
      type: 'unhandled_rejection',
      promise: promise.toString()
    });

    // Attempt graceful shutdown
    this.gracefulShutdown('Unhandled Promise Rejection');
  }

  /**
   * Create error from HTTP status code
   */
  static createHttpError(
    statusCode: number,
    message?: string,
    context?: ErrorContext
  ): BaseError {
    const errorCode = this.getErrorCodeFromStatus(statusCode);
    const errorMessage = message || getErrorMessage(errorCode);
    
    return new BaseError({
      code: errorCode,
      message: errorMessage,
      statusCode,
      category: this.getCategoryFromStatus(statusCode),
      context,
      retryable: statusCode >= 500,
      userFriendly: true
    });
  }

  /**
   * Create validation error with field details
   */
  static createValidationError(
    field: string,
    value: any,
    expectedType: string,
    context?: ErrorContext
  ): BaseError {
    return BaseError.validationError('INVALID_ENUM_VALUE', field, value, context);
  }

  /**
   * Create not found error
   */
  static createNotFoundError(
    resourceType: string,
    resourceId?: string,
    context?: ErrorContext
  ): BaseError {
    const code = `${resourceType.toUpperCase()}_NOT_FOUND` as ErrorCode;
    return BaseError.notFoundError(code, resourceId, context);
  }

  /**
   * Extract request context for error tracking
   */
  private static extractRequestContext(req: Request): ErrorContext {
    return {
      userId: req.user_id,
      organizationId: req.organization_id || req.workspace_id,
      requestId: req.headers['x-request-id'] as string,
      correlationId: req.headers['x-correlation-id'] as string,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Determine if error is a validation error
   */
  private static isValidationError(error: Error): boolean {
    const validationKeywords = [
      'validation',
      'invalid',
      'required',
      'format',
      'type',
      'range'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return validationKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Determine if error is an authentication error
   */
  private static isAuthenticationError(error: Error): boolean {
    const authKeywords = [
      'unauthorized',
      'authentication',
      'token',
      'session',
      'login',
      'credentials'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return authKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Determine if error is a database error
   */
  private static isDatabaseError(error: Error): boolean {
    const dbKeywords = [
      'sequelize',
      'database',
      'connection',
      'query',
      'constraint',
      'foreign key',
      'unique',
      'deadlock'
    ];
    
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    return dbKeywords.some(keyword => 
      errorMessage.includes(keyword) || errorName.includes(keyword)
    );
  }

  /**
   * Determine if error is a network error
   */
  private static isNetworkError(error: Error): boolean {
    const networkKeywords = [
      'network',
      'timeout',
      'econnrefused',
      'enotfound',
      'etimedout',
      'econnreset'
    ];
    
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code?.toLowerCase() || '';
    
    return networkKeywords.some(keyword => 
      errorMessage.includes(keyword) || errorCode.includes(keyword)
    );
  }

  /**
   * Handle database-specific errors
   */
  private static handleDatabaseError(error: Error, context?: ErrorContext): BaseError {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('unique')) {
      return BaseError.conflictError('DATABASE_UNIQUE_VIOLATION', undefined, context);
    }
    
    if (errorMessage.includes('foreign key')) {
      return BaseError.validationError('DATABASE_FOREIGN_KEY_VIOLATION', undefined, undefined, context);
    }
    
    if (errorMessage.includes('connection')) {
      return BaseError.serverError('DATABASE_CONNECTION_FAILED', error, context);
    }
    
    if (errorMessage.includes('timeout')) {
      return BaseError.serverError('DATABASE_TIMEOUT', error, context);
    }
    
    return BaseError.serverError('DATABASE_QUERY_FAILED', error, context);
  }

  /**
   * Set appropriate error headers
   */
  private static setErrorHeaders(res: Response, error: BaseError): void {
    // Set content type
    res.set('Content-Type', 'application/json');
    
    // Set retry-after header for rate limiting
    if (error.statusCode === 429 && error.metadata?.retryAfter) {
      res.set('Retry-After', error.metadata.retryAfter.toString());
    }
    
    // Set error tracking headers
    res.set('X-Error-Id', error.errorId);
    res.set('X-Error-Code', error.code);
    
    // Set cache headers for errors
    if (error.statusCode >= 400 && error.statusCode < 500) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }

  /**
   * Post-error processing (alerting, metrics, etc.)
   */
  private static postErrorProcessing(error: BaseError, req: Request): void {
    // Log error if enabled
    if (this.options.logErrors) {
      this.logError(error, req);
    }
    
    // Send alerts for server errors
    if (this.options.alertOnServerErrors && error.isServerError()) {
      this.sendErrorAlert(error, req);
    }
    
    // Update error metrics
    this.updateErrorMetrics(error);
    
    // Attempt error recovery
    if (this.options.enableErrorRecovery && error.isRetryable()) {
      this.attemptErrorRecovery(error);
    }
  }

  /**
   * Log error with appropriate context
   */
  private static logError(error: BaseError, req: Request): void {
    const logLevel = error.isServerError() ? 'error' : 'warn';
    const logData = {
      ...error.toDetailedObject(),
      request: {
        path: req.path,
        method: req.method,
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeRequestBody(req.body),
        query: req.query,
        params: req.params
      }
    };
    
    logger[logLevel](`Error occurred: ${error.message}`, logData);
  }

  /**
   * Send error alerts for critical errors
   */
  private static sendErrorAlert(error: BaseError, req: Request): void {
    // This would integrate with alerting systems like Slack, PagerDuty, etc.
    logger.error('ALERT: Critical error occurred', {
      errorId: error.errorId,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      path: req.path,
      method: req.method,
      userId: req.user_id,
      organizationId: req.organization_id
    });
  }

  /**
   * Update error metrics
   */
  private static updateErrorMetrics(error: BaseError): void {
    // This would integrate with metrics systems like Prometheus, DataDog, etc.
    // For now, just log the metric
    logger.info('Error metric', {
      errorCode: error.code,
      statusCode: error.statusCode,
      category: error.category,
      retryable: error.retryable
    });
  }

  /**
   * Attempt error recovery
   */
  private static attemptErrorRecovery(error: BaseError): void {
    // Implement recovery mechanisms based on error type
    if (error.category === 'DATABASE') {
      // Could implement database reconnection logic
      logger.info('Attempting database recovery', { errorId: error.errorId });
    }
    
    if (error.category === 'INTEGRATION') {
      // Could implement integration retry logic
      logger.info('Attempting integration recovery', { errorId: error.errorId });
    }
  }

  /**
   * Graceful shutdown on critical errors
   */
  private static gracefulShutdown(reason: string): void {
    logger.error(`Initiating graceful shutdown: ${reason}`);
    
    // Give pending requests time to complete
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }

  /**
   * Get error code from HTTP status
   */
  private static getErrorCodeFromStatus(statusCode: number): ErrorCode {
    switch (statusCode) {
      case 400: return 'INVALID_ENUM_VALUE';
      case 401: return 'AUTHENTICATION_REQUIRED';
      case 403: return 'INSUFFICIENT_PERMISSIONS';
      case 404: return 'RESOURCE_NOT_FOUND';
      case 409: return 'RESOURCE_ALREADY_EXISTS';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 502: return 'EXTERNAL_SERVICE_ERROR';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'SOMETHING_WENT_WRONG';
    }
  }

  /**
   * Get error category from HTTP status
   */
  private static getCategoryFromStatus(statusCode: number): string {
    if (statusCode >= 400 && statusCode < 500) {
      return 'VALIDATION';
    }
    if (statusCode >= 500) {
      return 'SYSTEM';
    }
    return 'GENERAL';
  }

  /**
   * Sanitize request headers for logging
   */
  private static sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging
   */
  private static sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Global error handlers
process.on('uncaughtException', ErrorHandler.handleUncaughtException);
process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);

export default ErrorHandler;