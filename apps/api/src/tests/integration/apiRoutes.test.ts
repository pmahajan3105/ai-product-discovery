/**
 * API Routes Integration Tests
 * End-to-end testing of HTTP endpoints with authentication
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index'; // We'll need to export app from index.ts
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';

// Mock SuperTokens session verification for testing
jest.mock('supertokens-node/recipe/session/framework/express', () => ({
  verifySession: () => (req: any, res: any, next: any) => {
    // Mock session data
    req.session = {
      getUserId: () => req.headers['x-test-user-id'] || 'test-user-123',
      getAccessTokenPayload: () => ({ email: 'test@example.com' }),
      getHandle: () => 'test-session-handle'
    };
    req.user_id = req.session.getUserId();
    next();
  }
}));

describe('API Routes Integration', () => {
  let testContext: any;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
    
    // Create auth headers with test user
    authHeaders = {
      ...AuthTestHelper.createAuthHeaders(),
      'x-test-user-id': testContext.user.id,
      'x-test-organization-id': testContext.organization.id
    };
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const { db } = await import('../../services/database');
    await db.models.Feedback?.destroy({ where: { organizationId: testContext.organization.id } });
  });

  describe('User Routes', () => {
    describe('GET /api/users/me', () => {
      test('should return current user profile', async () => {
        const response = await request(app)
          .get('/api/users/me')
          .set(authHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testContext.user.id,
            email: testContext.user.email
          }
        });
      });

      test('should require authentication', async () => {
        await request(app)
          .get('/api/users/me')
          .expect(401); // Or whatever status SuperTokens returns for unauthenticated
      });
    });

    describe('PUT /api/users/me', () => {
      test('should update user profile', async () => {
        const updateData = {
          firstName: 'Updated',
          lastName: 'Name',
          organization: 'Updated Company'
        };

        const response = await request(app)
          .put('/api/users/me')
          .set(authHeaders)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: testContext.user.id,
            firstName: updateData.firstName,
            lastName: updateData.lastName
          }
        });
      });

      test('should validate input data', async () => {
        const response = await request(app)
          .put('/api/users/me')
          .set(authHeaders)
          .send({
            firstName: 'A'.repeat(51) // Exceeds length limit
          })
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Validation Error'
        });
      });
    });

    describe('GET /api/users/organizations', () => {
      test('should return user organizations', async () => {
        const response = await request(app)
          .get('/api/users/organizations')
          .set(authHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: testContext.organization.id,
              name: testContext.organization.name
            })
          ])
        });
      });
    });

    describe('GET /api/users/search', () => {
      test('should search users by email', async () => {
        const response = await request(app)
          .get('/api/users/search')
          .query({ q: 'test@example.com' })
          .set(authHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array)
        });
      });

      test('should validate search query length', async () => {
        await request(app)
          .get('/api/users/search')
          .query({ q: 'ab' }) // Too short
          .set(authHeaders)
          .expect(400);
      });
    });
  });

  describe('Feedback Routes', () => {
    describe('POST /api/organizations/:organizationId/feedback', () => {
      test('should create feedback', async () => {
        const feedbackData = {
          title: 'Test Feedback',
          description: 'This is a test feedback item',
          source: 'manual',
          priority: 'medium',
          category: 'general'
        };

        const response = await request(app)
          .post(`/api/organizations/${testContext.organization.id}/feedback`)
          .set(authHeaders)
          .send(feedbackData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            title: feedbackData.title,
            description: feedbackData.description,
            organizationId: testContext.organization.id
          }
        });

        // Verify feedback was actually created in database
        const { db } = await import('../../services/database');
        const createdFeedback = await db.models.Feedback.findByPk(response.body.data.id);
        expect(createdFeedback).toBeTruthy();
      });

      test('should validate required fields', async () => {
        const response = await request(app)
          .post(`/api/organizations/${testContext.organization.id}/feedback`)
          .set(authHeaders)
          .send({
            description: 'Missing title'
            // Missing required title
          })
          .expect(400);

        expect(response.body).toMatchObject({
          error: 'Validation Error'
        });
      });

      test('should require organization access', async () => {
        // Create another organization that user doesn't have access to
        const { db } = await import('../../services/database');
        const otherOrgData = TestDataFactory.createOrganizationData();
        const otherOrg = await db.models.Organization.create(otherOrgData);

        await request(app)
          .post(`/api/organizations/${otherOrg.id}/feedback`)
          .set(authHeaders)
          .send({
            title: 'Test Feedback',
            description: 'Test description',
            source: 'manual'
          })
          .expect(403); // Should be forbidden

        // Cleanup
        await otherOrg.destroy();
      });
    });

    describe('GET /api/organizations/:organizationId/feedback', () => {
      beforeEach(async () => {
        // Create test feedback items
        const { db } = await import('../../services/database');
        const feedbackItems = [
          TestDataFactory.createFeedbackData({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            title: 'Bug Report',
            status: 'new',
            priority: 'high'
          }),
          TestDataFactory.createFeedbackData({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            title: 'Feature Request',
            status: 'planned',
            priority: 'medium'
          })
        ];

        await db.models.Feedback.bulkCreate(feedbackItems);
      });

      test('should return paginated feedback list', async () => {
        const response = await request(app)
          .get(`/api/organizations/${testContext.organization.id}/feedback`)
          .set(authHeaders)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.any(Array),
          pagination: {
            page: 1,
            limit: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number)
          }
        });

        expect(response.body.data.length).toBeGreaterThan(0);
      });

      test('should filter feedback by status', async () => {
        const response = await request(app)
          .get(`/api/organizations/${testContext.organization.id}/feedback`)
          .set(authHeaders)
          .query({ status: 'new' })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // All returned items should have 'new' status
        response.body.data.forEach((item: any) => {
          expect(item.status).toBe('new');
        });
      });

      test('should search feedback by title', async () => {
        const response = await request(app)
          .get(`/api/organizations/${testContext.organization.id}/feedback`)
          .set(authHeaders)
          .query({ search: 'Bug Report' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Bug')
            })
          ])
        );
      });
    });

    describe('GET /api/organizations/:organizationId/feedback/:feedbackId', () => {
      test('should return specific feedback item', async () => {
        // Create a feedback item first
        const { db } = await import('../../services/database');
        const feedbackData = TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id
        });
        const feedback = await db.models.Feedback.create(feedbackData);

        const response = await request(app)
          .get(`/api/organizations/${testContext.organization.id}/feedback/${feedback.id}`)
          .set(authHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: feedback.id,
            title: feedbackData.title,
            description: feedbackData.description
          }
        });
      });

      test('should return 404 for non-existent feedback', async () => {
        await request(app)
          .get(`/api/organizations/${testContext.organization.id}/feedback/non-existent-id`)
          .set(authHeaders)
          .expect(404);
      });
    });

    describe('PATCH /api/organizations/:organizationId/feedback/:feedbackId', () => {
      test('should update feedback', async () => {
        // Create a feedback item first
        const { db } = await import('../../services/database');
        const feedbackData = TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id
        });
        const feedback = await db.models.Feedback.create(feedbackData);

        const updateData = {
          status: 'in_progress',
          priority: 'high'
        };

        const response = await request(app)
          .patch(`/api/organizations/${testContext.organization.id}/feedback/${feedback.id}`)
          .set(authHeaders)
          .send(updateData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: feedback.id,
            status: 'in_progress',
            priority: 'high'
          }
        });
      });
    });

    describe('DELETE /api/organizations/:organizationId/feedback/:feedbackId', () => {
      test('should delete feedback', async () => {
        // Create a feedback item first
        const { db } = await import('../../services/database');
        const feedbackData = TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id
        });
        const feedback = await db.models.Feedback.create(feedbackData);

        await request(app)
          .delete(`/api/organizations/${testContext.organization.id}/feedback/${feedback.id}`)
          .set(authHeaders)
          .expect(200);

        // Verify feedback was actually deleted
        const deletedFeedback = await db.models.Feedback.findByPk(feedback.id);
        expect(deletedFeedback).toBeNull();
      });
    });

    describe('POST /api/organizations/:organizationId/feedback/bulk/update-status', () => {
      test('should bulk update feedback status', async () => {
        // Create multiple feedback items
        const { db } = await import('../../services/database');
        const feedbackItems = await Promise.all([
          db.models.Feedback.create(TestDataFactory.createFeedbackData({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            status: 'new'
          })),
          db.models.Feedback.create(TestDataFactory.createFeedbackData({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            status: 'new'
          }))
        ]);

        const feedbackIds = feedbackItems.map(f => f.id);

        const response = await request(app)
          .post(`/api/organizations/${testContext.organization.id}/feedback/bulk/update-status`)
          .set(authHeaders)
          .send({
            feedbackIds,
            status: 'triaged'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          updated: feedbackIds.length
        });

        // Verify all feedback items were updated
        const updatedFeedback = await db.models.Feedback.findAll({
          where: { id: feedbackIds }
        });
        
        updatedFeedback.forEach(feedback => {
          expect(feedback.status).toBe('triaged');
        });
      });
    });
  });

  describe('Health and System Routes', () => {
    describe('GET /health', () => {
      test('should return API health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toMatchObject({
          status: expect.any(String),
          timestamp: expect.any(String),
          service: 'feedbackhub-api',
          version: expect.any(String)
        });
      });
    });

    describe('GET /sessioninfo', () => {
      test('should return session information for authenticated user', async () => {
        const response = await request(app)
          .get('/sessioninfo')
          .set(authHeaders)
          .expect(200);

        expect(response.body).toMatchObject({
          sessionHandle: expect.any(String),
          userId: testContext.user.id,
          accessTokenPayload: expect.any(Object)
        });
      });

      test('should require authentication', async () => {
        await request(app)
          .get('/sessioninfo')
          .expect(401);
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .set(authHeaders)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found'
      });
    });

    test('should handle invalid JSON gracefully', async () => {
      await request(app)
        .post(`/api/organizations/${testContext.organization.id}/feedback`)
        .set({ ...authHeaders, 'Content-Type': 'application/json' })
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing Content-Type header', async () => {
      const headers = { ...authHeaders };
      delete headers['Content-Type'];

      await request(app)
        .post(`/api/organizations/${testContext.organization.id}/feedback`)
        .set(headers)
        .send({
          title: 'Test',
          description: 'Test description',
          source: 'manual'
        })
        .expect(201); // Should still work
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent API requests', async () => {
      const makeRequest = async () => {
        const response = await request(app)
          .get('/api/users/me')
          .set(authHeaders);
        
        return response.body;
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        makeRequest,
        5 // 5 concurrent requests
      );

      // All requests should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Average response time should be reasonable
      PerformanceTestHelper.assertPerformance(averageTimeMs, 1000);
    });

    test('should complete simple requests within performance threshold', async () => {
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await request(app)
          .get('/health')
          .expect(200);
      });

      // Health check should complete within 100ms
      PerformanceTestHelper.assertPerformance(timeMs, 100);
    });
  });

  describe('Security Tests', () => {
    test('should prevent access without authentication', async () => {
      await request(app)
        .get(`/api/organizations/${testContext.organization.id}/feedback`)
        .expect(401);
    });

    test('should prevent access to other organizations data', async () => {
      // Create another organization
      const { db } = await import('../../services/database');
      const otherOrgData = TestDataFactory.createOrganizationData();
      const otherOrg = await db.models.Organization.create(otherOrgData);

      await request(app)
        .get(`/api/organizations/${otherOrg.id}/feedback`)
        .set(authHeaders)
        .expect(403);

      // Cleanup
      await otherOrg.destroy();
    });

    test('should sanitize input data', async () => {
      const response = await request(app)
        .post(`/api/organizations/${testContext.organization.id}/feedback`)
        .set(authHeaders)
        .send({
          title: '<script>alert("xss")</script>',
          description: 'Normal description',
          source: 'manual'
        })
        .expect(201);

      // Script tags should be sanitized
      expect(response.body.data.title).not.toContain('<script>');
    });
  });
}); 