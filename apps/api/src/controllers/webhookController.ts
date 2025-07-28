/**
 * Webhook Controller
 * Handles incoming webhooks from external services (Slack, Zendesk, Intercom)
 */

import { Request, Response } from 'express';
import { integrationProcessor, IntegrationEventType } from '../services/integrations/integrationProcessor';
import { oauthConnectionService } from '../services/oauth/connectionService';

export class WebhookController {
  /**
   * Handle Slack webhooks
   */
  async handleSlackWebhook(req: Request, res: Response) {
    try {
      const { event, team_id, api_app_id } = req.body;
      
      // Handle URL verification challenge
      if (req.body.challenge) {
        return res.json({ challenge: req.body.challenge });
      }

      // Skip retries and bot events
      if (req.headers['x-slack-retry-num'] || event?.bot_id) {
        return res.status(200).json({ success: true });
      }

      // Find integration by team ID
      const integration = await this.findIntegrationByExternalId('SLACK', team_id);
      if (!integration) {
        console.warn(`No Slack integration found for team ${team_id}`);
        return res.status(404).json({ error: 'Integration not found' });
      }

      let eventType: IntegrationEventType;
      let eventData: any;

      switch (event.type) {
        case 'message':
          // Skip bot messages and system messages
          if (event.subtype || event.bot_id) {
            return res.status(200).json({ success: true });
          }
          
          eventType = IntegrationEventType.SLACK_MESSAGE;
          eventData = {
            message: event,
            channel: event.channel,
            user: event.user,
            text: event.text,
            ts: event.ts
          };
          break;

        case 'reaction_added':
          eventType = IntegrationEventType.SLACK_REACTION;
          eventData = {
            reaction: event.reaction,
            message_ts: event.item.ts,
            channel: event.item.channel,
            user: event.user
          };
          break;

        default:
          console.log(`Unhandled Slack event type: ${event.type}`);
          return res.status(200).json({ success: true });
      }

      // Queue event for processing
      const eventId = await integrationProcessor.queueEvent(
        integration.organizationId,
        integration.id,
        eventType,
        event.ts || event.item?.ts || `${Date.now()}`,
        eventData,
        {
          teamId: team_id,
          appId: api_app_id,
          receivedAt: new Date().toISOString()
        }
      );

      console.log(`Queued Slack event ${eventType} with ID: ${eventId}`);
      res.status(200).json({ success: true, eventId });
    } catch (error) {
      console.error('Error handling Slack webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle Zendesk webhooks
   */
  async handleZendeskWebhook(req: Request, res: Response) {
    try {
      const { ticket, current_user } = req.body;
      
      // Extract subdomain from headers or request
      const subdomain = this.extractZendeskSubdomain(req);
      if (!subdomain) {
        return res.status(400).json({ error: 'Could not determine Zendesk subdomain' });
      }

      // Find integration by subdomain
      const integration = await this.findZendeskIntegrationBySubdomain(subdomain);
      if (!integration) {
        console.warn(`No Zendesk integration found for subdomain ${subdomain}`);
        return res.status(404).json({ error: 'Integration not found' });
      }

      let eventType: IntegrationEventType;
      let eventData: any;

      // Determine event type based on ticket status/creation
      if (ticket.created_at === ticket.updated_at) {
        eventType = IntegrationEventType.ZENDESK_TICKET_CREATED;
      } else {
        eventType = IntegrationEventType.ZENDESK_TICKET_UPDATED;
      }

      eventData = {
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,
          url: ticket.url,
          requester: ticket.requester,
          assignee: ticket.assignee,
          organization_id: ticket.organization_id
        },
        current_user
      };

      // Queue event for processing
      const eventId = await integrationProcessor.queueEvent(
        integration.organizationId,
        integration.id,
        eventType,
        ticket.id.toString(),
        eventData,
        {
          subdomain,
          receivedAt: new Date().toISOString()
        }
      );

      console.log(`Queued Zendesk event ${eventType} with ID: ${eventId}`);
      res.status(200).json({ success: true, eventId });
    } catch (error) {
      console.error('Error handling Zendesk webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle Intercom webhooks
   */
  async handleIntercomWebhook(req: Request, res: Response) {
    try {
      const { type, data, created_at } = req.body;
      
      // Verify webhook signature
      const signature = req.headers['x-hub-signature'] as string;
      if (!this.verifyIntercomSignature(req.body, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Find integration by app ID (if available in headers/body)
      const appId = req.headers['x-intercom-app-id'] as string;
      const integration = await this.findIntegrationByExternalId('INTERCOM', appId);
      if (!integration) {
        console.warn(`No Intercom integration found for app ${appId}`);
        return res.status(404).json({ error: 'Integration not found' });
      }

      let eventType: IntegrationEventType;
      let eventData: any;

      switch (type) {
        case 'conversation.user.created':
          eventType = IntegrationEventType.INTERCOM_CONVERSATION_CREATED;
          eventData = {
            conversation: data.item,
            user: data.item.user,
            message: data.item.conversation_message
          };
          break;

        case 'conversation.user.replied':
        case 'conversation.admin.replied':
          eventType = IntegrationEventType.INTERCOM_CONVERSATION_UPDATED;
          eventData = {
            conversation: data.item,
            user: data.item.user,
            message: data.item.conversation_message
          };
          break;

        default:
          console.log(`Unhandled Intercom webhook type: ${type}`);
          return res.status(200).json({ success: true });
      }

      // Queue event for processing
      const eventId = await integrationProcessor.queueEvent(
        integration.organizationId,
        integration.id,
        eventType,
        data.item.id,
        eventData,
        {
          appId,
          webhookType: type,
          receivedAt: new Date().toISOString()
        }
      );

      console.log(`Queued Intercom event ${eventType} with ID: ${eventId}`);
      res.status(200).json({ success: true, eventId });
    } catch (error) {
      console.error('Error handling Intercom webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Helper methods
   */
  private async findIntegrationByExternalId(type: string, externalId: string) {
    const connections = await oauthConnectionService.getConnectionsByType(type);
    return connections.find(conn => 
      conn.metadata?.teamId === externalId || 
      conn.metadata?.appId === externalId ||
      conn.config?.teamId === externalId
    );
  }

  private async findZendeskIntegrationBySubdomain(subdomain: string) {
    const connections = await oauthConnectionService.getConnectionsByType('ZENDESK');
    return connections.find(conn => 
      conn.config?.subdomain === subdomain ||
      conn.metadata?.subdomain === subdomain
    );
  }

  private extractZendeskSubdomain(req: Request): string | null {
    // Try to extract from various sources
    const userAgent = req.headers['user-agent'] as string;
    const referer = req.headers['referer'] as string;
    const origin = req.headers['origin'] as string;

    // Extract from user agent (Zendesk format)
    if (userAgent?.includes('Zendesk')) {
      const match = userAgent.match(/Zendesk\/(\w+)/);
      if (match) return match[1];
    }

    // Extract from referer or origin
    for (const url of [referer, origin].filter(Boolean)) {
      const match = url.match(/https?:\/\/(\w+)\.zendesk\.com/);
      if (match) return match[1];
    }

    // Try to extract from request body if present
    if (req.body?.account?.subdomain) {
      return req.body.account.subdomain;
    }

    return null;
  }

  private verifyIntercomSignature(body: any, signature: string): boolean {
    // In production, implement proper signature verification
    // using HMAC SHA256 and your webhook secret
    return true; // Simplified for now
  }
}

export const webhookController = new WebhookController();