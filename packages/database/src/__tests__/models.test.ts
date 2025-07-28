import { Sequelize } from 'sequelize';
import { initializeModels } from '../index';

describe('Database Models', () => {
  let sequelize: Sequelize;
  let models: ReturnType<typeof initializeModels>;

  beforeAll(() => {
    // Use mock sequelize for testing model structure
    sequelize = new Sequelize('postgres://test', {
      logging: false,
      dialectOptions: {
        // Mock connection to avoid actual database connection
      },
    });
    
    models = initializeModels(sequelize);
  });

  test('should initialize all models', () => {
    expect(models.User).toBeDefined();
    expect(models.Organization).toBeDefined();
    expect(models.OrganizationUser).toBeDefined();
    expect(models.Customer).toBeDefined();
    expect(models.Integration).toBeDefined();
    expect(models.Feedback).toBeDefined();
    expect(models.Comment).toBeDefined();
  });

  test('should have correct model attributes', () => {
    // Test User model attributes
    const userAttributes = models.User.getTableName();
    expect(userAttributes).toBe('users');
    
    // Test Organization model
    const orgAttributes = models.Organization.getTableName();
    expect(orgAttributes).toBe('organizations');
    
    // Test Feedback model
    const feedbackAttributes = models.Feedback.getTableName();
    expect(feedbackAttributes).toBe('feedback');
  });

  test('should have correct model associations', () => {
    // Check User associations
    expect(models.User.associations.organizations).toBeDefined();
    expect(models.User.associations.assignedFeedback).toBeDefined();
    
    // Check Organization associations  
    expect(models.Organization.associations.users).toBeDefined();
    expect(models.Organization.associations.customers).toBeDefined();
    expect(models.Organization.associations.integrations).toBeDefined();
    expect(models.Organization.associations.feedback).toBeDefined();
    
    // Check Feedback associations
    expect(models.Feedback.associations.organization).toBeDefined();
    expect(models.Feedback.associations.customer).toBeDefined();
    expect(models.Feedback.associations.comments).toBeDefined();
    
    // Check Comment associations  
    expect(models.Comment.associations.feedback).toBeDefined();
    expect(models.Comment.associations.user).toBeDefined();
    expect(models.Comment.associations.replies).toBeDefined();
    expect(models.Comment.associations.parent).toBeDefined();
  });
});