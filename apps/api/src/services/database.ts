/**
 * Database connection and model initialization service
 */

import { 
  createDatabase, 
  initializeModels,
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
  type UserAttributes,
  type OrganizationAttributes,
  type CustomerAttributes,
  type IntegrationAttributes,
  type FeedbackAttributes,
  type CommentAttributes
} from '@feedback-hub/database';
import { Sequelize } from 'sequelize';

class DatabaseService {
  private static instance: DatabaseService;
  public sequelize: Sequelize;
  public models: {
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
  };

  private constructor() {
    // Initialize database connection
    this.sequelize = createDatabase(process.env.DATABASE_URL);
    
    // Initialize all models
    this.models = initializeModels(this.sequelize);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully');
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    await this.sequelize.close();
    console.log('🔌 Database connection closed');
  }

  public async healthCheck(): Promise<{ status: string; connected: boolean; models: number }> {
    try {
      await this.sequelize.authenticate();
      return {
        status: 'healthy',
        connected: true,
        models: Object.keys(this.models).length
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        models: 0
      };
    }
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();

// Export types for convenience
export type {
  UserAttributes,
  OrganizationAttributes,
  CustomerAttributes,
  IntegrationAttributes,
  FeedbackAttributes,
  CommentAttributes
};