# FeedbackHub Advanced Transaction System

This document describes the comprehensive transaction management system implemented in FeedbackHub, featuring advanced patterns, automatic rollback, recovery mechanisms, and monitoring.

## Overview

The transaction system provides:
- **Advanced Transaction Patterns** (Saga, Two-Phase Commit, Circuit Breaker, Optimistic Locking)
- **Automatic Rollback and Recovery** with compensating actions
- **Transaction Monitoring and Health Metrics**
- **Business Transaction Implementations** for real-world scenarios
- **Failure Analysis and Recovery Actions**

## Architecture

```
db/
├── TransactionManager.ts      # Core transaction management with CLS
├── TransactionPatterns.ts     # Advanced transaction patterns
├── BusinessTransactions.ts    # Real-world business implementations
├── TransactionRecovery.ts     # Recovery and monitoring system
└── examples/
    └── transactionExamples.ts # Usage examples and patterns
```

## Transaction Patterns

### 1. Saga Pattern
Distributed transactions with compensating actions for rollback.

```typescript
import { TransactionPatterns } from '../db';

const sagaSteps = [
  {
    name: 'createUser',
    execute: async (transaction) => {
      // Create user operation
      return await userAccessor.create(userData, { transaction });
    },
    compensate: async () => {
      // Rollback: delete the user
      await userAccessor.deleteById(userId);
    }
  },
  {
    name: 'createOrganization',
    execute: async (transaction) => {
      // Create organization operation
      return await orgAccessor.create(orgData, { transaction });
    },
    compensate: async () => {
      // Rollback: delete the organization
      await orgAccessor.deleteById(orgId);
    }
  }
];

const result = await TransactionPatterns.executeSaga(sagaSteps, {
  name: 'createUserWithOrganization'
});

if (result.success) {
  console.log('All operations completed successfully');
} else {
  console.log('Transaction failed, compensations executed');
}
```

**Features:**
- Automatic compensation on failure
- Step-by-step rollback
- Detailed logging and monitoring
- Support for complex multi-service operations

### 2. Two-Phase Commit
Prepare and commit phases for operations requiring validation.

```typescript
import { TransactionPatterns } from '../db';

// Phase 1: Prepare operations (validation, locking)
const prepareOperations = [
  async (transaction) => {
    // Validate source data
    const sourceData = await validateSource(transaction);
    return { sourceData };
  },
  async (transaction) => {
    // Validate target capacity
    const targetCapacity = await validateTarget(transaction);
    return { targetCapacity };
  }
];

// Phase 2: Commit operations (actual changes)
const commitOperations = [
  async (transaction, preparedData) => {
    // Execute the actual migration
    return await executeMigration(preparedData, transaction);
  }
];

const result = await TransactionPatterns.executeTwoPhaseCommit(
  prepareOperations,
  commitOperations,
  { name: 'dataMigration' }
);
```

**Features:**
- Validation before commitment
- All-or-nothing semantics
- Highest isolation level (SERIALIZABLE)
- Perfect for data migrations and critical operations

### 3. Circuit Breaker Pattern
Prevents system overload by stopping operations when failure threshold is reached.

```typescript
import { TransactionPatterns } from '../db';

const result = await TransactionPatterns.executeWithCircuitBreaker(
  async (transaction) => {
    // Operation that might overload the system
    return await heavyOperation(transaction);
  },
  {
    circuitName: 'heavyOperations',
    failureThreshold: 5,        // Open after 5 failures
    recoveryTimeout: 60000,     // Stay open for 1 minute
    name: 'heavyDataProcessing'
  }
);

if (!result.success && result.error?.message.includes('Circuit breaker is OPEN')) {
  console.log('System protected from overload');
}
```

**Features:**
- Automatic failure detection
- System protection from cascading failures
- Configurable thresholds and timeouts
- Automatic recovery detection

### 4. Optimistic Locking
Handles concurrent updates with version checking.

