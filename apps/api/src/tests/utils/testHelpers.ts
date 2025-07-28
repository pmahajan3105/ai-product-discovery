/**
 * Test Helpers - Comprehensive testing utilities
 * Provides standardized setup, teardown, and data creation for all tests
 */

import { db } from '../../services/database';
import { v4 as uuidv4 } from 'uuid';

// Test configuration constants
export const TEST_CONFIG = {
  TEST_ORG_ID: 'test-org-123',
  TEST_USER_ID: 'test-user-123',
  TEST_CUSTOMER_ID: 'test-customer-123',
  TEST_FEEDBACK_ID: 'test-feedback-123',
  TEST_INTEGRATION_ID: 'test-integration-123',
  TEST_SESSION_ID: 'test-session-123',
  ADMIN_USER_ID: 'test-admin-123',
  MEMBER_USER_ID: 'test-member-123',
  VIEWER_USER_ID: 'test-viewer-123'
};

/**
 * Database Setup and Teardown
 */
export class DatabaseTestHelper {
  static async setupTestDatabase(): Promise<void> {
    try {
      // Connect to test database
      await db.connect();
      
      // Ensure all models are synced
      await db.sequelize.sync({ force: false });
      
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  static async cleanupTestData(): Promise<void> {
    try {
      const models = db.models;
      
      // Clean up in dependency order (reverse of creation)
      await models.Comment?.destroy({ where: {} });
      await models.Feedback?.destroy({ where: {} });
      await models.Customer?.destroy({ where: {} });
      await models.Integration?.destroy({ where: {} });
      await models.FilterPreset?.destroy({ where: {} });
      await models.OrganizationUser?.destroy({ where: {} });
      await models.Organization?.destroy({ where: {} });
      await models.User?.destroy({ where: {} });
      
      // Clean up AI models
      await models.AIChatSession?.destroy({ where: {} });
      await models.FeedbackEmbedding?.destroy({ where: {} });
      await models.AICategorizationLog?.destroy({ where: {} });
      await models.AIUserFeedback?.destroy({ where: {} });
      await models.CompanyProfile?.destroy({ where: {} });
      
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
      throw error;
    }
  }

  static async teardownTestDatabase(): Promise<void> {
    try {
      await this.cleanupTestData();
      await db.disconnect();
    } catch (error) {
      console.error('Failed to teardown test database:', error);
      throw error;
    }
  }
}

/**
 * Test Data Factories
 */
export class TestDataFactory {
  /**
   * Create test user
   */
  static createUserData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      email: overrides.email || `test.user.${Date.now()}@example.com`,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      provider: overrides.provider || 'email',
      providerId: overrides.providerId || null,
      emailVerified: overrides.emailVerified ?? true,
      avatar: overrides.avatar || null,
      metadata: overrides.metadata || {},
      lastActiveAt: overrides.lastActiveAt || new Date(),
      ...overrides
    };
  }

  /**
   * Create test organization
   */
  static createOrganizationData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      name: overrides.name || `Test Organization ${Date.now()}`,
      slug: overrides.slug || `test-org-${Date.now()}`,
      domain: overrides.domain || 'test.com',
      settings: overrides.settings || {
        notifications: { email: true, slack: false },
        features: { aiAnalysis: true, integrations: true }
      },
      metadata: overrides.metadata || {},
      createdBy: overrides.createdBy || TEST_CONFIG.TEST_USER_ID,
      ...overrides
    };
  }

  /**
   * Create test customer
   */
  static createCustomerData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      organizationId: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      name: overrides.name || `Test Customer ${Date.now()}`,
      email: overrides.email || `customer.${Date.now()}@example.com`,
      company: overrides.company || 'Test Company',
      domain: overrides.domain || 'testcompany.com',
      externalId: overrides.externalId || null,
      avatar: overrides.avatar || null,
      metadata: overrides.metadata || {},
      enrichmentData: overrides.enrichmentData || {},
      identificationConfidence: overrides.identificationConfidence || 0.95,
      lastSeenAt: overrides.lastSeenAt || new Date(),
      ...overrides
    };
  }

  /**
   * Create test feedback
   */
  static createFeedbackData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      organizationId: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      customerId: overrides.customerId || TEST_CONFIG.TEST_CUSTOMER_ID,
      integrationId: overrides.integrationId || null,
      title: overrides.title || `Test Feedback ${Date.now()}`,
      description: overrides.description || 'This is test feedback content for automated testing.',
      source: overrides.source || 'manual',
      sourceUrl: overrides.sourceUrl || null,
      status: overrides.status || 'new',
      category: overrides.category || 'general',
      priority: overrides.priority || 'medium',
      sentiment: overrides.sentiment || 'neutral',
      assignedTo: overrides.assignedTo || null,
      upvoteCount: overrides.upvoteCount || 0,
      metadata: overrides.metadata || {},
      sourceMetadata: overrides.sourceMetadata || {},
      aiAnalysis: overrides.aiAnalysis || null,
      ...overrides
    };
  }

  /**
   * Create test integration
   */
  static createIntegrationData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      organizationId: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      name: overrides.name || `Test Integration ${Date.now()}`,
      type: overrides.type || 'slack',
      status: overrides.status || 'active',
      config: overrides.config || {
        webhookUrl: 'https://hooks.slack.com/test',
        channel: '#feedback',
        username: 'feedbackbot'
      },
      credentials: overrides.credentials || null, // Should be encrypted in real usage
      metadata: overrides.metadata || {},
      healthStatus: overrides.healthStatus || 'healthy',
      lastHealthCheck: overrides.lastHealthCheck || new Date(),
      lastSyncAt: overrides.lastSyncAt || null,
      ...overrides
    };
  }

  /**
   * Create test comment
   */
  static createCommentData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      feedbackId: overrides.feedbackId || TEST_CONFIG.TEST_FEEDBACK_ID,
      userId: overrides.userId || TEST_CONFIG.TEST_USER_ID,
      content: overrides.content || `Test comment content ${Date.now()}`,
      isInternal: overrides.isInternal ?? true,
      parentCommentId: overrides.parentCommentId || null,
      metadata: overrides.metadata || {},
      ...overrides
    };
  }

  /**
   * Create organization user relationship
   */
  static createOrganizationUserData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || uuidv4(),
      organizationId: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      userId: overrides.userId || TEST_CONFIG.TEST_USER_ID,
      role: overrides.role || 'member',
      joinedAt: overrides.joinedAt || new Date(),
      invitedBy: overrides.invitedBy || null,
      ...overrides
    };
  }
}

