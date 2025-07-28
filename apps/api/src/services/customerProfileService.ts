/**
 * Simplified Customer Profile Service
 * Feedback-focused customer identification and management
 * 
 * Key features:
 * - Simple customer identification from feedback sources
 * - Basic email domain-based company detection
 * - Customer deduplication across feedback channels
 * - Feedback history tracking
 * - Simple search and filtering
 */

import { db } from './database';
import { Op, Sequelize } from 'sequelize';
import { organizationService } from './organizationService';

// Ignored domains for company identification (extracted from Zeda)
const IGNORED_EMAIL_DOMAINS = new Set([
  'gmail', 'yahoo', 'hotmail', 'live', 'outlook', 'yopmail', 'protonmail',
  'icloud', 'aol', 'mail', 'temp-mail', '10minutemail', 'guerrillamail'
]);

export enum CustomerSource {
  FEEDBACK_CREATION = 'FEEDBACK_CREATION',
  WIDGET_SUBMISSION = 'WIDGET_SUBMISSION',
  INTEGRATION_SLACK = 'INTEGRATION_SLACK',
  INTEGRATION_ZENDESK = 'INTEGRATION_ZENDESK',
  INTEGRATION_INTERCOM = 'INTEGRATION_INTERCOM',
  INTEGRATION_EMAIL = 'INTEGRATION_EMAIL',
  MANUAL_ENTRY = 'MANUAL_ENTRY'
}

export interface CustomerIdentificationData {
  email?: string;
  name?: string;
  company?: string;
  domain?: string;
  source: CustomerSource;
  externalId?: string;
  metadata?: Record<string, any>;
  avatar?: string;
}

export interface SimpleCustomerData {
  name?: string;
  email?: string;
  company?: string;
  source: CustomerSource;
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface CustomerSearchOptions {
  search?: string;
  companies?: string[];
  sources?: CustomerSource[];
  hasEmail?: boolean;
  activityRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'email' | 'company' | 'lastActivity' | 'feedbackCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomerStats {
  totalCustomers: number;
  recentCustomers: number;
  companiesCount: number;
  avgFeedbackPerCustomer: number;
  topSources: Array<{
    source: string;
    customerCount: number;
  }>;
}

export class CustomerProfileService {
  /**
   * Helper method to check user permissions for organization
   */
  private async checkPermission(organizationId: string, userId: string, allowedRoles: string[]): Promise<void> {
    const role = await organizationService.getUserRole(organizationId, userId);
    if (!role || !allowedRoles.includes(role)) {
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Extract email domain and check if it should be ignored
   */
  private extractValidDomain(email: string): string | null {
    if (!email || !email.includes('@')) return null;
    
    const domain = email.split('@')[1].toLowerCase().trim();
    const domainParts = domain.split('.');
    const mainDomain = domainParts[0];
    
    if (IGNORED_EMAIL_DOMAINS.has(mainDomain)) {
      return null;
    }
    
    return domain;
  }

  /**
   * Normalize customer name for better matching
   */
  private normalizeName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Smart company identification by domain
   */
  private async identifyCompanyByDomain(organizationId: string, domain: string, source: CustomerSource): Promise<any> {
    if (!domain) return null;

    // Find companies with matching domain
    const companies = await db.models.Customer.findAll({
      where: {
        organizationId,
        metadata: {
          domain: domain
        }
      },
      group: ['metadata'],
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'customerCount'],
        'metadata'
      ],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']]
    });

    if (companies.length === 0) {
      return null;
    }

    // If multiple companies exist for domain, prefer by source match
    const sourceMatch = companies.find(c => 
      c.metadata?.source === source || 
      c.metadata?.sources?.includes(source)
    );

    return sourceMatch || companies[0];
  }

