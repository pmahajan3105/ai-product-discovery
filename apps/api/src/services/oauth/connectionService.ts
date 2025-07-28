/**
 * OAuth Connection Service
 * Manages OAuth connections and token lifecycle based on Zeda patterns
 */

import { db } from '../database';
import { Op } from 'sequelize';
import { OAuth2Credentials, OAuth2Provider } from './oauthProvider';
import { SlackOAuth2Provider } from './providers/slackProvider';
import { ZendeskOAuth2Provider } from './providers/zendeskProvider';
import { IntercomOAuth2Provider } from './providers/intercomProvider';
import crypto from 'crypto';

export enum IntegrationType {
  SLACK = 'SLACK',
  ZENDESK = 'ZENDESK',
  INTERCOM = 'INTERCOM'
}

export enum ConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  EXPIRED = 'EXPIRED'
}

export interface ConnectionMetadata {
  userInfo?: any;
  teamInfo?: any;
  accountInfo?: any;
  capabilities?: string[];
  lastHealthCheck?: string;
  errorCount?: number;
  lastError?: string;
}

export interface CreateConnectionData {
  organizationId: string;
  integrationType: IntegrationType;
  credentials: OAuth2Credentials;
  metadata?: ConnectionMetadata;
  name?: string;
  isActive?: boolean;
}

export interface UpdateConnectionData {
  credentials?: OAuth2Credentials;
  metadata?: ConnectionMetadata;
  name?: string;
  isActive?: boolean;
  status?: ConnectionStatus;
  lastHealthCheck?: Date;
}

