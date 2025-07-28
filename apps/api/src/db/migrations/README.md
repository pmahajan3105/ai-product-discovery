# FeedbackHub Migration System

A comprehensive database migration system based on Zeda patterns with TypeScript enhancements, providing robust rollback capabilities, dependency management, and error handling.

## Features

- ✅ **Dependency Management**: Automatic dependency resolution and validation
- ✅ **Rollback Capabilities**: Full rollback support with transaction safety
- ✅ **Error Handling**: Comprehensive error tracking and recovery
- ✅ **Dry Run Mode**: Test migrations without making changes
- ✅ **Interactive CLI**: User-friendly command line interface
- ✅ **Migration Templates**: Pre-built templates for common operations
- ✅ **Audit Logging**: Complete migration execution history
- ✅ **Data Validation**: Built-in integrity checks
- ✅ **TypeScript Support**: Full type safety throughout

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Make CLI globally available (optional)
npm link
```

## Quick Start

### 1. Check Migration Status

```bash
# Check status for all versions
npm run migrate:status

# Check specific version
npm run migrate:status -- --version 1.0.0
```

### 2. Run Migrations

```bash
# Run all pending migrations (interactive)
npm run migrate:run -- --interactive

# Run specific version
npm run migrate:run -- --version 1.0.0

# Dry run (see what would be executed)
npm run migrate:run -- --version 1.0.0 --dry-run
```

### 3. Rollback Migrations

```bash
# Rollback specific version (interactive)
npm run migrate:rollback -- --version 1.0.0 --interactive

# Dry run rollback
npm run migrate:rollback -- --version 1.0.0 --dry-run
```

## CLI Commands

### `migrate list`
List all available migrations and their status
```bash
migrate list
migrate list --version 1.0.0
```

### `migrate status`
Show detailed migration status
```bash
migrate status
migrate status --version 1.0.0
```

### `migrate run`
Execute migrations
```bash
# Interactive mode with confirmation
migrate run --interactive

# Specific version
migrate run --version 1.0.0

# Dry run mode
migrate run --version 1.0.0 --dry-run

# Continue on error
migrate run --version 1.0.0 --continue-on-error

# Rollback on error
migrate run --version 1.0.0 --rollback-on-error

# Run specific migrations only
migrate run --version 1.0.0 --specific migration1.js migration2.js
```

### `migrate rollback`
Rollback migrations
```bash
# Interactive rollback
migrate rollback --version 1.0.0 --interactive

# Dry run rollback
migrate rollback --version 1.0.0 --dry-run

# Rollback specific migrations
migrate rollback --version 1.0.0 --specific migration1.js
```

### `migrate create`
Create new migration file
```bash
# Interactive creation
migrate create

# With parameters
migrate create --version 1.0.0 --name "add-user-preferences" --template table

# Available templates: table, column, data, custom
```

### `migrate validate`
Validate migration files and dependencies
```bash
migrate validate --version 1.0.0
```

### `migrate history`
Show migration execution history
```bash
migrate history
migrate history --version 1.0.0 --limit 10
```

## Migration Structure

```
migrations/
├── versions/
│   ├── 1.0.0/
│   │   ├── index.js                    # Version configuration
│   │   ├── 001-create-table.ts         # Migration files
│   │   └── 002-add-column.ts
│   └── 1.1.0/
│       ├── index.js
│       └── 003-migrate-data.ts
├── BaseMigration.ts                    # Base migration class
├── MigrationRunner.ts                  # Core migration engine
└── cli/
    └── MigrationCLI.ts                # Command line interface
```

## Writing Migrations

### Basic Migration

```typescript
import { BaseMigration, MigrationContext } from '../BaseMigration';

export default class CreateUsersTableMigration extends BaseMigration {
  constructor() {
    super({
      name: 'create-users-table',
      version: '1.0.0',
      description: 'Create users table with audit fields',
      estimatedTime: '< 1 minute',
      dependencies: ['create-organizations-table']
    });
  }

  async run(context: MigrationContext): Promise<void> {
    this.logProgress(context, 'Creating users table');
    
    // Create table with audit columns
    await this.createTableWithAudit(context, 'users', {
      id: {
        type: context.dataTypes.UUID,
        primaryKey: true,
        defaultValue: context.dataTypes.UUIDV4
      },
      email: {
        type: context.dataTypes.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: context.dataTypes.STRING,
        allowNull: false
      }
    });

    // Add indexes
    await this.createStandardIndexes(context, 'users', [
      { fields: ['email'], unique: true }
    ]);
  }

  async rollback(context: MigrationContext): Promise<void> {
    await context.queryInterface.dropTable('users', {
      transaction: context.transaction
    });
  }

