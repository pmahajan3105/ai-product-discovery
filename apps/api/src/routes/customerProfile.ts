/**
 * Customer Profile Routes
 * API routes for advanced customer profile management
 */

import { Router } from 'express';
import { customerProfileController } from '../controllers/customerProfileController';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';

export const customerProfileRouter = Router();

// Customer identification and creation
customerProfileRouter.post(
  '/organizations/:organizationId/customers/identify',
  verifySession(),
  customerProfileController.identifyOrCreateCustomer.bind(customerProfileController)
);

// Customer search with advanced filtering
customerProfileRouter.get(
  '/organizations/:organizationId/customers/search',
  verifySession(),
  customerProfileController.searchCustomers.bind(customerProfileController)
);

// Get customer profile by ID
customerProfileRouter.get(
  '/customers/:customerId/profile',
  verifySession(),
  customerProfileController.getCustomerProfile.bind(customerProfileController)
);

// Update customer activity
customerProfileRouter.put(
  '/customers/:customerId/activity',
  verifySession(),
  customerProfileController.updateCustomerActivity.bind(customerProfileController)
);

// Get customer statistics for organization
customerProfileRouter.get(
  '/organizations/:organizationId/customers/stats',
  verifySession(),
  customerProfileController.getCustomerStats.bind(customerProfileController)
);

// Get customer companies (for filtering)
customerProfileRouter.get(
  '/organizations/:organizationId/customers/companies',
  verifySession(),
  customerProfileController.getCustomerCompanies.bind(customerProfileController)
);

// Merge customers (deduplication)
customerProfileRouter.post(
  '/customers/merge',
  verifySession(),
  customerProfileController.mergeCustomers.bind(customerProfileController)
);

// Bulk import customers
customerProfileRouter.post(
  '/organizations/:organizationId/customers/bulk-import',
  verifySession(),
  customerProfileController.bulkImportCustomers.bind(customerProfileController)
);