/**
 * FeedbackController Unit Tests
 * Comprehensive testing of all feedback management operations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { feedbackController } from '../../controllers/feedbackController';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';

describe('FeedbackController', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clean up any test feedback before each test
    const { db } = await import('../../services/database');
    await db.models.Feedback?.destroy({ where: { organizationId: testContext.organization.id } });
  });

  describe('createFeedback', () => {
    test('should create feedback with valid data', async () => {
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        body: {
          title: feedbackData.title,
          description: feedbackData.description,
          source: feedbackData.source,
          customerId: feedbackData.customerId,
          category: feedbackData.category,
          priority: feedbackData.priority
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.createFeedback(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            title: feedbackData.title,
            description: feedbackData.description,
            organizationId: testContext.organization.id
          })
        })
      );
    });

    test('should reject feedback with missing required fields', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        body: {
          // Missing title and description
          source: 'manual'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.createFeedback(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.stringContaining('title'),
            expect.stringContaining('description')
          ])
        })
      );
    });

    test('should complete creation within performance threshold', async () => {
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        body: feedbackData
      });

      const res = AuthTestHelper.createMockResponse();

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await feedbackController.createFeedback(req, res, jest.fn());
      });

      // Should complete within 1 second
      PerformanceTestHelper.assertPerformance(timeMs, 1000);
    });
  });

  describe('getFeedbackById', () => {
    test('should retrieve feedback by ID', async () => {
      // First create a feedback item
      const { db } = await import('../../services/database');
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });
      const feedback = await db.models.Feedback.create(feedbackData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: feedback.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.getFeedbackById(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: feedback.id,
            title: feedbackData.title,
            description: feedbackData.description
          })
        })
      );
    });

    test('should handle non-existent feedback ID gracefully', async () => {
      const nonExistentId = 'non-existent-feedback-id';

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: nonExistentId }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await feedbackController.getFeedbackById(req, res, next);

      // Should call next with error (handled by error middleware)
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getFeedbackList', () => {
    beforeEach(async () => {
      // Create test feedback items
      const { db } = await import('../../services/database');
      
      const feedbackItems = [
        TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'Bug Report',
          category: 'bug',
          priority: 'high',
          status: 'new'
        }),
        TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'Feature Request',
          category: 'feature',
          priority: 'medium',
          status: 'planned'
        }),
        TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'Resolved Issue',
          category: 'bug',
          priority: 'low',
          status: 'resolved'
        })
      ];

      await db.models.Feedback.bulkCreate(feedbackItems);
    });

    test('should return paginated feedback list', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        query: { page: '1', limit: '10' }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.getFeedbackList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              organizationId: testContext.organization.id
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: expect.any(Number),
            totalPages: expect.any(Number)
          })
        })
      );
    });

    test('should filter feedback by status', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        query: { status: 'new,planned' }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.getFeedbackList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      // Extract the call arguments to verify filtering
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(Array.isArray(responseCall.data)).toBe(true);
      
      // Verify all returned items have the filtered statuses
      responseCall.data.forEach((item: any) => {
        expect(['new', 'planned']).toContain(item.status);
      });
    });

    test('should handle search queries', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        query: { search: 'Bug Report' }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.getFeedbackList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );
    });
  });

  describe('updateFeedback', () => {
    test('should update feedback fields', async () => {
      // Create feedback first
      const { db } = await import('../../services/database');
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });
      const feedback = await db.models.Feedback.create(feedbackData);

      const updateData = {
        status: 'in_progress',
        priority: 'high',
        assignedTo: testContext.user.id
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: feedback.id },
        body: updateData
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.updateFeedback(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: feedback.id,
            status: 'in_progress',
            priority: 'high',
            assignedTo: testContext.user.id
          })
        })
      );
    });

    test('should validate update data', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: 'some-feedback-id' },
        body: {
          status: 'invalid-status', // Invalid status
          priority: 'invalid-priority' // Invalid priority
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.updateFeedback(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.any(Array)
        })
      );
    });
  });

  describe('deleteFeedback', () => {
    test('should delete feedback', async () => {
      // Create feedback first
      const { db } = await import('../../services/database');
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });
      const feedback = await db.models.Feedback.create(feedbackData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: feedback.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.deleteFeedback(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );

      // Verify feedback is actually deleted
      const deletedFeedback = await db.models.Feedback.findByPk(feedback.id);
      expect(deletedFeedback).toBeNull();
    });
  });

  describe('bulkUpdateStatus', () => {
    test('should update multiple feedback statuses', async () => {
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

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id },
        body: {
          feedbackIds,
          status: 'triaged'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.bulkUpdateStatus(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          updated: feedbackIds.length
        })
      );

      // Verify all feedback items were updated
      const updatedFeedback = await db.models.Feedback.findAll({
        where: { id: feedbackIds }
      });
      
      updatedFeedback.forEach(feedback => {
        expect(feedback.status).toBe('triaged');
      });
    });
  });

  describe('addComment', () => {
    test('should add comment to feedback', async () => {
      // Create feedback first
      const { db } = await import('../../services/database');
      const feedbackData = TestDataFactory.createFeedbackData({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id
      });
      const feedback = await db.models.Feedback.create(feedbackData);

      const commentData = {
        content: 'This is a test comment',
        isInternal: true
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { feedbackId: feedback.id },
        body: commentData
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.addComment(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            content: commentData.content,
            isInternal: commentData.isInternal,
            userId: testContext.user.id,
            feedbackId: feedback.id
          })
        })
      );
    });
  });

  describe('getFeedbackStats', () => {
    test('should return feedback statistics', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        organizationId: testContext.organization.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await feedbackController.getFeedbackStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total: expect.any(Number),
            byStatus: expect.any(Object),
            byCategory: expect.any(Object),
            byPriority: expect.any(Object)
          })
        })
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent feedback creation', async () => {
      const createFeedback = async () => {
        const feedbackData = TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id
        });

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          organizationId: testContext.organization.id,
          params: { organizationId: testContext.organization.id },
          body: feedbackData
        });

        const res = AuthTestHelper.createMockResponse();

        await feedbackController.createFeedback(req, res, jest.fn());
        return res.json.mock.calls[0][0];
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        createFeedback,
        5 // 5 concurrent operations
      );

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Average time should be reasonable
      PerformanceTestHelper.assertPerformance(averageTimeMs, 2000);
    });
  });
}); 