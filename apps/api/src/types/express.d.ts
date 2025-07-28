/**
 * Express type extensions
 * Extends Express Request interface with custom properties
 */

declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      [key: string]: any;
    };
  }
}

export {};