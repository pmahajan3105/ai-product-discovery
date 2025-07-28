/**
 * Customer Profile API Client
 * Handles advanced customer profile management API calls
 */

import { apiClient } from './apiClient';

// Types matching backend interfaces
export enum CustomerSource {
  DASHBOARD_MANUAL = 'DASHBOARD_MANUAL',
  FEEDBACK_CREATION = 'FEEDBACK_CREATION',
  WIDGET_SUBMISSION = 'WIDGET_SUBMISSION',
  API_IMPORT = 'API_IMPORT',
  CSV_IMPORT = 'CSV_IMPORT',
  INTEGRATION_SLACK = 'INTEGRATION_SLACK',
  INTEGRATION_ZENDESK = 'INTEGRATION_ZENDESK',
  INTEGRATION_INTERCOM = 'INTEGRATION_INTERCOM'
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

export interface CustomerProfile {
  id: string;
  organizationId: string;
  name?: string;
  email?: string;
  company?: string;
  avatar?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  stats?: {
    total: number;
    resolved: number;
    avgUpvotes: number;
    positive: number;
    negative: number;
    activeSince: string;
    lastActivity: string;
    totalActivities: number;
  };
  activityTimeline?: Array<{
    source: string;
    lastActivity: string;
    activityCount: number;
  }>;
  feedback?: Array<{
    id: string;
    title: string;
    status: string;
    sentiment?: string;
    upvoteCount: number;
    createdAt: string;
  }>;
}

export interface CustomerSearchOptions {
  search?: string;
  companies?: string[];
  sources?: CustomerSource[];
  hasEmail?: boolean;
  activityStart?: string;
  activityEnd?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'email' | 'company' | 'lastActivity' | 'feedbackCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomerSearchResult {
  customers: CustomerProfile[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  companiesCount: number;
  avgFeedbackPerCustomer: number;
  topCompanies: Array<{
    name: string;
    customerCount: number;
    feedbackCount: number;
  }>;
}

export interface CustomerCompany {
  name: string;
  customerCount: number;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  errors: Array<{
    index: number;
    data: any;
    error: string;
  }>;
}

export class CustomerProfileApi {
  /**
   * Identify or create customer with smart deduplication
   */
  async identifyOrCreateCustomer(organizationId: string, data: CustomerIdentificationData): Promise<CustomerProfile> {
    const response = await apiClient.post(`/organizations/${organizationId}/customers/identify`, data);
    return response.data;
  }

  /**
   * Search customers with advanced filtering
   */
  async searchCustomers(organizationId: string, options: CustomerSearchOptions): Promise<CustomerSearchResult> {
    const params = new URLSearchParams();
    
    if (options.search) params.append('search', options.search);
    if (options.companies) options.companies.forEach(c => params.append('companies', c));
    if (options.sources) options.sources.forEach(s => params.append('sources', s));
    if (options.hasEmail !== undefined) params.append('hasEmail', options.hasEmail.toString());
    if (options.activityStart) params.append('activityStart', options.activityStart);
    if (options.activityEnd) params.append('activityEnd', options.activityEnd);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sortBy) params.append('sortBy', options.sortBy);
    if (options.sortOrder) params.append('sortOrder', options.sortOrder);

    const response = await apiClient.get(`/organizations/${organizationId}/customers/search?${params.toString()}`);
    return {
      customers: response.data,
      pagination: response.pagination
    };
  }

  /**
   * Get detailed customer profile
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile> {
    const response = await apiClient.get(`/customers/${customerId}/profile`);
    return response.data;
  }

  /**
   * Update customer activity
   */
  async updateCustomerActivity(customerId: string, source: CustomerSource, activityData?: Record<string, any>): Promise<void> {
    await apiClient.put(`/customers/${customerId}/activity`, { source, activityData });
  }

  /**
   * Get customer statistics for organization
   */
  async getCustomerStats(organizationId: string): Promise<CustomerStats> {
    const response = await apiClient.get(`/organizations/${organizationId}/customers/stats`);
    return response.data;
  }

  /**
   * Get customer companies for filtering
   */
  async getCustomerCompanies(organizationId: string): Promise<CustomerCompany[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/customers/companies`);
    return response.data;
  }

  /**
   * Merge customers (deduplication)
   */
  async mergeCustomers(sourceCustomerId: string, targetCustomerId: string): Promise<void> {
    await apiClient.post('/customers/merge', {
      sourceCustomerId,
      targetCustomerId
    });
  }

  /**
   * Bulk import customers
   */
  async bulkImportCustomers(organizationId: string, customers: any[], source: CustomerSource = CustomerSource.CSV_IMPORT): Promise<BulkImportResult> {
    const response = await apiClient.post(`/organizations/${organizationId}/customers/bulk-import`, {
      customers,
      source
    });
    return response.data;
  }

  /**
   * Get customers for a specific company
   */
  async getCustomersByCompany(organizationId: string, companyName: string, options?: { limit?: number; offset?: number }): Promise<CustomerSearchResult> {
    return this.searchCustomers(organizationId, {
      companies: [companyName],
      limit: options?.limit,
      offset: options?.offset,
      sortBy: 'lastActivity',
      sortOrder: 'DESC'
    });
  }

  /**
   * Get recent customer activity
   */
  async getRecentCustomerActivity(organizationId: string, days: number = 30): Promise<CustomerProfile[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const result = await this.searchCustomers(organizationId, {
      activityStart: startDate.toISOString(),
      activityEnd: endDate.toISOString(),
      sortBy: 'lastActivity',
      sortOrder: 'DESC',
      limit: 50
    });

    return result.customers;
  }

  /**
   * Search customers by source
   */
  async getCustomersBySource(organizationId: string, sources: CustomerSource[], options?: CustomerSearchOptions): Promise<CustomerSearchResult> {
    return this.searchCustomers(organizationId, {
      ...options,
      sources,
      sortBy: options?.sortBy || 'lastActivity',
      sortOrder: options?.sortOrder || 'DESC'
    });
  }
}

export const customerProfileApi = new CustomerProfileApi();