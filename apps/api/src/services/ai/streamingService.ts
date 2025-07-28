/**
 * Socket.IO Streaming Service for AI Chat
 * Provides real-time streaming for LangChain callbacks
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
// import { AIChatSession } from '@feedback-hub/database/models/aiChatSession'; // Model not available yet

export interface StreamingMessage {
  sessionId: string;
  content: string;
  isComplete: boolean;
  metadata?: any;
  sources?: any[];
  suggestions?: string[];
}

export class LangChainStreamingHandler extends BaseCallbackHandler {
  name = 'langchain_streaming_handler';
  
  constructor(
    private socket: Socket,
    private sessionId: string
  ) {
    super();
  }

  async handleLLMNewToken(token: string): Promise<void> {
    this.socket.emit('ai_token', {
      sessionId: this.sessionId,
      token,
      timestamp: new Date().toISOString()
    });
  }

  async handleLLMStart(llm: any, prompts: string[]): Promise<void> {
    this.socket.emit('ai_start', {
      sessionId: this.sessionId,
      model: llm?.model || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  async handleLLMEnd(output: any): Promise<void> {
    this.socket.emit('ai_complete', {
      sessionId: this.sessionId,
      response: output,
      timestamp: new Date().toISOString()
    });
  }

  async handleLLMError(err: Error): Promise<void> {
    this.socket.emit('ai_error', {
      sessionId: this.sessionId,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }

  async handleChainStart(chain: any, inputs: any): Promise<void> {
    this.socket.emit('chain_start', {
      sessionId: this.sessionId,
      chainType: chain?.name || 'unknown',
      timestamp: new Date().toISOString()
    });
  }

  async handleChainEnd(outputs: any): Promise<void> {
    this.socket.emit('chain_complete', {
      sessionId: this.sessionId,
      outputs,
      timestamp: new Date().toISOString()
    });
  }

  async handleRetrieverStart(retriever: any, query: string): Promise<void> {
    this.socket.emit('retrieval_start', {
      sessionId: this.sessionId,
      query,
      timestamp: new Date().toISOString()
    });
  }

  async handleRetrieverEnd(documents: any[]): Promise<void> {
    this.socket.emit('retrieval_complete', {
      sessionId: this.sessionId,
      documentCount: documents.length,
      sources: documents.map(doc => ({
        content: doc.pageContent?.substring(0, 200) + '...',
        metadata: doc.metadata
      })),
      timestamp: new Date().toISOString()
    });
  }
}

export class AIStreamingService {
  private io: SocketIOServer;
  private authenticatedSockets = new Map<string, { userId: string; organizationId: string }>();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Extract session token from handshake auth
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('No authentication token provided');
        }

        // Create mock request/response for SuperTokens verification
        const mockReq = {
          headers: {
            authorization: `Bearer ${token}`
          }
        } as any;

        const mockRes = {
          status: () => mockRes,
          json: () => mockRes,
          setHeader: () => mockRes
        } as any;

        // Verify session with SuperTokens
        await new Promise((resolve, reject) => {
          verifySession()(mockReq, mockRes, (err?: any) => {
            if (err) reject(err);
            else resolve(mockReq.session);
          });
        });

        // Store authentication info
        this.authenticatedSockets.set(socket.id, {
          userId: mockReq.session.getUserId(),
          organizationId: mockReq.session.getAccessTokenPayload().organizationId
        });

        next();
      } catch (error) {
        console.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected to AI streaming:', socket.id);
      
      socket.on('join_chat_session', async ({ sessionId }) => {
        try {
          const auth = this.authenticatedSockets.get(socket.id);
          if (!auth) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          // Verify session belongs to user
          const chatSession = await AIChatSession.findOne({
            where: {
              id: sessionId,
              userId: auth.userId,
              organizationId: auth.organizationId
            }
          });

          if (!chatSession) {
            socket.emit('error', { message: 'Chat session not found or access denied' });
            return;
          }

          // Join the session room
          socket.join(`chat_${sessionId}`);
          socket.emit('joined_session', { sessionId, status: 'connected' });
          
          console.log(`Socket ${socket.id} joined chat session: ${sessionId}`);
        } catch (error) {
          console.error('Error joining chat session:', error);
          socket.emit('error', { message: 'Failed to join chat session' });
        }
      });

      socket.on('leave_chat_session', ({ sessionId }) => {
        socket.leave(`chat_${sessionId}`);
        socket.emit('left_session', { sessionId, status: 'disconnected' });
        console.log(`Socket ${socket.id} left chat session: ${sessionId}`);
      });

      socket.on('disconnect', () => {
        this.authenticatedSockets.delete(socket.id);
        console.log('Client disconnected from AI streaming:', socket.id);
      });
    });
  }

  // Create streaming handler for a specific session
  createStreamingHandler(socket: Socket, sessionId: string): LangChainStreamingHandler {
    return new LangChainStreamingHandler(socket, sessionId);
  }

  // Broadcast message to all clients in a chat session
  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`chat_${sessionId}`).emit(event, data);
  }

  // Send typing indicator
  sendTypingIndicator(sessionId: string, isTyping: boolean): void {
    this.broadcastToSession(sessionId, 'typing_indicator', {
      sessionId,
      isTyping,
      timestamp: new Date().toISOString()
    });
  }

  // Send message update (for editing/updating messages)
  sendMessageUpdate(sessionId: string, messageId: string, content: string): void {
    this.broadcastToSession(sessionId, 'message_update', {
      sessionId,
      messageId,
      content,
      timestamp: new Date().toISOString()
    });
  }

  // Send error to specific session
  sendErrorToSession(sessionId: string, error: string, details?: any): void {
    this.broadcastToSession(sessionId, 'ai_error', {
      sessionId,
      error,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Send completion notification
  sendCompletionToSession(sessionId: string, response: any, sources?: any[]): void {
    this.broadcastToSession(sessionId, 'ai_response_complete', {
      sessionId,
      response,
      sources,
      timestamp: new Date().toISOString()
    });
  }
}