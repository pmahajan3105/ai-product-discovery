/**
 * Transaction Examples - Practical usage examples for FeedbackHub transaction patterns
 * Demonstrates real-world integration of advanced transaction patterns with proper rollback
 */

import { BusinessTransactions } from '../db/BusinessTransactions';
import { TransactionPatterns } from '../db/TransactionPatterns';
import { TransactionRecovery } from '../db/TransactionRecovery';
import { withTransaction, DatabaseManager } from '../db';
import { logger } from '../utils/logger';

/**
 * Example 1: Organization Setup with Full Rollback
 * Demonstrates Saga pattern with compensating actions
 */
export async function createOrganizationExample() {
  const organizationData = {
    organizationData: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      plan: 'professional'
    },
    ownerData: {
      email: 'owner@acme.com',
      firstName: 'John',
      lastName: 'Doe'
    },
    initialSettings: {
      allowPublicFeedbook: true,
      requireCustomerAuth: false
    }
  };

  try {
    logger.info('Starting organization setup example');
    
    const result = await BusinessTransactions.createOrganizationWithOwner(organizationData);
    
    logger.info('Organization setup completed', {
      organizationId: result.organization.id,
      ownerId: result.owner.id
    });

    return result;
  } catch (error) {
    logger.error('Organization setup failed with full rollback', error);
    
    // All compensating actions have been executed automatically
    // Check recovery options
    const recentTransactions = await TransactionRecovery.getRecentTransactions(10, 'failed');
    const failedTransaction = recentTransactions.find(t => 
      t.operationType === 'createOrganizationWithOwner'
    );

    if (failedTransaction) {
      logger.info('Creating manual recovery action for failed organization setup');
      await TransactionRecovery.createRecoveryAction(
        failedTransaction.transactionId,
        'manual_fix',
        'Review failed organization setup and cleanup any partial data'
      );
    }

    throw error;
  }
}

/**
 * Example 2: Data Migration with Two-Phase Commit
 * Demonstrates safe data transfer between organizations
 */
export async function migrateDataExample() {
  const migrationData = {
    sourceOrganizationId: 'org-source-123',
    targetOrganizationId: 'org-target-456',
    feedbackIds: ['feedback-1', 'feedback-2', 'feedback-3'],
    migrateCustomers: true,
    migrateIntegrations: false
  };

  try {
    logger.info('Starting data migration example');
    
    // Log transaction start for monitoring
    const transactionId = `migration_${Date.now()}`;
    await TransactionRecovery.logTransactionStart(transactionId, 'dataMigration', {
      sourceOrganizationId: migrationData.sourceOrganizationId,
      targetOrganizationId: migrationData.targetOrganizationId
    });

    const result = await BusinessTransactions.migrateFeedbackBetweenOrganizations(migrationData);
    
    // Log successful completion
    await TransactionRecovery.logTransactionEnd(transactionId, 'committed', 3);
    
    logger.info('Data migration completed successfully', result);
    return result;

  } catch (error) {
    logger.error('Data migration failed', error);
    
    // Log failure
    const transactionId = `migration_${Date.now()}`;
    await TransactionRecovery.logTransactionEnd(
      transactionId, 
      'failed', 
      0, 
      error.message,
      'Two-phase commit validation or execution failure'
    );

    throw error;
  }
}

/**
 * Example 3: Bulk Updates with Optimistic Locking
 * Demonstrates handling concurrent updates safely
 */
export async function bulkUpdateExample() {
  const updateData = {
    feedbackIds: ['feedback-1', 'feedback-2', 'feedback-3', 'feedback-4', 'feedback-5'],
    updates: {
      status: 'triaged',
      category: 'bug',
      assignedTo: 'user-admin-123'
    },
    adminUserId: 'user-admin-123'
  };

  try {
    logger.info('Starting bulk update example with optimistic locking');
    
    const result = await BusinessTransactions.bulkUpdateFeedbackWithLocking(updateData);
    
    logger.info('Bulk update completed', {
      successful: result.summary.successful,
      failed: result.summary.failed,
      total: result.summary.total
    });

    // Handle partial failures
    if (result.failed.length > 0) {
      logger.warn('Some updates failed due to optimistic locking conflicts', {
        failedIds: result.failed.map(f => f.feedbackId)
      });

      // Create recovery action for failed updates
      const failedIds = result.failed.map(f => f.feedbackId);
      const recoveryActionId = await TransactionRecovery.createRecoveryAction(
        `bulk_update_${Date.now()}`,
        'retry',
        `Retry bulk update for ${failedIds.length} items that failed due to conflicts: ${failedIds.join(', ')}`
      );

      logger.info('Created recovery action for failed updates', { recoveryActionId });
    }

    return result;
  } catch (error) {
    logger.error('Bulk update example failed', error);
    throw error;
  }
}

