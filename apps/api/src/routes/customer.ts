/**
 * Customer Routes
 * RESTful API endpoints for customer identification and management
 * Following Zeda patterns for smart customer handling
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { customerController } from '../controllers/customerController';

const router = Router();

// All customer routes require authentication
router.use(verifySession());

/**
 * Organization-scoped customer operations
 */

// POST /api/organizations/:organizationId/customers - Identify or create customer
router.post('/:organizationId/customers', customerController.identifyOrCreateCustomer.bind(customerController));

// GET /api/organizations/:organizationId/customers - Get customer list with filters
router.get('/:organizationId/customers/', customerController.getCustomerList.bind(customerController));

// GET /api/organizations/:organizationId/customers/stats - Get customer statistics
router.get('/:organizationId/customers/stats', customerController.getCustomerStats.bind(customerController));

// GET /api/organizations/:organizationId/customers/duplicates - Find potential duplicates
router.get('/:organizationId/customers/duplicates', customerController.findPotentialDuplicates.bind(customerController));

/**
 * Individual customer operations
 */

// GET /api/customers/:customerId - Get customer by ID
router.get('/customers/:customerId', customerController.getCustomerById.bind(customerController));

// PUT /api/customers/:customerId - Update customer profile
router.put('/customers/:customerId', customerController.updateCustomer.bind(customerController));

// DELETE /api/customers/:customerId - Delete customer
router.delete('/customers/:customerId', customerController.deleteCustomer.bind(customerController));

// POST /api/customers/:customerId/merge - Merge duplicate customers
router.post('/customers/:customerId/merge', customerController.mergeCustomers.bind(customerController));

export default router;