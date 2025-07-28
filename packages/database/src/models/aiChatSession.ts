/**
 * AI Chat Session Model
 * Stores chat sessions for RAG conversations
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChatSessionAttributes {
  id: string;
  organizationId: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  metadata?: any;
  lastMessageAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AIChatSession extends Model<AIChatSessionAttributes> implements AIChatSessionAttributes {
  public id!: string;
  public organizationId!: string;
  public userId!: string;
  public title?: string;
  public messages!: ChatMessage[];
  public metadata?: any;
  public lastMessageAt?: Date;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize): typeof AIChatSession {
    AIChatSession.init(
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
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        messages: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        lastMessageAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'AIChatSession',
        tableName: 'ai_chat_sessions',
        timestamps: true,
      }
    );

    return AIChatSession;
  }

  public static associate(models: any): void {
    AIChatSession.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });

    if (models.User) {
      AIChatSession.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
}