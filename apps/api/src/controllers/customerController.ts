/**
 * Customer Controller
 * Handles customer identification and management HTTP requests
 * Following Zeda patterns for smart customer handling
 */

import { Response, NextFunction } from 'express';
import { customerService, CreateCustomerData, UpdateCustomerData, CustomerListOptions } from '../services/customerService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';

// Validation schemas
const createCustomerSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  company: Joi.string().max(100).optional(),
  avatar: Joi.string().uri().optional(),
  sourceMetadata: Joi.object().optional(),
  integrationId: Joi.string().uuid().optional()
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  company: Joi.string().max(100).optional(),
  avatar: Joi.string().uri().optional(),
  metadata: Joi.object().optional()
});

const customerListSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('name', 'email', 'company', 'createdAt', 'lastSeenAt').optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
  search: Joi.string().optional(),
  company: Joi.string().optional(),
  hasEmail: Joi.boolean().optional(),
  integrationId: Joi.string().optional(),
  dateStart: Joi.date().iso().optional(),
  dateEnd: Joi.date().iso().optional()
});

const mergeCustomersSchema = Joi.object({
  duplicateCustomerId: Joi.string().uuid().required()
});

export class CustomerController {
  /**
   * Identify or create customer
   * Smart customer identification with deduplication
   */
  async identifyOrCreateCustomer(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = createCustomerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      // At least one identifier is required
      if (!value.name && !value.email) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Either name or email must be provided'
        });
      }

      const customer = await customerService.identifyOrCreateCustomer(
        organizationId, 
        value as CreateCustomerData, 
        userId
      );

      res.status(201).json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const userId = req.session!.getUserId();

      const customer = await customerService.getCustomerById(customerId, userId);

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated customer list with filters
   */
  async getCustomerList(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate query parameters
      const { error, value } = customerListSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      // Parse filters from query params
      const options: CustomerListOptions = {
        page: value.page,
        limit: value.limit,
        sortBy: value.sortBy,
        sortOrder: value.sortOrder,
        filters: {}
      };

      // Build filters object
      if (value.search) options.filters!.search = value.search;
      if (value.company) options.filters!.company = value.company.split(',');
      if (value.hasEmail !== undefined) options.filters!.hasEmail = value.hasEmail;
      if (value.integrationId) options.filters!.integrationId = value.integrationId.split(',');
      if (value.dateStart && value.dateEnd) {
        options.filters!.dateRange = {
          start: value.dateStart.toISOString(),
          end: value.dateEnd.toISOString()
        };
      }

      const result = await customerService.getCustomerList(organizationId, options, userId);

      res.json({
        success: true,
        data: result.customers,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomer(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateCustomerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customer = await customerService.updateCustomer(customerId, value as UpdateCustomerData, userId);

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const userId = req.session!.getUserId();

      const result = await customerService.deleteCustomer(customerId, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge duplicate customers
   */
  async mergeCustomers(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = mergeCustomersSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customer = await customerService.mergeCustomers(
        customerId, 
        value.duplicateCustomerId, 
        userId
      );

      res.json({
        success: true,
        data: customer,
        message: 'Customers merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const stats = await customerService.getCustomerStats(organizationId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Find potential duplicate customers
   */
  async findPotentialDuplicates(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const duplicates = await customerService.findPotentialDuplicates(organizationId, userId);

      res.json({
        success: true,
        data: duplicates
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();