export class OAuthConnectionService {
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(text: string): string {
    try {
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedText: string): string {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Create OAuth provider instance
   */
  private createProvider(integrationType: IntegrationType, config?: any): OAuth2Provider {
    const clientId = process.env[`${integrationType}_CLIENT_ID`];
    const clientSecret = process.env[`${integrationType}_CLIENT_SECRET`];
    const redirectUri = process.env[`${integrationType}_REDIRECT_URI`];

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(`Missing OAuth configuration for ${integrationType}`);
    }

    switch (integrationType) {
      case IntegrationType.SLACK:
        return new SlackOAuth2Provider(clientId, clientSecret, redirectUri);
      
      case IntegrationType.ZENDESK:
        if (!config?.subdomain) {
          throw new Error('Zendesk subdomain is required');
        }
        return new ZendeskOAuth2Provider(clientId, clientSecret, redirectUri, config.subdomain);
      
      case IntegrationType.INTERCOM:
        return new IntercomOAuth2Provider(clientId, clientSecret, redirectUri);
      
      default:
        throw new Error(`Unsupported integration type: ${integrationType}`);
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  async getAuthorizationUrl(
    integrationType: IntegrationType, 
    organizationId: string, 
    config?: any
  ): Promise<{ url: string; state: string }> {
    const provider = this.createProvider(integrationType, config);
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in database for validation
    await this.storeOAuthState(state, organizationId, integrationType, config);
    
    const url = provider.getAuthorizationUrl(state);
    
    return { url, state };
  }

  /**
   * Store OAuth state for CSRF protection
   */
  private async storeOAuthState(
    state: string, 
    organizationId: string, 
    integrationType: IntegrationType, 
    config?: any
  ): Promise<void> {
    // Store in a temporary table or cache - for simplicity, using integration metadata
    const stateData = {
      organizationId,
      integrationType,
      config,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    // In production, use Redis or a dedicated state table
    // For now, we'll skip persistent state storage
  }

  /**
   * Exchange authorization code for tokens and create connection
   */
  async createConnectionFromAuthCode(
    authCode: string,
    state: string,
    organizationId: string,
    integrationType: IntegrationType,
    config?: any
  ): Promise<any> {
    // In production, validate state parameter here
    
    const provider = this.createProvider(integrationType, config);
    
    try {
      // Exchange code for tokens
      const credentials = await this.exchangeCodeForTokens(provider, authCode);
      
      // Get user/account information
      const [userInfo, accountInfo] = await Promise.all([
        provider.getUserInfo(credentials).catch(() => null),
        this.getAccountInfo(provider, credentials).catch(() => null)
      ]);

      // Create connection in database
      const connectionData: CreateConnectionData = {
        organizationId,
        integrationType,
        credentials,
        metadata: {
          userInfo,
          accountInfo,
          capabilities: this.getCapabilities(integrationType),
          lastHealthCheck: new Date().toISOString()
        },
        name: this.generateConnectionName(integrationType, userInfo, accountInfo),
        isActive: true
      };

      return await this.createConnection(connectionData);
    } catch (error) {
      console.error('Failed to create connection from auth code:', error);
      throw new Error(`Failed to complete OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(provider: OAuth2Provider, authCode: string): Promise<OAuth2Credentials> {
    if (provider instanceof SlackOAuth2Provider) {
      return await provider.exchangeCodeForTokens(authCode);
    } else if (provider instanceof ZendeskOAuth2Provider) {
      return await provider.exchangeCodeForTokens(authCode);
    } else if (provider instanceof IntercomOAuth2Provider) {
      return await provider.exchangeCodeForTokens(authCode);
    }
    
    throw new Error('Unsupported provider type');
  }

  /**
   * Get account information from provider
   */
  private async getAccountInfo(provider: OAuth2Provider, credentials: OAuth2Credentials): Promise<any> {
    if (provider instanceof SlackOAuth2Provider) {
      return await provider.getTeamInfo(credentials);
    } else if (provider instanceof ZendeskOAuth2Provider) {
      return await provider.getAccountInfo(credentials);
    } else if (provider instanceof IntercomOAuth2Provider) {
      return await provider.getAppInfo(credentials);
    }
    
    return null;
  }

  /**
   * Get integration capabilities
   */
  private getCapabilities(integrationType: IntegrationType): string[] {
    const capabilities: Record<IntegrationType, string[]> = {
      [IntegrationType.SLACK]: ['send_messages', 'read_channels', 'webhook_notifications'],
      [IntegrationType.ZENDESK]: ['create_tickets', 'update_tickets', 'read_tickets', 'webhook_notifications'],
      [IntegrationType.INTERCOM]: ['create_conversations', 'read_conversations', 'update_contacts', 'webhook_notifications']
    };

    return capabilities[integrationType] || [];
  }

  /**
   * Generate friendly connection name
   */
  private generateConnectionName(integrationType: IntegrationType, userInfo?: any, accountInfo?: any): string {
    const baseName = integrationType.charAt(0) + integrationType.slice(1).toLowerCase();
    
    if (accountInfo?.name || accountInfo?.teamName) {
      return `${baseName} - ${accountInfo.name || accountInfo.teamName}`;
    }
    
    if (userInfo?.name) {
      return `${baseName} - ${userInfo.name}`;
    }
    
    return `${baseName} Connection`;
  }

  /**
   * Create new OAuth connection
   */
  async createConnection(data: CreateConnectionData): Promise<any> {
    // Encrypt credentials before storing
    const encryptedCredentials = this.encrypt(JSON.stringify(data.credentials));
    
    const integration = await db.models.Integration.create({
      organizationId: data.organizationId,
      name: data.name || `${data.integrationType} Integration`,
      type: data.integrationType,
      status: data.isActive ? 'active' : 'inactive',
      config: {
        authType: 'oauth2',
        capabilities: data.metadata?.capabilities || []
      },
      credentials: encryptedCredentials,
      metadata: {
        ...data.metadata,
        connectionCreatedAt: new Date().toISOString()
      },
      healthStatus: 'healthy',
      lastHealthCheck: new Date()
    });

    return integration;
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string, organizationId: string): Promise<any> {
    const integration = await db.models.Integration.findOne({
      where: {
        id: connectionId,
        organizationId,
        type: { [Op.in]: Object.values(IntegrationType) }
      }
    });

    if (!integration) {
      return null;
    }

    // Decrypt credentials
    try {
      const decryptedCredentials = JSON.parse(this.decrypt(integration.credentials));
      return {
        ...integration.toJSON(),
        credentials: decryptedCredentials
      };
    } catch (error) {
      console.error('Failed to decrypt connection credentials:', error);
      return {
        ...integration.toJSON(),
        credentials: null,
        hasDecryptionError: true
      };
    }
  }

  /**
   * Get all connections for organization
   */
  async getConnections(organizationId: string): Promise<any[]> {
    const integrations = await db.models.Integration.findAll({
      where: {
        organizationId,
        type: { [Op.in]: Object.values(IntegrationType) }
      },
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(integration => {
      try {
        const decryptedCredentials = JSON.parse(this.decrypt(integration.credentials));
        return {
          ...integration.toJSON(),
          credentials: decryptedCredentials
        };
      } catch (error) {
        return {
          ...integration.toJSON(),
          credentials: null,
          hasDecryptionError: true
        };
      }
    });
  }

  /**
   * Update connection
   */
  async updateConnection(connectionId: string, organizationId: string, data: UpdateConnectionData): Promise<any> {
    const updateData: any = {};

    if (data.credentials) {
      updateData.credentials = this.encrypt(JSON.stringify(data.credentials));
    }

    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.isActive !== undefined) {
      updateData.status = data.isActive ? 'active' : 'inactive';
    }

    if (data.lastHealthCheck) {
      updateData.lastHealthCheck = data.lastHealthCheck;
    }

    const [updatedCount] = await db.models.Integration.update(updateData, {
      where: {
        id: connectionId,
        organizationId
      }
    });

    if (updatedCount === 0) {
      throw new Error('Connection not found or not updated');
    }

    return await this.getConnection(connectionId, organizationId);
  }

  /**
   * Delete connection
   */
  async deleteConnection(connectionId: string, organizationId: string): Promise<void> {
    const deletedCount = await db.models.Integration.destroy({
      where: {
        id: connectionId,
        organizationId
      }
    });

    if (deletedCount === 0) {
      throw new Error('Connection not found');
    }
  }

  /**
   * Refresh OAuth token if needed
   */
  async refreshTokenIfNeeded(connectionId: string, organizationId: string): Promise<OAuth2Credentials> {
    const connection = await this.getConnection(connectionId, organizationId);
    
    if (!connection || !connection.credentials) {
      throw new Error('Connection not found or credentials unavailable');
    }

    const credentials = connection.credentials as OAuth2Credentials;
    
    // Check if token needs refresh
    if (!OAuth2Provider.isTokenExpired(credentials.expiresAt)) {
      return credentials;
    }

    // Create provider and refresh token
    const provider = this.createProvider(connection.type as IntegrationType, connection.config);
    
    try {
      let refreshedCredentials: OAuth2Credentials;
      
      if (provider instanceof ZendeskOAuth2Provider) {
        refreshedCredentials = await provider.refreshAccessToken(credentials);
      } else {
        // For Slack and Intercom, tokens typically don't expire
        refreshedCredentials = credentials;
      }

      // Update connection with new credentials
      await this.updateConnection(connectionId, organizationId, {
        credentials: refreshedCredentials,
        lastHealthCheck: new Date()
      });

      return refreshedCredentials;
    } catch (error) {
      // Mark connection as having error
      await this.updateConnection(connectionId, organizationId, {
        isActive: false,
        metadata: {
          ...connection.metadata,
          lastError: error instanceof Error ? error.message : 'Token refresh failed',
          errorCount: (connection.metadata?.errorCount || 0) + 1
        }
      });

      throw error;
    }
  }

  /**
   * Test connection health
   */
  async testConnection(connectionId: string, organizationId: string): Promise<{ healthy: boolean; error?: string }> {
    try {
      const connection = await this.getConnection(connectionId, organizationId);
      
      if (!connection || !connection.credentials) {
        return { healthy: false, error: 'Connection not found or credentials unavailable' };
      }

      const provider = this.createProvider(connection.type as IntegrationType, connection.config);
      const credentials = connection.credentials as OAuth2Credentials;

      const isValid = await provider.validateToken(credentials);
      
      if (isValid) {
        await this.updateConnection(connectionId, organizationId, {
          lastHealthCheck: new Date(),
          metadata: {
            ...connection.metadata,
            errorCount: 0,
            lastError: undefined
          }
        });

        return { healthy: true };
      } else {
        return { healthy: false, error: 'Token validation failed' };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const oauthConnectionService = new OAuthConnectionService();