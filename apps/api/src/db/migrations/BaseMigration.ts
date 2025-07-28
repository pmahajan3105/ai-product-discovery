/**
 * Base Migration Class - Abstract class for database migrations
 * Provides consistent interface for all migrations with validation and utilities
 */

import { QueryInterface, DataTypes, Transaction, Sequelize } from 'sequelize';
import { logger } from '../../utils/logger';
import { ValidationError, DatabaseError } from '../../errors/SpecificErrors';

export interface MigrationContext {
  sequelize: Sequelize;
  transaction?: Transaction;
  queryInterface: QueryInterface;
  dataTypes: typeof DataTypes;
  releaseVersion: string;
  isDryRun: boolean;
  logger: typeof logger;
}

export interface MigrationMetadata {
  name: string;
  version: string;
  description?: string;
  estimatedTime?: string;
  breaking?: boolean;
  dependencies?: string[];
  tags?: string[];
}

export abstract class BaseMigration {
  protected metadata: MigrationMetadata;

  constructor(metadata: MigrationMetadata) {
    this.metadata = metadata;
  }

  /**
   * Execute the migration - must be implemented by subclasses
   */
  abstract run(context: MigrationContext): Promise<void>;

  /**
   * Rollback the migration - optional implementation
   */
  async rollback(context: MigrationContext): Promise<void> {
    throw new ValidationError(
      `Migration ${this.metadata.name} does not support rollback`,
      { migration: this.metadata.name }
    );
  }

  /**
   * Validate migration prerequisites
   */
  async validate(context?: MigrationContext): Promise<boolean> {
    return true;
  }

  /**
   * Get migration dependencies
   */
  getDependencies(): string[] {
    return this.metadata.dependencies || [];
  }

  /**
   * Get migration metadata
   */
  getMetadata(): MigrationMetadata {
    return { ...this.metadata };
  }

  /**
   * Helper: Check if table exists
   */
  protected async tableExists(
    context: MigrationContext,
    tableName: string
  ): Promise<boolean> {
    try {
      const tables = await context.queryInterface.showAllTables();
      return tables.includes(tableName);
    } catch (error) {
      context.logger.error('Failed to check table existence', error, { tableName });
      return false;
    }
  }

  /**
   * Helper: Check if column exists
   */
  protected async columnExists(
    context: MigrationContext,
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    try {
      const description = await context.queryInterface.describeTable(tableName);
      return columnName in description;
    } catch (error) {
      context.logger.error('Failed to check column existence', error, {
        tableName,
        columnName
      });
      return false;
    }
  }

  /**
   * Helper: Check if index exists
   */
  protected async indexExists(
    context: MigrationContext,
    tableName: string,
    indexName: string
  ): Promise<boolean> {
    try {
      const indexes = await context.queryInterface.showIndex(tableName);
      return indexes.some(index => index.name === indexName);
    } catch (error) {
      context.logger.error('Failed to check index existence', error, {
        tableName,
        indexName
      });
      return false;
    }
  }

