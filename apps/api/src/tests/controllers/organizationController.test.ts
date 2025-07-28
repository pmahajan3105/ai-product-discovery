/**
 * OrganizationController Unit Tests
 * Comprehensive testing of all organization management operations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { organizationController } from '../../controllers/organizationController';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';

describe('OrganizationController', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clean up test organizations (except the main test one)
    const { db } = await import('../../services/database');
    await db.models.Organization?.destroy({ 
      where: { 
        id: { [db.Sequelize.Op.ne]: testContext.organization.id }
      }
    });
  });

  describe('createOrganization', () => {
    test('should create organization with valid data', async () => {
      const orgData = {
        name: 'Test Company',
        description: 'A test organization',
        uniqueName: 'test-company-123',
        image: 'https://example.com/logo.png'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: orgData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.createOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: orgData.name,
            description: orgData.description,
            uniqueName: orgData.uniqueName,
            image: orgData.image
          })
        })
      );

      // Verify organization was actually created in database
      const { db } = await import('../../services/database');
      const createdOrg = await db.models.Organization.findOne({
        where: { uniqueName: orgData.uniqueName }
      });
      expect(createdOrg).toBeTruthy();

      // Verify user was added as owner
      const membership = await db.models.OrganizationUser.findOne({
        where: {
          userId: testContext.user.id,
          organizationId: createdOrg!.id
        }
      });
      expect(membership?.role).toBe('owner');
    });

    test('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name and uniqueName'
        // Missing required name and uniqueName
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.createOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          details: expect.arrayContaining([
            expect.stringContaining('name'),
            expect.stringContaining('uniqueName')
          ])
        })
      );
    });

    test('should validate uniqueName format', async () => {
      const invalidData = {
        name: 'Test Org',
        uniqueName: 'Invalid_Name!' // Invalid characters
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.createOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should validate image URL format', async () => {
      const invalidData = {
        name: 'Test Org',
        uniqueName: 'test-org-456',
        image: 'not-a-valid-url'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.createOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getOrganizationById', () => {
    test('should return organization details', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.getOrganizationById(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.organization.id,
            name: testContext.organization.name
          })
        })
      );
    });

    test('should handle non-existent organization', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: 'non-existent-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.getOrganizationById(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getUserOrganizations', () => {
    test('should return user organizations', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.getUserOrganizations(req, res, jest.fn());

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

      await organizationController.getUserOrganizations(req, res, jest.fn());

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

  describe('updateOrganization', () => {
    test('should update organization details', async () => {
      const updateData = {
        name: 'Updated Organization Name',
        description: 'Updated description'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: updateData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.updateOrganization(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.organization.id,
            name: updateData.name,
            description: updateData.description
          })
        })
      );
    });

    test('should validate update data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
        description: 'A'.repeat(1001) // Exceeds max length
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.updateOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should handle partial updates', async () => {
      const partialData = {
        description: 'Only updating description'
        // Not updating name
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: partialData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.updateOrganization(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            description: partialData.description
          })
        })
      );
    });
  });

  describe('deleteOrganization', () => {
    test('should delete organization', async () => {
      // Create a test organization to delete
      const { db } = await import('../../services/database');
      const testOrgData = TestDataFactory.createOrganizationData({
        name: 'Organization to Delete'
      });
      const testOrg = await db.models.Organization.create(testOrgData);

      // Add user as owner
      await db.models.OrganizationUser.create({
        id: TestDataFactory.generateId(),
        userId: testContext.user.id,
        organizationId: testOrg.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testOrg.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.deleteOrganization(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );

      // Verify organization was actually deleted
      const deletedOrg = await db.models.Organization.findByPk(testOrg.id);
      expect(deletedOrg).toBeNull();
    });

    test('should handle deletion of non-existent organization', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: 'non-existent-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.deleteOrganization(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Member Management', () => {
    describe('addMember', () => {
      test('should add member to organization', async () => {
        // Create a user to add as member
        const { db } = await import('../../services/database');
        const newUserData = TestDataFactory.createUserData();
        const newUser = await db.models.User.create(newUserData);

        const memberData = {
          userId: newUser.id,
          role: 'member'
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { organizationId: testContext.organization.id },
          body: memberData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.addMember(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.any(Object)
          })
        );

        // Verify membership was created
        const membership = await db.models.OrganizationUser.findOne({
          where: {
            userId: newUser.id,
            organizationId: testContext.organization.id
          }
        });
        expect(membership?.role).toBe('member');

        // Cleanup
        await membership?.destroy();
        await newUser.destroy();
      });

      test('should validate member data', async () => {
        const invalidData = {
          userId: 'invalid-uuid',
          role: 'invalid-role'
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { organizationId: testContext.organization.id },
          body: invalidData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.addMember(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Validation Error'
          })
        );
      });

      test('should validate role values', async () => {
        const { db } = await import('../../services/database');
        const newUserData = TestDataFactory.createUserData();
        const newUser = await db.models.User.create(newUserData);

        const invalidRoleData = {
          userId: newUser.id,
          role: 'super-admin' // Invalid role
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { organizationId: testContext.organization.id },
          body: invalidRoleData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.addMember(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);

        // Cleanup
        await newUser.destroy();
      });
    });

    describe('updateMemberRole', () => {
      test('should update member role', async () => {
        // Create a member to update
        const { db } = await import('../../services/database');
        const memberUserData = TestDataFactory.createUserData();
        const memberUser = await db.models.User.create(memberUserData);

        // Add as member
        await db.models.OrganizationUser.create({
          id: TestDataFactory.generateId(),
          userId: memberUser.id,
          organizationId: testContext.organization.id,
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const updateData = {
          role: 'admin'
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { 
            organizationId: testContext.organization.id,
            userId: memberUser.id
          },
          body: updateData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.updateMemberRole(req, res, jest.fn());

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.any(Object)
          })
        );

        // Verify role was updated
        const membership = await db.models.OrganizationUser.findOne({
          where: {
            userId: memberUser.id,
            organizationId: testContext.organization.id
          }
        });
        expect(membership?.role).toBe('admin');

        // Cleanup
        await membership?.destroy();
        await memberUser.destroy();
      });

      test('should validate role value', async () => {
        const invalidData = {
          role: 'invalid-role'
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { 
            organizationId: testContext.organization.id,
            userId: 'some-user-id'
          },
          body: invalidData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.updateMemberRole(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    describe('removeMember', () => {
      test('should remove member from organization', async () => {
        // Create a member to remove
        const { db } = await import('../../services/database');
        const memberUserData = TestDataFactory.createUserData();
        const memberUser = await db.models.User.create(memberUserData);

        // Add as member
        const membership = await db.models.OrganizationUser.create({
          id: TestDataFactory.generateId(),
          userId: memberUser.id,
          organizationId: testContext.organization.id,
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { 
            organizationId: testContext.organization.id,
            userId: memberUser.id
          }
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.removeMember(req, res, jest.fn());

        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: expect.any(String)
          })
        );

        // Verify membership was removed
        const deletedMembership = await db.models.OrganizationUser.findByPk(membership.id);
        expect(deletedMembership).toBeNull();

        // Cleanup
        await memberUser.destroy();
      });

      test('should handle removal of non-existent member', async () => {
        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { 
            organizationId: testContext.organization.id,
            userId: 'non-existent-user-id'
          }
        });

        const res = AuthTestHelper.createMockResponse();
        const next = jest.fn();

        await organizationController.removeMember(req, res, next);

        // Should call next with error
        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('getOrganizationStats', () => {
    test('should return organization statistics', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.getOrganizationStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalMembers: expect.any(Number),
            totalFeedback: expect.any(Number),
            totalCustomers: expect.any(Number),
            feedbackByStatus: expect.any(Object),
            recentActivity: expect.any(Array)
          })
        })
      );
    });

    test('should handle stats for organization with no data', async () => {
      // Create empty organization
      const { db } = await import('../../services/database');
      const emptyOrgData = TestDataFactory.createOrganizationData();
      const emptyOrg = await db.models.Organization.create(emptyOrgData);

      // Add user as owner
      await db.models.OrganizationUser.create({
        id: TestDataFactory.generateId(),
        userId: testContext.user.id,
        organizationId: emptyOrg.id,
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: emptyOrg.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.getOrganizationStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalMembers: expect.any(Number),
            totalFeedback: 0,
            totalCustomers: 0
          })
        })
      );

      // Cleanup
      await db.models.OrganizationUser.destroy({ where: { organizationId: emptyOrg.id } });
      await emptyOrg.destroy();
    });
  });

  describe('checkUniqueName', () => {
    test('should check if unique name is available', async () => {
      const req = AuthTestHelper.createMockRequest({
        query: { uniqueName: 'available-name-123' }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.checkUniqueName(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            uniqueName: 'available-name-123',
            available: true
          }
        })
      );
    });

    test('should check if unique name is taken', async () => {
      const req = AuthTestHelper.createMockRequest({
        query: { uniqueName: testContext.organization.uniqueName }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.checkUniqueName(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            uniqueName: testContext.organization.uniqueName,
            available: false
          }
        })
      );
    });

    test('should validate unique name format', async () => {
      const req = AuthTestHelper.createMockRequest({
        query: { uniqueName: 'Invalid_Name!' }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.checkUniqueName(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should require unique name parameter', async () => {
      const req = AuthTestHelper.createMockRequest({
        query: {} // Missing uniqueName
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.checkUniqueName(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getUserRole', () => {
    test('should return user role in organization', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.getUserRole(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {
            userId: testContext.user.id,
            organizationId: testContext.organization.id,
            role: expect.any(String)
          }
        })
      );
    });

    test('should handle user not in organization', async () => {
      // Create another organization
      const { db } = await import('../../services/database');
      const otherOrgData = TestDataFactory.createOrganizationData();
      const otherOrg = await db.models.Organization.create(otherOrgData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: otherOrg.id }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.getUserRole(req, res, next);

      // Should call next with error or return null role
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Cleanup
      await otherOrg.destroy();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent organization operations', async () => {
      const createOrganization = async (index: number) => {
        const orgData = {
          name: `Performance Test Org ${index}`,
          uniqueName: `perf-test-org-${index}-${Date.now()}`,
          description: 'Performance testing organization'
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          body: orgData
        });

        const res = AuthTestHelper.createMockResponse();

        await organizationController.createOrganization(req, res, jest.fn());
        return res.json.mock.calls[0][0];
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        createOrganization,
        3 // 3 concurrent creations
      );

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Operations should complete within reasonable time
      PerformanceTestHelper.assertPerformance(averageTimeMs, 2000);

      // Cleanup created organizations
      const { db } = await import('../../services/database');
      for (const result of results) {
        const org = await db.models.Organization.findByPk(result.data.id);
        await org?.destroy();
      }
    });

    test('should complete organization stats within performance threshold', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await organizationController.getOrganizationStats(req, res, jest.fn());
      });

      // Stats should complete within 1 second
      PerformanceTestHelper.assertPerformance(timeMs, 1000);
    });
  });

  describe('Security and Authorization', () => {
    test('should prevent unauthorized organization updates', async () => {
      // Create another user
      const { db } = await import('../../services/database');
      const unauthorizedUserData = TestDataFactory.createUserData();
      const unauthorizedUser = await db.models.User.create(unauthorizedUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: unauthorizedUser.id, // User not in organization
        params: { organizationId: testContext.organization.id },
        body: { name: 'Unauthorized Update' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.updateOrganization(req, res, next);

      // Should call next with error (unauthorized)
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Cleanup
      await unauthorizedUser.destroy();
    });

    test('should prevent non-admins from adding members', async () => {
      // Create a member user (not admin/owner)
      const { db } = await import('../../services/database');
      const memberUserData = TestDataFactory.createUserData();
      const memberUser = await db.models.User.create(memberUserData);

      // Add as member (not admin)
      await db.models.OrganizationUser.create({
        id: TestDataFactory.generateId(),
        userId: memberUser.id,
        organizationId: testContext.organization.id,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Try to add another member
      const newUserData = TestDataFactory.createUserData();
      const newUser = await db.models.User.create(newUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: memberUser.id, // Member trying to add another member
        params: { organizationId: testContext.organization.id },
        body: {
          userId: newUser.id,
          role: 'member'
        }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.addMember(req, res, next);

      // Should call next with error (insufficient permissions)
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Cleanup
      await db.models.OrganizationUser.destroy({ where: { userId: memberUser.id } });
      await memberUser.destroy();
      await newUser.destroy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unique name conflicts', async () => {
      const duplicateData = {
        name: 'Another Organization',
        uniqueName: testContext.organization.uniqueName // Duplicate unique name
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: duplicateData
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.createOrganization(req, res, next);

      // Should call next with error (unique constraint violation)
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should validate field length limits', async () => {
      const longData = {
        name: 'A'.repeat(256), // Exceeds max length
        uniqueName: 'valid-name',
        description: 'B'.repeat(1001) // Exceeds max length
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        body: longData
      });

      const res = AuthTestHelper.createMockResponse();

      await organizationController.createOrganization(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require more sophisticated mocking
      // For now, test that controller passes errors to error handler
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'invalid-user-id-that-will-cause-error',
        params: { organizationId: 'invalid-org-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await organizationController.getOrganizationById(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 