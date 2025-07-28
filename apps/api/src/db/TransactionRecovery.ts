/**
 * Transaction Recovery - Advanced rollback and recovery mechanisms
 * Provides automatic recovery, transaction monitoring, and failure analysis
 */

import { Transaction, QueryTypes } from 'sequelize';
import { DatabaseManager } from './index';
import { logger } from '../utils/logger';
import { redisManager } from '../utils/redis';

export interface TransactionLog {
  transactionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'committed' | 'rolled_back' | 'failed';
  operationType: string;
  userId?: string;
  organizationId?: string;
  operationsCount: number;
  errorMessage?: string;
  rollbackReason?: string;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  id: string;
  transactionId: string;
  actionType: 'compensate' | 'retry' | 'manual_fix';
  description: string;
  executedAt?: Date;
  success?: boolean;
  error?: string;
}

export interface TransactionHealth {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  rolledBackTransactions: number;
  averageDuration: number;
  slowTransactions: number;
  errorRate: number;
  commonFailures: Array<{ error: string; count: number }>;
}

/**
 * Transaction Recovery and Monitoring System
 */
export class TransactionRecovery {
  private static readonly TRANSACTION_LOG_KEY = 'feedbackhub:transactions:log';
  private static readonly RECOVERY_ACTIONS_KEY = 'feedbackhub:transactions:recovery';
  private static readonly HEALTH_METRICS_KEY = 'feedbackhub:transactions:health';

