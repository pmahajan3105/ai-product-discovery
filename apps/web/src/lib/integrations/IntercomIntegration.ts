import { 
  BaseIntegration, 
  IntegrationType, 
  IntegrationAction, 
  IntegrationResult, 
  IntegrationConfig,
  AuthType,
  IntercomCredentials,
  IntercomSettings 
} from '../../types/integration';

export class IntercomIntegration extends BaseIntegration {
  key = IntegrationType.INTERCOM;
  name = 'Intercom';
  authType = AuthType.OAUTH2;

  private readonly CLIENT_ID = process.env.NEXT_PUBLIC_INTERCOM_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.INTERCOM_CLIENT_SECRET;
  private readonly SCOPES = ['read_conversations', 'write_conversations', 'read_contacts', 'write_contacts'];

  async performAction(action: IntegrationAction, input: any): Promise<IntegrationResult> {
    try {
      switch (action) {
        case IntegrationAction.VALIDATE:
          return await this.validateCredentials(input.credentials);
        
        case IntegrationAction.CREATE:
          return await this.createIntegration(input);
        
        case IntegrationAction.TEST_CONNECTION:
          return await this.testConnection(input);
        
        case IntegrationAction.ENABLE:
          return await this.enableIntegration(input);
        
        case IntegrationAction.DISABLE:
          return await this.disableIntegration(input);
        
        case IntegrationAction.DELETE:
          return await this.deleteIntegration(input);
        
        default:
          return {
            isSuccess: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error: any) {
      return {
        isSuccess: false,
        error: error.message || 'Unknown error occurred',
        errorCode: error.code
      };
    }
  }

  async validateCredentials(credentials: IntercomCredentials): Promise<IntegrationResult> {
    try {
      const { accessToken, appId } = credentials;

      if (!accessToken || !appId) {
        return {
          isSuccess: false,
          error: 'Missing required credentials: access token and app ID are required',
          errorCode: 'MISSING_CREDENTIALS'
        };
      }

      // Test API call to validate credentials
      const response = await this.makeIntercomRequest(credentials, '/me');

      if (!response.isSuccess) {
        return response;
      }

      return {
        isSuccess: true,
        data: {
          app: response.data,
          appId,
          isValid: true
        }
      };
    } catch (error: any) {
      return {
        isSuccess: false,
        error: 'Failed to validate Intercom credentials',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  async testConnection(config: IntegrationConfig): Promise<IntegrationResult> {
    const credentials = config.credentials as IntercomCredentials;
    if (!credentials) {
      return {
        isSuccess: false,
        error: 'No credentials found',
        errorCode: 'MISSING_CREDENTIALS'
      };
    }

    return await this.validateCredentials(credentials);
  }

  private async createIntegration(input: any): Promise<IntegrationResult> {
    const { workspaceId, credentials, settings } = input;

    // Validate credentials first
    const validation = await this.validateCredentials(credentials);
    if (!validation.isSuccess) {
      return validation;
    }

    // Get teams for assignment options
    const teams = await this.getTeams(credentials);

    return {
      isSuccess: true,
      data: {
        workspaceId,
        type: this.key,
        credentials,
        settings: {
          defaultTags: ['feedback-hub'],
          syncToConversations: true,
          assignToTeam: '',
          ...settings
        },
        teams: teams.isSuccess ? teams.data : []
      }
    };
  }

  private async enableIntegration(input: any): Promise<IntegrationResult> {
    return {
      isSuccess: true,
      data: { enabled: true }
    };
  }

  private async disableIntegration(input: any): Promise<IntegrationResult> {
    return {
      isSuccess: true,
      data: { enabled: false }
    };
  }

  private async deleteIntegration(input: any): Promise<IntegrationResult> {
    return {
      isSuccess: true,
      data: { deleted: true }
    };
  }

  private async makeIntercomRequest(
    credentials: IntercomCredentials, 
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<IntegrationResult> {
    try {
      const { accessToken, region = 'us' } = credentials;
      const baseUrl = region === 'eu' ? 'https://api.eu.intercom.io' : 'https://api.intercom.io';
      const url = `${baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Intercom-Version': '2.10',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          isSuccess: false,
          error: errorData.message || `Intercom API error: ${response.status} ${response.statusText}`,
          errorCode: errorData.code || response.status.toString()
        };
      }

      const data = await response.json();
      return {
        isSuccess: true,
        data
      };
    } catch (error: any) {
      return {
        isSuccess: false,
        error: `Network error: ${error.message}`,
        errorCode: 'NETWORK_ERROR'
      };
    }
  }

  async getTeams(credentials: IntercomCredentials): Promise<IntegrationResult> {
    return await this.makeIntercomRequest(credentials, '/teams');
  }

  async createConversation(
    credentials: IntercomCredentials,
    conversation: {
      fromEmail: string;
      body: string;
      subject?: string;
      tags?: string[];
      assigneeId?: string;
    }
  ): Promise<IntegrationResult> {
    const conversationData = {
      from: {
        type: 'user',
        email: conversation.fromEmail
      },
      body: conversation.body,
      ...(conversation.subject && { subject: conversation.subject }),
      ...(conversation.tags && { tags: conversation.tags }),
      ...(conversation.assigneeId && { 
        assignee: {
          type: 'admin',
          id: conversation.assigneeId
        }
      })
    };

    return await this.makeIntercomRequest(
      credentials,
      '/conversations',
      {
        method: 'POST',
        body: JSON.stringify(conversationData)
      }
    );
  }

  async replyToConversation(
    credentials: IntercomCredentials,
    conversationId: string,
    message: {
      body: string;
      type?: 'comment' | 'note';
      messageType?: 'inbound' | 'outbound';
    }
  ): Promise<IntegrationResult> {
    const replyData = {
      body: message.body,
      type: message.type || 'comment',
      message_type: message.messageType || 'outbound'
    };

    return await this.makeIntercomRequest(
      credentials,
      `/conversations/${conversationId}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(replyData)
      }
    );
  }

  async tagConversation(
    credentials: IntercomCredentials,
    conversationId: string,
    tags: string[]
  ): Promise<IntegrationResult> {
    const tagData = {
      tags: tags.map(tag => ({ name: tag }))
    };

    return await this.makeIntercomRequest(
      credentials,
      `/conversations/${conversationId}/tags`,
      {
        method: 'POST',
        body: JSON.stringify(tagData)
      }
    );
  }

  async searchConversations(
    credentials: IntercomCredentials,
    query: {
      field: string;
      operator: string;
      value: string;
    }[]
  ): Promise<IntegrationResult> {
    const searchData = {
      query: {
        operator: 'AND',
        operands: query
      }
    };

    return await this.makeIntercomRequest(
      credentials,
      '/conversations/search',
      {
        method: 'POST',
        body: JSON.stringify(searchData)
      }
    );
  }

  getOAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code'
    });

    return `https://app.intercom.com/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<IntegrationResult> {
    try {
      const response = await fetch('https://api.intercom.io/auth/eagle/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          isSuccess: false,
          error: data.error_description || 'OAuth exchange failed'
        };
      }

      return {
        isSuccess: true,
        data: {
          accessToken: data.token,
          appId: data.app_id,
          region: data.region || 'us'
        }
      };
    } catch (error) {
      return {
        isSuccess: false,
        error: 'Failed to exchange OAuth code'
      };
    }
  }
}