/**
 * Authentication Test Helper
 */
export class AuthTestHelper {
  /**
   * Create mock session request
   */
  static createMockSessionRequest(overrides: Partial<any> = {}): any {
    return {
      session: {
        getUserId: () => overrides.userId || TEST_CONFIG.TEST_USER_ID,
        getAccessTokenPayload: () => ({
          email: overrides.email || 'test@example.com',
          ...overrides.accessTokenPayload
        }),
        getHandle: () => overrides.sessionHandle || 'test-session-handle'
      },
      user_id: overrides.userId || TEST_CONFIG.TEST_USER_ID,
      organization_id: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      workspace_id: overrides.organizationId || TEST_CONFIG.TEST_ORG_ID,
      params: overrides.params || {},
      query: overrides.query || {},
      body: overrides.body || {},
      ...overrides
    };
  }

  /**
   * Create mock response object
   */
  static createMockResponse(): any {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      statusCode: 200,
      locals: {}
    };
    return res;
  }

  /**
   * Create auth headers for API requests
   */
  static createAuthHeaders(token?: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token || 'test-token'}`,
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Setup and teardown helpers for different test types
 */
export class TestSetup {
  /**
   * Setup for unit tests (no database)
   */
  static setupUnitTest(): void {
    // Mock database and external services
    jest.mock('../../services/database');
    jest.mock('../../services/ai/openaiService');
  }

  /**
   * Setup for integration tests (with database)
   */
  static async setupIntegrationTest(): Promise<void> {
    await DatabaseTestHelper.setupTestDatabase();
  }

  /**
   * Setup for e2e tests (full system)
   */
  static async setupE2ETest(): Promise<{
    user: any;
    organization: any;
    customer: any;
    integration: any;
  }> {
    await DatabaseTestHelper.setupTestDatabase();
    
    // Create test entities
    const userData = TestDataFactory.createUserData();
    const orgData = TestDataFactory.createOrganizationData({ createdBy: userData.id });
    const customerData = TestDataFactory.createCustomerData({ organizationId: orgData.id });
    const integrationData = TestDataFactory.createIntegrationData({ organizationId: orgData.id });
    
    // Create in database
    const user = await db.models.User.create(userData);
    const organization = await db.models.Organization.create(orgData);
    const customer = await db.models.Customer.create(customerData);
    const integration = await db.models.Integration.create(integrationData);
    
    // Create organization-user relationship
    const orgUserData = TestDataFactory.createOrganizationUserData({
      userId: user.id,
      organizationId: organization.id,
      role: 'owner'
    });
    await db.models.OrganizationUser.create(orgUserData);

    return { user, organization, customer, integration };
  }

  /**
   * Teardown for all test types
   */
  static async teardownTest(): Promise<void> {
    await DatabaseTestHelper.teardownTestDatabase();
  }
}

/**
 * Common test assertions
 */
export class TestAssertions {
  /**
   * Assert valid UUID format
   */
  static assertValidUUID(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }

  /**
   * Assert valid email format
   */
  static assertValidEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(email).toMatch(emailRegex);
  }

  /**
   * Assert timestamp is recent (within last 5 seconds)
   */
  static assertRecentTimestamp(timestamp: Date | string): void {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    expect(diffMs).toBeLessThan(5000); // 5 seconds
  }

  /**
   * Assert API response structure
   */
  static assertValidAPIResponse(response: any, expectedData?: any): void {
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(true);
    
    if (expectedData) {
      expect(response).toHaveProperty('data');
      expect(response.data).toMatchObject(expectedData);
    }
  }

  /**
   * Assert error response structure
   */
  static assertValidErrorResponse(response: any, expectedError?: string): void {
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error');
    
    if (expectedError) {
      expect(response.error).toContain(expectedError);
    }
  }
}

/**
 * Performance testing helpers
 */
export class PerformanceTestHelper {
  /**
   * Measure execution time
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const startTime = Date.now();
    const result = await fn();
    const timeMs = Date.now() - startTime;
    return { result, timeMs };
  }

  /**
   * Run concurrent operations
   */
  static async runConcurrent<T>(
    operation: () => Promise<T>,
    concurrency: number = 10
  ): Promise<{ results: T[]; totalTimeMs: number; averageTimeMs: number }> {
    const startTime = Date.now();
    
    const promises = Array(concurrency).fill(null).map(() => operation());
    const results = await Promise.all(promises);
    
    const totalTimeMs = Date.now() - startTime;
    const averageTimeMs = totalTimeMs / concurrency;
    
    return { results, totalTimeMs, averageTimeMs };
  }

  /**
   * Assert performance requirements
   */
  static assertPerformance(timeMs: number, maxTimeMs: number): void {
    expect(timeMs).toBeLessThan(maxTimeMs);
  }
} 