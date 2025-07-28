/**
 * AI User Feedback Model
 * Stores user corrections for AI learning and improvement
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface AIUserFeedbackAttributes {
  id: string;
  organizationId: string;
  feedbackId: string;
  userId?: string;
  correctionType: 'category' | 'sentiment' | 'priority' | 'other';
  originalValue?: string;
  correctedValue?: string;
  confidence?: number;
  notes?: string;
  createdAt: Date;
}

export class AIUserFeedback extends Model<AIUserFeedbackAttributes> implements AIUserFeedbackAttributes {
  public id!: string;
  public organizationId!: string;
  public feedbackId!: string;
  public userId?: string;
  public correctionType!: 'category' | 'sentiment' | 'priority' | 'other';
  public originalValue?: string;
  public correctedValue?: string;
  public confidence?: number;
  public notes?: string;
  public readonly createdAt!: Date;

  public static initModel(sequelize: Sequelize): typeof AIUserFeedback {
    AIUserFeedback.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        feedbackId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        correctionType: {
          type: DataTypes.ENUM('category', 'sentiment', 'priority', 'other'),
          allowNull: false,
        },
        originalValue: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        correctedValue: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        confidence: {
          type: DataTypes.DECIMAL(3, 2),
          allowNull: true,
        },
        notes: {
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
        modelName: 'AIUserFeedback',
        tableName: 'ai_user_feedback',
        timestamps: false,
      }
    );

    return AIUserFeedback;
  }

  public static associate(models: any): void {
    AIUserFeedback.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });

    AIUserFeedback.belongsTo(models.Feedback, {
      foreignKey: 'feedbackId',
      as: 'feedback',
    });

    if (models.User) {
      AIUserFeedback.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
}