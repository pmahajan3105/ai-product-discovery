/**
 * Transaction Manager - Enhanced version of Zeda's transaction management patterns
 * Provides centralized transaction handling with CLS (Continuation Local Storage) support
 */

import { Transaction, TransactionOptions } from 'sequelize';
import { createNamespace, getNamespace, Namespace } from 'cls-hooked';
import { db } from '../services/database';
import { logger } from '../utils/logger';

// CLS namespace for transaction context
const TRANSACTION_NAMESPACE = 'feedbackhub-transaction';

export interface TransactionContext {
  transactionId: string;
  startTime: number;
  operationCount: number;
  userId?: string;
  organizationId?: string;
  requestId?: string;
}

export interface TransactionConfig extends TransactionOptions {
  name?: string;
  timeout?: number;
  retries?: number;
  onCommit?: () => void;
  onRollback?: (error: Error) => void;
}

/**
 * Transaction Manager Class - Manages database transactions with CLS support
 * Based on Zeda's proven patterns with enhanced error handling and monitoring
 */
export class TransactionManager {
  private static namespace: Namespace;
  private static transactionCounter = 0;

  /**
   * Initialize the transaction namespace
   */
  static initialize(): void {
    if (!this.namespace) {
      this.namespace = createNamespace(TRANSACTION_NAMESPACE);
      logger.info('Transaction namespace initialized');
    }
  }

  /**
   * Get the current transaction namespace
   */
  static getNamespace(): Namespace | undefined {
    return this.namespace || getNamespace(TRANSACTION_NAMESPACE);
  }

  /**
   * Get the current transaction from CLS context
   */
  static getCurrentTransaction(): Transaction | undefined {
    const namespace = this.getNamespace();
    return namespace?.get('transaction');
  }

  /**
   * Get the current transaction context
   */
  static getCurrentContext(): TransactionContext | undefined {
    const namespace = this.getNamespace();
    return namespace?.get('context');
  }

  /**
   * Execute a function within a transaction context
   */
  static async withTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>,
    config: TransactionConfig = {}
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const startTime = Date.now();
    
    logger.info('Starting transaction', { 
      transactionId,
      name: config.name || 'unnamed',
      isolationLevel: config.isolationLevel 
    });

