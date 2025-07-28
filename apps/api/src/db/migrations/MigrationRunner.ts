/**
 * Enhanced Migration System with Rollback Capabilities
 * Based on Zeda's proven migration patterns with TypeScript enhancements
 */

import fs from 'fs';
import path from 'path';
import { Sequelize, Transaction } from 'sequelize';
import { logger } from '../../utils/logger';
import { ResponseBuilder } from '../../utils/ResponseBuilder';
import { BaseError, DatabaseError, ValidationError } from '../../errors/SpecificErrors';

export interface MigrationConfig {
  filesToIncludeForAutoExec: string[];
  dependentMigrations: Record<string, string[]>;
  rollbackOrder?: string[];
  skipOnError?: boolean;
  transactionMode?: 'individual' | 'batch' | 'none';
}

export interface MigrationResult {
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'rolled_back';
  executedAt: Date;
  executionTime: number;
  errorLog?: {
    message: string;
    skipped: boolean;
    errorStack: string;
    level: string;
    timestamp: string;
  };
}

export interface ExecutedMigration {
  id: number;
  name: string;
  releaseVersion: string;
  executedAt: Date;
  errorLog?: any;
  rollbackExecutedAt?: Date;
  rollbackErrorLog?: any;
}

export interface BaseMigration {
  name: string;
  version: string;
  description?: string;
  run(context: MigrationContext): Promise<void>;
  rollback?(context: MigrationContext): Promise<void>;
  validate?(): Promise<boolean>;
  getDependencies?(): string[];
}

export interface MigrationContext {
  sequelize: Sequelize;
  transaction?: Transaction;
  queryInterface: any;
  dataTypes: any;
  releaseVersion: string;
  isDryRun: boolean;
  logger: any;
}

export class MigrationRunner {
  private sequelize: Sequelize;
  private releaseVersion: string;
  private migrationsPath: string;
  private executedMigrationsModel: any;

  constructor(
    sequelize: Sequelize,
    releaseVersion: string,
    migrationsPath: string,
    executedMigrationsModel: any
  ) {
    this.sequelize = sequelize;
    this.releaseVersion = releaseVersion;
    this.migrationsPath = migrationsPath;
    this.executedMigrationsModel = executedMigrationsModel;
  }

