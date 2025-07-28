/**
 * Feedback Embedding Model
 * Stores vector embeddings for semantic search
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export interface FeedbackEmbeddingAttributes {
  id: string;
  feedbackId: string;
  organizationId: string;
  embedding: number[]; // JSONB fallback
  embedding_vector?: any; // Native vector column
  text: string;
  tokens?: number;
  model: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class FeedbackEmbedding extends Model<FeedbackEmbeddingAttributes> implements FeedbackEmbeddingAttributes {
  public id!: string;
  public feedbackId!: string;
  public organizationId!: string;
  public embedding!: number[];
  public embedding_vector?: any;
  public text!: string;
  public tokens?: number;
  public model!: string;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static initModel(sequelize: Sequelize): typeof FeedbackEmbedding {
    FeedbackEmbedding.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        feedbackId: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        organizationId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        embedding: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        embedding_vector: {
          type: DataTypes.JSONB, // Using JSONB instead of vector for now
          allowNull: true,
        },
        text: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        tokens: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        model: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'text-embedding-3-large',
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
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
        modelName: 'FeedbackEmbedding',
        tableName: 'feedback_embeddings',
        timestamps: true,
      }
    );

    return FeedbackEmbedding;
  }

  public static associate(models: any): void {
    FeedbackEmbedding.belongsTo(models.Feedback, {
      foreignKey: 'feedbackId',
      as: 'feedback',
    });

    FeedbackEmbedding.belongsTo(models.Organization, {
      foreignKey: 'organizationId',
      as: 'organization',
    });
  }
}