  /**
   * Helper: Check if constraint exists
   */
  protected async constraintExists(
    context: MigrationContext,
    tableName: string,
    constraintName: string
  ): Promise<boolean> {
    try {
      // This is database-specific, implementation may vary
      const result = await context.sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = :tableName 
        AND constraint_name = :constraintName
      `, {
        replacements: { tableName, constraintName },
        type: context.sequelize.QueryTypes.SELECT,
        transaction: context.transaction
      });
      
      return result.length > 0;
    } catch (error) {
      context.logger.error('Failed to check constraint existence', error, {
        tableName,
        constraintName
      });
      return false;
    }
  }

  /**
   * Helper: Execute raw SQL with logging
   */
  protected async executeSQL(
    context: MigrationContext,
    sql: string,
    replacements?: Record<string, any>
  ): Promise<any> {
    try {
      context.logger.debug('Executing SQL', {
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        replacements
      });

      if (context.isDryRun) {
        context.logger.info('DRY RUN: Would execute SQL', { sql, replacements });
        return null;
      }

      return await context.sequelize.query(sql, {
        replacements,
        transaction: context.transaction
      });
    } catch (error) {
      context.logger.error('SQL execution failed', error, { sql, replacements });
      throw new DatabaseError(`SQL execution failed: ${error.message}`, {
        sql,
        replacements,
        originalError: error
      });
    }
  }

  /**
   * Helper: Create table with standard audit columns
   */
  protected async createTableWithAudit(
    context: MigrationContext,
    tableName: string,
    attributes: Record<string, any>,
    options: any = {}
  ): Promise<void> {
    const auditColumns = {
      created_at: {
        type: context.dataTypes.DATE,
        allowNull: false,
        defaultValue: context.dataTypes.NOW
      },
      updated_at: {
        type: context.dataTypes.DATE,
        allowNull: false,
        defaultValue: context.dataTypes.NOW
      },
      created_by: {
        type: context.dataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      updated_by: {
        type: context.dataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }
    };

    const allAttributes = {
      ...attributes,
      ...auditColumns
    };

    if (context.isDryRun) {
      context.logger.info('DRY RUN: Would create table', {
        tableName,
        attributes: Object.keys(allAttributes)
      });
      return;
    }

    await context.queryInterface.createTable(tableName, allAttributes, {
      transaction: context.transaction,
      ...options
    });

    context.logger.info('Table created with audit columns', {
      tableName,
      columns: Object.keys(allAttributes)
    });
  }

  /**
   * Helper: Add audit triggers for PostgreSQL
   */
  protected async addAuditTriggers(
    context: MigrationContext,
    tableName: string
  ): Promise<void> {
    const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_${tableName}_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_${tableName}_updated_at
        BEFORE UPDATE ON ${tableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_${tableName}_updated_at();
    `;

    await this.executeSQL(context, triggerSQL);
    
    context.logger.info('Audit triggers added', { tableName });
  }

  /**
   * Helper: Create standard indexes
   */
  protected async createStandardIndexes(
    context: MigrationContext,
    tableName: string,
    additionalIndexes: Array<{
      name?: string;
      fields: string | string[];
      unique?: boolean;
      where?: any;
    }> = []
  ): Promise<void> {
    // Standard indexes
    const standardIndexes = [
      {
        name: `idx_${tableName}_created_at`,
        fields: ['created_at']
      },
      {
        name: `idx_${tableName}_updated_at`,
        fields: ['updated_at']
      }
    ];

    const allIndexes = [...standardIndexes, ...additionalIndexes];

    for (const index of allIndexes) {
      try {
        if (context.isDryRun) {
          context.logger.info('DRY RUN: Would create index', {
            tableName,
            indexName: index.name,
            fields: index.fields
          });
          continue;
        }

        await context.queryInterface.addIndex(tableName, index.fields, {
          name: index.name,
          unique: index.unique || false,
          where: index.where,
          transaction: context.transaction
        });

        context.logger.debug('Index created', {
          tableName,
          indexName: index.name,
          fields: index.fields
        });
      } catch (error) {
        context.logger.error('Failed to create index', error, {
          tableName,
          indexName: index.name
        });
        throw error;
      }
    }
  }

  /**
   * Helper: Backup table before modifications
   */
  protected async backupTable(
    context: MigrationContext,
    tableName: string,
    backupSuffix: string = 'backup'
  ): Promise<string> {
    const backupTableName = `${tableName}_${backupSuffix}_${Date.now()}`;
    
    const sql = `CREATE TABLE ${backupTableName} AS SELECT * FROM ${tableName}`;
    
    await this.executeSQL(context, sql);
    
    context.logger.info('Table backed up', {
      originalTable: tableName,
      backupTable: backupTableName
    });
    
    return backupTableName;
  }

  /**
   * Helper: Get table row count
   */
  protected async getRowCount(
    context: MigrationContext,
    tableName: string
  ): Promise<number> {
    const result = await this.executeSQL(
      context,
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    
    return parseInt(result[0][0].count);
  }

  /**
   * Helper: Validate data integrity after migration
   */
  protected async validateDataIntegrity(
    context: MigrationContext,
    validations: Array<{
      name: string;
      sql: string;
      expectedResult?: any;
    }>
  ): Promise<void> {
    context.logger.info('Running data integrity validations', {
      validationCount: validations.length
    });

    for (const validation of validations) {
      try {
        const result = await this.executeSQL(context, validation.sql);
        
        if (validation.expectedResult !== undefined) {
          const actualValue = result[0][0];
          if (JSON.stringify(actualValue) !== JSON.stringify(validation.expectedResult)) {
            throw new ValidationError(
              `Data integrity validation failed: ${validation.name}`,
              {
                expected: validation.expectedResult,
                actual: actualValue,
                sql: validation.sql
              }
            );
          }
        }
        
        context.logger.debug('Data integrity validation passed', {
          validation: validation.name
        });
        
      } catch (error) {
        context.logger.error('Data integrity validation failed', error, {
          validation: validation.name
        });
        throw error;
      }
    }
  }

  /**
   * Helper: Log migration progress
   */
  protected logProgress(
    context: MigrationContext,
    step: string,
    details?: Record<string, any>
  ): void {
    context.logger.info(`Migration ${this.metadata.name}: ${step}`, {
      migration: this.metadata.name,
      version: this.metadata.version,
      step,
      ...details
    });
  }
}