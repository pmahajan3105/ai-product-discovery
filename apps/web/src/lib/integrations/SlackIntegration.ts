import { 
  BaseIntegration, 
  IntegrationType, 
  IntegrationAction, 
  IntegrationResult, 
  IntegrationConfig,
  AuthType,
  SlackCredentials,
  SlackSettings 
} from '../../types/integration';

export class SlackIntegration extends BaseIntegration {
  key = IntegrationType.SLACK;
  name = 'Slack';
  authType = AuthType.OAUTH2;

  private readonly CLIENT_ID = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
  private readonly SCOPES = [
    'channels:read',
    'chat:write',
    'groups:read',
    'im:read',
    'mpim:read',
    'team:read',
    'users:read'
  ];

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

  async validateCredentials(credentials: SlackCredentials): Promise<IntegrationResult> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.ok) {
        return {
          isSuccess: false,
          error: data.error || 'Invalid Slack credentials',
          errorCode: data.error
        };
      }

      return {
        isSuccess: true,
        data: {
          teamId: data.team_id,
          teamName: data.team,
          userId: data.user_id,
          user: data.user
        }
      };
    } catch (error: any) {
      return {
        isSuccess: false,
        error: 'Failed to validate Slack credentials',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  async testConnection(config: IntegrationConfig): Promise<IntegrationResult> {
    const credentials = config.credentials as SlackCredentials;
    if (!credentials?.accessToken) {
      return {
        isSuccess: false,
        error: 'No access token found',
        errorCode: 'MISSING_TOKEN'
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

    // Get channels list for settings
    const channels = await this.getChannels(credentials.accessToken);

    return {
      isSuccess: true,
      data: {
        workspaceId,
        type: this.key,
        credentials: {
          ...credentials,
          teamId: validation.data?.teamId,
          teamName: validation.data?.teamName,
          userId: validation.data?.userId
        },
        settings: {
          defaultChannel: '',
          notifyOnNewFeedback: true,
          notifyOnStatusChange: false,
          includeCustomerInfo: true,
          ...settings
        },
        channels: channels.isSuccess ? channels.data : []
      }
    };
  }

  private async enableIntegration(input: any): Promise<IntegrationResult> {
    // In a real implementation, this would update the database
    return {
      isSuccess: true,
      data: { enabled: true }
    };
  }

  private async disableIntegration(input: any): Promise<IntegrationResult> {
    // In a real implementation, this would update the database
    return {
      isSuccess: true,
      data: { enabled: false }
    };
  }

  private async deleteIntegration(input: any): Promise<IntegrationResult> {
    // In a real implementation, this would remove from database
    return {
      isSuccess: true,
      data: { deleted: true }
    };
  }

  async getChannels(accessToken: string): Promise<IntegrationResult> {
    try {
      const response = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.ok) {
        return {
          isSuccess: false,
          error: data.error || 'Failed to fetch channels'
        };
      }

      const channels = data.channels
        .filter((channel: any) => !channel.is_archived && channel.is_member)
        .map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          memberCount: channel.num_members
        }));

      return {
        isSuccess: true,
        data: channels
      };
    } catch (error) {
      return {
        isSuccess: false,
        error: 'Failed to fetch Slack channels'
      };
    }
  }

  async postMessage(accessToken: string, channel: string, message: string): Promise<IntegrationResult> {
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel,
          text: message,
          unfurl_links: false,
          unfurl_media: false
        })
      });

      const data = await response.json();

      if (!data.ok) {
        return {
          isSuccess: false,
          error: data.error || 'Failed to post message'
        };
      }

      return {
        isSuccess: true,
        data: {
          timestamp: data.ts,
          channel: data.channel
        }
      };
    } catch (error) {
      return {
        isSuccess: false,
        error: 'Failed to post Slack message'
      };
    }
  }

  getOAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID!,
      scope: this.SCOPES.join(','),
      redirect_uri: redirectUri,
      response_type: 'code'
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<IntegrationResult> {
    try {
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.CLIENT_ID!,
          client_secret: this.CLIENT_SECRET!,
          code,
          redirect_uri: redirectUri
        })
      });

      const data = await response.json();

      if (!data.ok) {
        return {
          isSuccess: false,
          error: data.error || 'OAuth exchange failed'
        };
      }

      return {
        isSuccess: true,
        data: {
          accessToken: data.access_token,
          teamId: data.team.id,
          teamName: data.team.name,
          userId: data.authed_user.id,
          refreshToken: data.refresh_token
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