```typescript
import { TransactionPatterns } from '../db';

const result = await TransactionPatterns.executeWithOptimisticLocking(
  'feedback-id-123',
  'feedback',
  async (transaction, currentVersion) => {
    // Update with version check
    const [affected] = await feedbackAccessor.update(
      { id: 'feedback-id-123', version: currentVersion },
      { status: 'resolved', updatedBy: userId },
      { transaction }
    );
    
    if (affected === 0) {
      throw new Error('Optimistic locking conflict');
    }
    
    return { updated: true };
  },
  { retries: 3, name: 'updateFeedbackStatus' }
);
```

**Features:**
- Automatic version management
- Conflict detection and retry
- Prevents lost updates
- Configurable retry logic

### 5. Bulk Operations with Batching
Process large datasets efficiently with partial rollback capability.

```typescript
import { TransactionPatterns } from '../db';

const items = [/* large array of items */];

const result = await TransactionPatterns.executeBulkWithBatching(
  items,
  100, // Process in batches of 100
  async (batch, transaction, batchIndex) => {
    // Process each batch
    const results = [];
    for (const item of batch) {
      const processed = await processItem(item, transaction);
      results.push(processed);
    }
    return results;
  },
  {
    stopOnFirstError: false,    // Continue processing other batches
    partialRollback: true,      // Allow partial rollback
    name: 'bulkDataProcessing'
  }
);

console.log(`Processed ${result.operationsCount} batches successfully`);
```

**Features:**
- Memory-efficient batch processing
- Partial failure handling
- Progress tracking
- Configurable error handling strategies

## Business Transaction Examples

### Organization Setup with Rollback
```typescript
import { BusinessTransactions } from '../db';

const result = await BusinessTransactions.createOrganizationWithOwner({
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
    allowPublicFeedback: true,
    requireCustomerAuth: false
  }
});

// If any step fails, all previous steps are automatically rolled back
```

### Data Migration Between Organizations
```typescript
import { BusinessTransactions } from '../db';

const result = await BusinessTransactions.migrateFeedbackBetweenOrganizations({
  sourceOrganizationId: 'org-source-123',
  targetOrganizationId: 'org-target-456',
  feedbackIds: ['feedback-1', 'feedback-2'],
  migrateCustomers: true,
  migrateIntegrations: false
});

// Uses Two-Phase Commit for safe data transfer
```

### Bulk Updates with Concurrent Safety
```typescript
import { BusinessTransactions } from '../db';

const result = await BusinessTransactions.bulkUpdateFeedbackWithLocking({
  feedbackIds: ['feedback-1', 'feedback-2', 'feedback-3'],
  updates: {
    status: 'triaged',
    category: 'bug',
    assignedTo: 'user-admin-123'
  },
  adminUserId: 'admin-user-123'
});

// Handles concurrent updates safely with optimistic locking
```

## Transaction Recovery and Monitoring

### Automatic Recovery
```typescript
import { TransactionRecovery } from '../db';

// Log transaction start
await TransactionRecovery.logTransactionStart(
  transactionId,
  'createOrganization',
  { userId: 'user-123', organizationId: 'org-456' }
);

// Log transaction completion
await TransactionRecovery.logTransactionEnd(
  transactionId,
  'committed', // or 'failed', 'rolled_back'
  3, // operations count
  errorMessage, // if failed
  rollbackReason // if rolled back
);

// Attempt automatic recovery for failed transactions
const recovered = await TransactionRecovery.attemptAutomaticRecovery(failedTransaction);
```

### Health Monitoring
```typescript
import { TransactionRecovery } from '../db';

// Get transaction health metrics
const health = await TransactionRecovery.getTransactionHealth('day');
console.log(`Success rate: ${(100 - health.errorRate).toFixed(2)}%`);
console.log(`Average duration: ${health.averageDuration}ms`);
console.log(`Slow transactions: ${health.slowTransactions}`);

// Get recent failed transactions
const failedTransactions = await TransactionRecovery.getRecentTransactions(10, 'failed');
```

### Manual Recovery Actions
```typescript
import { TransactionRecovery } from '../db';

// Create recovery action
const actionId = await TransactionRecovery.createRecoveryAction(
  transactionId,
  'retry',
  'Retry failed organization creation after fixing validation'
);

// Execute recovery action
const success = await TransactionRecovery.executeRecoveryAction(
  actionId,
  async () => {
    // Custom recovery logic
    await retryFailedOperation();
  }
);
```

