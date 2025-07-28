/**
 * Integrations API Service
 * Frontend service for integration-related API operations
 */

import { apiClient, ApiResponse } from './apiClient';

export interface OAuthConnection {
  id: string;
  organizationId: string;
  integrationType: string;
  connectionName: string;
  isActive: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    subdomain?: string; // For Zendesk
    workspace?: string; // For Slack
    [key: string]: any;
  };
  healthStatus?: {
    status: 'healthy' | 'warning' | 'error';
    lastChecked: string;
    message?: string;
  };
}

export interface IntegrationType {
  type: string;
  name: string;
  description: string;
  icon: string;
  authType: 'oauth2' | 'api_token' | 'webhook';
  capabilities: string[];
  isAvailable: boolean;
  requiresConfig?: boolean;
  configFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'boolean';
    required: boolean;
    options?: string[];
  }>;
}

export interface IntegrationHealthStatus {
  integrationId: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastChecked: string;
  message?: string;
  responseTime?: number;
  details?: {
    authentication: 'valid' | 'invalid' | 'expired';
    connectivity: 'connected' | 'disconnected';
    permissions: 'sufficient' | 'insufficient';
    [key: string]: any;
  };
}

export interface IntegrationSyncConfig {
  integrationId: string;
  isEnabled: boolean;
  syncRules: Array<{
    id: string;
    name: string;
    conditions: any;
    actions: any;
    isActive: boolean;
  }>;
  lastSyncAt?: string;
  nextSyncAt?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
}

export interface IntegrationStats {
  integrationId: string;
  totalItems: number;
  itemsLastWeek: number;
  itemsLastMonth: number;
  errorRate: number;
  avgResponseTime: number;
  lastSyncDuration?: number;
}

export class IntegrationsApiService {
  /**
   * Get available integration types
   */
  async getAvailableIntegrationTypes(): Promise<ApiResponse<IntegrationType[]>> {
    return apiClient.get('/oauth/integration-types');
  }

  /**
   * Get all OAuth connections for organization
   */
  async getOAuthConnections(organizationId: string): Promise<ApiResponse<OAuthConnection[]>> {
    return apiClient.get(`/organizations/${organizationId}/oauth/connections`);
  }

  /**
   * Get specific OAuth connection
   */
  async getOAuthConnection(organizationId: string, connectionId: string): Promise<ApiResponse<OAuthConnection>> {
    return apiClient.get(`/organizations/${organizationId}/oauth/connections/${connectionId}`);
  }

  /**
   * Start OAuth authorization flow
   */
  async getOAuthAuthorizationUrl(organizationId: string, integrationType: string, config?: any): Promise<ApiResponse<{ authorizationUrl: string }>> {
    return apiClient.post(`/organizations/${organizationId}/oauth/authorize`, {
      integrationType,
      config
    });
  }

  /**
   * Update OAuth connection
   */
  async updateOAuthConnection(organizationId: string, connectionId: string, data: Partial<OAuthConnection>): Promise<ApiResponse<OAuthConnection>> {
    return apiClient.put(`/organizations/${organizationId}/oauth/connections/${connectionId}`, data);
  }

  /**
   * Delete OAuth connection
   */
  async deleteOAuthConnection(organizationId: string, connectionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/organizations/${organizationId}/oauth/connections/${connectionId}`);
  }

  /**
   * Test OAuth connection
   */
  async testOAuthConnection(organizationId: string, connectionId: string): Promise<ApiResponse<{ status: string; message: string }>> {
    return apiClient.post(`/organizations/${organizationId}/oauth/connections/${connectionId}/test`);
  }

  /**
   * Refresh OAuth token
   */
  async refreshOAuthToken(organizationId: string, connectionId: string): Promise<ApiResponse<OAuthConnection>> {
    return apiClient.post(`/organizations/${organizationId}/oauth/connections/${connectionId}/refresh`);
  }

  /**
   * Get integration health status
   */
  async getIntegrationHealth(integrationId: string): Promise<ApiResponse<IntegrationHealthStatus>> {
    return apiClient.get(`/health/${integrationId}`);
  }

  /**
   * Get health summary for organization
   */
  async getHealthSummary(organizationId: string): Promise<ApiResponse<{ 
    totalIntegrations: number;
    healthyCount: number;
    warningCount: number;
    errorCount: number;
    integrations: IntegrationHealthStatus[];
  }>> {
    return apiClient.get('/health/summary', { organizationId });
  }

  /**
   * Force refresh health check
   */
  async refreshHealthCheck(integrationId: string): Promise<ApiResponse<IntegrationHealthStatus>> {
    return apiClient.post(`/health/${integrationId}/refresh`);
  }

  /**
   * Get integration sync configuration
   */
  async getSyncConfig(integrationId: string): Promise<ApiResponse<IntegrationSyncConfig>> {
    return apiClient.get(`/integrations/${integrationId}/config`);
  }

  /**
   * Update integration sync configuration
   */
  async updateSyncConfig(integrationId: string, config: Partial<IntegrationSyncConfig>): Promise<ApiResponse<IntegrationSyncConfig>> {
    return apiClient.put(`/integrations/${integrationId}/config`, config);
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(integrationId: string): Promise<ApiResponse<{ syncId: string; status: string }>> {
    return apiClient.post(`/integrations/${integrationId}/sync`);
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(integrationId: string): Promise<ApiResponse<IntegrationStats>> {
    return apiClient.get(`/integrations/${integrationId}/stats`);
  }

  /**
   * Create sync rule
   */
  async createSyncRule(integrationId: string, rule: { name: string; conditions: any; actions: any }): Promise<ApiResponse<any>> {
    return apiClient.post(`/integrations/${integrationId}/rules`, rule);
  }

  /**
   * Delete sync rule
   */
  async deleteSyncRule(integrationId: string, ruleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/integrations/${integrationId}/rules/${ruleId}`);
  }

  /**
   * Test sync rule
   */
  async testSyncRule(integrationId: string, rule: any): Promise<ApiResponse<{ success: boolean; results: any[] }>> {
    return apiClient.post(`/integrations/${integrationId}/test-rule`, rule);
  }
}

// Export singleton instance
export const integrationsApi = new IntegrationsApiService();