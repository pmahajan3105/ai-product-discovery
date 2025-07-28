/**
 * Transaction Patterns - Enhanced transaction patterns with comprehensive rollback strategies
 * Builds on TransactionManager to provide specialized patterns for complex business operations
 */

import { Transaction, IsolationLevel } from 'sequelize';
import { TransactionManager, withTransaction, TransactionConfig } from './TransactionManager';
import { DatabaseManager } from './index';
import { logger } from '../utils/logger';

export interface RollbackInfo {
  reason: string;
  error: Error;
  operationsCompleted: number;
  rollbackActions?: Array<() => Promise<void>>;
  compensatingActions?: Array<() => Promise<void>>;
}

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rollbackInfo?: RollbackInfo;
  transactionId: string;
  duration: number;
  operationsCount: number;
}

/**
 * Advanced Transaction Patterns for Complex Business Operations
 */
export class TransactionPatterns {
  
  /**
   * Saga Pattern - Distributed transaction with compensating actions
   * Each step has a corresponding compensation action for rollback
   */
  static async executeSaga<T>(
    steps: Array<{
      name: string;
      execute: (transaction: Transaction) => Promise<any>;
      compensate: () => Promise<void>;
    }>,
    config: TransactionConfig = {}
  ): Promise<TransactionResult<T[]>> {
    const startTime = Date.now();
    const transactionId = `saga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const completedSteps: any[] = [];
    const compensationActions: Array<() => Promise<void>> = [];

    logger.info('Starting Saga transaction', {
      transactionId,
      stepCount: steps.length,
      sagaName: config.name
    });

    try {
      return await withTransaction(async (transaction) => {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          
          logger.debug(`Executing saga step: ${step.name}`, {
            transactionId,
            stepIndex: i + 1,
            totalSteps: steps.length
          });

          try {
            const result = await step.execute(transaction);
            completedSteps.push(result);
            compensationActions.push(step.compensate);
            
            logger.debug(`Saga step completed: ${step.name}`, {
              transactionId,
              stepIndex: i + 1
            });
          } catch (stepError) {
            logger.error(`Saga step failed: ${step.name}`, stepError, {
              transactionId,
              stepIndex: i + 1,
              completedSteps: i
            });

            // Execute compensation actions for completed steps (in reverse order)
            await this.executeCompensationActions(compensationActions.reverse(), transactionId);
            
            throw new Error(`Saga failed at step "${step.name}": ${stepError.message}`);
          }
        }

        const duration = Date.now() - startTime;
        logger.info('Saga transaction completed successfully', {
          transactionId,
          duration,
          stepsCompleted: steps.length
        });

        return {
          success: true,
          data: completedSteps,
          transactionId,
          duration,
          operationsCount: steps.length
        };
      }, {
        ...config,
        name: `saga:${config.name || 'unnamed'}:${transactionId}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Saga transaction failed', error, {
        transactionId,
        duration,
        completedSteps: completedSteps.length,
        totalSteps: steps.length
      });

      return {
        success: false,
        error: error as Error,
        rollbackInfo: {
          reason: 'Saga step failure',
          error: error as Error,
          operationsCompleted: completedSteps.length,
          compensatingActions: compensationActions
        },
        transactionId,
        duration,
        operationsCount: completedSteps.length
      };
    }
  }

  /**
   * Two-Phase Commit Pattern - Prepare and commit phases
   * Useful for operations that need validation before commit
   */
  static async executeTwoPhaseCommit<T>(
    prepareOperations: Array<(transaction: Transaction) => Promise<any>>,
    commitOperations: Array<(transaction: Transaction, preparedData: any[]) => Promise<any>>,
    config: TransactionConfig = {}
  ): Promise<TransactionResult<T[]>> {
    const startTime = Date.now();
    const transactionId = `2pc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.info('Starting Two-Phase Commit transaction', {
      transactionId,
      prepareCount: prepareOperations.length,
      commitCount: commitOperations.length
    });

    try {
      return await withTransaction(async (transaction) => {
        // Phase 1: Prepare
        logger.debug('Two-Phase Commit: Starting prepare phase', { transactionId });
        const preparedData: any[] = [];

        for (let i = 0; i < prepareOperations.length; i++) {
          try {
            const result = await prepareOperations[i](transaction);
            preparedData.push(result);
            
            logger.debug(`Prepare operation ${i + 1} completed`, {
              transactionId,
              operation: i + 1,
              totalPrepareOps: prepareOperations.length
            });
          } catch (prepareError) {
            logger.error(`Prepare phase failed at operation ${i + 1}`, prepareError, {
              transactionId,
              failedOperation: i + 1
            });
            throw new Error(`Prepare phase failed: ${prepareError.message}`);
          }
        }

        // Phase 2: Commit
        logger.debug('Two-Phase Commit: Starting commit phase', { transactionId });
        const commitResults: any[] = [];

        for (let i = 0; i < commitOperations.length; i++) {
          try {
            const result = await commitOperations[i](transaction, preparedData);
            commitResults.push(result);
            
            logger.debug(`Commit operation ${i + 1} completed`, {
              transactionId,
              operation: i + 1,
              totalCommitOps: commitOperations.length
            });
          } catch (commitError) {
            logger.error(`Commit phase failed at operation ${i + 1}`, commitError, {
              transactionId,
              failedOperation: i + 1
            });
            throw new Error(`Commit phase failed: ${commitError.message}`);
          }
        }

        const duration = Date.now() - startTime;
        logger.info('Two-Phase Commit completed successfully', {
          transactionId,
          duration,
          preparedOperations: preparedData.length,
          committedOperations: commitResults.length
        });

        return {
          success: true,
          data: commitResults,
          transactionId,
          duration,
          operationsCount: prepareOperations.length + commitOperations.length
        };

      }, {
        ...config,
        isolationLevel: IsolationLevel.SERIALIZABLE, // Highest isolation for 2PC
        name: `2pc:${config.name || 'unnamed'}:${transactionId}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Two-Phase Commit failed', error, { transactionId, duration });

      return {
        success: false,
        error: error as Error,
        rollbackInfo: {
          reason: 'Two-phase commit failure',
          error: error as Error,
          operationsCompleted: 0
        },
        transactionId,
        duration,
        operationsCount: 0
      };
    }
  }

  /**
   * Circuit Breaker Pattern with Transaction Retry
   * Prevents cascading failures by stopping retries after threshold
   */
  static async executeWithCircuitBreaker<T>(
    operation: (transaction: Transaction) => Promise<T>,
    config: TransactionConfig & {
      failureThreshold?: number;
      recoveryTimeout?: number;
      circuitName?: string;
    } = {}
  ): Promise<TransactionResult<T>> {
    const circuitName = config.circuitName || 'default';
    const failureThreshold = config.failureThreshold || 5;
    const recoveryTimeout = config.recoveryTimeout || 60000; // 1 minute

    // In a real implementation, you'd store circuit state in Redis or memory
    // For this example, we'll use a simple in-memory store
    const circuitState = this.getCircuitState(circuitName);

    if (circuitState.isOpen && Date.now() - circuitState.lastFailure < recoveryTimeout) {
      logger.warn('Circuit breaker is OPEN, rejecting request', {
        circuitName,
        failures: circuitState.failures,
        lastFailure: circuitState.lastFailure
      });

      return {
        success: false,
        error: new Error(`Circuit breaker is OPEN for ${circuitName}`),
        rollbackInfo: {
          reason: 'Circuit breaker open',
          error: new Error('Circuit breaker protection'),
          operationsCompleted: 0
        },
        transactionId: `cb_rejected_${Date.now()}`,
        duration: 0,
        operationsCount: 0
      };
    }

    const startTime = Date.now();
    const transactionId = `cb_${circuitName}_${Date.now()}`;

    try {
      const result = await withTransaction(operation, {
        ...config,
        name: `circuitBreaker:${circuitName}:${transactionId}`
      });

      // Reset circuit breaker on success
      this.resetCircuitState(circuitName);

      const duration = Date.now() - startTime;
      logger.info('Circuit breaker transaction succeeded', {
        circuitName,
        transactionId,
        duration
      });

      return {
        success: true,
        data: result,
        transactionId,
        duration,
        operationsCount: 1
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure in circuit breaker
      this.recordCircuitFailure(circuitName, failureThreshold);

      logger.error('Circuit breaker transaction failed', error, {
        circuitName,
        transactionId,
        duration,
        circuitFailures: this.getCircuitState(circuitName).failures
      });

      return {
        success: false,
        error: error as Error,
        rollbackInfo: {
          reason: 'Transaction failed',
          error: error as Error,
          operationsCompleted: 0
        },
        transactionId,
        duration,
        operationsCount: 0
      };
    }
  }

  /**
   * Optimistic Locking Pattern
   * Handles concurrent updates with version checking
   */
  static async executeWithOptimisticLocking<T>(
    recordId: string,
    tableName: string,
    updateOperation: (transaction: Transaction, currentVersion: number) => Promise<T>,
    config: TransactionConfig = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const transactionId = `ol_${tableName}_${recordId}_${Date.now()}`;
    const maxRetries = config.retries || 3;

    logger.info('Starting optimistic locking transaction', {
      transactionId,
      recordId,
      tableName,
      maxRetries
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await withTransaction(async (transaction) => {
          // Get current version
          const versionQuery = `
            SELECT version FROM ${tableName} 
            WHERE id = :recordId 
            FOR UPDATE
          `;
          
          const versionResult = await DatabaseManager.db.sequelize.query(versionQuery, {
            replacements: { recordId },
            transaction,
            type: 'SELECT'
          });

          if (!versionResult || versionResult.length === 0) {
            throw new Error(`Record not found: ${recordId}`);
          }

          const currentVersion = (versionResult[0] as any).version;
          
          logger.debug('Retrieved current version for optimistic locking', {
            transactionId,
            recordId,
            currentVersion,
            attempt
          });

          // Execute the update operation
          const updateResult = await updateOperation(transaction, currentVersion);

          // Update version number
          const updateVersionQuery = `
            UPDATE ${tableName} 
            SET version = version + 1, "updatedAt" = NOW()
            WHERE id = :recordId AND version = :currentVersion
          `;

          const updateVersionResult = await DatabaseManager.db.sequelize.query(updateVersionQuery, {
            replacements: { recordId, currentVersion },
            transaction,
            type: 'UPDATE'
          });

          if (updateVersionResult[1] === 0) {
            throw new Error(`Optimistic locking conflict: Record was modified by another transaction`);
          }

          logger.debug('Version updated successfully', {
            transactionId,
            recordId,
            newVersion: currentVersion + 1
          });

          return updateResult;

        }, {
          ...config,
          isolationLevel: IsolationLevel.READ_COMMITTED,
          name: `optimisticLock:${tableName}:${recordId}:${transactionId}`
        });

        const duration = Date.now() - startTime;
        logger.info('Optimistic locking transaction succeeded', {
          transactionId,
          recordId,
          attempt,
          duration
        });

        return {
          success: true,
          data: result,
          transactionId,
          duration,
          operationsCount: attempt
        };

      } catch (error) {
        logger.warn(`Optimistic locking attempt ${attempt} failed`, error, {
          transactionId,
          recordId,
          attempt,
          maxRetries
        });

        if (attempt === maxRetries) {
          const duration = Date.now() - startTime;
          
          logger.error('Optimistic locking failed after all retries', error, {
            transactionId,
            recordId,
            maxRetries,
            duration
          });

          return {
            success: false,
            error: error as Error,
            rollbackInfo: {
              reason: 'Optimistic locking conflict',
              error: error as Error,
              operationsCompleted: attempt - 1
            },
            transactionId,
            duration,
            operationsCount: attempt
          };
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of optimistic locking transaction');
  }

  /**
   * Bulk Operation with Batching and Rollback
   * Processes large datasets in batches with partial rollback capability
   */
  static async executeBulkWithBatching<T, R>(
    items: T[],
    batchSize: number,
    batchProcessor: (batch: T[], transaction: Transaction, batchIndex: number) => Promise<R[]>,
    config: TransactionConfig & {
      stopOnFirstError?: boolean;
      partialRollback?: boolean;
    } = {}
  ): Promise<TransactionResult<R[]>> {
    const startTime = Date.now();
    const transactionId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalBatches = Math.ceil(items.length / batchSize);
    const results: R[] = [];
    const completedBatches: number[] = [];

    logger.info('Starting bulk operation with batching', {
      transactionId,
      totalItems: items.length,
      batchSize,
      totalBatches,
      stopOnFirstError: config.stopOnFirstError,
      partialRollback: config.partialRollback
    });

    try {
      return await withTransaction(async (transaction) => {
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIdx = batchIndex * batchSize;
          const endIdx = Math.min(startIdx + batchSize, items.length);
          const batch = items.slice(startIdx, endIdx);

          logger.debug(`Processing batch ${batchIndex + 1}/${totalBatches}`, {
            transactionId,
            batchIndex: batchIndex + 1,
            batchSize: batch.length,
            totalBatches
          });

          try {
            const batchResults = await batchProcessor(batch, transaction, batchIndex);
            results.push(...batchResults);
            completedBatches.push(batchIndex);

            logger.debug(`Batch ${batchIndex + 1} completed successfully`, {
              transactionId,
              batchIndex: batchIndex + 1,
              batchResults: batchResults.length
            });

          } catch (batchError) {
            logger.error(`Batch ${batchIndex + 1} failed`, batchError, {
              transactionId,
              batchIndex: batchIndex + 1,
              completedBatches: completedBatches.length
            });

            if (config.stopOnFirstError) {
              throw new Error(`Bulk operation stopped at batch ${batchIndex + 1}: ${batchError.message}`);
            } else {
              // Continue with next batch, but log the error
              logger.warn(`Continuing bulk operation despite batch ${batchIndex + 1} failure`, {
                transactionId,
                batchError: batchError.message
              });
            }
          }
        }

        const duration = Date.now() - startTime;
        logger.info('Bulk operation completed successfully', {
          transactionId,
          duration,
          totalItems: items.length,
          processedBatches: completedBatches.length,
          totalBatches,
          resultsCount: results.length
        });

        return {
          success: true,
          data: results,
          transactionId,
          duration,
          operationsCount: completedBatches.length
        };

      }, {
        ...config,
        name: `bulk:${config.name || 'unnamed'}:${transactionId}`
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Bulk operation failed', error, {
        transactionId,
        duration,
        completedBatches: completedBatches.length,
        totalBatches,
        processedItems: completedBatches.length * batchSize
      });

      return {
        success: false,
        error: error as Error,
        rollbackInfo: {
          reason: 'Bulk operation failure',
          error: error as Error,
          operationsCompleted: completedBatches.length
        },
        transactionId,
        duration,
        operationsCount: completedBatches.length
      };
    }
  }

  /**
   * Execute compensation actions for Saga pattern
   */
  private static async executeCompensationActions(
    actions: Array<() => Promise<void>>,
    transactionId: string
  ): Promise<void> {
    logger.info('Executing compensation actions', {
      transactionId,
      actionCount: actions.length
    });

    for (let i = 0; i < actions.length; i++) {
      try {
        await actions[i]();
        logger.debug(`Compensation action ${i + 1} completed`, {
          transactionId,
          actionIndex: i + 1
        });
      } catch (compensationError) {
        logger.error(`Compensation action ${i + 1} failed`, compensationError, {
          transactionId,
          actionIndex: i + 1
        });
        // Continue with other compensation actions even if one fails
      }
    }
  }

  // Circuit breaker state management (in production, use Redis or proper state store)
  private static circuitStates = new Map<string, {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
  }>();

  private static getCircuitState(name: string) {
    if (!this.circuitStates.has(name)) {
      this.circuitStates.set(name, {
        failures: 0,
        lastFailure: 0,
        isOpen: false
      });
    }
    return this.circuitStates.get(name)!;
  }

  private static recordCircuitFailure(name: string, threshold: number): void {
    const state = this.getCircuitState(name);
    state.failures++;
    state.lastFailure = Date.now();
    state.isOpen = state.failures >= threshold;
    
    if (state.isOpen) {
      logger.warn(`Circuit breaker OPENED for ${name}`, {
        failures: state.failures,
        threshold
      });
    }
  }

  private static resetCircuitState(name: string): void {
    const state = this.getCircuitState(name);
    if (state.failures > 0) {
      logger.info(`Circuit breaker RESET for ${name}`, {
        previousFailures: state.failures
      });
      state.failures = 0;
      state.isOpen = false;
    }
  }
}

export default TransactionPatterns;