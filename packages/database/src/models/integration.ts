import { DataTypes, Model, Sequelize } from 'sequelize';

export interface IntegrationAttributes {
  id: string;
  organizationId: string;
  type: 'slack' | 'zendesk' | 'intercom' | 'email' | 'webhook';
  name: string;
  status: 'connecting' | 'active' | 'error' | 'failed' | 'paused';
  configuration?: Record<string, any>;
  credentials?: Record<string, any>;
  lastSyncAt?: Date;
  healthCheck?: Record<string, any>;
  errorMessage?: string;
  syncStats?: Record<string, any>;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Integration extends Model<IntegrationAttributes> implements IntegrationAttributes {
  public id!: string;
  public organizationId!: string;
  public type!: 'slack' | 'zendesk' | 'intercom' | 'email' | 'webhook';
  public name!: string;
  public status!: 'connecting' | 'active' | 'error' | 'failed' | 'paused';
  public configuration?: Record<string, any>;
  public credentials?: Record<string, any>;
  public lastSyncAt?: Date;
  public healthCheck?: Record<string, any>;
  public errorMessage?: string;
  public syncStats?: Record<string, any>;
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Computed properties
  public get isActive(): boolean {
    return this.status === 'active';
  }

  public get isHealthy(): boolean {
    return this.status === 'active' && !this.errorMessage;
  }
}

export const initIntegration = (sequelize: Sequelize): typeof Integration => {
  Integration.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'id',
        },
      },
      type: {
        type: DataTypes.ENUM('slack', 'zendesk', 'intercom', 'email', 'webhook'),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('connecting', 'active', 'error', 'failed', 'paused'),
        allowNull: false,
        defaultValue: 'connecting',
      },
      configuration: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      credentials: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      healthCheck: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      syncStats: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Integration',
      tableName: 'integrations',
      timestamps: true,
      indexes: [
        {
          fields: ['organizationId'],
        },
        {
          fields: ['type'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['createdBy'],
        },
        {
          fields: ['organizationId', 'type'],
        },
      ],
    }
  );

  return Integration;
};