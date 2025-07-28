/**
 * Intercom OAuth Provider
 * Implements Intercom-specific OAuth2 flow and API integration
 */

import { OAuth2Provider, OAuth2Config, OAuth2Credentials } from '../oauthProvider';
import axios from 'axios';

export interface IntercomUserInfo {
  type: string;
  id: string;
  name: string;
  email: string;
  avatar?: {
    image_url: string;
  };
  app?: {
    id_code: string;
    name: string;
    type: string;
  };
}

export interface IntercomApp {
  id_code: string;
  name: string;
  type: string;
  created_at: number;
  monthly_active_users: number;
}

export class IntercomOAuth2Provider extends OAuth2Provider {
  private static readonly AUTH_URL = 'https://app.intercom.com/oauth';
  private static readonly TOKEN_URL = 'https://api.intercom.io/auth/eagle/token';
  private static readonly API_BASE_URL = 'https://api.intercom.io';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    const config: OAuth2Config = {
      clientId,
      clientSecret,
      redirectUri,
      authUrl: IntercomOAuth2Provider.AUTH_URL,
      tokenUrl: IntercomOAuth2Provider.TOKEN_URL,
      scopes: [
        'read_admins',
        'write_admins',
        'read_conversations',
        'write_conversations',
        'read_contacts',
        'write_contacts',
        'read_companies',
        'write_companies'
      ]
    };

    super(config);
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
      throw new Error(`Failed to exchange Intercom authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token (Intercom tokens don't typically expire)
   */
  async refreshAccessToken(credentials: OAuth2Credentials): Promise<OAuth2Credentials> {
    // Intercom tokens typically don't expire, but we validate the token
    const isValid = await this.validateToken(credentials);
    
    if (!isValid) {
      throw new Error('Intercom token is invalid and cannot be refreshed');
    }

    return credentials;
  }

  /**
   * Extract Intercom-specific metadata
   */
  protected extractMetadata(response: any): Record<string, any> {
    return {
      tokenType: response.token_type,
      scope: response.scope
    };
  }

  /**
   * Validate Intercom token by testing API access
   */
  async validateToken(credentials: OAuth2Credentials): Promise<boolean> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${IntercomOAuth2Provider.API_BASE_URL}/me`, { headers });
      
      return response.status === 200 && response.data.type === 'admin';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current admin information from Intercom
   */
  async getUserInfo(credentials: OAuth2Credentials): Promise<IntercomUserInfo | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${IntercomOAuth2Provider.API_BASE_URL}/me`, { headers });
      
      if (response.status !== 200 || response.data.type !== 'admin') {
        throw new Error('Failed to get admin info from Intercom');
      }

      return response.data as IntercomUserInfo;
    } catch (error) {
      console.error('Failed to get Intercom admin info:', error);
      return null;
    }
  }

  /**
   * Get app information
   */
  async getAppInfo(credentials: OAuth2Credentials): Promise<IntercomApp | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${IntercomOAuth2Provider.API_BASE_URL}/me`, { headers });
      
      if (response.status !== 200 || !response.data.app) {
        throw new Error('Failed to get app info from Intercom');
      }

      return response.data.app as IntercomApp;
    } catch (error) {
      console.error('Failed to get Intercom app info:', error);
      return null;
    }
  }

  /**
   * Create or update a contact in Intercom
   */
  async createOrUpdateContact(credentials: OAuth2Credentials, contact: {
    email?: string;
    phone?: string;
    user_id?: string;
    name?: string;
    avatar?: string;
    signed_up_at?: number;
    last_seen_at?: number;
    custom_attributes?: Record<string, any>;
  }): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10'
      };

      const response = await axios.post(`${IntercomOAuth2Provider.API_BASE_URL}/contacts`, contact, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create/update Intercom contact:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(credentials: OAuth2Credentials, contactId: string): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Intercom-Version': '2.10'
      };

      const response = await axios.get(`${IntercomOAuth2Provider.API_BASE_URL}/contacts/${contactId}`, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get Intercom contact:', error);
      throw error;
    }
  }

  /**
   * Search contacts
   */
  async searchContacts(credentials: OAuth2Credentials, query: {
    field: string;
    operator: string;
    value: string;
  }): Promise<any[]> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10'
      };

      const payload = {
        query: {
          field: query.field,
          operator: query.operator,
          value: query.value
        }
      };

      const response = await axios.post(`${IntercomOAuth2Provider.API_BASE_URL}/contacts/search`, payload, { headers });
      
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to search Intercom contacts:', error);
      return [];
    }
  }

  /**
   * Create a conversation in Intercom
   */
  async createConversation(credentials: OAuth2Credentials, conversation: {
    from: {
      type: 'admin' | 'user';
      id: string;
    };
    body: string;
    message_type?: 'email' | 'inapp' | 'facebook' | 'twitter';
    subject?: string;
  }): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10'
      };

      const response = await axios.post(`${IntercomOAuth2Provider.API_BASE_URL}/conversations`, conversation, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create Intercom conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversations
   */
  async getConversations(credentials: OAuth2Credentials, options?: {
    type?: 'admin' | 'user';
    admin_id?: string;
    intercom_user_id?: string;
    per_page?: number;
    page?: number;
  }): Promise<any[]> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Intercom-Version': '2.10'
      };

      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.admin_id) params.append('admin_id', options.admin_id);
      if (options?.intercom_user_id) params.append('intercom_user_id', options.intercom_user_id);
      if (options?.per_page) params.append('per_page', options.per_page.toString());
      if (options?.page) params.append('page', options.page.toString());

      const url = `${IntercomOAuth2Provider.API_BASE_URL}/conversations${params.toString() ? '?' + params : ''}`;
      const response = await axios.get(url, { headers });
      
      return response.data.conversations || [];
    } catch (error) {
      console.error('Failed to get Intercom conversations:', error);
      return [];
    }
  }

  /**
   * Reply to a conversation
   */
  async replyToConversation(credentials: OAuth2Credentials, conversationId: string, reply: {
    message_type: 'comment' | 'note';
    type: 'admin';
    admin_id: string;
    body: string;
  }): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10'
      };

      const response = await axios.post(
        `${IntercomOAuth2Provider.API_BASE_URL}/conversations/${conversationId}/reply`,
        reply,
        { headers }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to reply to Intercom conversation:', error);
      throw error;
    }
  }

  /**
   * Tag a conversation
   */
  async tagConversation(credentials: OAuth2Credentials, conversationId: string, tagId: string, adminId: string): Promise<any> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json',
        'Intercom-Version': '2.10'
      };

      const payload = {
        id: tagId,
        admin_id: adminId
      };

      const response = await axios.post(
        `${IntercomOAuth2Provider.API_BASE_URL}/conversations/${conversationId}/tags`,
        payload,
        { headers }
      );
      
      return response.data;
    } catch (error) {
      console.error('Failed to tag Intercom conversation:', error);
      throw error;
    }
  }
}