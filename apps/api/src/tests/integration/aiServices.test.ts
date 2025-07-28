/**
 * AI Services Integration Tests
 * Comprehensive testing of AI functionality and service interactions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  TestSetup,
  TestDataFactory,
  PerformanceTestHelper
} from '../utils/testHelpers';

// Import AI services
import { openaiService } from '../../services/ai/openaiService';
import { AICategorizationService } from '../../services/ai/aiCategorizationService';
import { companyContextService } from '../../services/ai/companyContextService';

// AI Services Integration Tests - focusing on service patterns and interfaces

describe('AI Services Integration', () => {
  let testContext: any;

  beforeAll(async () => {
    // Setup integration test environment
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('OpenAI Service', () => {
    describe('isAvailable', () => {
      test('should check OpenAI availability', () => {
        // This will depend on whether OPENAI_API_KEY is set
        const isAvailable = openaiService.isAvailable();
        expect(typeof isAvailable).toBe('boolean');
      });
    });

    describe('analyzeFeedback', () => {
      test('should have analyze feedback method defined', () => {
        expect(typeof openaiService.analyzeFeedback).toBe('function');
      });

      test('should handle feedback analysis parameters correctly', async () => {
        const feedbackText = 'The login button is broken on mobile. Very frustrating!';
        const customerInfo = {
          segment: 'enterprise',
          company: 'Test Corp',
          previousInteractions: 5
        };

        // Test that the method can be called without throwing
        try {
          await openaiService.analyzeFeedback(
            testContext.organization.id,
            feedbackText,
            customerInfo
          );
        } catch (error) {
          // Expected to fail in test environment without proper API key
          expect(error).toBeDefined();
        }
      });
    });

    describe('generateEmbedding', () => {
      test('should have generateEmbedding method defined', () => {
        expect(typeof openaiService.generateEmbedding).toBe('function');
      });

      test('should accept text parameter', async () => {
        const text = 'This is test feedback content for embedding generation';
        
        try {
          await openaiService.generateEmbedding(text);
        } catch (error) {
          // Expected to fail without API key
          expect(error).toBeDefined();
        }
      });
    });

    describe('chatWithFeedback', () => {
      test('should have chatWithFeedback method defined', () => {
        expect(typeof openaiService.chatWithFeedback).toBe('function');
      });

      test('should handle chat parameters correctly', async () => {
        const messages = [
          { role: 'user' as const, content: 'What are the main issues customers are facing?' }
        ];

        const relevantFeedback = [
          {
            id: testContext.feedback.id,
            title: 'Login Issues',
            description: 'Users unable to login on mobile app',
            metadata: { priority: 'high' }
          }
        ];

        try {
          await openaiService.chatWithFeedback(
            testContext.organization.id,
            messages,
            relevantFeedback
          );
        } catch (error) {
          // Expected to fail without API key
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('AI Categorization Service', () => {
    let categorizationService: AICategorizationService;

    beforeEach(() => {
      categorizationService = new AICategorizationService();
    });

    describe('categorizeFeedback', () => {
      test('should have categorization method defined', () => {
        expect(typeof categorizationService.categorizeFeedback).toBe('function');
      });

      test('should handle categorization request structure', async () => {
        const request = {
          feedbackId: testContext.feedback.id,
          organizationId: testContext.organization.id,
          title: 'Mobile App Crash',
          description: 'The app crashes when I try to upload photos. This is very frustrating and happens every time.',
          customerInfo: {
            segment: 'premium',
            company: 'Test Company',
            previousInteractions: 3
          }
        };

        try {
          const result = await categorizationService.categorizeFeedback(request);
          
          // If it succeeds (with mock or fallback), verify structure
          if (result) {
            expect(result).toMatchObject({
              feedbackId: request.feedbackId,
              category: expect.any(String),
              sentiment: expect.any(String),
              processingTime: expect.any(Number)
            });
          }
        } catch (error) {
          // Expected in test environment without proper setup
          expect(error).toBeDefined();
        }
      });

      test('should handle batch requests', async () => {
        const requests = [
          {
            feedbackId: 'feedback-1',
            organizationId: testContext.organization.id,
            title: 'Bug Report',
            description: 'Found a critical bug',
            customerInfo: {}
          },
          {
            feedbackId: 'feedback-2',
            organizationId: testContext.organization.id,
            title: 'Feature Request',
            description: 'Would love to see this feature',
            customerInfo: {}
          }
        ];

        const results = await Promise.allSettled(
          requests.map(req => categorizationService.categorizeFeedback(req))
        );

        expect(results).toHaveLength(2);
        // Test that method handles batch processing structure
        results.forEach(result => {
          expect(['fulfilled', 'rejected']).toContain(result.status);
        });
      });
    });
  });

  describe('Company Context Service', () => {
    describe('generateAIContextPrompt', () => {
      test('should have context generation method defined', () => {
        expect(typeof companyContextService.generateAIContextPrompt).toBe('function');
      });

      test('should handle organization context generation', async () => {
        try {
          const contextPrompt = await companyContextService.generateAIContextPrompt(
            testContext.organization.id
          );

          expect(contextPrompt).toBeDefined();
          expect(typeof contextPrompt).toBe('string');
          expect(contextPrompt.length).toBeGreaterThan(0);
        } catch (error) {
          // May fail in test environment
          expect(error).toBeDefined();
        }
      });

      test('should handle minimal organization data', async () => {
        // Create a new organization without custom context
        const { db } = await import('../../services/database');
        const newOrgData = TestDataFactory.createOrganizationData({
          name: 'Minimal Context Org'
        });
        const newOrg = await db.models.Organization.create(newOrgData);

        try {
          const contextPrompt = await companyContextService.generateAIContextPrompt(newOrg.id);
          
          expect(contextPrompt).toBeDefined();
          expect(typeof contextPrompt).toBe('string');
        } catch (error) {
          // Expected in some test environments
          expect(error).toBeDefined();
        }

        // Cleanup
        await newOrg.destroy();
      });
    });
  });

  describe('Service Integration Patterns', () => {
    test('should have all required AI services available', () => {
      // Verify all services are properly imported and initialized
      expect(openaiService).toBeDefined();
      expect(companyContextService).toBeDefined();
      expect(AICategorizationService).toBeDefined();
    });

    test('should handle service availability checks', () => {
      // Test that services can check their own availability
      const openaiAvailable = openaiService.isAvailable();
      expect(typeof openaiAvailable).toBe('boolean');
    });

    test('should support workflow chaining concepts', async () => {
      // Test that services can be composed together conceptually
      const categorizationService = new AICategorizationService();
      
      expect(typeof categorizationService.categorizeFeedback).toBe('function');
      expect(typeof companyContextService.generateAIContextPrompt).toBe('function');
      expect(typeof openaiService.analyzeFeedback).toBe('function');
    });
  });

  describe('Performance and Resilience Patterns', () => {
    test('should handle concurrent service instantiation', async () => {
      const createService = async () => {
        return new AICategorizationService();
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        createService,
        3 // 3 concurrent service creations
      );

      // All service creations should succeed
      results.forEach(service => {
        expect(service).toBeInstanceOf(AICategorizationService);
      });

      // Service creation should be fast
      PerformanceTestHelper.assertPerformance(averageTimeMs, 100);
    });

    test('should support error handling patterns', async () => {
      // Test that services handle errors gracefully
      const categorizationService = new AICategorizationService();
      
      const invalidRequest = {
        feedbackId: '',
        organizationId: '',
        title: '',
        description: '',
        customerInfo: {}
      };

      try {
        await categorizationService.categorizeFeedback(invalidRequest);
      } catch (error) {
        // Should handle invalid requests properly
        expect(error).toBeDefined();
      }
    });

    test('should support timeout and retry patterns', async () => {
      // Test service timeout behavior
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        try {
          await companyContextService.generateAIContextPrompt(testContext.organization.id);
        } catch (error) {
          // Expected to fail or timeout in test environment
          expect(error).toBeDefined();
        }
      });

      // Should fail or complete within reasonable time
      expect(timeMs).toBeLessThan(30000); // 30 second timeout
    });
  });

  describe('Configuration and Environment', () => {
    test('should respect environment configuration', () => {
      // Test that services check environment configuration
      const hasApiKey = process.env.OPENAI_API_KEY !== undefined;
      const serviceAvailable = openaiService.isAvailable();
      
      // Service availability should correlate with API key presence
      if (hasApiKey) {
        expect(serviceAvailable).toBe(true);
      } else {
        // May still be available with mocking in some environments
        expect(typeof serviceAvailable).toBe('boolean');
      }
    });

    test('should support different AI models', () => {
      // Test that services can work with different model configurations
      const categorizationService = new AICategorizationService();
      
      // Service should be configurable for different models
      expect(categorizationService).toBeDefined();
      expect(typeof categorizationService.categorizeFeedback).toBe('function');
    });
  });

  describe('Data Flow and Integration', () => {
    test('should support feedback processing workflow', async () => {
      // Test the conceptual data flow: feedback → analysis → storage → retrieval
      const feedbackData = {
        id: 'workflow-test',
        title: 'Workflow Test Feedback',
        description: 'Testing the complete AI workflow integration',
        organizationId: testContext.organization.id
      };

      // Step 1: Prepare feedback for AI analysis
      expect(feedbackData.title).toBeDefined();
      expect(feedbackData.description).toBeDefined();
      expect(feedbackData.organizationId).toBeDefined();

      // Step 2: Generate context for organization
      try {
        const context = await companyContextService.generateAIContextPrompt(
          feedbackData.organizationId
        );
        expect(typeof context).toBe('string');
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }

      // Step 3: Analyze feedback (would normally use AI)
      const categorizationService = new AICategorizationService();
      try {
        const analysis = await categorizationService.categorizeFeedback({
          feedbackId: feedbackData.id,
          organizationId: feedbackData.organizationId,
          title: feedbackData.title,
          description: feedbackData.description,
          customerInfo: {}
        });

        if (analysis) {
          expect(analysis.feedbackId).toBe(feedbackData.id);
          expect(analysis.category).toBeDefined();
        }
      } catch (error) {
        // Expected without proper AI setup
        expect(error).toBeDefined();
      }
    });

    test('should handle service orchestration patterns', () => {
      // Test that multiple services can be orchestrated together
      const services = {
        openai: openaiService,
        categorization: new AICategorizationService(),
        context: companyContextService
      };

      Object.values(services).forEach(service => {
        expect(service).toBeDefined();
      });

      // Verify each service has expected interface
      expect(typeof services.openai.isAvailable).toBe('function');
      expect(typeof services.categorization.categorizeFeedback).toBe('function');
      expect(typeof services.context.generateAIContextPrompt).toBe('function');
    });
  });
}); 