## Integration with Services

### Service Layer Integration
```typescript
import { DatabaseManager, withTransaction } from '../db';

export class EnhancedUserService {
  async createUserWithValidation(userData: any) {
    return await withTransaction(async (transaction) => {
      // Log transaction start
      await DatabaseManager.recovery.logTransactionStart(
        'user_creation',
        'createUser',
        { email: userData.email }
      );

      try {
        // Use accessor with transaction
        const user = await DatabaseManager.users.createUser(userData, transaction);
        
        // Additional business logic
        await this.sendWelcomeEmail(user.email);
        
        // Log success
        await DatabaseManager.recovery.logTransactionEnd(
          'user_creation',
          'committed',
          1
        );
        
        return user;
      } catch (error) {
        // Log failure
        await DatabaseManager.recovery.logTransactionEnd(
          'user_creation',
          'failed',
          0,
          error.message
        );
        throw error;
      }
    }, {
      name: 'createUserWithValidation'
    });
  }
}
```

### Controller Integration
```typescript
import { BusinessTransactions, TransactionRecovery } from '../db';

export class OrganizationController {
  async createOrganization(req: Request, res: Response) {
    try {
      const result = await BusinessTransactions.createOrganizationWithOwner(req.body);
      
      return ResponseBuilder.created(res, result, 'Organization created successfully');
    } catch (error) {
      // Check if it's a transaction failure
      const recentFailures = await TransactionRecovery.getRecentTransactions(5, 'failed');
      const relatedFailure = recentFailures.find(t => 
        t.operationType === 'createOrganizationWithOwner'
      );

      if (relatedFailure) {
        // Provide recovery information
        return ResponseBuilder.internalError(res, 'Organization creation failed', {
          transactionId: relatedFailure.transactionId,
          canRetry: true,
          recoveryAvailable: true
        });
      }

      return ResponseBuilder.internalError(res, 'Organization creation failed');
    }
  }
}
```

## Error Handling and Rollback Strategies

### Automatic Rollback
```typescript
// Transaction automatically rolls back on any error
await withTransaction(async (transaction) => {
  await step1(transaction); // ✓ Succeeds
  await step2(transaction); // ✓ Succeeds  
  await step3(transaction); // ✗ Fails - entire transaction rolls back
}, { name: 'automaticRollback' });

// All changes from step1 and step2 are automatically rolled back
```

### Partial Rollback with Savepoints
```typescript
import { TransactionManager } from '../db';

await withTransaction(async (transaction) => {
  await step1(transaction); // ✓ Succeeds
  
  await TransactionManager.withSavepoint(async (tx) => {
    await step2(tx); // ✓ Succeeds
    await step3(tx); // ✗ Fails - rolls back to savepoint
  }, 'savepoint1');
  
  // step1 is preserved, step2 and step3 are rolled back
  await step4(transaction); // Can continue with step4
});
```

### Compensating Actions (Saga)
```typescript
// Each step has a compensation action for rollback
const sagaSteps = [
  {
    name: 'createUser',
    execute: async (tx) => {
      const user = await createUser(userData, tx);
      return user;
    },
    compensate: async () => {
      // Compensating action: delete the created user
      await deleteUser(user.id);
    }
  },
  {
    name: 'sendEmail',
    execute: async (tx) => {
      await emailService.sendWelcome(user.email);
      return { emailSent: true };
    },
    compensate: async () => {
      // Compensating action: send cancellation email
      await emailService.sendCancellation(user.email);
    }
  }
];

// If step 2 fails, compensation for step 1 is automatically executed
```

## Performance Optimization

### Batch Processing
```typescript
// Process large datasets efficiently
const items = await getLargeDataset();
const batchSize = 100;

for (let i = 0; i < items.length; i += batchSize) {
  const batch = items.slice(i, i + batchSize);
  
  await withTransaction(async (transaction) => {
    for (const item of batch) {
      await processItem(item, transaction);
    }
  });
  
  // Small delay between batches
  await new Promise(resolve => setTimeout(resolve, 10));
}
```

