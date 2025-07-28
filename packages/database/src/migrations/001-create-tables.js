/**
 * Initial migration to create all FeedbackHub tables
 * Based on our Sequelize models with proper relationships and indexes
 */

const { DataTypes } = require('sequelize');

const up = async (queryInterface) => {
  // Create ENUM types first
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_users_provider" AS ENUM ('email', 'google');
  `);

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_organization_users_role" AS ENUM ('owner', 'admin', 'member', 'viewer');
  `);

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_integrations_type" AS ENUM ('slack', 'zendesk', 'intercom', 'email', 'webhook');
  `);

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_integrations_status" AS ENUM ('connecting', 'active', 'error', 'failed', 'paused');
  `);

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_feedback_status" AS ENUM ('new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived');
  `);

  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_feedback_sentiment" AS ENUM ('very_negative', 'negative', 'neutral', 'positive', 'very_positive');
  `);

  // 1. Users table
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    provider: {
      type: DataTypes.ENUM('email', 'google'),
      allowNull: false,
      defaultValue: 'email',
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    lastActivityTime: {
      type: DataTypes.DATE,
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

  // 2. Organizations table
  await queryInterface.createTable('organizations', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    uniqueName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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

  // 3. Organization Users junction table (many-to-many)
  await queryInterface.createTable('organization_users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
      allowNull: false,
      defaultValue: 'member',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
  });

  // 4. Customers table
  await queryInterface.createTable('customers', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
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
    },
    lastSeenAt: {
      type: DataTypes.DATE,
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

  // 5. Integrations table
  await queryInterface.createTable('integrations', {
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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

  // 6. Feedback table
  await queryInterface.createTable('feedback', {
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
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'customers',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    integrationId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'integrations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
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
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sentiment: {
      type: DataTypes.ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive'),
      allowNull: true,
    },
    sentimentScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    upvoteCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    aiAnalysis: {
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

  // 7. Comments table
  await queryInterface.createTable('comments', {
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
    parentCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mentions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    reactions: {
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

  // Create indexes for better performance
  console.log('Creating database indexes...');

  // Users indexes
  await queryInterface.addIndex('users', ['email'], { unique: true });
  await queryInterface.addIndex('users', ['googleId'], { unique: true });
  await queryInterface.addIndex('users', ['provider']);
  await queryInterface.addIndex('users', ['lastActivityTime']);

  // Organizations indexes
  await queryInterface.addIndex('organizations', ['uniqueName'], { unique: true });
  await queryInterface.addIndex('organizations', ['createdBy']);
  await queryInterface.addIndex('organizations', ['name']);

  // Organization Users indexes
  await queryInterface.addIndex('organization_users', ['userId', 'organizationId'], { unique: true });
  await queryInterface.addIndex('organization_users', ['userId']);
  await queryInterface.addIndex('organization_users', ['organizationId']);
  await queryInterface.addIndex('organization_users', ['role']);

  // Customers indexes
  await queryInterface.addIndex('customers', ['organizationId']);
  await queryInterface.addIndex('customers', ['email']);
  await queryInterface.addIndex('customers', ['company']);
  await queryInterface.addIndex('customers', ['domain']);
  await queryInterface.addIndex('customers', ['externalId']);
  await queryInterface.addIndex('customers', ['organizationId', 'email']);

  // Integrations indexes
  await queryInterface.addIndex('integrations', ['organizationId']);
  await queryInterface.addIndex('integrations', ['type']);
  await queryInterface.addIndex('integrations', ['status']);
  await queryInterface.addIndex('integrations', ['createdBy']);
  await queryInterface.addIndex('integrations', ['organizationId', 'type']);

  // Feedback indexes
  await queryInterface.addIndex('feedback', ['organizationId']);
  await queryInterface.addIndex('feedback', ['customerId']);
  await queryInterface.addIndex('feedback', ['integrationId']);
  await queryInterface.addIndex('feedback', ['status']);
  await queryInterface.addIndex('feedback', ['category']);
  await queryInterface.addIndex('feedback', ['sentiment']);
  await queryInterface.addIndex('feedback', ['assignedTo']);
  await queryInterface.addIndex('feedback', ['source']);
  await queryInterface.addIndex('feedback', ['createdAt']);
  await queryInterface.addIndex('feedback', ['organizationId', 'status', 'createdAt']);
  await queryInterface.addIndex('feedback', ['organizationId', 'customerId', 'createdAt']);

  // Comments indexes
  await queryInterface.addIndex('comments', ['feedbackId']);
  await queryInterface.addIndex('comments', ['userId']);
  await queryInterface.addIndex('comments', ['parentCommentId']);
  await queryInterface.addIndex('comments', ['feedbackId', 'createdAt']);
  await queryInterface.addIndex('comments', ['isInternal']);

  console.log('✅ All tables and indexes created successfully!');
};

const down = async (queryInterface) => {
  // Drop tables in reverse order to handle foreign key constraints
  await queryInterface.dropTable('comments');
  await queryInterface.dropTable('feedback');
  await queryInterface.dropTable('integrations');
  await queryInterface.dropTable('customers');
  await queryInterface.dropTable('organization_users');
  await queryInterface.dropTable('organizations');
  await queryInterface.dropTable('users');

  // Drop ENUM types
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_provider"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_organization_users_role"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_integrations_type"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_integrations_status"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_feedback_status"');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_feedback_sentiment"');
};

module.exports = { up, down };