/**
 * Example 4: Circuit Breaker Pattern
 * Demonstrates system protection under load
 */
export async function circuitBreakerExample() {
  const organizationId = 'org-heavy-load-123';

  // Simulate a heavy processing operation
  const heavyProcessor = async (feedback: any) => {
    // Simulate processing that might fail under load
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Randomly fail some operations to trigger circuit breaker
    if (Math.random() < 0.3) {
      throw new Error('Processing overload - simulated failure');
    }
    
    return { processed: true, id: feedback.get('id') };
  };

  try {
    logger.info('Starting circuit breaker example');
    
    const result = await BusinessTransactions.processLargeFeedbackDataset(
      organizationId,
      heavyProcessor,
      50 // Process in batches of 50
    );

    logger.info('Circuit breaker example completed', {
      processed: result.summary.processed,
      failed: result.summary.failed,
      successRate: result.summary.successRate
    });

    return result;
  } catch (error) {
    logger.error('Circuit breaker example failed', error);
    
    // Check if circuit breaker opened
    if (error.message.includes('Circuit breaker is OPEN')) {
      logger.warn('System protected by circuit breaker - processing stopped to prevent overload');
      
      // Create recovery action to resume when system recovers
      await TransactionRecovery.createRecoveryAction(
        `circuit_breaker_${Date.now()}`,
        'retry',
        'Resume large dataset processing when system load decreases'
      );
    }

    throw error;
  }
}

/**
 * Example 5: Complex Nested Transaction with Savepoints
 * Demonstrates partial rollback scenarios
 */
export async function nestedTransactionExample() {
  const organizationId = 'org-to-delete-123';
  const adminUserId = 'admin-user-456';
  const confirmationCode = `DELETE_ORG_${organizationId}`;

  try {
    logger.info('Starting nested transaction with savepoints example');
    
    await BusinessTransactions.deleteOrganizationCompletely(
      organizationId,
      adminUserId,
      confirmationCode
    );

    logger.info('Organization deletion completed successfully');
    
  } catch (error) {
    logger.error('Organization deletion failed', error);
    
    // The transaction uses savepoints, so only the failed step was rolled back
    // Create recovery action to investigate and potentially retry
    await TransactionRecovery.createRecoveryAction(
      `delete_org_${organizationId}`,
      'manual_fix',
      `Organization deletion partially failed: ${error.message}. Check which steps completed and cleanup manually if needed.`
    );

    throw error;
  }
}

/**
 * Example 6: Transaction Recovery and Monitoring
 * Demonstrates monitoring and recovery capabilities
 */
export async function transactionMonitoringExample() {
  try {
    logger.info('Starting transaction monitoring example');

    // Get recent transaction health
    const health = await TransactionRecovery.getTransactionHealth('day');
    logger.info('Transaction health metrics', health);

    // Get recent failed transactions
    const failedTransactions = await TransactionRecovery.getRecentTransactions(10, 'failed');
    logger.info('Recent failed transactions', {
      count: failedTransactions.length,
      transactions: failedTransactions.map(t => ({
        id: t.transactionId,
        type: t.operationType,
        error: t.errorMessage,
        time: t.startTime
      }))
    });

    // Attempt automatic recovery for recent failures
    for (const transaction of failedTransactions.slice(0, 3)) { // Process first 3
      logger.info('Attempting automatic recovery', {
        transactionId: transaction.transactionId
      });

      const recovered = await TransactionRecovery.attemptAutomaticRecovery(transaction);
      
      if (recovered) {
        logger.info('Automatic recovery successful', {
          transactionId: transaction.transactionId
        });
      } else {
        logger.warn('Automatic recovery not possible, manual intervention required', {
          transactionId: transaction.transactionId
        });
      }
    }

    // Clean up old entries
    await TransactionRecovery.cleanupOldEntries(7); // Clean entries older than 7 days

    return {
      health,
      failedTransactionsCount: failedTransactions.length,
      recoveryAttempted: Math.min(3, failedTransactions.length)
    };

  } catch (error) {
    logger.error('Transaction monitoring example failed', error);
    throw error;
  }
}

/**
 * Example 7: Custom Transaction Pattern
 * Demonstrates creating custom transaction patterns for specific business needs
 */