  /**
   * Advanced customer identification with fuzzy matching
   */
  async identifyExistingCustomer(organizationId: string, data: CustomerIdentificationData): Promise<any> {
    const searchCriteria = [];

    // Primary: Exact email match
    if (data.email) {
      searchCriteria.push({
        organizationId,
        email: { [Op.iLike]: data.email.trim() }
      });
    }

    // Secondary: External ID match (for integrations)
    if (data.externalId && data.source) {
      searchCriteria.push({
        organizationId,
        [Op.or]: [
          { 'metadata.externalId': data.externalId },
          { [`metadata.${data.source.toLowerCase()}_id`]: data.externalId }
        ]
      });
    }

    // Tertiary: Name + company match (fuzzy)
    if (data.name && data.company) {
      const normalizedName = this.normalizeName(data.name);
      searchCriteria.push({
        organizationId,
        [Op.and]: [
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.fn('TRIM', Sequelize.col('name'))),
            { [Op.like]: `%${normalizedName}%` }
          ),
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.fn('TRIM', Sequelize.col('company'))),
            { [Op.iLike]: `%${data.company.trim()}%` }
          )
        ]
      });
    }

    // Search with priority order
    for (const criteria of searchCriteria) {
      const customer = await db.models.Customer.findOne({
        where: criteria,
        order: [['lastSeenAt', 'DESC']]
      });
      
      if (customer) {
        return customer;
      }
    }

    return null;
  }

  /**
   * Simple customer identification and creation for feedback management
   */
  async identifyOrCreateCustomer(organizationId: string, data: CustomerIdentificationData, userId: string) {
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member']);

    // Extract domain for basic company identification
    const domain = data.email ? this.extractValidDomain(data.email) : null;
    
    // Try to identify existing customer by email or external ID
    let customer = await this.identifyExistingCustomer(organizationId, data);
    
    if (customer) {
      // Update existing customer with new information
      const updateData: any = {
        lastSeenAt: new Date()
      };

      // Fill in missing basic fields
      if (data.name && !customer.name) updateData.name = data.name;
      if (data.email && !customer.email) updateData.email = data.email;
      if (data.company && !customer.company) updateData.company = data.company;
      
      // Simple metadata update
      const existingMetadata = customer.metadata || {};
      const newMetadata = {
        ...existingMetadata,
        domain: domain || existingMetadata.domain,
        sources: [
          ...(existingMetadata.sources || []),
          data.source
        ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
        lastSource: data.source,
        updatedAt: new Date().toISOString()
      };

      // Track external IDs per source
      if (data.externalId) {
        newMetadata[`${data.source.toLowerCase()}_id`] = data.externalId;
      }

      updateData.metadata = newMetadata;
      await customer.update(updateData);
      
      return customer.reload();
    }

    // Create new customer with basic information
    const customerData: any = {
      organizationId,
      name: data.name,
      email: data.email,
      company: data.company,
      lastSeenAt: new Date(),
      metadata: {
        domain,
        source: data.source,
        sources: [data.source],
        createdAt: new Date().toISOString(),
        ...(data.externalId && { [`${data.source.toLowerCase()}_id`]: data.externalId })
      }
    };

    customer = await db.models.Customer.create(customerData);
    return customer;
  }

  /**
   * Update customer last seen time (simplified)
   */
  async updateCustomerLastSeen(customerId: string): Promise<void> {
    await db.models.Customer.update(
      { lastSeenAt: new Date() },
      { where: { id: customerId } }
    );
  }

  /**
   * Advanced customer search with full-text capabilities
   */
  async searchCustomers(organizationId: string, options: CustomerSearchOptions, userId: string) {
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const { search, companies, sources, hasEmail, activityRange, limit = 50, offset = 0, sortBy = 'lastActivity', sortOrder = 'DESC' } = options;

    const whereClause: any = { organizationId };
    const includeClause = [];

    // Text search across name, email, company
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by companies
    if (companies && companies.length > 0) {
      whereClause.company = { [Op.in]: companies };
    }

    // Filter by sources
    if (sources && sources.length > 0) {
      whereClause['metadata.source'] = { [Op.in]: sources };
    }

    // Filter by email presence
    if (hasEmail !== undefined) {
      whereClause.email = hasEmail ? { [Op.not]: null } : null;
    }

    // Filter by activity range
    if (activityRange) {
      whereClause.lastSeenAt = {
        [Op.between]: [activityRange.start, activityRange.end]
      };
    }

    // Include feedback count
    includeClause.push({
      model: db.models.Feedback,
      as: 'feedback',
      attributes: [],
      required: false
    });

    const orderClause = this.buildOrderClause(sortBy, sortOrder);

    const { rows: customers, count: total } = await db.models.Customer.findAndCountAll({
      where: whereClause,
      include: includeClause,
      attributes: [
        '*',
        [Sequelize.fn('COUNT', Sequelize.col('feedback.id')), 'feedbackCount']
      ],
      group: ['Customer.id'],
      order: orderClause,
      limit,
      offset,
      subQuery: false
    });

    return {
      customers,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Build order clause for customer search
   */
  private buildOrderClause(sortBy: string, sortOrder: string): any[] {
    const orderMap: Record<string, any> = {
      name: ['name', sortOrder],
      email: ['email', sortOrder],
      company: ['company', sortOrder],
      lastActivity: ['lastSeenAt', sortOrder],
      feedbackCount: [Sequelize.fn('COUNT', Sequelize.col('feedback.id')), sortOrder]
    };

    return [orderMap[sortBy] || ['lastSeenAt', 'DESC']];
  }

  /**
   * Get customer profile with feedback history
   */
  async getCustomerProfile(customerId: string, userId: string) {
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
          order: [['createdAt', 'DESC']],
          attributes: ['id', 'title', 'status', 'sentiment', 'priority', 'createdAt', 'source']
        }
      ]
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.checkPermission(customer.organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    // Simple feedback statistics
    const feedbackStats = await this.getCustomerFeedbackStats(customerId);

    return {
      ...customer.toJSON(),
      stats: {
        ...feedbackStats,
        firstSeenAt: customer.createdAt,
        lastSeenAt: customer.lastSeenAt,
        feedbackSources: customer.metadata?.sources || []
      }
    };
  }

  /**
   * Get customer feedback statistics
   */
  private async getCustomerFeedbackStats(customerId: string) {
    const feedback = await db.models.Feedback.findAll({
      where: { customerId },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN status = 'resolved' THEN 1 END")), 'resolved'],
        [Sequelize.fn('AVG', Sequelize.col('upvoteCount')), 'avgUpvotes'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN sentiment IN ('positive', 'very_positive') THEN 1 END")), 'positive'],
        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN sentiment IN ('negative', 'very_negative') THEN 1 END")), 'negative']
      ],
      raw: true
    });

    return feedback[0] || { total: 0, resolved: 0, avgUpvotes: 0, positive: 0, negative: 0 };
  }


  /**
   * Get simple customer statistics for feedback management
   */
  async getCustomerStats(organizationId: string, userId: string): Promise<CustomerStats> {
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const [customers, companies, feedbackStats, sources] = await Promise.all([
      // Total and recent customers (last 30 days)
      db.models.Customer.findAll({
        where: { organizationId },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
          [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN \"lastSeenAt\" > NOW() - INTERVAL '30 days' THEN 1 END")), 'recent']
        ],
        raw: true
      }),

      // Companies count
      db.models.Customer.findAll({
        where: { 
          organizationId,
          company: { [Op.not]: null }
        },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('company'))), 'companies']
        ],
        raw: true
      }),

      // Feedback statistics
      db.models.Feedback.findAll({
        where: { organizationId },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalFeedback'],
          [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('customerId'))), 'customersWithFeedback']
        ],
        raw: true
      }),

      // Top sources
      db.models.Customer.findAll({
        where: { organizationId },
        attributes: [
          [Sequelize.literal("metadata->>'source'"), 'source'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'customerCount']
        ],
        group: [Sequelize.literal("metadata->>'source'")],
        order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
        limit: 5,
        raw: true
      })
    ]);

    const customerData = customers[0] || { total: 0, recent: 0 };
    const companyData = companies[0] || { companies: 0 };
    const feedbackData = feedbackStats[0] || { totalFeedback: 0, customersWithFeedback: 0 };

    return {
      totalCustomers: parseInt(customerData.total as string) || 0,
      recentCustomers: parseInt(customerData.recent as string) || 0,
      companiesCount: parseInt(companyData.companies as string) || 0,
      avgFeedbackPerCustomer: parseInt(feedbackData.customersWithFeedback as string) > 0 
        ? parseFloat((parseInt(feedbackData.totalFeedback as string) / parseInt(feedbackData.customersWithFeedback as string)).toFixed(2))
        : 0,
      topSources: sources.map((source: any) => ({
        source: source.source || 'Unknown',
        customerCount: parseInt(source.customerCount)
      }))
    };
  }

  /**
   * Merge customers (deduplication)
   */
  async mergeCustomers(sourceCustomerId: string, targetCustomerId: string, userId: string): Promise<void> {
    const [sourceCustomer, targetCustomer] = await Promise.all([
      db.models.Customer.findByPk(sourceCustomerId),
      db.models.Customer.findByPk(targetCustomerId)
    ]);

    if (!sourceCustomer || !targetCustomer) {
      throw new Error('One or both customers not found');
    }

    if (sourceCustomer.organizationId !== targetCustomer.organizationId) {
      throw new Error('Cannot merge customers from different organizations');
    }

    await this.checkPermission(sourceCustomer.organizationId, userId, ['owner', 'admin']);

    // Move all feedback to target customer
    await db.models.Feedback.update(
      { customerId: targetCustomerId },
      { where: { customerId: sourceCustomerId } }
    );

    // Merge metadata
    const mergedMetadata = {
      ...targetCustomer.metadata,
      ...sourceCustomer.metadata,
      mergedFrom: sourceCustomerId,
      mergedAt: new Date().toISOString(),
      mergedBy: userId
    };

    // Update target customer with merged data
    const updateData: any = {
      metadata: mergedMetadata
    };

    // Fill in missing fields from source
    if (!targetCustomer.name && sourceCustomer.name) updateData.name = sourceCustomer.name;
    if (!targetCustomer.email && sourceCustomer.email) updateData.email = sourceCustomer.email;
    if (!targetCustomer.company && sourceCustomer.company) updateData.company = sourceCustomer.company;
    if (!targetCustomer.avatar && sourceCustomer.avatar) updateData.avatar = sourceCustomer.avatar;

    await targetCustomer.update(updateData);

    // Soft delete source customer
    await sourceCustomer.destroy();
  }
}

export const customerProfileService = new CustomerProfileService();