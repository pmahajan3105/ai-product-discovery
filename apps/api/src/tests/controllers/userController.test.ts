/**
 * UserController Unit Tests
 * Comprehensive testing of all user management operations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { userController } from '../../controllers/userController';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';

describe('UserController', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clean up any additional test users before each test
    const { db } = await import('../../services/database');
    await db.models.User?.destroy({ 
      where: { 
        email: { [db.Sequelize.Op.like]: '%test%' } 
      }
    });
  });

  describe('createUserProfile', () => {
    test('should create user profile with valid data', async () => {
      const userData = TestDataFactory.createUserData({
        email: `new.user.${Date.now()}@example.com`,
        firstName: 'New',
        lastName: 'User'
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: userData.id,
        body: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          organization: 'Test Company'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.createUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName
          })
        })
      );
    });

    test('should reject invalid email format', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'test-user-id',
        body: {
          email: 'invalid-email', // Invalid email format
          firstName: 'Test',
          lastName: 'User'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.createUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.stringContaining('email')
          ])
        })
      );
    });

    test('should handle missing required email field', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'test-user-id',
        body: {
          firstName: 'Test',
          lastName: 'User'
          // Missing email
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.createUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.stringContaining('email')
          ])
        })
      );
    });
  });

  describe('getCurrentUser', () => {
    test('should return current user profile', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getCurrentUser(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.user.id,
            email: testContext.user.email
          })
        })
      );
    });

    test('should handle non-existent user gracefully', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'non-existent-user-id'
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await userController.getCurrentUser(req, res, next);

      // Should call next with error (handled by error middleware)
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateUserProfile', () => {
    test('should update user profile fields', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        organization: 'Updated Company'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: updateData
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.updateUserProfile(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.user.id,
            firstName: updateData.firstName,
            lastName: updateData.lastName
          })
        })
      );
    });

    test('should validate profile image URL format', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: {
          profileImage: 'invalid-url' // Invalid URL format
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.updateUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should allow partial updates', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: {
          firstName: 'OnlyFirstName' // Only updating first name
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.updateUserProfile(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            firstName: 'OnlyFirstName'
          })
        })
      );
    });
  });

  describe('markEmailVerified', () => {
    test('should mark user email as verified', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.markEmailVerified(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.user.id,
            emailVerified: true
          })
        })
      );
    });
  });

  describe('getUserOrganizations', () => {
    test('should return user organizations', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getUserOrganizations(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: testContext.organization.id,
              name: testContext.organization.name
            })
          ])
        })
      );
    });

    test('should return empty array for user with no organizations', async () => {
      // Create a new user without organization membership
      const { db } = await import('../../services/database');
      const newUserData = TestDataFactory.createUserData();
      const newUser = await db.models.User.create(newUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: newUser.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getUserOrganizations(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: []
        })
      );

      // Cleanup
      await newUser.destroy();
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      // Create some test users for searching
      const { db } = await import('../../services/database');
      
      await db.models.User.bulkCreate([
        TestDataFactory.createUserData({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe'
        }),
        TestDataFactory.createUserData({
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith'
        }),
        TestDataFactory.createUserData({
          email: 'user.test@company.com',
          firstName: 'User',
          lastName: 'Test'
        })
      ]);
    });

    test('should search users by email', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        query: {
          q: 'john.doe@example.com',
          limit: '10'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.searchUsers(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              email: 'john.doe@example.com',
              firstName: 'John',
              lastName: 'Doe'
            })
          ])
        })
      );
    });

    test('should enforce minimum query length', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        query: {
          q: 'ab' // Too short (minimum 3 characters)
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.searchUsers(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should limit search results', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        query: {
          q: 'example.com',
          limit: '1'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.searchUsers(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      expect(responseCall.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getUserStats', () => {
    test('should return user statistics', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getUserStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalOrganizations: expect.any(Number),
            totalFeedback: expect.any(Number),
            recentActivity: expect.any(Array)
          })
        })
      );
    });
  });

  describe('updateActivity', () => {
    test('should update user activity', async () => {
      const activityData = {
        action: 'test_action',
        metadata: {
          testData: 'test_value'
        }
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: activityData,
        originalUrl: '/api/test',
        method: 'GET',
        ip: '127.0.0.1'
      });

      // Mock req.get method
      req.get = jest.fn().mockReturnValue('Test User Agent');

      const res = AuthTestHelper.createMockResponse();

      await userController.updateActivity(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Activity updated'
        })
      );
    });

    test('should handle activity update without metadata', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: {},
        originalUrl: '/api/test',
        method: 'GET',
        ip: '127.0.0.1'
      });

      req.get = jest.fn().mockReturnValue('Test User Agent');

      const res = AuthTestHelper.createMockResponse();

      await userController.updateActivity(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Activity updated'
        })
      );
    });
  });

  describe('deleteUserProfile', () => {
    test('should delete user profile', async () => {
      // Create a test user to delete
      const { db } = await import('../../services/database');
      const testUserData = TestDataFactory.createUserData();
      const testUser = await db.models.User.create(testUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testUser.id
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.deleteUserProfile(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );

      // Verify user is actually deleted
      const deletedUser = await db.models.User.findByPk(testUser.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('getUserById', () => {
    test('should return user profile when accessing own profile', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { userId: testContext.user.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getUserById(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.user.id,
            email: testContext.user.email
          })
        })
      );
    });

    test('should deny access to other users profiles', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { userId: 'other-user-id' }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.getUserById(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access Denied',
          message: expect.stringContaining('own user profile')
        })
      );
    });
  });

  describe('checkOrganizationAccess', () => {
    test('should confirm user has organization access', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.checkOrganizationAccess(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            hasAccess: true,
            role: expect.any(String),
            userId: testContext.user.id,
            organizationId: testContext.organization.id
          })
        })
      );
    });

    test('should deny access to organizations user is not part of', async () => {
      // Create another organization that user is not part of
      const { db } = await import('../../services/database');
      const otherOrgData = TestDataFactory.createOrganizationData({
        name: 'Other Organization'
      });
      const otherOrg = await db.models.Organization.create(otherOrgData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: otherOrg.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.checkOrganizationAccess(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            hasAccess: false,
            role: null,
            userId: testContext.user.id,
            organizationId: otherOrg.id
          })
        })
      );

      // Cleanup
      await otherOrg.destroy();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent profile updates', async () => {
      const updateProfile = async () => {
        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          body: {
            firstName: `Updated${Date.now()}`,
            lastName: 'User'
          }
        });

        const res = AuthTestHelper.createMockResponse();

        await userController.updateUserProfile(req, res, jest.fn());
        return res.json.mock.calls[0][0];
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        updateProfile,
        3 // 3 concurrent operations (less than feedback to avoid conflicts)
      );

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Average time should be reasonable
      PerformanceTestHelper.assertPerformance(averageTimeMs, 1500);
    });

    test('should complete user search within performance threshold', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        query: {
          q: 'test@example.com',
          limit: '10'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await userController.searchUsers(req, res, jest.fn());
      });

      // Search should complete within 500ms
      PerformanceTestHelper.assertPerformance(timeMs, 500);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require more sophisticated mocking to simulate database failures
      // For now, we test that the controller passes errors to the next middleware
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'invalid-user-id'
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await userController.getCurrentUser(req, res, next);

      // Should call next with error for invalid user
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should validate field length limits', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: {
          firstName: 'A'.repeat(51), // Exceeds 50 character limit
          lastName: 'Valid'
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await userController.updateUserProfile(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });
  });
}); 