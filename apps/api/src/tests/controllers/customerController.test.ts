/**
 * CustomerController Unit Tests
 * Comprehensive testing of all customer management operations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { customerController } from '../../controllers/customerController';
import { Op } from 'sequelize';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';

describe('CustomerController', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clean up test customers before each test
    const { db } = await import('../../services/database');
    await db.models.Customer?.destroy({ 
      where: { 
        organizationId: testContext.organization.id,
        id: { [Op.ne]: testContext.customer.id }
      }
    });
  });

  describe('identifyOrCreateCustomer', () => {
    test('should create new customer with email', async () => {
      const customerData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        company: 'Test Company',
        avatar: 'https://example.com/avatar.jpg'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: customerData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: customerData.name,
            email: customerData.email,
            company: customerData.company,
            organizationId: testContext.organization.id
          })
        })
      );

      // Verify customer was created in database
      const { db } = await import('../../services/database');
      const createdCustomer = await db.models.Customer.findOne({
        where: { email: customerData.email, organizationId: testContext.organization.id }
      });
      expect(createdCustomer).toBeTruthy();
    });

    test('should create customer with only name', async () => {
      const customerData = {
        name: 'Jane Smith',
        company: 'Another Company'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: customerData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: customerData.name,
            company: customerData.company
          })
        })
      );
    });

    test('should identify existing customer by email', async () => {
      // Use existing test customer
      const customerData = {
        name: 'Different Name', // Different name but same email
        email: testContext.customer.email
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: customerData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.customer.id, // Should return existing customer
            email: testContext.customer.email
          })
        })
      );
    });

    test('should require at least name or email', async () => {
      const invalidData = {
        company: 'Company Only'
        // Missing both name and email
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error',
          message: 'Either name or email must be provided'
        })
      );
    });

    test('should validate email format', async () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email-format'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should handle sourceMetadata and integrationId', async () => {
      const customerData = {
        name: 'Integration User',
        email: 'integration@example.com',
        sourceMetadata: {
          source: 'slack',
          userId: 'U123456789'
        },
        integrationId: 'integration-123'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: customerData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: customerData.name,
            email: customerData.email
          })
        })
      );
    });
  });

  describe('getCustomerById', () => {
    test('should return customer details', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerById(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.customer.id,
            name: testContext.customer.name,
            email: testContext.customer.email
          })
        })
      );
    });

    test('should handle non-existent customer', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: 'non-existent-customer-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.getCustomerById(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getCustomerList', () => {
    beforeEach(async () => {
      // Create multiple test customers for list testing
      const { db } = await import('../../services/database');
      const customers = [
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'Alice Johnson',
          email: 'alice@company.com',
          company: 'Alpha Corp'
        }),
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'Bob Wilson',
          email: 'bob@betacorp.com',
          company: 'Beta Corp'
        }),
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'Charlie Brown',
          company: 'Gamma Inc'
          // No email
        })
      ];

      await db.models.Customer.bulkCreate(customers);
    });

    test('should return paginated customer list', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { page: '1', limit: '10' }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number)
          })
        })
      );

      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.data.length).toBeGreaterThan(0);
    });

    test('should filter customers by search term', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { search: 'Alice' }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      // Should find customers with 'Alice' in name
      expect(responseCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Alice')
          })
        ])
      );
    });

    test('should filter customers by company', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { company: 'Alpha Corp,Beta Corp' }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      // Should only return customers from specified companies
      responseCall.data.forEach((customer: any) => {
        expect(['Alpha Corp', 'Beta Corp']).toContain(customer.company);
      });
    });

    test('should filter customers by hasEmail', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { hasEmail: 'true' }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      // Should only return customers with email addresses
      responseCall.data.forEach((customer: any) => {
        expect(customer.email).toBeTruthy();
      });
    });

    test('should sort customers by name', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { sortBy: 'name', sortOrder: 'ASC' }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.json).toHaveBeenCalled();
      
      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.success).toBe(true);
      
      // Check if results are sorted by name
      const names = responseCall.data.map((customer: any) => customer.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });

    test('should validate query parameters', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { 
          page: '-1', // Invalid page
          limit: '150', // Exceeds max limit
          sortBy: 'invalid-field' // Invalid sort field
        }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerList(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });
  });

  describe('updateCustomer', () => {
    test('should update customer details', async () => {
      const updateData = {
        name: 'Updated Customer Name',
        company: 'Updated Company',
        metadata: {
          updated: true,
          source: 'test'
        }
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: updateData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.updateCustomer(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.customer.id,
            name: updateData.name,
            company: updateData.company
          })
        })
      );
    });

    test('should validate update data', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        avatar: 'not-a-valid-url'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.updateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should handle partial updates', async () => {
      const partialData = {
        company: 'Only Update Company'
        // Not updating other fields
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: partialData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.updateCustomer(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            company: partialData.company
          })
        })
      );
    });

    test('should handle non-existent customer', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: 'non-existent-customer-id' },
        body: { name: 'Updated Name' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.updateCustomer(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteCustomer', () => {
    test('should delete customer', async () => {
      // Create a customer to delete
      const { db } = await import('../../services/database');
      const customerData = TestDataFactory.createCustomerData({
        organizationId: testContext.organization.id,
        name: 'Customer to Delete'
      });
      const customerToDelete = await db.models.Customer.create(customerData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: customerToDelete.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.deleteCustomer(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.any(String)
        })
      );

      // Verify customer was actually deleted
      const deletedCustomer = await db.models.Customer.findByPk(customerToDelete.id);
      expect(deletedCustomer).toBeNull();
    });

    test('should handle deletion of non-existent customer', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: 'non-existent-customer-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.deleteCustomer(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('mergeCustomers', () => {
    test('should merge duplicate customers', async () => {
      // Create a duplicate customer
      const { db } = await import('../../services/database');
      const duplicateData = TestDataFactory.createCustomerData({
        organizationId: testContext.organization.id,
        name: 'Duplicate Customer',
        email: 'duplicate@example.com'
      });
      const duplicateCustomer = await db.models.Customer.create(duplicateData);

      const mergeData = {
        duplicateCustomerId: duplicateCustomer.id
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: mergeData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.mergeCustomers(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: testContext.customer.id
          }),
          message: 'Customers merged successfully'
        })
      );

      // Verify duplicate customer was removed
      const deletedDuplicate = await db.models.Customer.findByPk(duplicateCustomer.id);
      expect(deletedDuplicate).toBeNull();
    });

    test('should validate merge request', async () => {
      const invalidData = {
        duplicateCustomerId: 'invalid-uuid'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: invalidData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.mergeCustomers(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation Error'
        })
      );
    });

    test('should require duplicateCustomerId', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: testContext.customer.id },
        body: {} // Missing duplicateCustomerId
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.mergeCustomers(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCustomerStats', () => {
    test('should return customer statistics', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCustomers: expect.any(Number),
            customersWithEmail: expect.any(Number),
            customersWithoutEmail: expect.any(Number),
            averageFeedbackPerCustomer: expect.any(Number),
            topCompanies: expect.any(Array),
            recentCustomers: expect.any(Array)
          })
        })
      );
    });

    test('should handle stats for organization with no customers', async () => {
      // Create empty organization
      const { db } = await import('../../services/database');
      const emptyOrgData = TestDataFactory.createOrganizationData();
      const emptyOrg = await db.models.Organization.create(emptyOrgData);

      // Add user as owner
      const orgUserData = TestDataFactory.createOrganizationUserData({
        userId: testContext.user.id,
        organizationId: emptyOrg.id,
        role: 'owner'
      });
      await db.models.OrganizationUser.create(orgUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: emptyOrg.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.getCustomerStats(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalCustomers: 0,
            customersWithEmail: 0,
            customersWithoutEmail: 0
          })
        })
      );

      // Cleanup
      await db.models.OrganizationUser.destroy({ where: { organizationId: emptyOrg.id } });
      await emptyOrg.destroy();
    });
  });

  describe('findPotentialDuplicates', () => {
    beforeEach(async () => {
      // Create potential duplicate customers
      const { db } = await import('../../services/database');
      const duplicates = [
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'John Smith',
          email: 'john@example.com'
        }),
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'John Smith', // Same name
          email: 'j.smith@example.com' // Different email
        }),
        TestDataFactory.createCustomerData({
          organizationId: testContext.organization.id,
          name: 'Jane Doe',
          email: 'john@example.com' // Same email as first
        })
      ];

      await db.models.Customer.bulkCreate(duplicates);
    });

    test('should find potential duplicate customers', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.findPotentialDuplicates(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Array)
        })
      );

      const responseCall = res.json.mock.calls[0][0];
      expect(responseCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            customer: expect.any(Object),
            potentialDuplicates: expect.any(Array),
            matchingFields: expect.any(Array)
          })
        ])
      );
    });

    test('should return empty array when no duplicates exist', async () => {
      // Clear all customers except the test one
      const { db } = await import('../../services/database');
      await db.models.Customer.destroy({
        where: {
          organizationId: testContext.organization.id,
          id: { [Op.ne]: testContext.customer.id }
        }
      });

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id }
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.findPotentialDuplicates(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: []
        })
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent customer creation', async () => {
      const createCustomer = async (index: number) => {
        const customerData = {
          name: `Performance Customer ${index}`,
          email: `perf-customer-${index}@example.com`,
          company: `Performance Company ${index}`
        };

        const req = AuthTestHelper.createMockSessionRequest({
          userId: testContext.user.id,
          params: { organizationId: testContext.organization.id },
          body: customerData
        });

        const res = AuthTestHelper.createMockResponse();

        await customerController.identifyOrCreateCustomer(req, res, jest.fn());
        return res.json.mock.calls[0][0];
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => createCustomer(Date.now()),
        5 // 5 concurrent creations
      );

      // All operations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Operations should complete within reasonable time
      PerformanceTestHelper.assertPerformance(averageTimeMs, 1500);

      // Cleanup created customers
      const { db } = await import('../../services/database');
      for (const result of results) {
        const customer = await db.models.Customer.findByPk(result.data.id);
        await customer?.destroy();
      }
    });

    test('should complete customer list within performance threshold', async () => {
      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        query: { page: '1', limit: '50' }
      });

      const res = AuthTestHelper.createMockResponse();

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await customerController.getCustomerList(req, res, jest.fn());
      });

      // List should complete within 800ms
      PerformanceTestHelper.assertPerformance(timeMs, 800);
    });
  });

  describe('Security and Authorization', () => {
    test('should prevent access to customers from other organizations', async () => {
      // Create another organization with a customer
      const { db } = await import('../../services/database');
      const otherOrgData = TestDataFactory.createOrganizationData();
      const otherOrg = await db.models.Organization.create(otherOrgData);

      const otherCustomerData = TestDataFactory.createCustomerData({
        organizationId: otherOrg.id
      });
      const otherCustomer = await db.models.Customer.create(otherCustomerData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { customerId: otherCustomer.id }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.getCustomerById(req, res, next);

      // Should call next with error (unauthorized access)
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Cleanup
      await otherCustomer.destroy();
      await otherOrg.destroy();
    });

    test('should validate organization access for customer operations', async () => {
      // Create unauthorized user
      const { db } = await import('../../services/database');
      const unauthorizedUserData = TestDataFactory.createUserData();
      const unauthorizedUser = await db.models.User.create(unauthorizedUserData);

      const req = AuthTestHelper.createMockSessionRequest({
        userId: unauthorizedUser.id,
        params: { organizationId: testContext.organization.id },
        body: {
          name: 'Unauthorized Customer',
          email: 'unauthorized@example.com'
        }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.identifyOrCreateCustomer(req, res, next);

      // Should call next with error (no access to organization)
      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Cleanup
      await unauthorizedUser.destroy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed email addresses gracefully', async () => {
      const malformedData = {
        name: 'Test User',
        email: 'not@valid@email@address'
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: malformedData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should validate field length limits', async () => {
      const longData = {
        name: 'A'.repeat(101), // Exceeds max length
        email: 'valid@example.com',
        company: 'B'.repeat(101) // Exceeds max length
      };

      const req = AuthTestHelper.createMockSessionRequest({
        userId: testContext.user.id,
        params: { organizationId: testContext.organization.id },
        body: longData
      });

      const res = AuthTestHelper.createMockResponse();

      await customerController.identifyOrCreateCustomer(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should handle database connection errors gracefully', async () => {
      // Test that controller passes errors to error handler
      const req = AuthTestHelper.createMockSessionRequest({
        userId: 'invalid-user-id-that-will-cause-error',
        params: { customerId: 'invalid-customer-id' }
      });

      const res = AuthTestHelper.createMockResponse();
      const next = jest.fn();

      await customerController.getCustomerById(req, res, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 