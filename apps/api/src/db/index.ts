/**
 * Simplified Database Layer Index
 * Basic exports without complex circular dependencies
 */

// Database connection
export { db } from '../services/database';

// Re-export commonly used types from Sequelize
export { Transaction, Op, QueryTypes } from 'sequelize';

// Base patterns and utilities
export { BaseAccessor } from './BaseAccessor';
export { QueryBuilder } from './QueryBuilder';
export { TransactionManager } from './TransactionManager';

// Model-specific accessors
export { UserAccessor } from './accessors/UserAccessor';
export { FeedbackAccessor } from './accessors/FeedbackAccessor';

/**
 * Create a new BaseAccessor for a model
 * Useful for models that don't have specialized accessors yet
 */
export function createAccessor<T>(model: any): BaseAccessor<T> {
  return new BaseAccessor<T>(model);
}