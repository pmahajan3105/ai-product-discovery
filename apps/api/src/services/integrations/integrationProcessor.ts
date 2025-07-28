/**
 * Integration Processor
 * Core workflow engine for processing integration data based on Zeda patterns
 */

import { db } from '../database';
import { oauthConnectionService } from '../oauth/connectionService';
import { customerProfileService, CustomerSource } from '../customerProfileService';
import { feedbackService } from '../feedbackService';
import { SlackOAuth2Provider } from '../oauth/providers/slackProvider';
import { ZendeskOAuth2Provider } from '../oauth/providers/zendeskProvider';
import { IntercomOAuth2Provider } from '../oauth/providers/intercomProvider';
import { healthMonitorService } from './healthMonitorService';

export enum IntegrationEventType {
  // Inbound events (from external services to FeedbackHub)
  SLACK_MESSAGE = 'SLACK_MESSAGE',
  SLACK_REACTION = 'SLACK_REACTION',
  ZENDESK_TICKET_CREATED = 'ZENDESK_TICKET_CREATED',
  ZENDESK_TICKET_UPDATED = 'ZENDESK_TICKET_UPDATED',
  INTERCOM_CONVERSATION_CREATED = 'INTERCOM_CONVERSATION_CREATED',
  INTERCOM_CONVERSATION_UPDATED = 'INTERCOM_CONVERSATION_UPDATED',
  
