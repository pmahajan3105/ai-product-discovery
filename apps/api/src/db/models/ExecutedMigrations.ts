/**
 * Executed Migrations Model - Tracks database migration execution
 * Based on Zeda patterns with enhanced error tracking and rollback support
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ExecutedMigrationAttributes {
  id: number;
  name: string;
  releaseVersion: string;
  executedAt: Date;
  errorLog?: {
    message: string;
    skipped: boolean;
    errorStack: string;
    level: string;
    timestamp: string;
  };
  rollbackExecutedAt?: Date;
  rollbackErrorLog?: {
    message: string;
    errorStack: string;
    level: string;
    timestamp: string;
  };
  executionTime?: number;
  checksum?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutedMigrationCreationAttributes extends Omit<ExecutedMigrationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ExecutedMigrations extends Model<ExecutedMigrationAttributes, ExecutedMigrationCreationAttributes> 
  implements ExecutedMigrationAttributes {
  
  public id!: number;
  public name!: string;
  public releaseVersion!: string;
  public executedAt!: Date;
  public errorLog?: {
    message: string;
    skipped: boolean;
    errorStack: string;
    level: string;
    timestamp: string;
  };
  public rollbackExecutedAt?: Date;
  public rollbackErrorLog?: {
    message: string;
    errorStack: string;
    level: string;
    timestamp: string;
  };
  public executionTime?: number;
  public checksum?: string;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Check if migration was successful
   */
  public get isSuccessful(): boolean {
    return !this.errorLog;
  }

  /**
   * Check if migration was skipped
   */
  public get wasSkipped(): boolean {
    return this.errorLog?.skipped || false;
  }

  /**
   * Check if migration was rolled back
   */
  public get wasRolledBack(): boolean {
    return !!this.rollbackExecutedAt;
  }

  /**
   * Get migration status string
   */
  public get status(): 'success' | 'failed' | 'skipped' | 'rolled_back' {
    if (this.wasRolledBack) return 'rolled_back';
    if (this.wasSkipped) return 'skipped';
    if (this.isSuccessful) return 'success';
    return 'failed';
  }

  /**
   * Get formatted execution time
   */
  public get formattedExecutionTime(): string {
    if (!this.executionTime) return 'N/A';
    
    if (this.executionTime < 1000) {
      return `${this.executionTime}ms`;
    } else if (this.executionTime < 60000) {
      return `${(this.executionTime / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(this.executionTime / 60000);
      const seconds = ((this.executionTime % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Get error summary
   */
  public getErrorSummary(): string | null {
    if (!this.errorLog) return null;
    
    return `${this.errorLog.level.toUpperCase()}: ${this.errorLog.message}`;
  }

  /**
   * Get rollback error summary
   */
  public getRollbackErrorSummary(): string | null {
    if (!this.rollbackErrorLog) return null;
    
    return `${this.rollbackErrorLog.level.toUpperCase()}: ${this.rollbackErrorLog.message}`;
  }

  /**
   * Static method to find successful migrations for a version
   */
  public static async findSuccessfulMigrations(releaseVersion: string): Promise<ExecutedMigrations[]> {
    return this.findAll({
      where: {
        releaseVersion,
        errorLog: null
      },
      order: [['executedAt', 'ASC']]
    });
  }

  /**
   * Static method to find failed migrations for a version
   */
  public static async findFailedMigrations(releaseVersion: string): Promise<ExecutedMigrations[]> {
    return this.findAll({
      where: {
        releaseVersion,
        errorLog: { [DataTypes.Op.ne]: null }
      },
      order: [['executedAt', 'ASC']]
    });
  }

  /**
   * Static method to get migration statistics
   */
  public static async getMigrationStats(releaseVersion?: string): Promise<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    rolledBack: number;
  }> {
    const whereClause = releaseVersion ? { releaseVersion } : {};
    
    const migrations = await this.findAll({
      where: whereClause,
      attributes: ['errorLog', 'rollbackExecutedAt']
    });

    const stats = {
      total: migrations.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      rolledBack: 0
    };

    migrations.forEach(migration => {
      if (migration.rollbackExecutedAt) {
        stats.rolledBack++;
      } else if (migration.errorLog?.skipped) {
        stats.skipped++;
      } else if (migration.errorLog) {
        stats.failed++;
      } else {
        stats.successful++;
      }
    });

    return stats;
  }

  /**
   * Static method to get recent migration history
   */
  public static async getRecentHistory(limit: number = 20): Promise<ExecutedMigrations[]> {
    return this.findAll({
      order: [['executedAt', 'DESC']],
      limit
    });
  }

  /**
   * Static method to cleanup old migration records
   */
  public static async cleanupOldRecords(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await this.destroy({
      where: {
        executedAt: {
          [DataTypes.Op.lt]: cutoffDate
        },
        // Only cleanup successful migrations (keep failed ones for debugging)
        errorLog: null,
        rollbackExecutedAt: null
      }
    });

    return deletedCount;
  }

  /**
   * Initialize the model
   */
  public static initialize(sequelize: Sequelize): typeof ExecutedMigrations {
    ExecutedMigrations.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          comment: 'Migration file name'
        },
        releaseVersion: {
          type: DataTypes.STRING(50),
          allowNull: false,
          comment: 'Release version this migration belongs to'
        },
        executedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          comment: 'When the migration was executed'
        },
        errorLog: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Error details if migration failed',
          validate: {
            isValidErrorLog(value: any) {
              if (value !== null && value !== undefined) {
                if (typeof value !== 'object') {
                  throw new Error('errorLog must be an object');
                }
                if (!value.message || !value.timestamp) {
                  throw new Error('errorLog must contain message and timestamp');
                }
              }
            }
          }
        },
        rollbackExecutedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'When the migration was rolled back'
        },
        rollbackErrorLog: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Error details if rollback failed'
        },
        executionTime: {
          type: DataTypes.INTEGER,
          allowNull: true,
          comment: 'Migration execution time in milliseconds'
        },
        checksum: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: 'Migration file checksum for integrity verification'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      },
      {
        sequelize,
        modelName: 'ExecutedMigrations',
        tableName: 'executed_migrations',
        timestamps: true,
        indexes: [
          {
            name: 'idx_executed_migrations_name_version',
            fields: ['name', 'releaseVersion'],
            unique: true
          },
          {
            name: 'idx_executed_migrations_version',
            fields: ['releaseVersion']
          },
          {
            name: 'idx_executed_migrations_executed_at',
            fields: ['executedAt']
          },
          {
            name: 'idx_executed_migrations_status',
            fields: ['errorLog', 'rollbackExecutedAt']
          }
        ],
        hooks: {
          beforeCreate: (migration: ExecutedMigrations) => {
            // Set execution time if not provided
            if (!migration.executionTime) {
              migration.executionTime = 0;
            }
          },
          beforeUpdate: (migration: ExecutedMigrations) => {
            // Update timestamp when error log is modified
            if (migration.changed('errorLog') || migration.changed('rollbackErrorLog')) {
              migration.updatedAt = new Date();
            }
          }
        }
      }
    );

    return ExecutedMigrations;
  }

  /**
   * Define associations
   */
  public static associate(): void {
    // Add associations if needed in the future
    // For example, association with Users model for who executed the migration
  }
}

export default ExecutedMigrations;