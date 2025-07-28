import { DataTypes, Model, Sequelize } from 'sequelize';

export interface FeedbackAttributes {
  id: string;
  organizationId: string;
  customerId?: string;
  integrationId?: string;
  title: string;
  description: string;
  source: string;
  sourceMetadata?: Record<string, any>;
  status: 'new' | 'triaged' | 'planned' | 'in_progress' | 'resolved' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore?: number;
  upvoteCount: number;
  assignedTo?: string;
  metadata?: Record<string, any>;
  aiAnalysis?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Feedback extends Model<FeedbackAttributes> implements FeedbackAttributes {
  public id!: string;
  public organizationId!: string;
  public customerId?: string;
  public integrationId?: string;
  public title!: string;
  public description!: string;
  public source!: string;
  public sourceMetadata?: Record<string, any>;
  public status!: 'new' | 'triaged' | 'planned' | 'in_progress' | 'resolved' | 'archived';
  public priority?: 'low' | 'medium' | 'high' | 'urgent';
  public category?: string;
  public sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  public sentimentScore?: number;
  public upvoteCount!: number;
  public assignedTo?: string;
  public metadata?: Record<string, any>;
  public aiAnalysis?: Record<string, any>;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Computed properties
  public get isPositive(): boolean {
    return this.sentiment === 'positive' || this.sentiment === 'very_positive';
  }

  public get isNegative(): boolean {
    return this.sentiment === 'negative' || this.sentiment === 'very_negative';
  }
}

export const initFeedback = (sequelize: Sequelize): typeof Feedback => {
  Feedback.init(
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
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      integrationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'integrations',
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 500],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [1, 100],
        },
      },
      sourceMetadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived'),
        allowNull: false,
        defaultValue: 'new',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [1, 100],
        },
      },
      sentiment: {
        type: DataTypes.ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive'),
        allowNull: true,
      },
      sentimentScore: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: -1,
          max: 1,
        },
      },
      upvoteCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      aiAnalysis: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Feedback',
      tableName: 'feedback',
      timestamps: true,
      indexes: [
        {
          fields: ['organizationId'],
        },
        {
          fields: ['customerId'],
        },
        {
          fields: ['integrationId'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['category'],
        },
        {
          fields: ['sentiment'],
        },
        {
          fields: ['assignedTo'],
        },
        {
          fields: ['source'],
        },
        {
          fields: ['createdAt'],
        },
        {
          fields: ['organizationId', 'status', 'createdAt'],
        },
        {
          fields: ['organizationId', 'customerId', 'createdAt'],
        },
      ],
    }
  );

  return Feedback;
};