  // Outbound events (from FeedbackHub to external services)
  FEEDBACK_CREATED = 'FEEDBACK_CREATED',
  FEEDBACK_STATUS_CHANGED = 'FEEDBACK_STATUS_CHANGED',
  FEEDBACK_ASSIGNED = 'FEEDBACK_ASSIGNED',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED'
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export interface IntegrationEvent {
  id: string;
  organizationId: string;
  integrationId: string;
  eventType: IntegrationEventType;
  sourceId: string; // External ID from the source system
  data: Record<string, any>;
  metadata?: Record<string, any>;
  status: ProcessingStatus;
  attempts: number;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface ProcessingContext {
  organizationId: string;
  integrationId: string;
  integration: any; // Integration connection with credentials
  provider: SlackOAuth2Provider | ZendeskOAuth2Provider | IntercomOAuth2Provider;
  event: IntegrationEvent;
  retryCount?: number;
}

export interface ProcessingResult {
  success: boolean;
  result?: any;
  error?: string;
  shouldRetry?: boolean;
  metadata?: Record<string, any>;
}

export class IntegrationProcessor {
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 5000, 15000]; // 1s, 5s, 15s

  /**
   * Process integration event with error handling and retry logic
   */
  async processEvent(eventId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    let integrationId: string | undefined;
    let organizationId: string | undefined;

    try {
      // Get event from database
      const event = await this.getEvent(eventId);
      if (!event) {
        this.logError('EVENT_NOT_FOUND', eventId, undefined, undefined, 'Event not found in database');
        return { success: false, error: 'Event not found' };
      }

      integrationId = event.integrationId;
      organizationId = event.organizationId;

      // Skip if already processed or max retries exceeded
      if (event.status === ProcessingStatus.COMPLETED) {
        this.logInfo('EVENT_ALREADY_PROCESSED', eventId, integrationId, organizationId, 'Event already processed');
        return { success: true, result: 'Already processed' };
      }

      if (event.attempts >= this.maxRetries) {
        const errorMsg = `Max retries exceeded (${this.maxRetries})`;
        this.logError('MAX_RETRIES_EXCEEDED', eventId, integrationId, organizationId, errorMsg, { attempts: event.attempts });
        await this.updateEventStatus(eventId, ProcessingStatus.FAILED, errorMsg);
        await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, false, errorMsg);
        return { success: false, error: errorMsg };
      }

      // Mark as processing
      await this.updateEventStatus(eventId, ProcessingStatus.PROCESSING);
      this.logInfo('EVENT_PROCESSING_STARTED', eventId, integrationId, organizationId, `Processing ${event.eventType} event`);

      // Get integration connection
      const integration = await oauthConnectionService.getConnection(event.integrationId, event.organizationId);
      if (!integration || !integration.credentials) {
        const errorMsg = 'Integration connection not found or invalid';
        this.logError('INTEGRATION_CONNECTION_INVALID', eventId, integrationId, organizationId, errorMsg);
        await this.updateEventStatus(eventId, ProcessingStatus.FAILED, errorMsg);
        await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, false, errorMsg);
        return { success: false, error: errorMsg };
      }

      // Create provider instance
      const provider = this.createProvider(integration);
      
      // Build processing context
      const context: ProcessingContext = {
        organizationId: event.organizationId,
        integrationId: event.integrationId,
        integration,
        provider,
        event,
        retryCount: event.attempts
      };

      // Process based on event type
      const result = await this.processEventByType(context);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        this.logInfo('EVENT_PROCESSED_SUCCESS', eventId, integrationId, organizationId, 
          `Successfully processed ${event.eventType}`, { responseTime, result: result.result });
        await this.updateEventStatus(eventId, ProcessingStatus.COMPLETED, undefined, result.result);
        await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, true, undefined, responseTime);
        return result;
      } else {
        const newAttempts = event.attempts + 1;
        
        if (result.shouldRetry && newAttempts < this.maxRetries) {
          this.logWarn('EVENT_PROCESSING_RETRY', eventId, integrationId, organizationId, 
            `Processing failed, scheduling retry ${newAttempts}/${this.maxRetries}`, 
            { error: result.error, responseTime, attempt: newAttempts });
          
          // Schedule retry
          await this.updateEventStatus(eventId, ProcessingStatus.PENDING, result.error, undefined, newAttempts);
          await this.scheduleRetry(eventId, newAttempts);
          await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, false, `Retry ${newAttempts}: ${result.error}`, responseTime);
          return { success: false, error: result.error, shouldRetry: true };
        } else {
          this.logError('EVENT_PROCESSING_FAILED', eventId, integrationId, organizationId, 
            `Processing failed permanently after ${newAttempts} attempts`, 
            { error: result.error, responseTime, finalAttempt: newAttempts });
          
          await this.updateEventStatus(eventId, ProcessingStatus.FAILED, result.error, undefined, newAttempts);
          await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, false, result.error, responseTime);
          return result;
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      this.logError('EVENT_PROCESSING_EXCEPTION', eventId, integrationId, organizationId, 
        'Unexpected error during event processing', { error: errorMsg, responseTime, stack: error instanceof Error ? error.stack : undefined });
      
      await this.updateEventStatus(eventId, ProcessingStatus.FAILED, errorMsg);
      
      if (integrationId && organizationId) {
        await healthMonitorService.updateIntegrationMetrics(integrationId, organizationId, false, errorMsg, responseTime);
      }
      
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create provider instance based on integration type
   */
  private createProvider(integration: any): SlackOAuth2Provider | ZendeskOAuth2Provider | IntercomOAuth2Provider {
    const { type, config, credentials } = integration;
    
    const clientId = process.env[`${type}_CLIENT_ID`];
    const clientSecret = process.env[`${type}_CLIENT_SECRET`];
    const redirectUri = process.env[`${type}_REDIRECT_URI`];

    switch (type) {
      case 'SLACK':
        return new SlackOAuth2Provider(clientId!, clientSecret!, redirectUri!);
      
      case 'ZENDESK':
        return new ZendeskOAuth2Provider(clientId!, clientSecret!, redirectUri!, config.subdomain);
      
      case 'INTERCOM':
        return new IntercomOAuth2Provider(clientId!, clientSecret!, redirectUri!);
      
      default:
        throw new Error(`Unsupported integration type: ${type}`);
    }
  }

  /**
   * Process event based on its type
   */
  private async processEventByType(context: ProcessingContext): Promise<ProcessingResult> {
    const { event } = context;

    try {
      switch (event.eventType) {
        case IntegrationEventType.SLACK_MESSAGE:
          return await this.processSlackMessage(context);
        
        case IntegrationEventType.SLACK_REACTION:
          return await this.processSlackReaction(context);
        
        case IntegrationEventType.ZENDESK_TICKET_CREATED:
          return await this.processZendeskTicketCreated(context);
        
        case IntegrationEventType.ZENDESK_TICKET_UPDATED:
          return await this.processZendeskTicketUpdated(context);
        
        case IntegrationEventType.INTERCOM_CONVERSATION_CREATED:
          return await this.processIntercomConversationCreated(context);
        
        case IntegrationEventType.INTERCOM_CONVERSATION_UPDATED:
          return await this.processIntercomConversationUpdated(context);
        
        case IntegrationEventType.FEEDBACK_CREATED:
          return await this.processFeedbackCreated(context);
        
        case IntegrationEventType.FEEDBACK_STATUS_CHANGED:
          return await this.processFeedbackStatusChanged(context);
        
        case IntegrationEventType.FEEDBACK_ASSIGNED:
          return await this.processFeedbackAssigned(context);
        
        default:
          return { success: false, error: `Unsupported event type: ${event.eventType}` };
      }
    } catch (error) {
      console.error(`Error processing ${event.eventType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        shouldRetry: this.shouldRetryError(error)
      };
    }
  }

  /**
   * Process Slack message - convert to feedback
   */
  private async processSlackMessage(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, organizationId } = context;
    const { message, channel, user } = event.data;

    if (!provider || !(provider instanceof SlackOAuth2Provider)) {
      return { success: false, error: 'Invalid Slack provider' };
    }

    try {
      // Skip bot messages or system messages
      if (message.subtype || message.bot_id) {
        return { success: true, result: 'Skipped bot/system message' };
      }

      // Get user info for customer identification
      const credentials = context.integration.credentials;
      const userInfo = await this.getSlackUserInfo(provider, credentials, user);

      // Identify or create customer
      const customer = await customerProfileService.identifyOrCreateCustomer(
        organizationId,
        {
          email: userInfo?.profile?.email,
          name: userInfo?.profile?.display_name || userInfo?.profile?.real_name,
          source: CustomerSource.INTEGRATION_SLACK,
          externalId: user,
          metadata: {
            slackUserId: user,
            slackChannel: channel,
            slackTeam: context.integration.metadata?.teamId
          }
        },
        'system' // System user for automatic processing
      );

      // Create feedback from message
      const feedbackData = {
        title: this.extractSlackMessageTitle(message.text),
        description: message.text,
        source: 'slack',
        customerId: customer.id,
        integrationId: context.integrationId,
        customerEmail: userInfo?.profile?.email,
        customerName: userInfo?.profile?.display_name || userInfo?.profile?.real_name,
        sourceMetadata: {
          slackChannel: channel,
          slackMessageTs: message.ts,
          slackUserId: user,
          slackPermalink: await this.getSlackPermalink(provider, credentials, channel, message.ts)
        }
      };

      const feedback = await feedbackService.createFeedback(organizationId, feedbackData, 'system');

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          customerId: customer.id,
          action: 'feedback_created_from_slack_message'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Slack message',
        shouldRetry: true
      };
    }
  }

  /**
   * Process Slack reaction - update feedback engagement
   */
  private async processSlackReaction(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, organizationId } = context;
    const { reaction, message_ts, user } = event.data;

    try {
      // Find feedback based on Slack message timestamp
      const feedback = await db.models.Feedback.findOne({
        where: {
          organizationId,
          sourceMetadata: {
            slackMessageTs: message_ts
          }
        }
      });

      if (!feedback) {
        return { success: true, result: 'No associated feedback found' };
      }

      // Update upvote count for positive reactions
      const positiveReactions = ['thumbsup', '+1', 'heart', 'star'];
      if (positiveReactions.includes(reaction)) {
        await feedback.update({
          upvoteCount: feedback.upvoteCount + 1
        });
      }

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          reaction,
          action: 'reaction_processed'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Slack reaction',
        shouldRetry: true
      };
    }
  }

  /**
   * Process Zendesk ticket created - convert to feedback
   */
  private async processZendeskTicketCreated(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, organizationId } = context;
    const { ticket } = event.data;

    if (!provider || !(provider instanceof ZendeskOAuth2Provider)) {
      return { success: false, error: 'Invalid Zendesk provider' };
    }

    try {
      // Identify or create customer
      const customer = await customerProfileService.identifyOrCreateCustomer(
        organizationId,
        {
          email: ticket.requester?.email,
          name: ticket.requester?.name,
          source: CustomerSource.INTEGRATION_ZENDESK,
          externalId: ticket.requester?.id?.toString(),
          metadata: {
            zendeskUserId: ticket.requester?.id,
            zendeskOrganizationId: ticket.organization_id
          }
        },
        'system'
      );

      // Create feedback from ticket
      const feedbackData = {
        title: ticket.subject,
        description: ticket.description,
        source: 'zendesk',
        customerId: customer.id,
        integrationId: context.integrationId,
        priority: this.mapZendeskPriority(ticket.priority),
        customerEmail: ticket.requester?.email,
        customerName: ticket.requester?.name,
        sourceMetadata: {
          zendeskTicketId: ticket.id,
          zendeskStatus: ticket.status,
          zendeskType: ticket.type,
          zendeskUrl: ticket.url
        }
      };

      const feedback = await feedbackService.createFeedback(organizationId, feedbackData, 'system');

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          customerId: customer.id,
          zendeskTicketId: ticket.id,
          action: 'feedback_created_from_zendesk_ticket'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Zendesk ticket',
        shouldRetry: true
      };
    }
  }

  /**
   * Process Zendesk ticket updated - update existing feedback
   */
  private async processZendeskTicketUpdated(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, organizationId } = context;
    const { ticket } = event.data;

    try {
      // Find existing feedback by Zendesk ticket ID
      const feedback = await db.models.Feedback.findOne({
        where: {
          organizationId,
          sourceMetadata: {
            zendeskTicketId: ticket.id
          }
        }
      });

      if (!feedback) {
        return { success: true, result: 'No associated feedback found' };
      }

      // Update feedback with ticket changes
      await feedback.update({
        status: this.mapZendeskStatusToFeedback(ticket.status),
        priority: this.mapZendeskPriority(ticket.priority),
        sourceMetadata: {
          ...feedback.sourceMetadata,
          zendeskStatus: ticket.status,
          zendeskUpdatedAt: ticket.updated_at
        }
      });

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          zendeskTicketId: ticket.id,
          action: 'feedback_updated_from_zendesk_ticket'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Zendesk ticket update',
        shouldRetry: true
      };
    }
  }

  /**
   * Process Intercom conversation created - convert to feedback
   */
  private async processIntercomConversationCreated(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, organizationId } = context;
    const { conversation, user, message } = event.data;

    if (!provider || !(provider instanceof IntercomOAuth2Provider)) {
      return { success: false, error: 'Invalid Intercom provider' };
    }

    try {
      // Identify or create customer
      const customer = await customerProfileService.identifyOrCreateCustomer(
        organizationId,
        {
          email: user?.email,
          name: user?.name,
          source: CustomerSource.INTEGRATION_INTERCOM,
          externalId: user?.id?.toString(),
          metadata: {
            intercomUserId: user?.id,
            intercomContactId: user?.contact_id
          }
        },
        'system'
      );

      // Create feedback from conversation
      const feedbackData = {
        title: this.extractIntercomConversationTitle(message?.body || conversation?.subject),
        description: message?.body || 'Intercom conversation',
        source: 'intercom',
        customerId: customer.id,
        integrationId: context.integrationId,
        customerEmail: user?.email,
        customerName: user?.name,
        sourceMetadata: {
          intercomConversationId: conversation.id,
          intercomState: conversation.state,
          intercomMessageId: message?.id,
          intercomUrl: conversation.links?.self
        }
      };

      const feedback = await feedbackService.createFeedback(organizationId, feedbackData, 'system');

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          customerId: customer.id,
          intercomConversationId: conversation.id,
          action: 'feedback_created_from_intercom_conversation'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Intercom conversation',
        shouldRetry: true
      };
    }
  }

  /**
   * Process Intercom conversation updated - add comment to feedback
   */
  private async processIntercomConversationUpdated(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, organizationId } = context;
    const { conversation, message } = event.data;

    try {
      // Find existing feedback by Intercom conversation ID
      const feedback = await db.models.Feedback.findOne({
        where: {
          organizationId,
          sourceMetadata: {
            intercomConversationId: conversation.id
          }
        }
      });

      if (!feedback) {
        return { success: true, result: 'No associated feedback found' };
      }

      // Add comment if there's a new message
      if (message?.body) {
        await db.models.Comment.create({
          feedbackId: feedback.id,
          organizationId,
          userId: 'system',
          content: message.body,
          metadata: {
            source: 'intercom',
            intercomMessageId: message.id,
            intercomAuthor: message.author
          }
        });
      }

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          intercomConversationId: conversation.id,
          action: 'comment_added_from_intercom_update'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Intercom conversation update',
        shouldRetry: true
      };
    }
  }

  /**
   * Process feedback created - sync to external services
   */
  private async processFeedbackCreated(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, integration } = context;
    const { feedback, syncConfig } = event.data;

    try {
      const results = [];

      // Sync to Slack if configured
      if (integration.type === 'SLACK' && syncConfig?.slack?.enabled && provider instanceof SlackOAuth2Provider) {
        const slackResult = await this.syncFeedbackToSlack(provider, integration.credentials, feedback, syncConfig.slack);
        results.push({ service: 'slack', ...slackResult });
      }

      // Sync to Zendesk if configured
      if (integration.type === 'ZENDESK' && syncConfig?.zendesk?.enabled && provider instanceof ZendeskOAuth2Provider) {
        const zendeskResult = await this.syncFeedbackToZendesk(provider, integration.credentials, feedback, syncConfig.zendesk);
        results.push({ service: 'zendesk', ...zendeskResult });
      }

      // Sync to Intercom if configured
      if (integration.type === 'INTERCOM' && syncConfig?.intercom?.enabled && provider instanceof IntercomOAuth2Provider) {
        const intercomResult = await this.syncFeedbackToIntercom(provider, integration.credentials, feedback, syncConfig.intercom);
        results.push({ service: 'intercom', ...intercomResult });
      }

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          syncResults: results,
          action: 'feedback_synced_to_integrations'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync feedback to integrations',
        shouldRetry: true
      };
    }
  }

  /**
   * Sync feedback to Slack channel
   */
  private async syncFeedbackToSlack(
    provider: SlackOAuth2Provider, 
    credentials: any, 
    feedback: any, 
    config: any
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = `🗣️ *New Feedback*\n*${feedback.title}*\n${feedback.description}\n\n_From: ${feedback.customerName || 'Anonymous'}_`;
      
      const success = await provider.sendMessage(
        credentials,
        config.channelId,
        message
      );

      return { success };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown Slack sync error' 
      };
    }
  }

  /**
   * Sync feedback to Zendesk ticket
   */
  private async syncFeedbackToZendesk(
    provider: ZendeskOAuth2Provider, 
    credentials: any, 
    feedback: any, 
    config: any
  ): Promise<{ success: boolean; ticketId?: number; error?: string }> {
    try {
      const ticket = await provider.createTicket(credentials, {
        subject: feedback.title,
        comment: { body: feedback.description },
        requester: {
          name: feedback.customerName || 'Anonymous',
          email: feedback.customerEmail || 'no-email@example.com'
        },
        priority: feedback.priority || 'normal',
        type: 'question',
        tags: ['feedbackhub', 'auto-created']
      });

      return { success: true, ticketId: ticket.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown Zendesk sync error' 
      };
    }
  }

  /**
   * Sync feedback to Intercom conversation
   */
  private async syncFeedbackToIntercom(
    provider: IntercomOAuth2Provider, 
    credentials: any, 
    feedback: any, 
    config: any
  ): Promise<{ success: boolean; conversationId?: string; error?: string }> {
    try {
      // First, create or update contact
      const contact = await provider.createOrUpdateContact(credentials, {
        email: feedback.customerEmail,
        name: feedback.customerName,
        custom_attributes: {
          feedback_source: 'feedbackhub'
        }
      });

      // Create conversation
      const conversation = await provider.createConversation(credentials, {
        from: {
          type: 'user',
          id: contact.id
        },
        body: `**${feedback.title}**\n\n${feedback.description}`,
        message_type: 'email',
        subject: feedback.title
      });

      return { success: true, conversationId: conversation.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown Intercom sync error' 
      };
    }
  }

  /**
   * Process feedback status changed - notify external services
   */
  private async processFeedbackStatusChanged(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, integration } = context;
    const { feedback, oldStatus, newStatus, syncConfig } = event.data;

    try {
      const results = [];

      // Notify Slack if configured
      if (integration.type === 'SLACK' && syncConfig?.slack?.notifyOnStatusChange && provider instanceof SlackOAuth2Provider) {
        const slackResult = await this.notifySlackStatusChange(provider, integration.credentials, feedback, oldStatus, newStatus, syncConfig.slack);
        results.push({ service: 'slack', ...slackResult });
      }

      // Update Zendesk ticket if configured and feedback came from Zendesk
      if (integration.type === 'ZENDESK' && feedback.sourceMetadata?.zendeskTicketId && provider instanceof ZendeskOAuth2Provider) {
        const zendeskResult = await this.updateZendeskTicketStatus(provider, integration.credentials, feedback, newStatus);
        results.push({ service: 'zendesk', ...zendeskResult });
      }

      // Update Intercom conversation if configured
      if (integration.type === 'INTERCOM' && feedback.sourceMetadata?.intercomConversationId && provider instanceof IntercomOAuth2Provider) {
        const intercomResult = await this.updateIntercomConversationStatus(provider, integration.credentials, feedback, newStatus);
        results.push({ service: 'intercom', ...intercomResult });
      }

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          oldStatus,
          newStatus,
          notificationResults: results,
          action: 'feedback_status_change_processed'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process feedback status change',
        shouldRetry: true
      };
    }
  }

  /**
   * Process feedback assigned - notify external services
   */
  private async processFeedbackAssigned(context: ProcessingContext): Promise<ProcessingResult> {
    const { event, provider, integration } = context;
    const { feedback, assigneeId, assigneeName, syncConfig } = event.data;

    try {
      const results = [];

      // Notify Slack if configured
      if (integration.type === 'SLACK' && syncConfig?.slack?.notifyOnAssignment && provider instanceof SlackOAuth2Provider) {
        const message = `📋 Feedback "${feedback.title}" has been assigned to ${assigneeName}`;
        const slackResult = await provider.sendMessage(
          integration.credentials,
          syncConfig.slack.channelId,
          message
        );
        results.push({ service: 'slack', success: slackResult });
      }

      // Update Zendesk ticket assignee if applicable
      if (integration.type === 'ZENDESK' && feedback.sourceMetadata?.zendeskTicketId && provider instanceof ZendeskOAuth2Provider) {
        const zendeskResult = await this.updateZendeskTicketAssignee(provider, integration.credentials, feedback.sourceMetadata.zendeskTicketId, assigneeId);
        results.push({ service: 'zendesk', ...zendeskResult });
      }

      return {
        success: true,
        result: {
          feedbackId: feedback.id,
          assigneeId,
          assigneeName,
          notificationResults: results,
          action: 'feedback_assignment_processed'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process feedback assignment',
        shouldRetry: true
      };
    }
  }

  /**
   * Notification and sync helper methods
   */
  private async notifySlackStatusChange(
    provider: SlackOAuth2Provider,
    credentials: any,
    feedback: any,
    oldStatus: string,
    newStatus: string,
    config: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const statusEmoji = this.getStatusEmoji(newStatus);
      const message = `${statusEmoji} Feedback "${feedback.title}" status changed from ${oldStatus} to ${newStatus}`;
      
      const success = await provider.sendMessage(
        credentials,
        config.channelId,
        message
      );

      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Slack notification error'
      };
    }
  }

  private async updateZendeskTicketStatus(
    provider: ZendeskOAuth2Provider,
    credentials: any,
    feedback: any,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const zendeskStatus = this.mapFeedbackStatusToZendesk(newStatus);
      await provider.updateTicket(credentials, feedback.sourceMetadata.zendeskTicketId, {
        status: zendeskStatus
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Zendesk update error'
      };
    }
  }

  private async updateIntercomConversationStatus(
    provider: IntercomOAuth2Provider,
    credentials: any,
    feedback: any,
    newStatus: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const intercomState = this.mapFeedbackStatusToIntercom(newStatus);
      await provider.updateConversation(credentials, feedback.sourceMetadata.intercomConversationId, {
        state: intercomState
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Intercom update error'
      };
    }
  }

  private async updateZendeskTicketAssignee(
    provider: ZendeskOAuth2Provider,
    credentials: any,
    ticketId: string,
    assigneeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await provider.updateTicket(credentials, ticketId, {
        assignee_id: assigneeId
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown Zendesk assignee update error'
      };
    }
  }

  /**
   * Helper methods
   */
  private extractSlackMessageTitle(text: string): string {
    // Extract first sentence or first 100 characters as title
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence || 'Slack Message';
  }

  private async getSlackUserInfo(provider: SlackOAuth2Provider, credentials: any, userId: string): Promise<any> {
    // In a real implementation, we'd cache user info
    return provider.getUserInfo(credentials);
  }

  private async getSlackPermalink(provider: SlackOAuth2Provider, credentials: any, channel: string, ts: string): Promise<string> {
    // Generate permalink to Slack message
    return `https://slack.com/app_redirect?channel=${channel}&message_ts=${ts}`;
  }

  private mapZendeskPriority(zendeskPriority: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      'low': 'low',
      'normal': 'medium',
      'high': 'high',
      'urgent': 'urgent'
    };
    return priorityMap[zendeskPriority] || 'medium';
  }

  private mapZendeskStatusToFeedback(zendeskStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'new',
      'open': 'triaged',
      'pending': 'in_progress',
      'hold': 'in_progress',
      'solved': 'resolved',
      'closed': 'archived'
    };
    return statusMap[zendeskStatus] || 'new';
  }

  private mapFeedbackStatusToZendesk(feedbackStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'new',
      'triaged': 'open',
      'planned': 'open',
      'in_progress': 'pending',
      'resolved': 'solved',
      'archived': 'closed'
    };
    return statusMap[feedbackStatus] || 'open';
  }

  private mapFeedbackStatusToIntercom(feedbackStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'open',
      'triaged': 'open',
      'planned': 'open',
      'in_progress': 'open',
      'resolved': 'closed',
      'archived': 'closed'
    };
    return statusMap[feedbackStatus] || 'open';
  }

  private extractIntercomConversationTitle(text: string): string {
    if (!text) return 'Intercom Conversation';
    // Extract first sentence or first 100 characters as title
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 100 
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence || 'Intercom Conversation';
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      'new': '🆕',
      'triaged': '🔍',
      'planned': '📋',
      'in_progress': '⚡',
      'resolved': '✅',
      'archived': '📁'
    };
    return emojiMap[status] || '📝';
  }

  private shouldRetryError(error: any): boolean {
    // Retry on network errors, rate limits, temporary failures
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') return true;
    if (error?.response?.status === 429 || error?.response?.status >= 500) return true;
    return false;
  }

  /**
   * Database operations
   */
  private async getEvent(eventId: string): Promise<IntegrationEvent | null> {
    // In production, this would query a dedicated integration_events table
    // For now, we'll use metadata field in the existing structure
    const integration = await db.models.Integration.findByPk(eventId);
    return integration as any; // Type assertion for now
  }

  private async updateEventStatus(
    eventId: string, 
    status: ProcessingStatus, 
    error?: string, 
    result?: any,
    attempts?: number
  ): Promise<void> {
    const updateData: any = {
      metadata: {
        processingStatus: status,
        lastProcessedAt: new Date().toISOString(),
        ...(error && { lastError: error }),
        ...(result && { lastResult: result }),
        ...(attempts !== undefined && { attempts })
      }
    };

    await db.models.Integration.update(updateData, {
      where: { id: eventId }
    });
  }

  private async scheduleRetry(eventId: string, attemptNumber: number): Promise<void> {
    const delay = this.retryDelays[attemptNumber - 1] || this.retryDelays[this.retryDelays.length - 1];
    
    // In production, use a job queue like Bull or Agenda
    setTimeout(async () => {
      await this.processEvent(eventId);
    }, delay);
  }

  /**
   * Queue integration event for processing
   */
  async queueEvent(
    organizationId: string,
    integrationId: string,
    eventType: IntegrationEventType,
    sourceId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<string> {
    // Create event record
    const integration = await db.models.Integration.create({
      organizationId,
      name: `Event-${eventType}-${Date.now()}`,
      type: 'EVENT',
      status: 'pending',
      config: {
        eventType,
        sourceId,
        originalIntegrationId: integrationId
      },
      credentials: JSON.stringify(data),
      metadata: {
        ...metadata,
        processingStatus: ProcessingStatus.PENDING,
        attempts: 0,
        queuedAt: new Date().toISOString()
      }
    });

    // Process asynchronously
    setImmediate(() => {
      this.processEvent(integration.id);
    });

    return integration.id;
  }

  /**
   * Structured logging methods following Zeda patterns
   */
  private logInfo(
    eventCode: string,
    eventId: string,
    integrationId?: string,
    organizationId?: string,
    message?: string,
    metadata?: any
  ): void {
    const logData = {
      level: 'info',
      eventCode,
      eventId,
      integrationId,
      organizationId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      service: 'integration-processor'
    };

    console.log(`[INTEGRATION-PROCESSOR] ${eventCode}:`, JSON.stringify(logData));
  }

  private logWarn(
    eventCode: string,
    eventId: string,
    integrationId?: string,
    organizationId?: string,
    message?: string,
    metadata?: any
  ): void {
    const logData = {
      level: 'warn',
      eventCode,
      eventId,
      integrationId,
      organizationId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      service: 'integration-processor'
    };

    console.warn(`[INTEGRATION-PROCESSOR] ${eventCode}:`, JSON.stringify(logData));
  }

  private logError(
    eventCode: string,
    eventId: string,
    integrationId?: string,
    organizationId?: string,
    message?: string,
    metadata?: any
  ): void {
    const logData = {
      level: 'error',
      eventCode,
      eventId,
      integrationId,
      organizationId,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      service: 'integration-processor'
    };

    console.error(`[INTEGRATION-PROCESSOR] ${eventCode}:`, JSON.stringify(logData));
  }
}

export const integrationProcessor = new IntegrationProcessor();