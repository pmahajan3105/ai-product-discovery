import { 
  BaseIntegration, 
  IntegrationType, 
  IntegrationAction, 
  IntegrationResult, 
  IntegrationConfig,
  AuthType,
  ZendeskCredentials,
  ZendeskSettings 
} from '../../types/integration';

export class ZendeskIntegration extends BaseIntegration {
  key = IntegrationType.ZENDESK;
  name = 'Zendesk';
  authType = AuthType.API_TOKEN;

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

  async validateCredentials(credentials: ZendeskCredentials): Promise<IntegrationResult> {
    try {
      const { subdomain, email, apiToken } = credentials;

      if (!subdomain || !email || !apiToken) {
        return {
          isSuccess: false,
          error: 'Missing required credentials: subdomain, email, and API token are required',
          errorCode: 'MISSING_CREDENTIALS'
        };
      }

      // Test API call to validate credentials
      const response = await this.makeZendeskRequest(credentials, '/api/v2/users/me.json');

      if (!response.isSuccess) {
        return response;
      }

      return {
        isSuccess: true,
        data: {
          user: response.data?.user,
          subdomain,
          isValid: true
        }
      };
    } catch (error: any) {
      return {
        isSuccess: false,
        error: 'Failed to validate Zendesk credentials',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  }

  async testConnection(config: IntegrationConfig): Promise<IntegrationResult> {
    const credentials = config.credentials as ZendeskCredentials;
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

    // Get ticket fields and settings
    const ticketFields = await this.getTicketFields(credentials);

    return {
      isSuccess: true,
      data: {
        workspaceId,
        type: this.key,
        credentials,
        settings: {
          defaultTicketType: 'incident',
          defaultPriority: 'normal',
          autoCreateTickets: false,
          syncComments: true,
          ...settings
        },
        ticketFields: ticketFields.isSuccess ? ticketFields.data : []
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

  private async makeZendeskRequest(
    credentials: ZendeskCredentials, 
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<IntegrationResult> {
    try {
      const { subdomain, email, apiToken } = credentials;
      const url = `https://${subdomain}.zendesk.com${endpoint}`;
      
      const auth = btoa(`${email}/token:${apiToken}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          isSuccess: false,
          error: `Zendesk API error: ${response.status} ${response.statusText}`,
          errorCode: response.status.toString()
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

  async getTicketFields(credentials: ZendeskCredentials): Promise<IntegrationResult> {
    return await this.makeZendeskRequest(credentials, '/api/v2/ticket_fields.json');
  }

  async createTicket(
    credentials: ZendeskCredentials, 
    ticket: {
      subject: string;
      description: string;
      priority?: string;
      type?: string;
      tags?: string[];
      requesterEmail?: string;
    }
  ): Promise<IntegrationResult> {
    const ticketData = {
      ticket: {
        subject: ticket.subject,
        comment: {
          body: ticket.description
        },
        priority: ticket.priority || 'normal',
        type: ticket.type || 'incident',
        tags: ticket.tags || [],
        ...(ticket.requesterEmail && {
          requester: {
            email: ticket.requesterEmail
          }
        })
      }
    };

    return await this.makeZendeskRequest(
      credentials, 
      '/api/v2/tickets.json',
      {
        method: 'POST',
        body: JSON.stringify(ticketData)
      }
    );
  }

  async updateTicket(
    credentials: ZendeskCredentials,
    ticketId: string,
    updates: {
      subject?: string;
      comment?: string;
      status?: string;
      priority?: string;
      tags?: string[];
    }
  ): Promise<IntegrationResult> {
    const updateData: any = {
      ticket: {}
    };

    if (updates.subject) updateData.ticket.subject = updates.subject;
    if (updates.status) updateData.ticket.status = updates.status;
    if (updates.priority) updateData.ticket.priority = updates.priority;
    if (updates.tags) updateData.ticket.tags = updates.tags;
    
    if (updates.comment) {
      updateData.ticket.comment = {
        body: updates.comment,
        public: false
      };
    }

    return await this.makeZendeskRequest(
      credentials,
      `/api/v2/tickets/${ticketId}.json`,
      {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }
    );
  }

  async searchTickets(
    credentials: ZendeskCredentials,
    query: string
  ): Promise<IntegrationResult> {
    const encodedQuery = encodeURIComponent(query);
    return await this.makeZendeskRequest(
      credentials,
      `/api/v2/search.json?query=${encodedQuery}`
    );
  }

  async getTicket(
    credentials: ZendeskCredentials,
    ticketId: string
  ): Promise<IntegrationResult> {
    return await this.makeZendeskRequest(
      credentials,
      `/api/v2/tickets/${ticketId}.json`
    );
  }
}