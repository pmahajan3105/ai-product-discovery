/**
 * Slack OAuth Provider
 * Implements Slack-specific OAuth2 flow and API integration
 */

import { OAuth2Provider, OAuth2Config, OAuth2Credentials } from '../oauthProvider';
import axios from 'axios';

export interface SlackTeamInfo {
  id: string;
  name: string;
  domain: string;
  image_68?: string;
}

export interface SlackUserInfo {
  id: string;
  name: string;
  email?: string;
  image_48?: string;
  is_admin: boolean;
  is_owner: boolean;
}

export interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: SlackTeamInfo;
  authed_user?: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
}

export class SlackOAuth2Provider extends OAuth2Provider {
  private static readonly AUTH_URL = 'https://slack.com/oauth/v2/authorize';
  private static readonly TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
  private static readonly API_BASE_URL = 'https://slack.com/api';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    const config: OAuth2Config = {
      clientId,
      clientSecret,
      redirectUri,
      authUrl: SlackOAuth2Provider.AUTH_URL,
      tokenUrl: SlackOAuth2Provider.TOKEN_URL,
      scopes: [
        'channels:read',
        'chat:write',
        'commands',
        'users:read',
        'users:read.email',
        'team:read',
        'incoming-webhook'
      ]
    };

    super(config);
  }

  /**
   * Get Slack-specific authorization URL with user scopes
   */
  getAuthorizationUrl(state: string): string {
    const userScopes = ['identity.basic', 'identity.email', 'identity.team'];
    
    return super.getAuthorizationUrl(state, {
      user_scope: userScopes.join(',')
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(authCode: string): Promise<OAuth2Credentials> {
    const payload = this.buildAuthConfig(authCode);
    const headers = this.getRequestHeaders();

    try {
      const response = await axios.post(this.config.tokenUrl, new URLSearchParams(payload), { headers });
      
      if (!response.data.ok) {
        throw new Error(`Slack OAuth error: ${response.data.error}`);
      }

      return this.parseSlackTokenResponse(response.data);
    } catch (error) {
      throw new Error(`Failed to exchange Slack authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(credentials: OAuth2Credentials): Promise<OAuth2Credentials> {
    // Slack tokens typically don't expire, but we implement refresh for consistency
    // In practice, we'd validate the token and return the same credentials
    const isValid = await this.validateToken(credentials);
    
    if (!isValid) {
      throw new Error('Slack token is invalid and cannot be refreshed');
    }

    return credentials;
  }

  /**
   * Parse Slack-specific token response
   */
  private parseSlackTokenResponse(response: SlackTokenResponse): OAuth2Credentials {
    return {
      accessToken: response.access_token,
      tokenType: response.token_type || 'Bearer',
      scope: response.scope,
      metadata: {
        teamId: response.team.id,
        teamName: response.team.name,
        teamDomain: response.team.domain,
        teamImage: response.team.image_68,
        botUserId: response.bot_user_id,
        appId: response.app_id,
        authedUser: response.authed_user,
        incomingWebhook: response.incoming_webhook
      }
    };
  }

  /**
   * Extract Slack-specific metadata
   */
  protected extractMetadata(response: SlackTokenResponse): Record<string, any> {
    return {
      teamId: response.team?.id,
      teamName: response.team?.name,
      teamDomain: response.team?.domain,
      botUserId: response.bot_user_id,
      appId: response.app_id
    };
  }

  /**
   * Validate Slack token by testing API access
   */
  async validateToken(credentials: OAuth2Credentials): Promise<boolean> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${SlackOAuth2Provider.API_BASE_URL}/auth.test`, { headers });
      
      return response.data.ok === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user information from Slack
   */
  async getUserInfo(credentials: OAuth2Credentials): Promise<SlackUserInfo | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${SlackOAuth2Provider.API_BASE_URL}/users.identity`, { headers });
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const user = response.data.user;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image_48: user.image_48,
        is_admin: false, // Would need additional API call to determine
        is_owner: false
      };
    } catch (error) {
      console.error('Failed to get Slack user info:', error);
      return null;
    }
  }

  /**
   * Get team information
   */
  async getTeamInfo(credentials: OAuth2Credentials): Promise<SlackTeamInfo | null> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${SlackOAuth2Provider.API_BASE_URL}/team.info`, { headers });
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      const team = response.data.team;
      return {
        id: team.id,
        name: team.name,
        domain: team.domain,
        image_68: team.icon?.image_68
      };
    } catch (error) {
      console.error('Failed to get Slack team info:', error);
      return null;
    }
  }

  /**
   * Send message to Slack channel
   */
  async sendMessage(credentials: OAuth2Credentials, channel: string, text: string, attachments?: any[]): Promise<boolean> {
    try {
      const headers = {
        ...this.getAuthHeader(credentials),
        'Content-Type': 'application/json'
      };

      const payload = {
        channel,
        text,
        attachments
      };

      const response = await axios.post(`${SlackOAuth2Provider.API_BASE_URL}/chat.postMessage`, payload, { headers });
      
      return response.data.ok === true;
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      return false;
    }
  }

  /**
   * Get list of channels
   */
  async getChannels(credentials: OAuth2Credentials): Promise<any[]> {
    try {
      const headers = this.getAuthHeader(credentials);
      const response = await axios.get(`${SlackOAuth2Provider.API_BASE_URL}/conversations.list`, { 
        headers,
        params: { types: 'public_channel,private_channel' }
      });
      
      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error}`);
      }

      return response.data.channels || [];
    } catch (error) {
      console.error('Failed to get Slack channels:', error);
      return [];
    }
  }
}