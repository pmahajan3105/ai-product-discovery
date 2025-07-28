# FeedbackHub Database Layer - Base Accessor Pattern

This database layer implements an enhanced version of Zeda's proven Base Accessor Pattern, providing consistent, type-safe, and feature-rich database operations across all models.

## Overview

The Base Accessor Pattern provides:
- **Consistent API** across all database operations
- **Transaction management** with automatic rollback and retry
- **Query building** with fluent interfaces
- **Comprehensive logging** and error handling
- **Performance optimization** with caching and batch operations
- **Type safety** with TypeScript

## Architecture

```
db/
├── BaseAccessor.ts          # Core base accessor class
├── QueryBuilder.ts          # Fluent query building
├── TransactionManager.ts    # Transaction handling with CLS
├── accessors/              # Model-specific accessors
│   ├── UserAccessor.ts     # User operations
│   └── FeedbackAccessor.ts # Feedback operations
├── index.ts                # Central exports
└── README.md               # This file
```

## Core Components

### 1. BaseAccessor

The foundation class that provides common CRUD operations for all models.

```typescript
import { BaseAccessor } from '../db';

// Create a base accessor for any model
const userAccessor = new BaseAccessor(db.models.User);

// Basic operations
const user = await userAccessor.create({ name: 'John', email: 'john@example.com' });
const users = await userAccessor.findAll({ isActive: true });
const updated = await userAccessor.updateById('user-id', { name: 'Jane' });
```

**Key Features:**
- Automatic logging of all operations
- Error handling with context
- Pagination support
- Transaction integration
- Raw SQL execution
- Data sanitization for logs

### 2. QueryBuilder

Fluent interface for building complex Sequelize queries.

```typescript
import { QueryBuilder } from '../db';

const query = new QueryBuilder()
  .filterByOrganization('org-123')
  .searchByField('title', 'bug report')
  .filterByIn('status', ['new', 'in_progress'])
  .addPagination(1, 20)
  .addOrderBy('createdAt', 'DESC')
  .addInclude({
    model: Customer,
    attributes: ['id', 'name']
  });

const results = await feedbackAccessor.findAll({}, query.getQuery());
```

**Features:**
- Method chaining for readable queries
- Built-in pagination
- Search and filtering helpers
- Association includes
- Date range filtering
- Organization/user scoping

### 3. TransactionManager

Advanced transaction management with CLS (Continuation Local Storage) support.

```typescript
import { withTransaction, withRetry } from '../db';

// Basic transaction
await withTransaction(async (transaction) => {
  const user = await userAccessor.create(userData, { transaction });
  const org = await orgAccessor.create(orgData, { transaction });
  return { user, org };
});

// Transaction with retry on conflicts
await withRetry(async (transaction) => {
  // Operations that might conflict
}, { retries: 3 });

// Batch operations
await withBatchTransaction([
  async (transaction) => userAccessor.create(user1, { transaction }),
  async (transaction) => userAccessor.create(user2, { transaction }),
  async (transaction) => userAccessor.create(user3, { transaction })
]);
```

**Features:**
- Automatic rollback on errors
- Retry logic for transaction conflicts
- Nested transactions with savepoints
- Context tracking with CLS
- Performance monitoring
- Named transactions for debugging

## Specialized Accessors

### UserAccessor

Enhanced user operations with domain-specific methods.

```typescript
import { userAccessor } from '../db';

// Create user with validation
const user = await userAccessor.createUser({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

// Search users with pagination
const results = await userAccessor.getUsersWithSearch('john', 1, 20);

// Update profile safely
await userAccessor.updateProfile(userId, { firstName: 'Jane' });

// Get user statistics
const stats = await userAccessor.getUserStats();
```

### FeedbackAccessor

Advanced feedback operations with analytics and search.

```typescript
import { feedbackAccessor } from '../db';

// Create feedback with auto-sentiment analysis
const feedback = await feedbackAccessor.createFeedback({
  organizationId: 'org-123',
  title: 'Bug Report',
  description: 'The app crashes when...'
});

// Advanced search with multiple filters
const results = await feedbackAccessor.searchFeedback({
  organizationId: 'org-123',
  searchTerm: 'crash',
  status: ['new', 'in_progress'],
  sentiment: ['negative', 'very_negative'],
  dateRange: { startDate: startDate, endDate: endDate },
  page: 1,
  size: 20
});

// Get analytics
const analytics = await feedbackAccessor.getAnalytics('org-123');

// Find similar feedback
const similar = await feedbackAccessor.getSimilarFeedback('feedback-id', 'org-123');
```

## Usage Patterns

### 1. Basic CRUD Operations

```typescript
import { DatabaseManager } from '../db';

// Access specialized accessors
const users = DatabaseManager.users;
const feedback = DatabaseManager.feedback;

// Create
const user = await users.createUser(userData);

// Read
const user = await users.findById('user-id');
const usersByEmail = await users.findByEmail('user@example.com');

// Update
await users.updateProfile('user-id', { firstName: 'Updated' });

// Delete
await users.deleteById('user-id');
```

### 2. Complex Queries

```typescript
import { createQuery } from '../db';

// Build complex queries
const query = createQuery
  .forOrganization('org-123')
  .recent(30) // Last 30 days
  .paginated(1, 20)
  .search('title', 'bug');

const results = await feedbackAccessor.findAll({}, query.getQuery());
```

