/**
 * OAuth API Client
 * Handles OAuth integration management API calls
 */

import { apiClient } from './apiClient';

export enum IntegrationType {
  SLACK = 'SLACK',
  ZENDESK = 'ZENDESK',
  INTERCOM = 'INTERCOM'
}

export interface IntegrationTypeInfo {
  type: IntegrationType;
  name: string;
  capabilities: string[];
  requiresConfig: boolean;
  configFields: string[];
}

export interface OAuthConnection {
  id: string;
  organizationId: string;
  name: string;
  type: IntegrationType;
  status: 'active' | 'inactive';
  config?: Record<string, any>;
  metadata?: {
    userInfo?: any;
    accountInfo?: any;
    capabilities?: string[];
    lastHealthCheck?: string;
    errorCount?: number;
    lastError?: string;
  };
  healthStatus: 'healthy' | 'warning' | 'error';
  lastHealthCheck: string;
  createdAt: string;
  updatedAt: string;
  hasCredentials: boolean;
  credentialType?: string;
  hasRefreshToken?: boolean;
  tokenExpiry?: string;
}

export interface AuthorizationUrlRequest {
  integrationType: IntegrationType;
  config?: Record<string, any>;
}

export interface AuthorizationUrlResponse {
  authorizationUrl: string;
  state: string;
  integrationType: IntegrationType;
}

export interface UpdateConnectionRequest {
  name?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface ConnectionHealthResult {
  healthy: boolean;
  error?: string;
}

export interface TokenRefreshResult {
  tokenType: string;
  expiresAt?: string;
  scope?: string;
}

export class OAuthApi {
  /**
   * Get available integration types
   */
  async getIntegrationTypes(): Promise<IntegrationTypeInfo[]> {
    const response = await apiClient.get('/oauth/integration-types');
    return response.data;
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthorizationUrl(organizationId: string, request: AuthorizationUrlRequest): Promise<AuthorizationUrlResponse> {
    const response = await apiClient.post(`/organizations/${organizationId}/oauth/authorize`, request);
    return response.data;
  }

  /**
   * Get all OAuth connections for organization
   */
  async getConnections(organizationId: string): Promise<OAuthConnection[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/oauth/connections`);
    return response.data;
  }

  /**
   * Get specific OAuth connection
   */
  async getConnection(organizationId: string, connectionId: string): Promise<OAuthConnection> {
    const response = await apiClient.get(`/organizations/${organizationId}/oauth/connections/${connectionId}`);
    return response.data;
  }

  /**
   * Update OAuth connection
   */
  async updateConnection(organizationId: string, connectionId: string, request: UpdateConnectionRequest): Promise<OAuthConnection> {
    const response = await apiClient.put(`/organizations/${organizationId}/oauth/connections/${connectionId}`, request);
    return response.data;
  }

  /**
   * Delete OAuth connection
   */
  async deleteConnection(organizationId: string, connectionId: string): Promise<void> {
    await apiClient.delete(`/organizations/${organizationId}/oauth/connections/${connectionId}`);
  }

  /**
   * Test OAuth connection health
   */
  async testConnection(organizationId: string, connectionId: string): Promise<ConnectionHealthResult> {
    const response = await apiClient.post(`/organizations/${organizationId}/oauth/connections/${connectionId}/test`);
    return response.data;
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(organizationId: string, connectionId: string): Promise<TokenRefreshResult> {
    const response = await apiClient.post(`/organizations/${organizationId}/oauth/connections/${connectionId}/refresh`);
    return response.data;
  }

  /**
   * Start OAuth flow by opening authorization URL
   */
  async startOAuthFlow(organizationId: string, integrationType: IntegrationType, config?: Record<string, any>): Promise<void> {
    const { authorizationUrl } = await this.getAuthorizationUrl(organizationId, {
      integrationType,
      config
    });

    // Open authorization URL in new window/tab
    window.open(authorizationUrl, '_blank');
  }

  /**
   * Get connection status summary
   */
  async getConnectionsSummary(organizationId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    healthy: number;
    withErrors: number;
    byType: Record<IntegrationType, number>;
  }> {
    const connections = await this.getConnections(organizationId);

    const summary = {
      total: connections.length,
      active: connections.filter(c => c.status === 'active').length,
      inactive: connections.filter(c => c.status === 'inactive').length,
      healthy: connections.filter(c => c.healthStatus === 'healthy').length,
      withErrors: connections.filter(c => c.healthStatus === 'error').length,
      byType: {} as Record<IntegrationType, number>
    };

    // Count by type
    Object.values(IntegrationType).forEach(type => {
      summary.byType[type] = connections.filter(c => c.type === type).length;
    });

    return summary;
  }

  /**
   * Bulk test all connections health
   */
  async testAllConnections(organizationId: string): Promise<Record<string, ConnectionHealthResult>> {
    const connections = await this.getConnections(organizationId);
    const results: Record<string, ConnectionHealthResult> = {};

    // Test connections in parallel
    await Promise.all(
      connections.map(async (connection) => {
        try {
          results[connection.id] = await this.testConnection(organizationId, connection.id);
        } catch (error) {
          results[connection.id] = {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return results;
  }

  /**
   * Get connections by type
   */
  async getConnectionsByType(organizationId: string, integrationType: IntegrationType): Promise<OAuthConnection[]> {
    const connections = await this.getConnections(organizationId);
    return connections.filter(connection => connection.type === integrationType);
  }

  /**
   * Get active connections only
   */
  async getActiveConnections(organizationId: string): Promise<OAuthConnection[]> {
    const connections = await this.getConnections(organizationId);
    return connections.filter(connection => connection.status === 'active');
  }

  /**
   * Enable/disable connection
   */
  async toggleConnection(organizationId: string, connectionId: string, isActive: boolean): Promise<OAuthConnection> {
    return this.updateConnection(organizationId, connectionId, { isActive });
  }

  /**
   * Rename connection
   */
  async renameConnection(organizationId: string, connectionId: string, name: string): Promise<OAuthConnection> {
    return this.updateConnection(organizationId, connectionId, { name });
  }

  /**
   * Get integration type display info
   */
  getIntegrationDisplayInfo(type: IntegrationType): {
    name: string;
    description: string;
    icon: string;
    color: string;
  } {
    const displayInfo = {
      [IntegrationType.SLACK]: {
        name: 'Slack',
        description: 'Send notifications and create feedback from Slack messages',
        icon: '💬',
        color: '#4A154B'
      },
      [IntegrationType.ZENDESK]: {
        name: 'Zendesk',
        description: 'Sync feedback with support tickets and track resolutions',
        icon: '🎫',
        color: '#03363D'
      },
      [IntegrationType.INTERCOM]: {
        name: 'Intercom',
        description: 'Connect with customer conversations and support interactions',
        icon: '💻',
        color: '#338DF1'
      }
    };

    return displayInfo[type] || {
      name: type,
      description: 'Integration description',
      icon: '🔗',
      color: '#6B7280'
    };
  }
}

export const oauthApi = new OAuthApi();