export async function customTransactionPattern() {
  try {
    logger.info('Starting custom transaction pattern example');

    // Define a custom multi-step operation with specific rollback requirements
    const customSteps = [
      {
        name: 'validateInput',
        execute: async (transaction: any) => {
          logger.info('Step 1: Validating input data');
          // Simulate validation
          return { validated: true };
        },
        compensate: async () => {
          logger.info('Compensation: Clear validation cache');
          // Clear any validation cache
        }
      },
      {
        name: 'reserveResources',
        execute: async (transaction: any) => {
          logger.info('Step 2: Reserving system resources');
          // Simulate resource reservation
          return { resourceId: 'res-123', reserved: true };
        },
        compensate: async () => {
          logger.info('Compensation: Release reserved resources');
          // Release resources
        }
      },
      {
        name: 'processData',
        execute: async (transaction: any) => {
          logger.info('Step 3: Processing data');
          
          // Simulate processing failure (30% chance)
          if (Math.random() < 0.3) {
            throw new Error('Data processing failed - simulated error');
          }
          
          return { processed: true, records: 100 };
        },
        compensate: async () => {
          logger.info('Compensation: Rollback data processing');
          // Rollback any data changes
        }
      },
      {
        name: 'updateIndexes',
        execute: async (transaction: any) => {
          logger.info('Step 4: Updating search indexes');
          return { indexed: true };
        },
        compensate: async () => {
          logger.info('Compensation: Revert index updates');
          // Revert index changes
        }
      }
    ];

    const result = await TransactionPatterns.executeSaga(customSteps, {
      name: 'customBusinessOperation'
    });

    if (result.success) {
      logger.info('Custom transaction pattern completed successfully', {
        stepsCompleted: result.operationsCount,
        duration: result.duration
      });
    } else {
      logger.error('Custom transaction pattern failed', {
        error: result.error?.message,
        rollbackInfo: result.rollbackInfo
      });
    }

    return result;

  } catch (error) {
    logger.error('Custom transaction pattern example failed', error);
    throw error;
  }
}

/**
 * Example 8: Transaction Performance Analysis
 * Demonstrates how to analyze and optimize transaction performance
 */
export async function transactionPerformanceExample() {
  try {
    logger.info('Starting transaction performance analysis');

    // Run multiple transactions to gather performance data
    const performanceTests = [
      { name: 'simpleCreate', operation: () => simulateSimpleCreate() },
      { name: 'complexUpdate', operation: () => simulateComplexUpdate() },
      { name: 'bulkOperation', operation: () => simulateBulkOperation() }
    ];

    const results = [];

    for (const test of performanceTests) {
      const startTime = Date.now();
      
      try {
        await test.operation();
        const duration = Date.now() - startTime;
        
        results.push({
          name: test.name,
          success: true,
          duration,
          performance: duration < 1000 ? 'good' : duration < 5000 ? 'acceptable' : 'slow'
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        results.push({
          name: test.name,
          success: false,
          duration,
          error: error.message
        });
      }
    }

    // Analyze results
    const totalTests = results.length;
    const successfulTests = results.filter(r => r.success).length;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    const slowTests = results.filter(r => r.success && r.duration > 5000).length;

    const analysis = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      successRate: (successfulTests / totalTests) * 100,
      averageDuration,
      slowTests,
      results
    };

    logger.info('Transaction performance analysis completed', analysis);

    // Generate recommendations
    const recommendations = [];
    if (analysis.successRate < 95) {
      recommendations.push('Consider adding retry logic for failed transactions');
    }
    if (analysis.averageDuration > 3000) {
      recommendations.push('Review transaction scope and consider breaking into smaller operations');
    }
    if (analysis.slowTests > 0) {
      recommendations.push('Optimize slow transactions by reducing database calls or using batching');
    }

    return { ...analysis, recommendations };

  } catch (error) {
    logger.error('Transaction performance example failed', error);
    throw error;
  }
}

// Helper functions for performance testing
async function simulateSimpleCreate() {
  return withTransaction(async (transaction) => {
    // Simulate simple database create
    await new Promise(resolve => setTimeout(resolve, 100));
    return { created: true };
  });
}

async function simulateComplexUpdate() {
  return withTransaction(async (transaction) => {
    // Simulate complex multi-table update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Randomly fail to test error handling
    if (Math.random() < 0.1) {
      throw new Error('Simulated complex update failure');
    }
    
    return { updated: true };
  });
}

async function simulateBulkOperation() {
  return withTransaction(async (transaction) => {
    // Simulate bulk operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { processed: 100 };
  });
}

// Export all examples for easy testing
export const transactionExamples = {
  createOrganization: createOrganizationExample,
  migrateData: migrateDataExample,
  bulkUpdate: bulkUpdateExample,
  circuitBreaker: circuitBreakerExample,
  nestedTransaction: nestedTransactionExample,
  monitoring: transactionMonitoringExample,
  customPattern: customTransactionPattern,
  performance: transactionPerformanceExample
};

export default transactionExamples;