### 3. Transaction Patterns

```typescript
import { createTransaction } from '../db';

// Named transaction for logging
await createTransaction.named('createUserWithOrg', async (transaction) => {
  const user = await userAccessor.create(userData, { transaction });
  const org = await orgAccessor.create(orgData, { transaction });
  return { user, org };
});

// Retry on conflicts
await createTransaction.withRetry(async (transaction) => {
  // Operations that might have conflicts
}, 3);

// Batch operations
await createTransaction.batch([
  async (t) => operation1(t),
  async (t) => operation2(t),
  async (t) => operation3(t)
]);
```

### 4. Raw SQL Queries

```typescript
// Execute raw SQL with parameter binding
const results = await feedbackAccessor.executeRawQuery(`
  SELECT 
    DATE_TRUNC('day', "createdAt") as date,
    COUNT(*) as count,
    AVG("sentimentScore") as sentiment
  FROM feedback 
  WHERE "organizationId" = :organizationId
  AND "createdAt" >= :startDate
  GROUP BY DATE_TRUNC('day', "createdAt")
  ORDER BY date
`, {
  organizationId: 'org-123',
  startDate: new Date('2024-01-01')
});
```

## Performance Optimization

### 1. Pagination

```typescript
// Built-in pagination with metadata
const results = await feedbackAccessor.findWithPagination(
  { organizationId: 'org-123' },
  { page: 1, size: 20, sort: 'createdAt', order: 'DESC' }
);

console.log(results.totalCount, results.hasNextPage);
```

### 2. Batch Processing

```typescript
// Process large datasets in batches
let page = 1;
let hasMore = true;

while (hasMore) {
  const batch = await feedbackAccessor.findWithPagination(
    { organizationId: 'org-123' },
    { page, size: 100 }
  );
  
  await processBatch(batch.data);
  
  hasMore = batch.hasNextPage;
  page++;
}
```

### 3. Selective Field Loading

```typescript
// Load only needed fields
const users = await userAccessor.findAll(
  { isActive: true },
  { attributes: ['id', 'email', 'firstName'] }
);
```

## Error Handling

All accessor methods include comprehensive error handling:

```typescript
try {
  const user = await userAccessor.createUser(userData);
} catch (error) {
  // Error is automatically logged with context
  // Original error is preserved and re-thrown
  console.error('User creation failed:', error.message);
}
```

## Logging

All database operations are automatically logged:

```typescript
// Automatically logs:
// - Operation type and parameters
// - Execution time
// - Success/failure status
// - Transaction context
// - Sensitive data is sanitized

const user = await userAccessor.findByEmail('user@example.com');
// Logs: "Finding User by email: user@example.com"
```

## Migration from Direct Model Usage

### Before (Direct Model Usage)
```typescript
// Old pattern - direct model usage
const user = await User.create(userData);
const feedback = await Feedback.findAll({
  where: { organizationId: 'org-123' },
  include: [Customer],
  order: [['createdAt', 'DESC']],
  limit: 20
});
```

### After (Accessor Pattern)
```typescript
// New pattern - using accessors
const user = await userAccessor.createUser(userData);
const feedback = await feedbackAccessor.searchFeedback({
  organizationId: 'org-123',
  page: 1,
  size: 20
});
```

**Benefits of Migration:**
- Consistent error handling and logging
- Built-in validation
- Performance optimizations
- Transaction management
- Type safety
- Easier testing and mocking

## Testing

```typescript
// Mock accessors for testing
const mockUserAccessor = {
  createUser: jest.fn(),
  findById: jest.fn(),
  updateProfile: jest.fn()
};

// Test with real database (integration tests)
describe('UserService', () => {
  beforeEach(async () => {
    await DatabaseManager.initialize();
  });
  
  afterEach(async () => {
    await DatabaseManager.cleanup();
  });
  
  it('should create user', async () => {
    const user = await userAccessor.createUser(testData);
    expect(user.email).toBe(testData.email);
  });
});
```

## Best Practices

1. **Use Specialized Accessors**: Always prefer specialized accessors (UserAccessor, FeedbackAccessor) over BaseAccessor
2. **Leverage Query Builder**: Use QueryBuilder for complex queries instead of raw Sequelize options
3. **Wrap in Transactions**: Use TransactionManager for operations that need atomicity
4. **Handle Errors Gracefully**: Let accessors handle logging, but add business-specific error handling
5. **Use Pagination**: Always paginate large result sets
6. **Monitor Performance**: Use logging to identify slow queries and optimize
7. **Sanitize Inputs**: Accessors handle basic sanitization, but validate business rules
8. **Test Thoroughly**: Write both unit and integration tests for database operations

## Extension Guide

To create a new specialized accessor:

```typescript
import { BaseAccessor } from '../BaseAccessor';
import { db } from '../../services/database';

export class CustomAccessor extends BaseAccessor {
  constructor() {
    super(db.models.CustomModel);
  }

  // Add specialized methods
  async customOperation(params: any) {
    try {
      // Custom logic here
      return await this.create(params);
    } catch (error) {
      logger.error('Custom operation failed', error);
      throw error;
    }
  }
}

export const customAccessor = new CustomAccessor();
```

This Base Accessor Pattern provides a robust, scalable foundation for all database operations in FeedbackHub, ensuring consistency, performance, and maintainability across the entire application.