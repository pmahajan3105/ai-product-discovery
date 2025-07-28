/**
 * Customer Service
 * Handles customer identification and profile management
 * 
 * Key architectural decisions based on Zeda analysis:
 * - Smart customer identification and deduplication
 * - Organization-scoped customer management
 * - Integration with feedback sources
 * - Privacy-conscious data handling
 */

import { db } from './database';
import { Op } from 'sequelize';

export interface CreateCustomerData {
  name?: string;
  email?: string;
  company?: string;
  avatar?: string;
  sourceMetadata?: Record<string, any>;
  integrationId?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  company?: string;
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface CustomerFilters {
  search?: string;
  company?: string[];
  hasEmail?: boolean;
  integrationId?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CustomerListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'company' | 'createdAt' | 'lastSeenAt';
  sortOrder?: 'ASC' | 'DESC';
  filters?: CustomerFilters;
}

export class CustomerService {
  /**
   * Helper method to check user permissions for organization
   */
  private async checkOrganizationAccess(organizationId: string, userId: string): Promise<void> {
    const membership = await db.models.OrganizationUser.findOne({
      where: { organizationId, userId }
    });
    
    if (!membership) {
      throw new Error('Access denied to organization');
    }
  }

  /**
   * Smart customer identification and creation
   * Following Zeda pattern of intelligent customer matching
   */
  async identifyOrCreateCustomer(organizationId: string, data: CreateCustomerData, userId: string) {
    await this.checkOrganizationAccess(organizationId, userId);

    // Try to identify existing customer
    let customer = null;
    
    // Primary identification by email (if provided)
    if (data.email) {
      customer = await db.models.Customer.findOne({
        where: {
          organizationId,
          email: { [Op.iLike]: data.email }
        }
      });
    }

    // Secondary identification by name + company combination
    if (!customer && data.name && data.company) {
      customer = await db.models.Customer.findOne({
        where: {
          organizationId,
          name: { [Op.iLike]: data.name },
          company: { [Op.iLike]: data.company }
        }
      });
    }

    if (customer) {
      // Update existing customer with new information
      const updateData: any = {
        lastSeenAt: new Date()
      };

      // Merge non-empty fields
      if (data.name && !customer.name) updateData.name = data.name;
      if (data.email && !customer.email) updateData.email = data.email;
      if (data.company && !customer.company) updateData.company = data.company;
      if (data.avatar && !customer.avatar) updateData.avatar = data.avatar;
      
      // Merge metadata
      if (data.sourceMetadata) {
        updateData.metadata = {
          ...customer.metadata,
          ...data.sourceMetadata
        };
      }

      await customer.update(updateData);
      return customer.reload();
    }

    // Create new customer
    customer = await db.models.Customer.create({
      ...data,
      organizationId,
      metadata: data.sourceMetadata || {},
      lastSeenAt: new Date()
    });

    return customer;
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string, userId: string) {
    const customer = await db.models.Customer.findByPk(customerId, {
      include: [
        {
          model: db.models.Organization,
          as: 'organization',
          attributes: ['id', 'name', 'uniqueName']
        },
        {
          model: db.models.Feedback,
          as: 'feedback',
          limit: 5,
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'title', 'status', 'createdAt']
        }
      ]
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.checkOrganizationAccess(customer.organizationId, userId);
    return customer;
  }

  /**
   * Get paginated customer list with filters
   */
  async getCustomerList(organizationId: string, options: CustomerListOptions, userId: string) {
    await this.checkOrganizationAccess(organizationId, userId);

    const {
      page = 1,
      limit = 25,
      sortBy = 'lastSeenAt',
      sortOrder = 'DESC',
      filters = {}
    } = options;

    const offset = (page - 1) * limit;

    // Build where conditions
    const where: any = { organizationId };

    // Apply filters
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } },
        { company: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    if (filters.company?.length) {
      where.company = { [Op.in]: filters.company };
    }

    if (filters.hasEmail !== undefined) {
      where.email = filters.hasEmail ? { [Op.not]: null } : { [Op.is]: null };
    }

    if (filters.integrationId?.length) {
      where.integrationId = { [Op.in]: filters.integrationId };
    }

    if (filters.dateRange) {
      where.createdAt = {
        [Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }

    // Execute query
    const { count, rows } = await db.models.Customer.findAndCountAll({
      where,
      include: [
        {
          model: db.models.Integration,
          as: 'integration',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      customers: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update customer profile
   */
  async updateCustomer(customerId: string, data: UpdateCustomerData, userId: string) {
    const customer = await db.models.Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.checkOrganizationAccess(customer.organizationId, userId);

    // Validate email format if provided
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    // Check for duplicates if email is being changed
    if (data.email && data.email !== customer.email) {
      const existingCustomer = await db.models.Customer.findOne({
        where: {
          organizationId: customer.organizationId,
          email: { [Op.iLike]: data.email },
          id: { [Op.not]: customerId }
        }
      });

      if (existingCustomer) {
        throw new Error('A customer with this email already exists');
      }
    }

    // Update customer
    const updateData = {
      ...data,
      lastSeenAt: new Date()
    };

    // Merge metadata if provided
    if (data.metadata) {
      updateData.metadata = {
        ...customer.metadata,
        ...data.metadata
      };
    }

    await customer.update(updateData);
    return this.getCustomerById(customerId, userId);
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string, userId: string) {
    const customer = await db.models.Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.checkOrganizationAccess(customer.organizationId, userId);

    // Check if customer has feedback
    const feedbackCount = await db.models.Feedback.count({
      where: { customerId: customer.id }
    });

    if (feedbackCount > 0) {
      throw new Error('Cannot delete customer with existing feedback. Archive the customer instead.');
    }

    await customer.destroy();
    return { message: 'Customer deleted successfully' };
  }

  /**
   * Merge duplicate customers
   * Following Zeda pattern for data consolidation
   */
  async mergeCustomers(primaryCustomerId: string, duplicateCustomerId: string, userId: string) {
    const [primaryCustomer, duplicateCustomer] = await Promise.all([
      db.models.Customer.findByPk(primaryCustomerId),
      db.models.Customer.findByPk(duplicateCustomerId)
    ]);

    if (!primaryCustomer || !duplicateCustomer) {
      throw new Error('One or both customers not found');
    }

    if (primaryCustomer.organizationId !== duplicateCustomer.organizationId) {
      throw new Error('Cannot merge customers from different organizations');
    }

    await this.checkOrganizationAccess(primaryCustomer.organizationId, userId);

    const transaction = await db.sequelize.transaction();

    try {
      // Move all feedback from duplicate to primary
      await db.models.Feedback.update(
        { customerId: primaryCustomerId },
        { 
          where: { customerId: duplicateCustomerId },
          transaction 
        }
      );

      // Merge metadata
      const mergedMetadata = {
        ...duplicateCustomer.metadata,
        ...primaryCustomer.metadata,
        mergedFrom: duplicateCustomerId,
        mergedAt: new Date().toISOString()
      };

      // Update primary customer with merged data
      const updateData: any = {
        metadata: mergedMetadata,
        lastSeenAt: new Date()
      };

      // Fill in missing fields from duplicate
      if (!primaryCustomer.name && duplicateCustomer.name) {
        updateData.name = duplicateCustomer.name;
      }
      if (!primaryCustomer.email && duplicateCustomer.email) {
        updateData.email = duplicateCustomer.email;
      }
      if (!primaryCustomer.company && duplicateCustomer.company) {
        updateData.company = duplicateCustomer.company;
      }
      if (!primaryCustomer.avatar && duplicateCustomer.avatar) {
        updateData.avatar = duplicateCustomer.avatar;
      }

      await primaryCustomer.update(updateData, { transaction });

      // Delete duplicate customer
      await duplicateCustomer.destroy({ transaction });

      await transaction.commit();

      return this.getCustomerById(primaryCustomerId, userId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get customer statistics for organization
   */
  async getCustomerStats(organizationId: string, userId: string) {
    await this.checkOrganizationAccess(organizationId, userId);

    const [
      totalCount,
      withEmailCount,
      companyCounts,
      integrationCounts,
      recentActivity
    ] = await Promise.all([
      // Total customer count
      db.models.Customer.count({ where: { organizationId } }),
      
      // Customers with email
      db.models.Customer.count({ 
        where: { 
          organizationId,
          email: { [Op.not]: null }
        } 
      }),
      
      // Count by company
      db.models.Customer.findAll({
        where: { 
          organizationId,
          company: { [Op.not]: null }
        },
        attributes: [
          'company',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['company'],
        order: [[db.sequelize.literal('count'), 'DESC']],
        limit: 10,
        raw: true
      }),
      
      // Count by integration
      db.models.Customer.findAll({
        where: { organizationId },
        include: [
          {
            model: db.models.Integration,
            as: 'integration',
            attributes: ['name', 'type']
          }
        ],
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('Customer.id')), 'count']
        ],
        group: ['integration.id', 'integration.name', 'integration.type'],
        raw: true
      }),
      
      // Recent activity (customers created in last 30 days)
      db.models.Customer.count({
        where: {
          organizationId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      total: totalCount,
      withEmail: withEmailCount,
      withoutEmail: totalCount - withEmailCount,
      recentActivity,
      topCompanies: companyCounts.reduce((acc: any, item: any) => {
        acc[item.company] = parseInt(item.count);
        return acc;
      }, {}),
      byIntegration: integrationCounts.reduce((acc: any, item: any) => {
        const key = `${item['integration.name']} (${item['integration.type']})`;
        acc[key] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Find potential duplicate customers
   * Following Zeda pattern for data quality
   */
  async findPotentialDuplicates(organizationId: string, userId: string) {
    await this.checkOrganizationAccess(organizationId, userId);

    const duplicates = await db.sequelize.query(`
      SELECT 
        c1.id as customer1_id,
        c1.name as customer1_name,
        c1.email as customer1_email,
        c2.id as customer2_id,
        c2.name as customer2_name,
        c2.email as customer2_email,
        CASE 
          WHEN c1.email = c2.email THEN 'email'
          WHEN c1.name = c2.name AND c1.company = c2.company THEN 'name_company'
          ELSE 'unknown'
        END as match_type
      FROM customers c1
      JOIN customers c2 ON c1.organization_id = c2.organization_id
      WHERE c1.organization_id = :organizationId
        AND c1.id < c2.id
        AND (
          c1.email = c2.email
          OR (c1.name = c2.name AND c1.company = c2.company AND c1.name IS NOT NULL)
        )
      ORDER BY match_type, c1.name
    `, {
      replacements: { organizationId },
      type: db.sequelize.QueryTypes.SELECT
    });

    return duplicates;
  }
}

export const customerService = new CustomerService();