  /**
   * Run all migrations for the specified version
   */
  async runMigrations(
    options: {
      dryRun?: boolean;
      continueOnError?: boolean;
      rollbackOnError?: boolean;
      specificMigrations?: string[];
    } = {}
  ): Promise<MigrationResult[]> {
    const startTime = Date.now();
    const results: MigrationResult[] = [];

    try {
      logger.info('Migration execution started', {
        releaseVersion: this.releaseVersion,
        options
      });

      // Validate version directory exists
      const versionPath = path.join(this.migrationsPath, this.releaseVersion);
      if (!fs.existsSync(versionPath)) {
        throw new ValidationError(
          `Migration version directory not found: ${this.releaseVersion}`,
          { path: versionPath }
        );
      }

      // Load migration configuration
      const config = await this.loadMigrationConfig(versionPath);
      
      // Get list of migrations to execute
      const migrationsToRun = options.specificMigrations || config.filesToIncludeForAutoExec;
      
      // Load executed migrations from database
      const executedMigrations = await this.getExecutedMigrations();
      const executedMigrationsMap = new Map(
        executedMigrations.map(m => [m.name, m])
      );

      // Filter successful migrations
      const successfulMigrations = executedMigrations
        .filter(m => m.releaseVersion === this.releaseVersion && !m.errorLog)
        .map(m => m.name);

      // Validate dependencies
      await this.validateDependencies(config, successfulMigrations);

      logger.info('Migrations to be executed', {
        migrations: migrationsToRun,
        successfulCount: successfulMigrations.length,
        totalCount: migrationsToRun.length
      });

      // Execute migrations in order
      let executionCount = 0;
      for (const migrationName of migrationsToRun) {
        executionCount++;
        
        const executedMigration = executedMigrationsMap.get(migrationName);
        const result = await this.executeSingleMigration({
          migrationName,
          executedMigration,
          config,
          successfulMigrations,
          count: executionCount,
          totalCount: migrationsToRun.length,
          options
        });

        results.push(result);

        // Handle execution result
        if (result.status === 'success') {
          successfulMigrations.push(migrationName);
        } else if (result.status === 'failed' && options.rollbackOnError) {
          logger.warn('Rolling back due to migration failure', {
            failedMigration: migrationName
          });
          await this.rollbackMigrations(successfulMigrations);
          break;
        } else if (result.status === 'failed' && !options.continueOnError) {
          logger.error('Stopping migration execution due to failure', {
            failedMigration: migrationName
          });
          break;
        }
      }

      logger.info('Migration execution completed', {
        releaseVersion: this.releaseVersion,
        totalTime: Date.now() - startTime,
        results: results.map(r => ({ name: r.name, status: r.status }))
      });

      return results;

    } catch (error) {
      logger.error('Migration execution failed', error, {
        releaseVersion: this.releaseVersion,
        totalTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Rollback migrations in reverse order
   */
  async rollbackMigrations(
    migrationsToRollback: string[],
    options: { dryRun?: boolean } = {}
  ): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const rollbackOrder = [...migrationsToRollback].reverse();

    logger.info('Starting migration rollback', {
      migrations: rollbackOrder,
      dryRun: options.dryRun
    });

    try {
      for (const migrationName of rollbackOrder) {
        const result = await this.rollbackSingleMigration(migrationName, options);
        results.push(result);

        if (result.status === 'failed') {
          logger.error('Rollback failed, stopping', { migration: migrationName });
          break;
        }
      }

      logger.info('Migration rollback completed', {
        results: results.map(r => ({ name: r.name, status: r.status }))
      });

      return results;

    } catch (error) {
      logger.error('Migration rollback failed', error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  private async executeSingleMigration({
    migrationName,
    executedMigration,
    config,
    successfulMigrations,
    count,
    totalCount,
    options
  }: {
    migrationName: string;
    executedMigration?: ExecutedMigration;
    config: MigrationConfig;
    successfulMigrations: string[];
    count: number;
    totalCount: number;
    options: any;
  }): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Skip if already executed successfully
      if (executedMigration && !executedMigration.errorLog) {
        logger.info(`Skipped: Migration ${migrationName} already executed (${count}/${totalCount})`);
        return {
          name: migrationName,
          status: 'skipped',
          executedAt: executedMigration.executedAt,
          executionTime: 0
        };
      }

      // Check dependencies
      const dependencies = config.dependentMigrations[migrationName] || [];
      const missingDependencies = dependencies.filter(dep => !successfulMigrations.includes(dep));
      
      if (missingDependencies.length > 0) {
        const error = new ValidationError(
          `Skipping migration ${migrationName} as dependencies failed: ${missingDependencies.join(', ')}`,
          {
            migration: migrationName,
            missingDependencies,
            availableMigrations: successfulMigrations
          }
        );

        await this.recordMigrationResult(migrationName, executedMigration?.id, {
          message: error.message,
          skipped: true,
          errorStack: error.stack || '',
          level: 'warning',
          timestamp: new Date().toISOString()
        });

        return {
          name: migrationName,
          status: 'skipped',
          executedAt: new Date(),
          executionTime: Date.now() - startTime,
          errorLog: {
            message: error.message,
            skipped: true,
            errorStack: error.stack || '',
            level: 'warning',
            timestamp: new Date().toISOString()
          }
        };
      }

      // Load and execute migration
      const migrationPath = path.join(this.migrationsPath, this.releaseVersion, migrationName);
      const MigrationClass = require(migrationPath);
      const migration: BaseMigration = new MigrationClass();

      // Validate migration
      if (migration.validate && !(await migration.validate())) {
        throw new ValidationError(`Migration ${migrationName} validation failed`);
      }

      // Create migration context
      const context: MigrationContext = {
        sequelize: this.sequelize,
        queryInterface: this.sequelize.getQueryInterface(),
        dataTypes: this.sequelize.Sequelize.DataTypes,
        releaseVersion: this.releaseVersion,
        isDryRun: options.dryRun || false,
        logger
      };

      // Execute with transaction if configured
      if (config.transactionMode === 'individual' || config.transactionMode === undefined) {
        await this.sequelize.transaction(async (transaction) => {
          context.transaction = transaction;
          await migration.run(context);
        });
      } else {
        await migration.run(context);
      }

      // Record success
      await this.recordMigrationResult(migrationName, executedMigration?.id, null);

      logger.info(`Migration ${count}/${totalCount} executed successfully: ${migrationName}`, {
        executionTime: Date.now() - startTime
      });

      return {
        name: migrationName,
        status: 'success',
        executedAt: new Date(),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorLog = {
        message: error.message || 'Unknown error occurred',
        skipped: false,
        errorStack: error.stack || '',
        level: 'error',
        timestamp: new Date().toISOString()
      };

      await this.recordMigrationResult(migrationName, executedMigration?.id, errorLog);

      logger.error(`Migration ${count}/${totalCount} failed: ${migrationName}`, error, {
        executionTime: Date.now() - startTime
      });

      return {
        name: migrationName,
        status: 'failed',
        executedAt: new Date(),
        executionTime: Date.now() - startTime,
        errorLog
      };
    }
  }

  /**
   * Rollback a single migration
   */
  private async rollbackSingleMigration(
    migrationName: string,
    options: { dryRun?: boolean }
  ): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      logger.info(`Rolling back migration: ${migrationName}`);

      // Load migration
      const migrationPath = path.join(this.migrationsPath, this.releaseVersion, migrationName);
      const MigrationClass = require(migrationPath);
      const migration: BaseMigration = new MigrationClass();

      if (!migration.rollback) {
        logger.warn(`Migration ${migrationName} does not support rollback`);
        return {
          name: migrationName,
          status: 'skipped',
          executedAt: new Date(),
          executionTime: Date.now() - startTime
        };
      }

      // Create rollback context
      const context: MigrationContext = {
        sequelize: this.sequelize,
        queryInterface: this.sequelize.getQueryInterface(),
        dataTypes: this.sequelize.Sequelize.DataTypes,
        releaseVersion: this.releaseVersion,
        isDryRun: options.dryRun || false,
        logger
      };

      // Execute rollback with transaction
      await this.sequelize.transaction(async (transaction) => {
        context.transaction = transaction;
        await migration.rollback!(context);
      });

      // Update database record
      await this.recordRollbackResult(migrationName, null);

      logger.info(`Migration rolled back successfully: ${migrationName}`, {
        executionTime: Date.now() - startTime
      });

      return {
        name: migrationName,
        status: 'rolled_back',
        executedAt: new Date(),
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      const errorLog = {
        message: error.message || 'Rollback failed',
        skipped: false,
        errorStack: error.stack || '',
        level: 'error',
        timestamp: new Date().toISOString()
      };

      await this.recordRollbackResult(migrationName, errorLog);

      logger.error(`Migration rollback failed: ${migrationName}`, error, {
        executionTime: Date.now() - startTime
      });

      return {
        name: migrationName,
        status: 'failed',
        executedAt: new Date(),
        executionTime: Date.now() - startTime,
        errorLog
      };
    }
  }

  /**
   * Load migration configuration from version directory
   */
  private async loadMigrationConfig(versionPath: string): Promise<MigrationConfig> {
    const configPath = path.join(versionPath, 'index.js');
    
    if (!fs.existsSync(configPath)) {
      throw new ValidationError(`Migration config not found: ${configPath}`);
    }

    try {
      const config = require(configPath);
      
      // Validate required fields
      if (!config.filesToIncludeForAutoExec || !Array.isArray(config.filesToIncludeForAutoExec)) {
        throw new ValidationError('Invalid migration config: filesToIncludeForAutoExec is required');
      }

      return {
        filesToIncludeForAutoExec: config.filesToIncludeForAutoExec,
        dependentMigrations: config.dependentMigrations || {},
        rollbackOrder: config.rollbackOrder,
        skipOnError: config.skipOnError || false,
        transactionMode: config.transactionMode || 'individual'
      };

    } catch (error) {
      throw new DatabaseError(`Failed to load migration config: ${error.message}`, {
        configPath,
        originalError: error
      });
    }
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<ExecutedMigration[]> {
    try {
      return await this.executedMigrationsModel.findAll({
        where: {
          releaseVersion: this.releaseVersion
        },
        order: [['executedAt', 'ASC']]
      });
    } catch (error) {
      throw new DatabaseError('Failed to fetch executed migrations', {
        releaseVersion: this.releaseVersion,
        originalError: error
      });
    }
  }

  /**
   * Validate migration dependencies
   */
  private async validateDependencies(
    config: MigrationConfig,
    successfulMigrations: string[]
  ): Promise<void> {
    for (const [migration, dependencies] of Object.entries(config.dependentMigrations)) {
      const missingDeps = dependencies.filter(dep => !successfulMigrations.includes(dep));
      
      if (missingDeps.length > 0 && config.filesToIncludeForAutoExec.includes(migration)) {
        logger.warn(`Migration ${migration} has unmet dependencies`, {
          migration,
          missingDependencies: missingDeps,
          availableMigrations: successfulMigrations
        });
      }
    }
  }

  /**
   * Record migration execution result
   */
  private async recordMigrationResult(
    migrationName: string,
    existingId?: number,
    errorLog?: any
  ): Promise<void> {
    try {
      if (!existingId) {
        await this.executedMigrationsModel.create({
          name: migrationName,
          releaseVersion: this.releaseVersion,
          executedAt: new Date(),
          errorLog
        });
      } else {
        await this.executedMigrationsModel.update({
          errorLog,
          executedAt: new Date()
        }, {
          where: { id: existingId }
        });
      }
    } catch (error) {
      logger.error('Failed to record migration result', error, {
        migrationName,
        existingId,
        hasError: !!errorLog
      });
    }
  }

  /**
   * Record rollback execution result
   */
  private async recordRollbackResult(
    migrationName: string,
    errorLog?: any
  ): Promise<void> {
    try {
      await this.executedMigrationsModel.update({
        rollbackExecutedAt: new Date(),
        rollbackErrorLog: errorLog
      }, {
        where: {
          name: migrationName,
          releaseVersion: this.releaseVersion
        }
      });
    } catch (error) {
      logger.error('Failed to record rollback result', error, {
        migrationName,
        hasError: !!errorLog
      });
    }
  }

  /**
   * Get migration status summary
   */
  async getMigrationStatus(): Promise<{
    version: string;
    totalMigrations: number;
    executedMigrations: number;
    failedMigrations: number;
    pendingMigrations: string[];
  }> {
    try {
      const versionPath = path.join(this.migrationsPath, this.releaseVersion);
      const config = await this.loadMigrationConfig(versionPath);
      const executedMigrations = await this.getExecutedMigrations();

      const successfulMigrations = executedMigrations
        .filter(m => !m.errorLog)
        .map(m => m.name);

      const failedMigrations = executedMigrations
        .filter(m => m.errorLog)
        .length;

      const pendingMigrations = config.filesToIncludeForAutoExec
        .filter(name => !successfulMigrations.includes(name));

      return {
        version: this.releaseVersion,
        totalMigrations: config.filesToIncludeForAutoExec.length,
        executedMigrations: successfulMigrations.length,
        failedMigrations,
        pendingMigrations
      };

    } catch (error) {
      throw new DatabaseError('Failed to get migration status', {
        releaseVersion: this.releaseVersion,
        originalError: error
      });
    }
  }
}