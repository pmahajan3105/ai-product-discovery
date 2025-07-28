/**
 * Integration Health API Client
 * Client for calling integration health monitoring endpoints
 */

import { APIClient } from './apiClient';
import { IntegrationHealth } from '../components/Integrations/IntegrationHealthStatus';

export interface HealthSummary {
  overview: {
    totalIntegrations: number;
    activeIntegrations: number;
    healthyIntegrations: number;
    issuesCount: number;
  };
  recentActivity: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    overallSuccessRate: number;
  };
  alerts: {
    tokenExpirations: number;
    criticalErrors: number;
    rateLimited: number;
  };
  integrationTypes: Record<string, {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    successRate: number;
  }>;
}

export interface OrganizationHealth {
  summary: HealthSummary;
  integrations: IntegrationHealth[];
}

export interface HealthHistoryPoint {
  date: string;
  successRate: number;
  errorRate: number;
  avgResponseTime: number;
  totalEvents: number;
  status: string;
}

export interface HealthHistory {
  current: IntegrationHealth;
  history: HealthHistoryPoint[];
  trends: {
    successRateTrend: 'up' | 'down' | 'stable';
    errorRateTrend: 'up' | 'down' | 'stable';
    responseTimeTrend: 'up' | 'down' | 'stable';
  };
}

export class IntegrationHealthAPI extends APIClient {
  /**
   * Get health summary for dashboard
   */
  async getHealthSummary(): Promise<HealthSummary> {
    const response = await this.get('/health/summary');
    return response.data;
  }

  /**
   * Get health status for all integrations in organization
   */
  async getOrganizationHealth(): Promise<OrganizationHealth> {
    const response = await this.get('/health/organization');
    return response.data;
  }

  /**
   * Get health status for a specific integration
   */
  async getIntegrationHealth(integrationId: string): Promise<IntegrationHealth> {
    const response = await this.get(`/health/${integrationId}`);
    return response.data;
  }

  /**
   * Force refresh health check for an integration
   */
  async refreshIntegrationHealth(integrationId: string): Promise<IntegrationHealth> {
    const response = await this.post(`/health/${integrationId}/refresh`);
    return response.data;
  }

  /**
   * Get integration health history and trends
   */
  async getHealthHistory(integrationId: string, days: number = 7): Promise<HealthHistory> {
    const response = await this.get(`/health/${integrationId}/history?days=${days}`);
    return response.data;
  }
}

// Export singleton instance
export const integrationHealthAPI = new IntegrationHealthAPI();