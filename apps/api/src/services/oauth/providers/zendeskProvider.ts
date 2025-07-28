/**
 * Zendesk OAuth Provider
 * Implements Zendesk-specific OAuth2 flow and API integration
 */

import { OAuth2Provider, OAuth2Config, OAuth2Credentials } from '../oauthProvider';
import axios from 'axios';

export interface ZendeskUserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  photo?: {
    content_url: string;
  };
  organization_id?: number;
}

export interface ZendeskAccount {
  subdomain: string;
  plan_name: string;
}

export class ZendeskOAuth2Provider extends OAuth2Provider {
  private subdomain: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string, subdomain: string) {
    const config: OAuth2Config = {
      clientId,
      clientSecret,
      redirectUri,
      authUrl: `https://${subdomain}.zendesk.com/oauth/authorizations/new`,
      tokenUrl: `https://${subdomain}.zendesk.com/oauth/tokens`,
      scopes: ['read', 'write']
    };

    super(config);
    this.subdomain = subdomain;
  }

  /**
   * Get Zendesk API base URL
   */
  private getApiBaseUrl(): string {
    return `https://${this.subdomain}.zendesk.com/api/v2`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(authCode: string): Promise<OAuth2Credentials> {
    const payload = this.buildAuthConfig(authCode);
    const headers = this.getRequestHeaders();

    try {
      const response = await axios.post(this.config.tokenUrl, new URLSearchParams(payload), { headers });
      
      return this.parseTokenResponse(response.data);
    } catch (error) {
      throw new Error(`Failed to exchange Zendesk authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(credentials: OAuth2Credentials): Promise<OAuth2Credentials> {
    if (!credentials.refreshToken) {
      throw new Error('Refresh token is required for Zendesk token refresh');
    }

    const payload = this.buildRefreshConfig(credentials);
    const headers = this.getRequestHeaders();

    try {
      const response = await axios.post(this.config.tokenUrl, new URLSearchParams(payload), { headers });
      
      return this.parseTokenResponse(response.data);
    } catch (error) {
      throw new Error(`Failed to refresh Zendesk token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract Zendesk-specific metadata
   */
  protected extractMetadata(response: any): Record<string, any> {
    return {
      subdomain: this.subdomain,
      scope: response.scope
    };
  }

  /**
   * Validate Zendesk token by testing API access
   */
  async validateToken(credentials: OAuth2Credentials): Promise<boolean> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${this.getApiBaseUrl()}/users/me.json`, { headers });
      
      return response.status === 200 && response.data.user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user information from Zendesk
   */
  async getUserInfo(credentials: OAuth2Credentials): Promise<ZendeskUserInfo | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${this.getApiBaseUrl()}/users/me.json`, { headers });
      
      if (response.status !== 200 || !response.data.user) {
        throw new Error('Failed to get user info from Zendesk');
      }

      const user = response.data.user;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
        organization_id: user.organization_id
      };
    } catch (error) {
      console.error('Failed to get Zendesk user info:', error);
      return null;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo(credentials: OAuth2Credentials): Promise<ZendeskAccount | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${this.getApiBaseUrl()}/account/settings.json`, { headers });
      
      if (response.status !== 200 || !response.data.settings) {
        throw new Error('Failed to get account info from Zendesk');
      }

      const settings = response.data.settings;
      return {
        subdomain: this.subdomain,
        plan_name: settings.branding?.plan_name || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to get Zendesk account info:', error);
      return null;
    }
  }

  /**
   * Create a ticket in Zendesk
   */
  async createTicket(credentials: OAuth2Credentials, ticket: {
    subject: string;
    comment: { body: string };
    requester?: { name: string; email: string };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    type?: 'problem' | 'incident' | 'question' | 'task';
    tags?: string[];
  }): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json'
      };

      const payload = { ticket };

      const response = await axios.post(`${this.getApiBaseUrl()}/tickets.json`, payload, { headers });
      
      return response.data.ticket;
    } catch (error) {
      console.error('Failed to create Zendesk ticket:', error);
      throw error;
    }
  }

  /**
   * Get tickets from Zendesk
   */
  async getTickets(credentials: OAuth2Credentials, options?: {
    status?: string;
    priority?: string;
    per_page?: number;
    page?: number;
  }): Promise<any[]> {
    try {
      const headers = this.getAuthHeader(credentials);
      const params = new URLSearchParams();
      
      if (options?.status) params.append('status', options.status);
      if (options?.priority) params.append('priority', options.priority);
      if (options?.per_page) params.append('per_page', options.per_page.toString());
      if (options?.page) params.append('page', options.page.toString());

      const response = await axios.get(`${this.getApiBaseUrl()}/tickets.json?${params}`, { headers });
      
      return response.data.tickets || [];
    } catch (error) {
      console.error('Failed to get Zendesk tickets:', error);
      return [];
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(credentials: OAuth2Credentials, ticketId: number): Promise<any> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${this.getApiBaseUrl()}/tickets/${ticketId}.json`, { headers });
      
      return response.data.ticket;
    } catch (error) {
      console.error('Failed to get Zendesk ticket:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicket(credentials: OAuth2Credentials, ticketId: number, updates: {
    status?: 'new' | 'open' | 'pending' | 'hold' | 'solved' | 'closed';
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    comment?: { body: string; public?: boolean };
    tags?: string[];
  }): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json'
      };

      const payload = { ticket: updates };

      const response = await axios.put(`${this.getApiBaseUrl()}/tickets/${ticketId}.json`, payload, { headers });
      
      return response.data.ticket;
    } catch (error) {
      console.error('Failed to update Zendesk ticket:', error);
      throw error;
    }
  }

  /**
   * Search tickets
   */
  async searchTickets(credentials: OAuth2Credentials, query: string): Promise<any[]> {
    try {
      const headers = this.getAuthHeader(credentials);
      const encodedQuery = encodeURIComponent(query);
      const response = await axios.get(`${this.getApiBaseUrl()}/search.json?query=${encodedQuery}`, { headers });
      
      return response.data.results?.filter((result: any) => result.result_type === 'ticket') || [];
    } catch (error) {
      console.error('Failed to search Zendesk tickets:', error);
      return [];
    }
  }
}