    try {
      return await db.sequelize.transaction(
        {
          isolationLevel: config.isolationLevel,
          type: config.type,
          deferrable: config.deferrable,
          autocommit: config.autocommit
        },
        async (transaction) => {
          const context: TransactionContext = {
            transactionId,
            startTime,
            operationCount: 0,
            userId: config.name?.includes('user:') ? config.name.split('user:')[1] : undefined,
            organizationId: config.name?.includes('org:') ? config.name.split('org:')[1] : undefined
          };

          // Set up CLS context
          const namespace = this.getNamespace();
          if (namespace) {
            namespace.set('transaction', transaction);
            namespace.set('context', context);
          }

          logger.debug('Transaction context established', { 
            transactionId,
            context 
          });

          try {
            // Execute the operation
            const result = await operation(transaction);
            
            // Log successful completion
            const duration = Date.now() - startTime;
            logger.info('Transaction completed successfully', {
              transactionId,
              duration,
              operationCount: context.operationCount
            });

            // Execute onCommit callback if provided
            if (config.onCommit) {
              try {
                config.onCommit();
              } catch (callbackError) {
                logger.warn('Transaction onCommit callback failed', callbackError, {
                  transactionId
                });
              }
            }

            return result;
          } catch (error) {
            // Log transaction failure
            const duration = Date.now() - startTime;
            logger.error('Transaction failed and will be rolled back', error, {
              transactionId,
              duration,
              operationCount: context.operationCount,
              name: config.name
            });

            // Execute onRollback callback if provided
            if (config.onRollback) {
              try {
                config.onRollback(error as Error);
              } catch (callbackError) {
                logger.warn('Transaction onRollback callback failed', callbackError, {
                  transactionId
                });
              }
            }

            throw error;
          }
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Transaction execution failed', error, {
        transactionId,
        duration,
        name: config.name
      });
      throw error;
    }
  }

  /**
   * Execute a function within the current transaction context, or create a new one
   */
  static async ensureTransaction<T>(
    operation: (transaction: Transaction) => Promise<T>,
    config: TransactionConfig = {}
  ): Promise<T> {
    const currentTransaction = this.getCurrentTransaction();
    
    if (currentTransaction) {
      // Use existing transaction
      logger.debug('Using existing transaction', {
        transactionId: this.getCurrentContext()?.transactionId
      });
      
      // Increment operation count
      const context = this.getCurrentContext();
      if (context) {
        context.operationCount++;
      }
      
      return await operation(currentTransaction);
    } else {
      // Create new transaction
      logger.debug('Creating new transaction for operation');
      return await this.withTransaction(operation, config);
    }
  }

  /**
   * Execute multiple operations in a single transaction with rollback on any failure
   */
  static async withBatchTransaction<T>(
    operations: Array<(transaction: Transaction) => Promise<T>>,
    config: TransactionConfig = {}
  ): Promise<T[]> {
    return await this.withTransaction(async (transaction) => {
      const results: T[] = [];
      
      logger.info('Executing batch transaction', {
        operationCount: operations.length,
        transactionId: this.getCurrentContext()?.transactionId
      });

      for (let i = 0; i < operations.length; i++) {
        try {
          logger.debug(`Executing batch operation ${i + 1}/${operations.length}`);
          const result = await operations[i](transaction);
          results.push(result);
        } catch (error) {
          logger.error(`Batch operation ${i + 1} failed, rolling back entire transaction`, error);
          throw error;
        }
      }

      logger.info('All batch operations completed successfully', {
        operationCount: operations.length,
        transactionId: this.getCurrentContext()?.transactionId
      });

      return results;
    }, config);
  }

  /**
   * Execute operation with retry logic on transaction conflicts
   */
  static async withRetry<T>(
    operation: (transaction: Transaction) => Promise<T>,
    config: TransactionConfig & { retries?: number; retryDelay?: number } = {}
  ): Promise<T> {
    const maxRetries = config.retries || 3;
    const retryDelay = config.retryDelay || 100;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Transaction attempt ${attempt}/${maxRetries}`, {
          name: config.name
        });

        return await this.withTransaction(operation, config);
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable (serialization failure, deadlock, etc.)
        if (this.isRetryableError(error as Error) && attempt < maxRetries) {
          logger.warn(`Transaction attempt ${attempt} failed, retrying`, error, {
            attempt,
            maxRetries,
            retryDelay,
            name: config.name
          });
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }

        // Non-retryable error or max retries reached
        logger.error(`Transaction failed after ${attempt} attempts`, error, {
          attempt,
          maxRetries,
          name: config.name
        });
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Execute operation within a savepoint (nested transaction)
   */
  static async withSavepoint<T>(
    operation: (transaction: Transaction) => Promise<T>,
    savepointName?: string
  ): Promise<T> {
    const currentTransaction = this.getCurrentTransaction();
    
    if (!currentTransaction) {
      throw new Error('Savepoint can only be used within an existing transaction');
    }

    const name = savepointName || `sp_${Date.now()}`;
    
    logger.debug('Creating savepoint', {
      savepointName: name,
      transactionId: this.getCurrentContext()?.transactionId
    });

    try {
      // Create savepoint
      await currentTransaction.query(`SAVEPOINT ${name}`);
      
      // Execute operation
      const result = await operation(currentTransaction);
      
      // Release savepoint on success
      await currentTransaction.query(`RELEASE SAVEPOINT ${name}`);
      
      logger.debug('Savepoint completed successfully', {
        savepointName: name,
        transactionId: this.getCurrentContext()?.transactionId
      });
      
      return result;
    } catch (error) {
      // Rollback to savepoint on error
      logger.warn('Rolling back to savepoint', error, {
        savepointName: name,
        transactionId: this.getCurrentContext()?.transactionId
      });
      
      try {
        await currentTransaction.query(`ROLLBACK TO SAVEPOINT ${name}`);
        await currentTransaction.query(`RELEASE SAVEPOINT ${name}`);
      } catch (rollbackError) {
        logger.error('Failed to rollback savepoint', rollbackError, {
          savepointName: name,
          originalError: error
        });
      }
      
      throw error;
    }
  }

  /**
   * Run operation within transaction namespace context
   */
  static runInContext<T>(
    contextData: Partial<TransactionContext>,
    operation: () => Promise<T>
  ): Promise<T> {
    const namespace = this.getNamespace();
    
    if (!namespace) {
      logger.warn('Transaction namespace not available, running operation without context');
      return operation();
    }

    return new Promise((resolve, reject) => {
      namespace.run(async () => {
        // Set context data
        Object.keys(contextData).forEach(key => {
          namespace.set(key, (contextData as any)[key]);
        });

        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Check if an error is retryable (transaction conflict, deadlock, etc.)
   */
  private static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'could not serialize access',
      'deadlock detected',
      'lock_timeout',
      'connection terminated',
      'connection reset',
      'ECONRESET',
      'ENOTFOUND',
      'ETIMEDOUT'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(): string {
    return `txn_${Date.now()}_${++this.transactionCounter}`;
  }

  /**
   * Get transaction statistics
   */
  static getStats(): {
    activeTransactions: number;
    totalTransactions: number;
    currentContext?: TransactionContext;
  } {
    return {
      activeTransactions: 0, // Would need to track this
      totalTransactions: this.transactionCounter,
      currentContext: this.getCurrentContext()
    };
  }
}

// Initialize the transaction manager
TransactionManager.initialize();

// Helper function for easy access to transaction execution
export const withTransaction = TransactionManager.withTransaction.bind(TransactionManager);
export const ensureTransaction = TransactionManager.ensureTransaction.bind(TransactionManager);
export const withBatchTransaction = TransactionManager.withBatchTransaction.bind(TransactionManager);
export const withRetry = TransactionManager.withRetry.bind(TransactionManager);
export const withSavepoint = TransactionManager.withSavepoint.bind(TransactionManager);

export default TransactionManager;