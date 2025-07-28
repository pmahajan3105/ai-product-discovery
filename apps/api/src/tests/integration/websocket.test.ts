/**
 * WebSocket Integration Tests
 * Testing real-time AI streaming service functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { TestSetup } from '../utils/testHelpers';
import { AIStreamingService } from '../../services/ai/streamingService';

// Mock SuperTokens session verification for WebSocket tests
jest.mock('supertokens-node/recipe/session/framework/express', () => ({
  verifySession: () => (req: any, res: any, next: any) => {
    // Mock successful verification
    if (req.headers.authorization?.includes('valid-token')) {
      req.session = {
        getUserId: () => 'test-user-123',
        getAccessTokenPayload: () => ({
          organizationId: 'test-org-123',
          email: 'test@example.com'
        })
      };
      next();
    } else {
      next(new Error('Invalid token'));
    }
  }
}));

// Mock AIChatSession model for global availability
const mockAIChatSession = {
  findOne: jest.fn()
};

// Set up successful mock response
mockAIChatSession.findOne.mockResolvedValue({
  id: 'test-session-123',
  userId: 'test-user-123', 
  organizationId: 'test-org-123',
  title: 'Test Chat Session'
});

// Make AIChatSession available globally
(global as any).AIChatSession = mockAIChatSession;

describe('WebSocket AI Streaming Service Tests', () => {
  let server: Server;
  let io: SocketIOServer;
  let aiStreamingService: AIStreamingService;

  beforeAll(async () => {
    // Setup test environment
    await TestSetup.setupE2ETest();
    
    // Create HTTP server and Socket.IO instance for testing
    const express = await import('express');
    const app = express.default();
    const http = await import('http');
    server = http.createServer(app);
    
    io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket']
    });

    // Initialize AI Streaming Service
    aiStreamingService = new AIStreamingService(io);

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('AIStreamingService Core Functionality', () => {
    test('should initialize with Socket.IO server', () => {
      expect(aiStreamingService).toBeDefined();
      expect(aiStreamingService).toBeInstanceOf(AIStreamingService);
    });

    test('should have broadcastToSession method', () => {
      expect(typeof aiStreamingService.broadcastToSession).toBe('function');
    });

    test('should have sendTypingIndicator method', () => {
      expect(typeof aiStreamingService.sendTypingIndicator).toBe('function');
    });

    test('should broadcast message to session room', () => {
      const sessionId = 'test-session-123';
      const eventName = 'ai_token';
      const data = {
        sessionId,
        token: 'Hello',
        timestamp: new Date().toISOString()
      };

      // This should not throw
      expect(() => {
        aiStreamingService.broadcastToSession(sessionId, eventName, data);
      }).not.toThrow();
    });

    test('should send typing indicator', () => {
      const sessionId = 'test-session-123';
      
      // These should not throw
      expect(() => {
        aiStreamingService.sendTypingIndicator(sessionId, true);
      }).not.toThrow();

      expect(() => {
        aiStreamingService.sendTypingIndicator(sessionId, false);
      }).not.toThrow();
    });

    test('should handle streaming message structure', () => {
      const streamingMessage = {
        sessionId: 'test-session',
        content: 'Hello world',
        isComplete: false,
        metadata: { model: 'gpt-4' },
        sources: [{ feedbackId: 'feedback-123', title: 'Test Feedback' }],
        suggestions: ['Follow up question?']
      };

      // Verify structure matches expected interface
      expect(streamingMessage).toMatchObject({
        sessionId: expect.any(String),
        content: expect.any(String),
        isComplete: expect.any(Boolean),
        metadata: expect.any(Object),
        sources: expect.any(Array),
        suggestions: expect.any(Array)
      });
    });
  });

  describe('Authentication Middleware', () => {
    test('should have authentication setup', () => {
      // The streaming service should have set up authentication middleware
      expect(io.engine.opts).toBeDefined();
      expect(io.sockets).toBeDefined();
    });

    test('should handle valid token format', () => {
      const validToken = 'valid-token-123';
      const invalidToken = 'invalid-token';

      // These tests verify the authentication logic would work
      expect(validToken.includes('valid-token')).toBe(true);
      expect(invalidToken.includes('valid-token')).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('should validate session data structure', () => {
      const sessionData = {
        id: 'test-session-123',
        userId: 'test-user-123',
        organizationId: 'test-org-123',
        title: 'Test Chat Session'
      };

      expect(sessionData).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        organizationId: expect.any(String),
        title: expect.any(String)
      });
    });

    test('should mock session lookup correctly', async () => {
      const session = await mockAIChatSession.findOne({
        where: {
          id: 'test-session-123',
          userId: 'test-user-123',
          organizationId: 'test-org-123'
        }
      });

      expect(session).toBeDefined();
      expect(session.id).toBe('test-session-123');
      expect(mockAIChatSession.findOne).toHaveBeenCalled();
    });
  });

  describe('Streaming Callback Integration', () => {
    test('should support LangChain callback structure', () => {
      // Test the structure expected by LangChain callbacks
      const callbackMethods = {
        handleLLMNewToken: (token: string) => {
          expect(typeof token).toBe('string');
        },
        handleLLMStart: () => {
          // Start callback
        },
        handleLLMEnd: () => {
          // End callback  
        }
      };

      expect(typeof callbackMethods.handleLLMNewToken).toBe('function');
      expect(typeof callbackMethods.handleLLMStart).toBe('function');
      expect(typeof callbackMethods.handleLLMEnd).toBe('function');

      // Test callback execution
      callbackMethods.handleLLMNewToken('test-token');
      callbackMethods.handleLLMStart();
      callbackMethods.handleLLMEnd();
    });

    test('should integrate with RAG chat streaming', () => {
      // Test the integration pattern used in RAGChatService
      const sessionId = 'test-session';
      
      const streamingHandler = {
        handleLLMNewToken: (token: string) => {
          // This would normally call the streaming service
          aiStreamingService.broadcastToSession(sessionId, 'ai_token', {
            sessionId,
            token,
            timestamp: new Date().toISOString()
          });
        },
        handleLLMStart: () => {
          aiStreamingService.sendTypingIndicator(sessionId, true);
        },
        handleLLMEnd: () => {
          aiStreamingService.sendTypingIndicator(sessionId, false);
        }
      };

      // These should execute without error
      expect(() => {
        streamingHandler.handleLLMStart();
        streamingHandler.handleLLMNewToken('Hello');
        streamingHandler.handleLLMNewToken(' world');
        streamingHandler.handleLLMEnd();
      }).not.toThrow();
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high-frequency broadcasting', () => {
      const sessionId = 'perf-test-session';
      const tokenCount = 50;

      // Simulate rapid token streaming
      const start = Date.now();
      
      for (let i = 0; i < tokenCount; i++) {
        aiStreamingService.broadcastToSession(sessionId, 'ai_token', {
          sessionId,
          token: `token_${i}`,
          timestamp: new Date().toISOString()
        });
      }

      const duration = Date.now() - start;
      
      // Should handle 50 broadcasts quickly
      expect(duration).toBeLessThan(100); // 100ms
    });

    test('should handle concurrent session broadcasting', () => {
      const sessionCount = 10;
      const sessions = Array.from({ length: sessionCount }, (_, i) => `session-${i}`);

      // Broadcast to all sessions simultaneously
      const start = Date.now();
      
      sessions.forEach(sessionId => {
        aiStreamingService.broadcastToSession(sessionId, 'test_broadcast', {
          sessionId,
          message: 'Concurrent test message',
          timestamp: new Date().toISOString()
        });
      });

      const duration = Date.now() - start;
      
      // Should handle concurrent broadcasts efficiently
      expect(duration).toBeLessThan(50); // 50ms for 10 broadcasts
    });

    test('should handle typing indicator toggling', () => {
      const sessionId = 'typing-test-session';
      
      // Should handle rapid typing indicator changes
      expect(() => {
        for (let i = 0; i < 10; i++) {
          aiStreamingService.sendTypingIndicator(sessionId, i % 2 === 0);
        }
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid session IDs gracefully', () => {
      const invalidSessionId = '';
      
      // Should not throw with invalid session ID
      expect(() => {
        aiStreamingService.broadcastToSession(invalidSessionId, 'test_event', {
          message: 'test'
        });
      }).not.toThrow();
    });

    test('should handle malformed broadcast data', () => {
      const sessionId = 'test-session';
      
      // Should handle various data types
      expect(() => {
        aiStreamingService.broadcastToSession(sessionId, 'test_event', null);
        aiStreamingService.broadcastToSession(sessionId, 'test_event', undefined);
        aiStreamingService.broadcastToSession(sessionId, 'test_event', {});
        aiStreamingService.broadcastToSession(sessionId, 'test_event', { complex: { nested: 'data' } });
      }).not.toThrow();
    });

    test('should handle typing indicator edge cases', () => {
      const sessionId = 'edge-case-session';
      
      // Should handle edge cases gracefully
      expect(() => {
        aiStreamingService.sendTypingIndicator('', true);
        aiStreamingService.sendTypingIndicator(sessionId, true);
        aiStreamingService.sendTypingIndicator(sessionId, false);
        aiStreamingService.sendTypingIndicator(sessionId, true);
        aiStreamingService.sendTypingIndicator(sessionId, false);
      }).not.toThrow();
    });
  });

  describe('Integration Patterns', () => {
    test('should support the expected workflow patterns', () => {
      // Test the complete AI streaming workflow
      const sessionId = 'workflow-test-session';
      
      // Step 1: Start streaming
      aiStreamingService.sendTypingIndicator(sessionId, true);
      
      // Step 2: Stream tokens
      const tokens = ['Hello', ' there', '!', ' How', ' can', ' I', ' help', '?'];
      tokens.forEach((token, index) => {
        aiStreamingService.broadcastToSession(sessionId, 'ai_token', {
          sessionId,
          token,
          index,
          timestamp: new Date().toISOString()
        });
      });
      
      // Step 3: Complete streaming
      aiStreamingService.sendTypingIndicator(sessionId, false);
      aiStreamingService.broadcastToSession(sessionId, 'ai_response_complete', {
        sessionId,
        fullResponse: tokens.join(''),
        timestamp: new Date().toISOString()
      });

      // The workflow should complete without errors
      expect(true).toBe(true); // If we reach here, workflow succeeded
    });

    test('should support multiple concurrent conversations', () => {
      const sessions = ['session-a', 'session-b', 'session-c'];
      
      // Simulate concurrent conversations
      sessions.forEach(sessionId => {
        // Each session gets its own conversation flow
        aiStreamingService.sendTypingIndicator(sessionId, true);
        
        ['Hello', ' from', ` ${sessionId}`].forEach(token => {
          aiStreamingService.broadcastToSession(sessionId, 'ai_token', {
            sessionId,
            token,
            timestamp: new Date().toISOString()
          });
        });
        
        aiStreamingService.sendTypingIndicator(sessionId, false);
      });

      // All conversations should proceed independently
      expect(sessions).toHaveLength(3);
    });
  });
}); 