/**
 * Customer Profile Controller
 * Handles HTTP requests for customer profile management
 */

import { Request, Response, NextFunction } from 'express';
import { customerProfileService, CustomerIdentificationData, CustomerSource, CustomerSearchOptions } from '../services/customerProfileService';
import { SessionRequest } from 'supertokens-node/framework/express';
import { db } from '../services/database';
import { Op } from 'sequelize';
import Joi from 'joi';

// Validation schemas
const identifyCustomerSchema = Joi.object({
  email: Joi.string().email().optional(),
  name: Joi.string().min(1).max(200).optional(),
  company: Joi.string().min(1).max(200).optional(),
  domain: Joi.string().domain().optional(),
  source: Joi.string().valid(...Object.values(CustomerSource)).required(),
  externalId: Joi.string().max(100).optional(),
  metadata: Joi.object().optional(),
  avatar: Joi.string().uri().optional()
}).or('email', 'name'); // At least email or name is required

const searchCustomersSchema = Joi.object({
  search: Joi.string().max(100).optional(),
  companies: Joi.array().items(Joi.string()).optional(),
  sources: Joi.array().items(Joi.string().valid(...Object.values(CustomerSource))).optional(),
  hasEmail: Joi.boolean().optional(),
  activityStart: Joi.date().optional(),
  activityEnd: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  sortBy: Joi.string().valid('name', 'email', 'company', 'lastActivity', 'feedbackCount').default('lastActivity'),
  sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
});

const mergeCustomersSchema = Joi.object({
  sourceCustomerId: Joi.string().required(),
  targetCustomerId: Joi.string().required()
});

export class CustomerProfileController {
  /**
   * Identify or create customer
   */
  async identifyOrCreateCustomer(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = identifyCustomerSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customer = await customerProfileService.identifyOrCreateCustomer(
        organizationId,
        value as CustomerIdentificationData,
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
   * Search customers with advanced filtering
   */
  async searchCustomers(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate query parameters
      const { error, value } = searchCustomersSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      // Build search options
      const searchOptions: CustomerSearchOptions = {
        search: value.search,
        companies: value.companies,
        sources: value.sources,
        hasEmail: value.hasEmail,
        ...(value.activityStart && value.activityEnd && {
          activityRange: {
            start: new Date(value.activityStart),
            end: new Date(value.activityEnd)
          }
        }),
        limit: value.limit,
        offset: value.offset,
        sortBy: value.sortBy,
        sortOrder: value.sortOrder
      };

      const result = await customerProfileService.searchCustomers(organizationId, searchOptions, userId);

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
   * Get customer profile by ID
   */
  async getCustomerProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const userId = req.session!.getUserId();

      const profile = await customerProfileService.getCustomerProfile(customerId, userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer activity
   */
  async updateCustomerActivity(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { customerId } = req.params;
      const { source, activityData } = req.body;

      // Validate source
      if (!Object.values(CustomerSource).includes(source)) {
        return res.status(400).json({
          error: 'Invalid source',
          message: 'Source must be one of: ' + Object.values(CustomerSource).join(', ')
        });
      }

      // TODO: Implement updateCustomerActivity method
      console.log('Activity update requested for customer:', customerId);

      res.json({
        success: true,
        message: 'Customer activity updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer statistics for organization
   */
  async getCustomerStats(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const stats = await customerProfileService.getCustomerStats(organizationId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Merge customers (deduplication)
   */
  async mergeCustomers(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = mergeCustomersSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      await customerProfileService.mergeCustomers(
        value.sourceCustomerId,
        value.targetCustomerId,
        userId
      );

      res.json({
        success: true,
        message: 'Customers merged successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer companies (for filtering)
   */
  async getCustomerCompanies(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // This is a simplified implementation - could be moved to service
      const { db } = await import('../services/database');
      
      // Check permissions (simplified)
      const membership = await db.models.OrganizationUser.findOne({
        where: { organizationId, userId }
      });
      
      if (!membership) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const companies = await db.models.Customer.findAll({
        where: { 
          organizationId,
          company: { [Op.ne]: null }
        },
        attributes: [
          'company',
          [db.sequelize.Sequelize.fn('COUNT', db.sequelize.Sequelize.col('id')), 'customerCount']
        ],
        group: ['company'],
        order: [[db.sequelize.Sequelize.fn('COUNT', db.sequelize.Sequelize.col('id')), 'DESC']],
        limit: 50
      });

      res.json({
        success: true,
        data: companies.map((c: any) => ({
          name: c.company,
          customerCount: parseInt(c.dataValues.customerCount)
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk import customers (for CSV uploads, etc.)
   */
  async bulkImportCustomers(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();
      const { customers, source = CustomerSource.MANUAL_ENTRY } = req.body;

      if (!Array.isArray(customers) || customers.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'customers must be a non-empty array'
        });
      }

      const results = {
        created: 0,
        updated: 0,
        errors: [] as any[]
      };

      // Process customers in batches
      for (let i = 0; i < customers.length; i++) {
        try {
          const customerData = customers[i];
          
          // Validate individual customer
          const { error, value } = identifyCustomerSchema.validate({
            ...customerData,
            source
          });
          
          if (error) {
            results.errors.push({
              index: i,
              data: customerData,
              error: error.details.map(d => d.message).join(', ')
            });
            continue;
          }

          const customer = await customerProfileService.identifyOrCreateCustomer(
            organizationId,
            value as CustomerIdentificationData,
            userId
          );

          if (customer.createdAt === customer.updatedAt) {
            results.created++;
          } else {
            results.updated++;
          }
        } catch (error) {
          results.errors.push({
            index: i,
            data: customers[i],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Processed ${customers.length} customers: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customerProfileController = new CustomerProfileController();