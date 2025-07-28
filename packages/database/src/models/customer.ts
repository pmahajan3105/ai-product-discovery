import { DataTypes, Model, Sequelize, Op } from 'sequelize';

export interface CustomerAttributes {
  id: string;
  organizationId: string;
  name?: string;
  email?: string;
  company?: string;
  domain?: string;
  externalId?: string;
  avatar?: string;
  metadata?: Record<string, any>;  
  enrichmentData?: Record<string, any>;
  identificationConfidence?: number;
  lastSeenAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Customer extends Model<CustomerAttributes> implements CustomerAttributes {
  public id!: string;
  public organizationId!: string;
  public name?: string;
  public email?: string;
  public company?: string;
  public domain?: string;
  public externalId?: string;
  public avatar?: string;
  public metadata?: Record<string, any>;
  public enrichmentData?: Record<string, any>;
  public identificationConfidence?: number;
  public lastSeenAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Computed properties
  public get displayName(): string {
    return this.name || this.email || 'Anonymous Customer';
  }
}

export const initCustomer = (sequelize: Sequelize): typeof Customer => {
  Customer.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      company: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      externalId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      enrichmentData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      identificationConfidence: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 1,
        },
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Customer',
      tableName: 'customers',
      timestamps: true,
      indexes: [
        {
          fields: ['organizationId'],
        },
        {
          fields: ['email'],
        },
        {
          fields: ['company'],
        },
        {
          fields: ['domain'],
        },
        {
          fields: ['externalId'],
        },
        {
          fields: ['organizationId', 'email'],
        },
      ],
    }
  );

  return Customer;
};