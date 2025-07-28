/**
 * Response Builder - Enhanced TypeScript version of Zeda's ResponseUtil
 * Provides consistent API response formatting across all endpoints
 */

import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
    total?: number;
    page?: number;
    limit?: number;
    count?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
  metadata: {
    timestamp: string;
    requestId?: string;
  };
}

export class ResponseBuilder<T = any> {
  private response: Response;
  private statusCode: number = StatusCodes.OK;
  private message: string = '';
  private data: T | null = null;
  private error: string = '';
  private metadata: Record<string, any> = {};

  constructor(response: Response) {
    this.response = response;
  }

  // Success status codes
  setOk200(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.OK;
    return this;
  }

  setCreated201(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.CREATED;
    return this;
  }

  setAccepted202(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.ACCEPTED;
    return this;
  }

  setNoContent204(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.NO_CONTENT;
    return this;
  }

  // Client error status codes
  setBadRequest400(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.BAD_REQUEST;
    return this;
  }

  setUnauthorized401(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.UNAUTHORIZED;
    return this;
  }

  setForbidden403(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.FORBIDDEN;
    return this;
  }

  setNotFound404(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.NOT_FOUND;
    return this;
  }

  setConflict409(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.CONFLICT;
    return this;
  }

  setUnprocessableEntity422(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    return this;
  }

  setTooManyRequests429(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.TOO_MANY_REQUESTS;
    return this;
  }

  // Server error status codes
  setInternalServerError500(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    return this;
  }

  setNotImplemented501(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.NOT_IMPLEMENTED;
    return this;
  }

  setBadGateway502(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.BAD_GATEWAY;
    return this;
  }

  setServiceUnavailable503(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    return this;
  }

  setGatewayTimeout504(): ResponseBuilder<T> {
    this.statusCode = StatusCodes.GATEWAY_TIMEOUT;
    return this;
  }

  // Data and message setters
  setData(data: T): ResponseBuilder<T> {
    this.data = data;
    return this;
  }

  setMessage(message: string): ResponseBuilder<T> {
    this.message = message;
    return this;
  }

  setError(error: string): ResponseBuilder<T> {
    this.error = error;
    return this;
  }

  setMetadata(metadata: Record<string, any>): ResponseBuilder<T> {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  setPagination(total: number, page: number, limit: number): ResponseBuilder<T> {
    this.metadata = {
      ...this.metadata,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
    return this;
  }

  setRequestId(requestId: string): ResponseBuilder<T> {
    this.metadata.requestId = requestId;
    return this;
  }

  // Response senders
  sendSuccess(): Response {
    const responseBody: APIResponse<T> = {
      success: true,
      ...(this.data !== null && { data: this.data }),
      ...(this.message && { message: this.message }),
      metadata: {
        timestamp: new Date().toISOString(),
        ...this.metadata
      }
    };

    return this.response.status(this.statusCode).json(responseBody);
  }

  sendError(details?: any): Response {
    const responseBody: ErrorResponse = {
      success: false,
      error: this.error || 'An error occurred',
      ...(this.message && { message: this.message }),
      ...(details && { details }),
      metadata: {
        timestamp: new Date().toISOString(),
        ...this.metadata
      }
    };

    return this.response.status(this.statusCode).json(responseBody);
  }

  sendArray(): Response {
    if (!Array.isArray(this.data)) {
      throw new Error('Data must be an array to use sendArray()');
    }

    const responseBody: APIResponse<T> = {
      success: true,
      data: this.data,
      ...(this.message && { message: this.message }),
      metadata: {
        timestamp: new Date().toISOString(),
        count: this.data.length,
        ...this.metadata
      }
    };

    return this.response.status(this.statusCode).json(responseBody);
  }

  sendRaw(data: any): Response {
    return this.response.status(this.statusCode).json(data);
  }

  sendNoContent(): Response {
    return this.response.status(StatusCodes.NO_CONTENT).send();
  }

  // Utility methods
  redirect(url: string): void {
    this.response.redirect(url);
  }

  setCookie(key: string, value: string, options?: any): ResponseBuilder<T> {
    this.response.cookie(key, value, options);
    return this;
  }

  setHeader(key: string, value: string): ResponseBuilder<T> {
    this.response.setHeader(key, value);
    return this;
  }

  // Common response patterns
  static success<T>(res: Response, data?: T, message?: string): Response {
    return new ResponseBuilder<T>(res)
      .setOk200()
      .setData(data as T)
      .setMessage(message || 'Operation successful')
      .sendSuccess();
  }

  static created<T>(res: Response, data?: T, message?: string): Response {
    return new ResponseBuilder<T>(res)
      .setCreated201()
      .setData(data as T)
      .setMessage(message || 'Resource created successfully')
      .sendSuccess();
  }

  static badRequest(res: Response, error: string, details?: any): Response {
    return new ResponseBuilder(res)
      .setBadRequest400()
      .setError(error)
      .sendError(details);
  }

  static unauthorized(res: Response, error: string = 'Unauthorized'): Response {
    return new ResponseBuilder(res)
      .setUnauthorized401()
      .setError(error)
      .sendError();
  }

  static forbidden(res: Response, error: string = 'Forbidden'): Response {
    return new ResponseBuilder(res)
      .setForbidden403()
      .setError(error)
      .sendError();
  }

  static notFound(res: Response, error: string = 'Resource not found'): Response {
    return new ResponseBuilder(res)
      .setNotFound404()
      .setError(error)
      .sendError();
  }

  static conflict(res: Response, error: string, details?: any): Response {
    return new ResponseBuilder(res)
      .setConflict409()
      .setError(error)
      .sendError(details);
  }

  static validationError(res: Response, error: string, details?: any): Response {
    return new ResponseBuilder(res)
      .setUnprocessableEntity422()
      .setError(error)
      .sendError(details);
  }

  static tooManyRequests(res: Response, error: string = 'Too many requests'): Response {
    return new ResponseBuilder(res)
      .setTooManyRequests429()
      .setError(error)
      .sendError();
  }

  static internalError(res: Response, error: string = 'Internal server error', details?: any): Response {
    return new ResponseBuilder(res)
      .setInternalServerError500()
      .setError(error)
      .sendError(details);
  }

  // Generic error method for backward compatibility
  static error(res: Response, message: string, statusCode: number = 500, details?: any): Response {
    const builder = new ResponseBuilder(res).setError(message);
    
    switch (statusCode) {
      case 400:
        builder.setBadRequest400();
        break;
      case 401:
        builder.setUnauthorized401();
        break;
      case 403:
        builder.setForbidden403();
        break;
      case 404:
        builder.setNotFound404();
        break;
      case 409:
        builder.setConflict409();
        break;
      case 422:
        builder.setUnprocessableEntity422();
        break;
      case 429:
        builder.setTooManyRequests429();
        break;
      case 500:
      default:
        builder.setInternalServerError500();
        break;
    }
    
    return builder.sendError(details);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ): Response {
    return new ResponseBuilder<T[]>(res)
      .setOk200()
      .setData(data)
      .setMessage(message || 'Data retrieved successfully')
      .setPagination(total, page, limit)
      .sendSuccess();
  }
}

export default ResponseBuilder;