### Connection Pooling
```typescript
// Configure connection pooling for better performance
const sequelize = new Sequelize(databaseUrl, {
  pool: {
    max: 25,        // Maximum number of connections
    min: 5,         // Minimum number of connections
    acquire: 30000, // Maximum time to acquire connection
    idle: 10000     // Maximum time connection can be idle
  }
});
```

### Query Optimization
```typescript
// Use specific fields and indexes
const users = await userAccessor.findAll(
  { isActive: true },
  {
    attributes: ['id', 'email', 'firstName'], // Only load needed fields
    order: [['createdAt', 'DESC']],
    limit: 20
  }
);
```

## Monitoring and Alerting

### Health Checks
```typescript
// Add to your health check endpoint
app.get('/health/transactions', async (req, res) => {
  const health = await TransactionRecovery.getTransactionHealth('hour');
  
  const status = health.errorRate > 0.1 ? 'degraded' : 
                health.errorRate > 0.05 ? 'warning' : 'healthy';
  
  res.json({
    status,
    metrics: {
      totalTransactions: health.totalTransactions,
      successRate: (100 - health.errorRate * 100).toFixed(2) + '%',
      averageDuration: health.averageDuration + 'ms',
      slowTransactions: health.slowTransactions
    },
    commonFailures: health.commonFailures.slice(0, 3)
  });
});
```

### Alerting Integration
```typescript
// Set up alerts for transaction failures
const health = await TransactionRecovery.getTransactionHealth('hour');

if (health.errorRate > 0.1) {
  await alertingService.sendAlert({
    severity: 'high',
    message: `Transaction error rate is ${(health.errorRate * 100).toFixed(2)}%`,
    metrics: health
  });
}

if (health.slowTransactions > health.totalTransactions * 0.2) {
  await alertingService.sendAlert({
    severity: 'medium',
    message: `${health.slowTransactions} slow transactions detected`,
    threshold: '5 seconds'
  });
}
```

## Best Practices

### 1. Transaction Scope
- Keep transactions as short as possible
- Avoid long-running operations within transactions
- Use savepoints for complex operations

### 2. Error Handling
- Always handle transaction failures gracefully
- Implement appropriate compensation actions
- Log transaction outcomes for monitoring

### 3. Performance
- Use appropriate isolation levels
- Batch operations when possible
- Monitor transaction duration and optimize slow operations

### 4. Recovery
- Implement idempotent operations
- Design compensating actions carefully
- Test rollback scenarios thoroughly

### 5. Monitoring
- Track transaction health metrics
- Set up alerting for high error rates
- Regularly review failed transactions

## Testing

### Unit Testing
```typescript
describe('Transaction Patterns', () => {
  beforeEach(async () => {
    await DatabaseManager.initialize();
  });

  afterEach(async () => {
    await DatabaseManager.cleanup();
  });

  it('should execute saga with rollback', async () => {
    const sagaSteps = [
      {
        name: 'step1',
        execute: async (tx) => ({ success: true }),
        compensate: async () => { /* cleanup */ }
      },
      {
        name: 'step2',
        execute: async (tx) => { throw new Error('Simulated failure'); },
        compensate: async () => { /* cleanup */ }
      }
    ];

    const result = await TransactionPatterns.executeSaga(sagaSteps);
    
    expect(result.success).toBe(false);
    expect(result.rollbackInfo).toBeDefined();
  });
});
```

### Integration Testing
```typescript
describe('Business Transactions', () => {
  it('should create organization with full rollback on failure', async () => {
    const invalidData = {
      organizationData: { name: '', slug: '', plan: 'invalid' }, // Invalid data
      ownerData: { email: 'invalid-email', firstName: '', lastName: '' }
    };

    await expect(
      BusinessTransactions.createOrganizationWithOwner(invalidData)
    ).rejects.toThrow();

    // Verify no partial data was left behind
    const organizations = await orgAccessor.findAll({ name: '' });
    expect(organizations).toHaveLength(0);
  });
});
```

This comprehensive transaction system provides enterprise-grade reliability, monitoring, and recovery capabilities for FeedbackHub, ensuring data consistency and system resilience under all conditions.