  async validate(context: MigrationContext): Promise<boolean> {
    return await this.tableExists(context, 'users');
  }
}
```

### Version Configuration

```javascript
// versions/1.0.0/index.js
module.exports = {
    filesToIncludeForAutoExec: [
        '001-create-organizations.ts',
        '002-create-users.ts',
        '003-create-feedback.ts'
    ],
    
    dependentMigrations: {
        '002-create-users.ts': ['001-create-organizations.ts'],
        '003-create-feedback.ts': ['001-create-organizations.ts', '002-create-users.ts']
    },
    
    rollbackOrder: [
        '003-create-feedback.ts',
        '002-create-users.ts', 
        '001-create-organizations.ts'
    ],
    
    transactionMode: 'individual', // or 'batch' or 'none'
    skipOnError: false
};
```

## Helper Methods

The `BaseMigration` class provides many helper methods:

### Table Operations
```typescript
// Check if table exists
await this.tableExists(context, 'table_name');

// Create table with audit columns
await this.createTableWithAudit(context, 'table_name', attributes);

// Backup table before modifications
const backupName = await this.backupTable(context, 'table_name');
```

### Index Operations
```typescript
// Check if index exists
await this.indexExists(context, 'table_name', 'index_name');

// Create standard indexes (created_at, updated_at, etc.)
await this.createStandardIndexes(context, 'table_name', [
  { fields: ['email'], unique: true }
]);
```

### Data Operations
```typescript
// Execute raw SQL with logging
await this.executeSQL(context, 'SELECT * FROM users WHERE id = :id', { id: userId });

// Get row count
const count = await this.getRowCount(context, 'table_name');
```

### Validation
```typescript
// Validate data integrity
await this.validateDataIntegrity(context, [
  {
    name: 'check_user_count',
    sql: 'SELECT COUNT(*) as count FROM users',
    expectedResult: { count: '10' }
  }
]);
```

## Configuration

### Environment Variables

```bash
# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=feedbackhub
DB_USER=postgres
DB_PASSWORD=password

# Migration settings
MIGRATION_PATH=/path/to/migrations
MIGRATION_TABLE=executed_migrations
```

### Database Setup

The migration system requires a PostgreSQL database with the `executed_migrations` table:

```sql
CREATE TABLE executed_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  release_version VARCHAR(50) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  error_log JSONB,
  rollback_executed_at TIMESTAMP,
  rollback_error_log JSONB,
  execution_time INTEGER,
  checksum VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(name, release_version)
);
```

## Error Handling

The system provides comprehensive error handling:

### Migration Errors
- Automatic error logging with full stack traces
- Continuation options (stop, continue, or rollback)
- Error categorization (skipped, failed, validation)

### Rollback Errors
- Safe rollback with transaction isolation
- Rollback error tracking separate from migration errors
- Automatic cleanup on rollback failure

### Recovery Options
```bash
# View failed migrations
migrate history --version 1.0.0

# Retry specific failed migration
migrate run --version 1.0.0 --specific failed-migration.ts

# Rollback and retry
migrate rollback --version 1.0.0 --specific failed-migration.ts
migrate run --version 1.0.0 --specific failed-migration.ts
```

## Best Practices

### 1. Migration Design
- Keep migrations small and focused
- Always provide rollback implementation
- Include comprehensive validation
- Use descriptive names and comments

### 2. Testing
```bash
# Always test with dry-run first
migrate run --version 1.0.0 --dry-run

# Test rollback capability
migrate rollback --version 1.0.0 --dry-run

# Validate after execution
migrate validate --version 1.0.0
```

### 3. Production Deployment
```bash
# 1. Backup database before migrations
pg_dump database_name > backup.sql

# 2. Run with rollback protection
migrate run --version 1.0.0 --rollback-on-error --interactive

# 3. Verify data integrity
migrate validate --version 1.0.0
```

### 4. Dependencies
- Clearly define migration dependencies
- Keep dependency chains short
- Test dependency resolution

## Monitoring

### Migration Statistics
```bash
# Get overall statistics
migrate status

# Get detailed history
migrate history --limit 50
```

### Database Queries
```sql
-- Check migration status
SELECT 
  release_version,
  COUNT(*) as total,
  COUNT(CASE WHEN error_log IS NULL THEN 1 END) as successful,
  COUNT(CASE WHEN error_log IS NOT NULL THEN 1 END) as failed
FROM executed_migrations 
GROUP BY release_version;

-- Find long-running migrations
SELECT name, execution_time, executed_at
FROM executed_migrations 
WHERE execution_time > 60000  -- > 1 minute
ORDER BY execution_time DESC;
```

## Troubleshooting

### Common Issues

1. **Migration fails due to missing dependency**
   ```bash
   # Check dependencies
   migrate validate --version 1.0.0
   
   # Run dependencies first
   migrate run --version 1.0.0 --specific dependency-migration.ts
   ```

2. **Rollback fails**
   ```bash
   # Check rollback error log
   migrate history --version 1.0.0
   
   # Manual rollback if needed
   # Connect to database and manually revert changes
   ```

3. **Migration stuck in progress**
   ```sql
   -- Check for hanging transactions
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   
   -- Kill hanging processes if needed
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;
   ```

### Debug Mode
```bash
# Enable verbose logging
migrate run --version 1.0.0 --verbose

# Check logs
tail -f logs/migration.log
```

## Contributing

1. Follow the existing migration patterns
2. Include comprehensive tests
3. Document new features
4. Test rollback capabilities
5. Update this README for new features

## License

MIT License - see LICENSE file for details.