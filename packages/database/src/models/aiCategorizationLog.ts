/**
 * AI Categorization Log Model
 * Tracks AI categorization results for performance monitoring
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface AICategorizationLogAttributes {
  id: string;
  feedbackId: string;
  organizationId: string;
  category?: string;
  categoryConfidence?: number;
  sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentConfidence?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  processingTime?: number;
  aiModel?: string;
  reasoning?: string;
  createdAt: Date;
}

export class AICategorizationLog extends Model<AICategorizationLogAttributes> implements AICategorizationLogAttributes {
  public id!: string;
  public feedbackId!: string;
  public organizationId!: string;
  public category?: string;
  public categoryConfidence?: number;
  public sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  public sentimentConfidence?: number;
  public priority?: 'low' | 'medium' | 'high' | 'urgent';
  public processingTime?: number;
  public aiModel?: string;
  public reasoning?: string;
  public readonly createdAt!: Date;

  public static initModel(sequelize: Sequelize): typeof AICategorizationLog {
    AICategorizationLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        feedbackId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        categoryConfidence: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: true,
        },
        sentiment: {
          type: DataTypes.ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive'),
          allowNull: true,
        },
        sentimentConfidence: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: true,
        },
        priority: {
          type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
          allowNull: true,
        },
        processingTime: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        aiModel: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        reasoning: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'AICategorizationLog',
        tableName: 'ai_categorization_logs',
        timestamps: false,
      }
    );

    return AICategorizationLog;
  }

  public static associate(models: any): void {
    AICategorizationLog.belongsTo(models.Feedback, {
      foreignKey: 'feedbackId',
      as: 'feedback',
    });

    AICategorizationLog.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });
  }
}