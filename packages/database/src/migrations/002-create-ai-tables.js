/**
 * AI tables migration
 * Creates tables for AI functionality including company profiles, user feedback, and logs
 */

const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  // 1. Company Profiles table for AI context
  await queryInterface.createTable('company_profiles', {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      unique: true, // One profile per organization
    },
    industry: {
      type: DataTypes.ENUM('SaaS', 'E-commerce', 'Fintech', 'Healthcare', 'EdTech', 'Other'),
      allowNull: false,
      defaultValue: 'Other',
    },
    productType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companySize: {
      type: DataTypes.ENUM('Startup', 'SMB', 'Mid-Market', 'Enterprise'),
      allowNull: false,
      defaultValue: 'SMB',
    },
    customerSegments: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    businessGoals: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    competitivePosition: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    currentChallenges: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    productFeatures: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    targetMarket: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoryMapping: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    priorityKeywords: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    customerValueWords: {
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
  });

  // 2. AI User Feedback table for learning
  await queryInterface.createTable('ai_user_feedback', {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    feedbackId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'feedback',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
  });

  // 3. AI Categorization Log table for tracking
  await queryInterface.createTable('ai_categorization_logs', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    feedbackId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'feedback',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
  });

  // 4. Feedback Embeddings table for vector search
  await queryInterface.createTable('feedback_embeddings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    feedbackId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'feedback',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      unique: true, // One embedding per feedback
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'organizations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    embedding: {
      type: DataTypes.JSONB, // Store as JSON array until pgvector is set up
      allowNull: false,
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // 5. AI Chat Sessions table
  await queryInterface.createTable('ai_chat_sessions', {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    messages: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: '[]',
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
  });

  // Create indexes for better performance
  console.log('Creating AI table indexes...');

  // Company Profiles indexes
  await queryInterface.addIndex('company_profiles', ['organizationId'], { unique: true });
  await queryInterface.addIndex('company_profiles', ['industry']);

  // AI User Feedback indexes
  await queryInterface.addIndex('ai_user_feedback', ['organizationId']);
  await queryInterface.addIndex('ai_user_feedback', ['feedbackId']);
  await queryInterface.addIndex('ai_user_feedback', ['correctionType']);
  await queryInterface.addIndex('ai_user_feedback', ['createdAt']);

  // AI Categorization Logs indexes
  await queryInterface.addIndex('ai_categorization_logs', ['organizationId']);
  await queryInterface.addIndex('ai_categorization_logs', ['feedbackId']);
  await queryInterface.addIndex('ai_categorization_logs', ['category']);
  await queryInterface.addIndex('ai_categorization_logs', ['createdAt']);

  // Feedback Embeddings indexes
  await queryInterface.addIndex('feedback_embeddings', ['organizationId']);
  await queryInterface.addIndex('feedback_embeddings', ['feedbackId'], { unique: true });
  await queryInterface.addIndex('feedback_embeddings', ['model']);

  // AI Chat Sessions indexes
  await queryInterface.addIndex('ai_chat_sessions', ['organizationId']);
  await queryInterface.addIndex('ai_chat_sessions', ['userId']);
  await queryInterface.addIndex('ai_chat_sessions', ['isActive']);
  await queryInterface.addIndex('ai_chat_sessions', ['lastMessageAt']);

  console.log('✅ All AI tables and indexes created successfully!');
};

const down = async (queryInterface) => {
  // Drop tables in reverse order to handle foreign key constraints
  await queryInterface.dropTable('ai_chat_sessions');
  await queryInterface.dropTable('feedback_embeddings');
  await queryInterface.dropTable('ai_categorization_logs');
  await queryInterface.dropTable('ai_user_feedback');
  await queryInterface.dropTable('company_profiles');

  console.log('✅ All AI tables dropped successfully!');
};

module.exports = { up, down };