import { Sequelize } from 'sequelize';
import { initUser, User } from './models/user.js';
import { initOrganization, Organization } from './models/organization.js';
import { initOrganizationUser, OrganizationUser } from './models/organizationUser.js';
import { initCustomer, Customer } from './models/customer.js';
import { initIntegration, Integration } from './models/integration.js';
import { initFeedback, Feedback } from './models/feedback.js';
import { initComment, Comment } from './models/comment.js';
import { initFilterPreset, FilterPreset } from './models/filterPreset.js';
import { CompanyProfile } from './models/CompanyProfile.js';
import { AIUserFeedback } from './models/aiUserFeedback.js';
import { FeedbackEmbedding } from './models/feedbackEmbedding.js';
import { AICategorizationLog } from './models/aiCategorizationLog.js';
import { AIChatSession } from './models/aiChatSession.js';

// Database connection with optimized pooling
export const createDatabase = (databaseUrl?: string): Sequelize => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sequelize = new Sequelize(
    databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/feedbackhub_dev',
    {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      
      // Optimized connection pool settings
      pool: {
        max: isProduction ? 25 : 10,        // Maximum connections in pool
        min: isProduction ? 5 : 2,          // Minimum connections in pool
        acquire: 60000,                     // Maximum time to get connection (60s)
        idle: 10000,                        // Maximum idle time before releasing (10s)
        evict: 1000,                        // Check for idle connections every 1s
      },
      
      // Connection retry settings
      retry: {
        max: 3,                             // Maximum retry attempts
        timeout: 60000,                     // Connection timeout (60s)
        match: [
          /ETIMEDOUT/,
          /EHOSTUNREACH/,
          /ECONNRESET/,
          /ECONNREFUSED/,
          /ETIMEDOUT/,
          /ESOCKETTIMEDOUT/,
          /EHOSTUNREACH/,
          /EPIPE/,
          /EAI_AGAIN/,
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/
        ]
      },
      
      // Query optimization
      define: {
        freezeTableName: true,              // Don't pluralize table names
        underscored: true,                  // Use snake_case for columns
        timestamps: true,                   // Add createdAt/updatedAt
      },
      
      // Performance optimizations
      dialectOptions: {
        ssl: isProduction ? {
          require: true,
          rejectUnauthorized: false
        } : false,
        
        // Connection keep-alive
        keepAlive: true,
        keepAliveInitialDelayMillis: 0,
        
        // Statement timeout (30 seconds)
        statement_timeout: 30000,
        
        // Query timeout (30 seconds)
        query_timeout: 30000,
        
        // Application name for monitoring
        application_name: 'feedbackhub-api',
      },
      
      // Hooks for connection monitoring
      hooks: {
        afterConnect: (connection: any) => {
          console.log(`✅ Database connection established (PID: ${connection.processID})`);
        },
        beforeDisconnect: (connection: any) => {
          console.log(`🔌 Database connection closing (PID: ${connection.processID})`);
        }
      }
    }
  );

  // Add connection event handlers
  sequelize.addHook('afterConnect', async (connection: any) => {
    // Set optimal PostgreSQL settings for this connection
    await connection.query('SET statement_timeout = 30000'); // 30 seconds
    await connection.query('SET lock_timeout = 10000');      // 10 seconds
    await connection.query('SET idle_in_transaction_session_timeout = 60000'); // 60 seconds
    
    if (isProduction) {
      await connection.query('SET work_mem = "16MB"');         // Increase work memory
      await connection.query('SET shared_preload_libraries = "pg_stat_statements"'); // Enable query stats
    }
  });

  return sequelize;
};

// Initialize all models
export const initializeModels = (sequelize: Sequelize) => {
  // Initialize models
  const models = {
    User: initUser(sequelize),
    Organization: initOrganization(sequelize),
    OrganizationUser: initOrganizationUser(sequelize),
    Customer: initCustomer(sequelize),
    Integration: initIntegration(sequelize),
    Feedback: initFeedback(sequelize),
    Comment: initComment(sequelize),
    FilterPreset: initFilterPreset(sequelize),
    CompanyProfile: CompanyProfile.initModel(sequelize),
    AIUserFeedback: AIUserFeedback.initModel(sequelize),
    FeedbackEmbedding: FeedbackEmbedding.initModel(sequelize),
    AICategorizationLog: AICategorizationLog.initModel(sequelize),
    AIChatSession: AIChatSession.initModel(sequelize),
  };

  // Define associations
  setupAssociations(models);

  return models;
};

