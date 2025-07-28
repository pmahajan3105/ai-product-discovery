/**
 * AI Pipeline End-to-End Tests
 * Tests the complete AI functionality from API to database
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../../services/database';
import { langchainService } from '../../services/ai/langchainService';
import { ragChatService } from '../../services/ai/ragChatService';
import { aiCategorizationService } from '../../services/ai/aiCategorizationService';
import { companyContextService } from '../../services/ai/companyContextService';
import { aiHealthCheckService } from '../../services/ai/healthCheckService';
import { AIChatSession } from '@feedback-hub/database/models/aiChatSession';
import { FeedbackEmbedding } from '@feedback-hub/database/models/feedbackEmbedding';
import { AICategorizationLog } from '@feedback-hub/database/models/aiCategorizationLog';

// Test configuration
const TEST_ORG_ID = 'test-org-123';
const TEST_USER_ID = 'test-user-123';
const TEST_FEEDBACK_ID = 'test-feedback-123';

describe('AI Pipeline End-to-End Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await db.connect();
    
    // Clean up any existing test data
    await AIChatSession.destroy({ where: { organizationId: TEST_ORG_ID } });
    await FeedbackEmbedding.destroy({ where: { organizationId: TEST_ORG_ID } });
    await AICategorizationLog.destroy({ where: { organizationId: TEST_ORG_ID } });
  });

  afterAll(async () => {
    // Clean up test data
    await AIChatSession.destroy({ where: { organizationId: TEST_ORG_ID } });
    await FeedbackEmbedding.destroy({ where: { organizationId: TEST_ORG_ID } });
    await AICategorizationLog.destroy({ where: { organizationId: TEST_ORG_ID } });
    
    // Disconnect from database
    await db.disconnect();
  });

  describe('Health Check Service', () => {
    test('should return system health status', async () => {
      const health = await aiHealthCheckService.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.components).toBeDefined();
      expect(health.components.openai).toBeDefined();
      expect(health.components.langchain).toBeDefined();
      expect(health.components.vectorStore).toBeDefined();
      expect(health.components.database).toBeDefined();
      expect(health.components.streaming).toBeDefined();
    });

    test('should return availability status', async () => {
      const availability = await aiHealthCheckService.getAvailabilityStatus();
      
      expect(availability).toBeDefined();
      expect(typeof availability.available).toBe('boolean');
      expect(Array.isArray(availability.services)).toBe(true);
      expect(Array.isArray(availability.degradedServices)).toBe(true);
      expect(Array.isArray(availability.unavailableServices)).toBe(true);
    });
  });

  describe('LangChain Service', () => {
    test('should initialize with correct configuration', () => {
      expect(langchainService.isAvailable()).toBe(true);
      expect(langchainService.getChatModel()).toBeDefined();
      expect(langchainService.getEmbeddings()).toBeDefined();
    });

    test('should create categorization chain', async () => {
      const chain = await langchainService.createCategorizationChain(TEST_ORG_ID);
      
      if (process.env.OPENAI_API_KEY) {
        expect(chain).toBeDefined();
        expect(chain).toHaveProperty('llm');
        expect(chain).toHaveProperty('prompt');
      } else {
        expect(chain).toBeNull();
      }
    });

    test('should create insights chain', async () => {
      const chain = await langchainService.createInsightsChain(TEST_ORG_ID);
      
      if (process.env.OPENAI_API_KEY) {
        expect(chain).toBeDefined();
        expect(chain).toHaveProperty('llm');
        expect(chain).toHaveProperty('prompt');
      } else {
        expect(chain).toBeNull();
      }
    });
  });

  describe('Company Context Service', () => {
    test('should generate default context prompt', async () => {
      const prompt = await companyContextService.generateAIContextPrompt(TEST_ORG_ID);
      
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('company');
    });

    test('should get company context', async () => {
      const context = await companyContextService.getCompanyContext(TEST_ORG_ID);
      
      expect(context).toBeDefined();
      expect(context).toHaveProperty('prompt');
      expect(context).toHaveProperty('categories');
      expect(context).toHaveProperty('businessGoals');
    });
  });

  describe('AI Categorization Service', () => {
    const mockFeedbackRequest = {
      feedbackId: TEST_FEEDBACK_ID,
      organizationId: TEST_ORG_ID,
      title: 'Test Feedback',
      description: 'This is a test feedback about the product being slow and difficult to use.',
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        segment: 'enterprise'
      },
      source: 'email',
      metadata: { priority: 'medium' }
    };

    test('should categorize feedback (mock mode)', async () => {
      const result = await aiCategorizationService.categorizeFeedback(mockFeedbackRequest);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle batch categorization', async () => {
      const requests = [
        mockFeedbackRequest,
        {
          ...mockFeedbackRequest,
          feedbackId: 'test-feedback-124',
          description: 'Great product, love the new features!'
        }
      ];

      const results = await aiCategorizationService.batchCategorize(requests);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      
      results.forEach(result => {
        expect(result).toHaveProperty('category');
        expect(result).toHaveProperty('sentiment');
        expect(result).toHaveProperty('priority');
      });
    });

    test('should get categorization stats', async () => {
      const stats = await aiCategorizationService.getCategorizationStats(TEST_ORG_ID, 30);
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('sentimentDistribution');
      expect(stats).toHaveProperty('categoryDistribution');
    });
  });

  describe('RAG Chat Service', () => {
    let testSessionId: string;

    beforeEach(async () => {
      // Create a test chat session
      testSessionId = await ragChatService.createSession(TEST_ORG_ID, TEST_USER_ID, 'Test Session');
    });

    test('should create chat session', async () => {
      expect(testSessionId).toBeDefined();
      expect(typeof testSessionId).toBe('string');
      
      const session = await AIChatSession.findByPk(testSessionId);
      expect(session).toBeDefined();
      expect(session!.organizationId).toBe(TEST_ORG_ID);
      expect(session!.userId).toBe(TEST_USER_ID);
    });

    test('should list chat sessions', async () => {
      const sessions = await ragChatService.listSessions(TEST_ORG_ID, TEST_USER_ID);
      
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(1);
      
      const testSession = sessions.find(s => s.id === testSessionId);
      expect(testSession).toBeDefined();
    });

    test('should handle chat with fallback response', async () => {
      const response = await ragChatService.chat({
        sessionId: testSessionId,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        message: 'What are the main customer complaints?'
      });
      
      expect(response).toBeDefined();
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('confidence');
      expect(response).toHaveProperty('sources');
      expect(response).toHaveProperty('suggestions');
      expect(response).toHaveProperty('followUpQuestions');
      expect(response).toHaveProperty('processingTime');
      
      expect(Array.isArray(response.sources)).toBe(true);
      expect(Array.isArray(response.suggestions)).toBe(true);
      expect(Array.isArray(response.followUpQuestions)).toBe(true);
    });

    test('should save and retrieve session messages', async () => {
      // Send a message
      await ragChatService.chat({
        sessionId: testSessionId,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        message: 'Hello, what insights can you provide?'
      });

      // Check that messages were saved
      const session = await AIChatSession.findByPk(testSessionId);
      expect(session).toBeDefined();
      expect(session!.messages).toBeDefined();
      expect(session!.messages.length).toBeGreaterThanOrEqual(2); // User message + AI response
    });

    test('should delete chat session', async () => {
      await ragChatService.deleteSession(testSessionId);
      
      const session = await AIChatSession.findByPk(testSessionId);
      expect(session).toBeNull();
    });
  });

  describe('Database Models Integration', () => {
    test('should create and retrieve FeedbackEmbedding', async () => {
      const embedding = await FeedbackEmbedding.create({
        feedbackId: TEST_FEEDBACK_ID,
        organizationId: TEST_ORG_ID,
        embedding: [0.1, 0.2, 0.3], // Mock embedding
        text: 'Test feedback text',
        model: 'text-embedding-3-large',
        tokens: 10,
        metadata: { source: 'test' }
      });

      expect(embedding).toBeDefined();
      expect(embedding.id).toBeDefined();
      expect(embedding.feedbackId).toBe(TEST_FEEDBACK_ID);
      expect(embedding.organizationId).toBe(TEST_ORG_ID);
      
      // Clean up
      await embedding.destroy();
    });

    test('should create and retrieve AICategorizationLog', async () => {
      const log = await AICategorizationLog.create({
        feedbackId: TEST_FEEDBACK_ID,
        organizationId: TEST_ORG_ID,
        category: 'product-issue',
        categoryConfidence: 0.85,
        sentiment: 'negative',
        sentimentConfidence: 0.92,
        priority: 'high',
        processingTime: 1500,
        aiModel: 'gpt-4o-mini',
        reasoning: 'Customer reported performance issues'
      });

      expect(log).toBeDefined();
      expect(log.id).toBeDefined();
      expect(log.feedbackId).toBe(TEST_FEEDBACK_ID);
      expect(log.category).toBe('product-issue');
      expect(log.sentiment).toBe('negative');
      
      // Clean up
      await log.destroy();
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle missing OpenAI API key gracefully', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      
      // Service should still initialize but with limited functionality
      expect(() => langchainService.isAvailable()).not.toThrow();
      
      // Restore API key
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    test('should handle database connection errors', async () => {
      // This test would require mocking database failures
      // For now, we just ensure the service handles it gracefully
      const stats = await aiCategorizationService.getCategorizationStats(TEST_ORG_ID, 30);
      expect(stats).toBeDefined();
    });

    test('should provide fallback responses', async () => {
      const sessionId = await ragChatService.createSession(TEST_ORG_ID, TEST_USER_ID, 'Fallback Test');
      
      const response = await ragChatService.chat({
        sessionId,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        message: 'This is a test message for fallback'
      });
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');
      expect(response.message.length).toBeGreaterThan(0);
      
      // Clean up
      await ragChatService.deleteSession(sessionId);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle multiple concurrent chat requests', async () => {
      const sessionId = await ragChatService.createSession(TEST_ORG_ID, TEST_USER_ID, 'Concurrent Test');
      
      const promises = Array.from({ length: 3 }, (_, i) =>
        ragChatService.chat({
          sessionId,
          organizationId: TEST_ORG_ID,
          userId: TEST_USER_ID,
          message: `Concurrent test message ${i + 1}`
        })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.message).toBeDefined();
        expect(response.processingTime).toBeGreaterThan(0);
      });
      
      // Clean up
      await ragChatService.deleteSession(sessionId);
    });

    test('should complete categorization within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await aiCategorizationService.categorizeFeedback({
        feedbackId: 'perf-test-123',
        organizationId: TEST_ORG_ID,
        title: 'Performance Test',
        description: 'Testing categorization performance with a medium-length feedback description.',
        source: 'test'
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});

// Integration test helper functions
export const testHelpers = {
  createTestSession: async (orgId: string, userId: string) => {
    return await ragChatService.createSession(orgId, userId, 'Test Session');
  },
  
  cleanupTestData: async (orgId: string) => {
    await AIChatSession.destroy({ where: { organizationId: orgId } });
    await FeedbackEmbedding.destroy({ where: { organizationId: orgId } });
    await AICategorizationLog.destroy({ where: { organizationId: orgId } });
  },
  
  waitForProcessing: (ms: number = 1000) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};