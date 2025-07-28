/**
 * Structured Logger - Enhanced TypeScript version of Zeda's logging system
 * Provides request tracking, performance monitoring, and structured logging
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import { createNamespace, getNamespace } from 'cls-hooked';
import path from 'path';
import { Request, Response } from 'express';
import os from 'os';

// Create or get the request namespace for context tracking
const requestNamespace = createNamespace('request');

export interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  clientIP?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  responseTime?: number;
  timestamp?: string;
}

export interface LogMetadata {
  service: string;
  environment: string;
  version: string;
  hostname: string;
  pid: number;
  [key: string]: any;
}

class Logger {
  private winston: winston.Logger;
  private defaultMetadata: LogMetadata;

  constructor() {
    this.defaultMetadata = {
      service: 'feedbackhub-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0',
      hostname: os.hostname(),
      pid: process.pid
    };

    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const logDir = path.join(process.cwd(), 'logs');
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `[${timestamp}] ${level}: ${message} ${metaStr}`;
      })
    );

    // JSON format for production
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const transports: winston.transport[] = [];

    // Add console transport for development
    if (isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })
      );
    }

    // Add file transports for all environments
    transports.push(
      // General log file with daily rotation
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
        level: 'info'
      }),

      // Error log file
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
        level: 'error'
      }),

      // HTTP request log file
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'requests-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '50m',
        maxFiles: '7d',
        format: fileFormat,
        level: 'http'
      })
    );

    return winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true })
      ),
      defaultMeta: this.defaultMetadata,
      transports,
      exitOnError: false
    });
  }

  private getContext(): LogContext {
    const namespace = getNamespace('request');
    if (!namespace) return {};

    return {
      requestId: namespace.get('requestId'),
      userId: namespace.get('userId'),
      organizationId: namespace.get('organizationId'),
      clientIP: namespace.get('clientIP'),
      userAgent: namespace.get('userAgent'),
      method: namespace.get('method'),
      path: namespace.get('path'),
      timestamp: new Date().toISOString()
    };
  }

  private formatMessage(message: string, meta: any = {}): { message: string; meta: any } {
    const context = this.getContext();
    
    return {
      message,
      meta: {
        ...context,
        ...meta
      }
    };
  }

  // Core logging methods
  error(message: string, error?: Error | any, meta: any = {}): void {
    const formatted = this.formatMessage(message, {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...error
        }
      })
    });

    this.winston.error(formatted.message, formatted.meta);
  }

  warn(message: string, meta: any = {}): void {
    const formatted = this.formatMessage(message, meta);
    this.winston.warn(formatted.message, formatted.meta);
  }

  info(message: string, meta: any = {}): void {
    const formatted = this.formatMessage(message, meta);
    this.winston.info(formatted.message, formatted.meta);
  }

  debug(message: string, meta: any = {}): void {
    const formatted = this.formatMessage(message, meta);
    this.winston.debug(formatted.message, formatted.meta);
  }

  http(message: string, meta: any = {}): void {
    const formatted = this.formatMessage(message, meta);
    this.winston.http(formatted.message, formatted.meta);
  }

  // Specialized logging methods
  logRequest(req: Request, startTime: number): void {
    const responseTime = Date.now() - startTime;
    const clientIP = this.getClientIP(req);

    this.http('HTTP Request', {
      method: req.method,
      path: req.originalUrl,
      query: req.query,
      body: this.sanitizeBody(req.body),
      headers: this.sanitizeHeaders(req.headers),
      clientIP,
      userAgent: req.get('User-Agent'),
      responseTime
    });
  }

  logResponse(req: Request, res: Response, startTime: number, body?: any): void {
    const responseTime = Date.now() - startTime;
    const clientIP = this.getClientIP(req);

    this.http('HTTP Response', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
      clientIP,
      userAgent: req.get('User-Agent'),
      ...(body && { responseBody: this.sanitizeResponseBody(body) })
    });
  }

  logError(error: Error, req?: Request, context?: any): void {
    const clientIP = req ? this.getClientIP(req) : undefined;

    this.error('Application Error', error, {
      ...(req && {
        method: req.method,
        path: req.originalUrl,
        query: req.query,
        body: this.sanitizeBody(req.body),
        clientIP,
        userAgent: req.get('User-Agent')
      }),
      ...context
    });
  }

  logDatabaseQuery(query: string, duration: number, params?: any): void {
    this.debug('Database Query', {
      query: query.replace(/\s+/g, ' ').trim(),
      duration,
      params: this.sanitizeParams(params)
    });
  }

  logIntegrationEvent(event: string, integration: string, success: boolean, duration?: number, error?: Error): void {
    const logMethod = success ? this.info : this.error;
    
    logMethod.call(this, `Integration Event: ${event}`, {
      integration,
      success,
      duration,
      ...(error && { error: error.message })
    });
  }

  logBusinessEvent(event: string, data: any): void {
    this.info(`Business Event: ${event}`, {
      eventData: this.sanitizeData(data)
    });
  }

  // Utility methods
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeResponseBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    // Don't log large response bodies
    const stringified = JSON.stringify(body);
    if (stringified.length > 1000) {
      return { _truncated: true, _size: stringified.length };
    }

    return body;
  }

  private sanitizeParams(params: any): any {
    if (!params || typeof params !== 'object') return params;

    const sensitiveParams = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...params };

    for (const param of sensitiveParams) {
      if (sanitized[param]) {
        sanitized[param] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credentials'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  // Context management
  static setContext(contextData: Partial<LogContext>): void {
    const namespace = getNamespace('request');
    if (namespace) {
      Object.keys(contextData).forEach(key => {
        namespace.set(key, contextData[key as keyof LogContext]);
      });
    }
  }

  static runWithContext<T>(contextData: LogContext, fn: () => T): T {
    const namespace = getNamespace('request') || createNamespace('request');
    
    return namespace.run(() => {
      Object.keys(contextData).forEach(key => {
        namespace.set(key, contextData[key as keyof LogContext]);
      });
      return fn();
    });
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export the Logger class for testing
export { Logger };

// Export namespace for middleware usage
export { requestNamespace };

export default logger;