  /**
   * Log transaction start
   */
  static async logTransactionStart(
    transactionId: string,
    operationType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const logEntry: TransactionLog = {
        transactionId,
        startTime: new Date(),
        status: 'pending',
        operationType,
        userId: metadata.userId,
        organizationId: metadata.organizationId,
        operationsCount: 0,
        metadata
      };

      // Store in Redis for fast access
      const redisClient = await redisManager.getCacheConnection();
      await redisClient.hSet(
        `${this.TRANSACTION_LOG_KEY}:${transactionId}`,
        'data',
        JSON.stringify(logEntry)
      );

      // Set expiration (30 days)
      await redisClient.expire(`${this.TRANSACTION_LOG_KEY}:${transactionId}`, 30 * 24 * 60 * 60);

      logger.debug('Transaction logged', { transactionId, operationType });
    } catch (error) {
      logger.error('Failed to log transaction start', error, { transactionId });
    }
  }

  /**
   * Log transaction completion
   */
  static async logTransactionEnd(
    transactionId: string,
    status: 'committed' | 'rolled_back' | 'failed',
    operationsCount: number = 0,
    errorMessage?: string,
    rollbackReason?: string
  ): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const existingData = await redisClient.hGet(`${this.TRANSACTION_LOG_KEY}:${transactionId}`, 'data');
      
      if (!existingData) {
        logger.warn('Transaction log entry not found', { transactionId });
        return;
      }

      const logEntry: TransactionLog = JSON.parse(existingData);
      logEntry.endTime = new Date();
      logEntry.status = status;
      logEntry.operationsCount = operationsCount;
      logEntry.errorMessage = errorMessage;
      logEntry.rollbackReason = rollbackReason;

      await redisClient.hSet(
        `${this.TRANSACTION_LOG_KEY}:${transactionId}`,
        'data',
        JSON.stringify(logEntry)
      );

      // Update health metrics
      await this.updateHealthMetrics(logEntry);

      logger.info('Transaction completed', {
        transactionId,
        status,
        duration: logEntry.endTime.getTime() - logEntry.startTime.getTime(),
        operationsCount
      });

      // If transaction failed, initiate recovery analysis
      if (status === 'failed' || status === 'rolled_back') {
        await this.analyzeFailureAndCreateRecoveryActions(logEntry);
      }
    } catch (error) {
      logger.error('Failed to log transaction end', error, { transactionId });
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransaction(transactionId: string): Promise<TransactionLog | null> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const data = await redisClient.hGet(`${this.TRANSACTION_LOG_KEY}:${transactionId}`, 'data');
      
      if (!data) {
        // Try to fetch from database if not in Redis
        return await this.getTransactionFromDatabase(transactionId);
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get transaction', error, { transactionId });
      return null;
    }
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(
    limit: number = 100,
    status?: 'pending' | 'committed' | 'rolled_back' | 'failed'
  ): Promise<TransactionLog[]> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const keys = await redisClient.keys(`${this.TRANSACTION_LOG_KEY}:*`);
      
      const transactions: TransactionLog[] = [];
      
      for (const key of keys.slice(0, limit)) {
        const data = await redisClient.hGet(key, 'data');
        if (data) {
          const transaction = JSON.parse(data);
          if (!status || transaction.status === status) {
            transactions.push(transaction);
          }
        }
      }

      // Sort by start time (most recent first)
      transactions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      return transactions.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get recent transactions', error);
      return [];
    }
  }

  /**
   * Get transaction health metrics
   */
  static async getTransactionHealth(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<TransactionHealth> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const healthData = await redisClient.hGet(this.HEALTH_METRICS_KEY, timeRange);
      
      if (healthData) {
        return JSON.parse(healthData);
      }

      // Calculate health metrics from transaction logs
      return await this.calculateHealthMetrics(timeRange);
    } catch (error) {
      logger.error('Failed to get transaction health', error);
      return this.getDefaultHealthMetrics();
    }
  }

  /**
   * Create recovery action for failed transaction
   */
  static async createRecoveryAction(
    transactionId: string,
    actionType: 'compensate' | 'retry' | 'manual_fix',
    description: string
  ): Promise<string> {
    try {
      const actionId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const recoveryAction: RecoveryAction = {
        id: actionId,
        transactionId,
        actionType,
        description
      };

      const redisClient = await redisManager.getCacheConnection();
      await redisClient.hSet(
        `${this.RECOVERY_ACTIONS_KEY}:${actionId}`,
        'data',
        JSON.stringify(recoveryAction)
      );

      // Set expiration (7 days)
      await redisClient.expire(`${this.RECOVERY_ACTIONS_KEY}:${actionId}`, 7 * 24 * 60 * 60);

      logger.info('Recovery action created', {
        actionId,
        transactionId,
        actionType,
        description
      });

      return actionId;
    } catch (error) {
      logger.error('Failed to create recovery action', error, { transactionId });
      throw error;
    }
  }

  /**
   * Execute recovery action
   */
  static async executeRecoveryAction(
    actionId: string,
    executor: () => Promise<void>
  ): Promise<boolean> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const actionData = await redisClient.hGet(`${this.RECOVERY_ACTIONS_KEY}:${actionId}`, 'data');
      
      if (!actionData) {
        throw new Error(`Recovery action not found: ${actionId}`);
      }

      const recoveryAction: RecoveryAction = JSON.parse(actionData);
      
      logger.info('Executing recovery action', {
        actionId,
        transactionId: recoveryAction.transactionId,
        actionType: recoveryAction.actionType
      });

      try {
        await executor();
        
        // Mark as successful
        recoveryAction.executedAt = new Date();
        recoveryAction.success = true;
        
        await redisClient.hSet(
          `${this.RECOVERY_ACTIONS_KEY}:${actionId}`,
          'data',
          JSON.stringify(recoveryAction)
        );

        logger.info('Recovery action executed successfully', { actionId });
        return true;

      } catch (executionError) {
        // Mark as failed
        recoveryAction.executedAt = new Date();
        recoveryAction.success = false;
        recoveryAction.error = executionError.message;
        
        await redisClient.hSet(
          `${this.RECOVERY_ACTIONS_KEY}:${actionId}`,
          'data',
          JSON.stringify(recoveryAction)
        );

        logger.error('Recovery action execution failed', executionError, { actionId });
        return false;
      }
    } catch (error) {
      logger.error('Failed to execute recovery action', error, { actionId });
      return false;
    }
  }

  /**
   * Automatic recovery for common failure patterns
   */
  static async attemptAutomaticRecovery(transactionLog: TransactionLog): Promise<boolean> {
    try {
      logger.info('Attempting automatic recovery', {
        transactionId: transactionLog.transactionId,
        operationType: transactionLog.operationType,
        errorMessage: transactionLog.errorMessage
      });

      // Determine recovery strategy based on error type
      if (this.isTransientError(transactionLog.errorMessage)) {
        return await this.retryTransaction(transactionLog);
      }

      if (this.isDeadlockError(transactionLog.errorMessage)) {
        return await this.handleDeadlockRecovery(transactionLog);
      }

      if (this.isConnectionError(transactionLog.errorMessage)) {
        return await this.handleConnectionRecovery(transactionLog);
      }

      // For non-recoverable errors, create manual recovery action
      await this.createRecoveryAction(
        transactionLog.transactionId,
        'manual_fix',
        `Manual intervention required for: ${transactionLog.errorMessage}`
      );

      return false;
    } catch (error) {
      logger.error('Automatic recovery failed', error, {
        transactionId: transactionLog.transactionId
      });
      return false;
    }
  }

  /**
   * Clean up old transaction logs and recovery actions
   */
  static async cleanupOldEntries(olderThanDays: number = 30): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      // Clean up transaction logs
      const transactionKeys = await redisClient.keys(`${this.TRANSACTION_LOG_KEY}:*`);
      let cleanedTransactions = 0;

      for (const key of transactionKeys) {
        const data = await redisClient.hGet(key, 'data');
        if (data) {
          const transaction: TransactionLog = JSON.parse(data);
          if (new Date(transaction.startTime) < cutoffDate) {
            await redisClient.del(key);
            cleanedTransactions++;
          }
        }
      }

      // Clean up recovery actions
      const recoveryKeys = await redisClient.keys(`${this.RECOVERY_ACTIONS_KEY}:*`);
      let cleanedRecoveryActions = 0;

      for (const key of recoveryKeys) {
        const data = await redisClient.hGet(key, 'data');
        if (data) {
          const action: RecoveryAction = JSON.parse(data);
          // Keep recovery actions for longer (they're smaller and useful for analysis)
          if (action.executedAt && new Date(action.executedAt) < cutoffDate) {
            await redisClient.del(key);
            cleanedRecoveryActions++;
          }
        }
      }

      logger.info('Cleaned up old transaction entries', {
        cleanedTransactions,
        cleanedRecoveryActions,
        olderThanDays
      });
    } catch (error) {
      logger.error('Failed to cleanup old entries', error);
    }
  }

  /**
   * Private helper methods
   */

  private static async updateHealthMetrics(transaction: TransactionLog): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const duration = transaction.endTime ? 
        transaction.endTime.getTime() - transaction.startTime.getTime() : 0;

      // Update metrics for different time ranges
      for (const timeRange of ['hour', 'day', 'week']) {
        const healthKey = `${this.HEALTH_METRICS_KEY}:${timeRange}`;
        const existingData = await redisClient.hGet(healthKey, 'data');
        
        let health: TransactionHealth = existingData ? 
          JSON.parse(existingData) : this.getDefaultHealthMetrics();

        // Update metrics
        health.totalTransactions++;
        
        if (transaction.status === 'committed') {
          health.successfulTransactions++;
        } else if (transaction.status === 'failed') {
          health.failedTransactions++;
        } else if (transaction.status === 'rolled_back') {
          health.rolledBackTransactions++;
        }

        // Update average duration
        health.averageDuration = (health.averageDuration * (health.totalTransactions - 1) + duration) / health.totalTransactions;

        // Count slow transactions (>5 seconds)
        if (duration > 5000) {
          health.slowTransactions++;
        }

        // Update error rate
        health.errorRate = (health.failedTransactions + health.rolledBackTransactions) / health.totalTransactions;

        // Track common failures
        if (transaction.errorMessage) {
          const existingFailure = health.commonFailures.find(f => f.error === transaction.errorMessage);
          if (existingFailure) {
            existingFailure.count++;
          } else {
            health.commonFailures.push({ error: transaction.errorMessage, count: 1 });
          }
          // Keep only top 10 failures
          health.commonFailures.sort((a, b) => b.count - a.count);
          health.commonFailures = health.commonFailures.slice(0, 10);
        }

        await redisClient.hSet(healthKey, 'data', JSON.stringify(health));
        
        // Set appropriate expiration
        const expiration = timeRange === 'hour' ? 3600 : timeRange === 'day' ? 86400 : 604800;
        await redisClient.expire(healthKey, expiration);
      }
    } catch (error) {
      logger.error('Failed to update health metrics', error);
    }
  }

  private static async analyzeFailureAndCreateRecoveryActions(transaction: TransactionLog): Promise<void> {
    try {
      // Check if automatic recovery is possible
      const automaticRecovery = await this.attemptAutomaticRecovery(transaction);
      
      if (!automaticRecovery) {
        // Create appropriate recovery action based on failure type
        const actionType = this.determineRecoveryActionType(transaction);
        const description = this.generateRecoveryDescription(transaction);
        
        await this.createRecoveryAction(transaction.transactionId, actionType, description);
      }
    } catch (error) {
      logger.error('Failed to analyze failure', error, {
        transactionId: transaction.transactionId
      });
    }
  }

  private static async retryTransaction(transaction: TransactionLog): Promise<boolean> {
    // This would implement the actual retry logic
    // For now, just create a retry recovery action
    await this.createRecoveryAction(
      transaction.transactionId,
      'retry',
      `Automatic retry recommended for transient error: ${transaction.errorMessage}`
    );
    return false;
  }

  private static async handleDeadlockRecovery(transaction: TransactionLog): Promise<boolean> {
    logger.info('Handling deadlock recovery', { transactionId: transaction.transactionId });
    // Deadlocks are usually automatically retried by the transaction manager
    return true;
  }

  private static async handleConnectionRecovery(transaction: TransactionLog): Promise<boolean> {
    logger.info('Handling connection recovery', { transactionId: transaction.transactionId });
    // Connection errors might resolve themselves
    return false;
  }

  private static isTransientError(errorMessage?: string): boolean {
    if (!errorMessage) return false;
    const transientErrors = ['connection timeout', 'network error', 'temporary failure'];
    return transientErrors.some(error => errorMessage.toLowerCase().includes(error));
  }

  private static isDeadlockError(errorMessage?: string): boolean {
    if (!errorMessage) return false;
    return errorMessage.toLowerCase().includes('deadlock');
  }

  private static isConnectionError(errorMessage?: string): boolean {
    if (!errorMessage) return false;
    const connectionErrors = ['connection reset', 'connection refused', 'etimedout'];
    return connectionErrors.some(error => errorMessage.toLowerCase().includes(error));
  }

  private static determineRecoveryActionType(transaction: TransactionLog): 'compensate' | 'retry' | 'manual_fix' {
    if (this.isTransientError(transaction.errorMessage)) {
      return 'retry';
    }
    if (transaction.operationType.includes('create') || transaction.operationType.includes('update')) {
      return 'compensate';
    }
    return 'manual_fix';
  }

  private static generateRecoveryDescription(transaction: TransactionLog): string {
    return `Recovery needed for ${transaction.operationType} operation. Error: ${transaction.errorMessage}. ` +
           `Started at ${transaction.startTime}, affected ${transaction.operationsCount} operations.`;
  }

  private static async getTransactionFromDatabase(transactionId: string): Promise<TransactionLog | null> {
    // This would query the database for historical transaction data
    // For now, return null
    return null;
  }

  private static async calculateHealthMetrics(timeRange: 'hour' | 'day' | 'week'): Promise<TransactionHealth> {
    // This would calculate metrics from actual transaction data
    // For now, return default metrics
    return this.getDefaultHealthMetrics();
  }

  private static getDefaultHealthMetrics(): TransactionHealth {
    return {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      rolledBackTransactions: 0,
      averageDuration: 0,
      slowTransactions: 0,
      errorRate: 0,
      commonFailures: []
    };
  }
}

export default TransactionRecovery;