// Set up model relationships
const setupAssociations = (models: {
  User: typeof User;
  Organization: typeof Organization;
  OrganizationUser: typeof OrganizationUser;
  Customer: typeof Customer;
  Integration: typeof Integration;
  Feedback: typeof Feedback;
  Comment: typeof Comment;
  FilterPreset: typeof FilterPreset;
  CompanyProfile: typeof CompanyProfile;
  AIUserFeedback: typeof AIUserFeedback;
  FeedbackEmbedding: typeof FeedbackEmbedding;
  AICategorizationLog: typeof AICategorizationLog;
  AIChatSession: typeof AIChatSession;
}) => {
  const { User, Organization, OrganizationUser, Customer, Integration, Feedback, Comment, FilterPreset, CompanyProfile, AIUserFeedback, FeedbackEmbedding, AICategorizationLog, AIChatSession } = models;

  // User <-> Organization (many-to-many through OrganizationUser)
  User.belongsToMany(Organization, {
    through: OrganizationUser,
    foreignKey: 'userId',
    otherKey: 'organizationId',
    as: 'organizations',
  });
  
  Organization.belongsToMany(User, {
    through: OrganizationUser,
    foreignKey: 'organizationId',
    otherKey: 'userId',
    as: 'users',
  });

  // Organization -> User (creator relationship)
  Organization.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  // OrganizationUser relationships
  OrganizationUser.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });
  
  OrganizationUser.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization -> Customer (one-to-many)
  Organization.hasMany(Customer, {
    foreignKey: 'organizationId',
    as: 'customers',
  });
  
  Customer.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization -> Integration (one-to-many)
  Organization.hasMany(Integration, {
    foreignKey: 'organizationId',
    as: 'integrations',
  });
  
  Integration.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Organization -> Feedback (one-to-many)
  Organization.hasMany(Feedback, {
    foreignKey: 'organizationId',
    as: 'feedback',
  });
  
  Feedback.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Customer -> Feedback (one-to-many)
  Customer.hasMany(Feedback, {
    foreignKey: 'customerId',
    as: 'feedback',
  });
  
  Feedback.belongsTo(Customer, {
    foreignKey: 'customerId',
    as: 'customer',
  });

  // Integration -> Feedback (one-to-many)
  Integration.hasMany(Feedback, {
    foreignKey: 'integrationId',
    as: 'feedback',
  });
  
  Feedback.belongsTo(Integration, {
    foreignKey: 'integrationId',
    as: 'integration',
  });

  // User -> Feedback (assigned relationship)
  User.hasMany(Feedback, {
    foreignKey: 'assignedTo',
    as: 'assignedFeedback',
  });
  
  Feedback.belongsTo(User, {
    foreignKey: 'assignedTo',
    as: 'assignee',
  });

  // Feedback -> Comment (one-to-many)
  Feedback.hasMany(Comment, {
    foreignKey: 'feedbackId',
    as: 'comments',
  });
  
  Comment.belongsTo(Feedback, {
    foreignKey: 'feedbackId',
    as: 'feedback',
  });

  // User -> Comment (one-to-many)
  User.hasMany(Comment, {
    foreignKey: 'userId',
    as: 'comments',
  });
  
  Comment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Comment -> Comment (self-referencing for threading)
  Comment.hasMany(Comment, {
    foreignKey: 'parentCommentId',
    as: 'replies',
  });
  
  Comment.belongsTo(Comment, {
    foreignKey: 'parentCommentId',
    as: 'parent',
  });

  // User -> FilterPreset (one-to-many)
  User.hasMany(FilterPreset, {
    foreignKey: 'createdBy',
    as: 'filterPresets',
  });
  
  FilterPreset.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator',
  });

  // Organization -> FilterPreset (one-to-many)
  Organization.hasMany(FilterPreset, {
    foreignKey: 'organizationId',
    as: 'filterPresets',
  });
  
  FilterPreset.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // AI Model Associations
  
  // Organization -> CompanyProfile (one-to-one)
  Organization.hasOne(CompanyProfile, {
    foreignKey: 'organizationId',
    as: 'companyProfile',
  });
  
  CompanyProfile.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // User -> AIUserFeedback (one-to-many)
  User.hasMany(AIUserFeedback, {
    foreignKey: 'userId',
    as: 'aiFeedback',
  });
  
  AIUserFeedback.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Organization -> AIUserFeedback (one-to-many)
  Organization.hasMany(AIUserFeedback, {
    foreignKey: 'organizationId',
    as: 'aiFeedback',
  });
  
  AIUserFeedback.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Feedback -> FeedbackEmbedding (one-to-one)
  Feedback.hasOne(FeedbackEmbedding, {
    foreignKey: 'feedbackId',
    as: 'embedding',
  });
  
  FeedbackEmbedding.belongsTo(Feedback, {
    foreignKey: 'feedbackId',
    as: 'feedback',
  });

  // Organization -> FeedbackEmbedding (one-to-many)
  Organization.hasMany(FeedbackEmbedding, {
    foreignKey: 'organizationId',
    as: 'embeddings',
  });
  
  FeedbackEmbedding.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // Feedback -> AICategorizationLog (one-to-many)
  Feedback.hasMany(AICategorizationLog, {
    foreignKey: 'feedbackId',
    as: 'categorizationLogs',
  });
  
  AICategorizationLog.belongsTo(Feedback, {
    foreignKey: 'feedbackId',
    as: 'feedback',
  });

  // Organization -> AICategorizationLog (one-to-many)
  Organization.hasMany(AICategorizationLog, {
    foreignKey: 'organizationId',
    as: 'categorizationLogs',
  });
  
  AICategorizationLog.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });

  // User -> AIChatSession (one-to-many)
  User.hasMany(AIChatSession, {
    foreignKey: 'userId',
    as: 'chatSessions',
  });
  
  AIChatSession.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });

  // Organization -> AIChatSession (one-to-many)
  Organization.hasMany(AIChatSession, {
    foreignKey: 'organizationId',
    as: 'chatSessions',
  });
  
  AIChatSession.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization',
  });
};

// Export models and types
export {
  User,
  Organization,
  OrganizationUser,
  Customer,
  Integration,
  Feedback,
  Comment,
  FilterPreset,
  CompanyProfile,
  AIUserFeedback,
  FeedbackEmbedding,
  AICategorizationLog,
  AIChatSession,
};

export * from './models/user.js';
export * from './models/organization.js';
export * from './models/organizationUser.js';
export * from './models/customer.js';
export * from './models/integration.js';
export * from './models/feedback.js';
export * from './models/comment.js';
export * from './models/filterPreset.js';
export * from './models/CompanyProfile.js';
export * from './models/aiUserFeedback.js';
export * from './models/feedbackEmbedding.js';
export * from './models/aiCategorizationLog.js';
export * from './models/aiChatSession.js';