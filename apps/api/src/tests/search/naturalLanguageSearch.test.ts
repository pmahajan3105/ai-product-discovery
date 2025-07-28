/**
 * Natural Language Search Service Tests
 */

import { naturalLanguageSearchService } from '../../services/search/naturalLanguageSearchService';
import { companyContextService } from '../../services/ai/companyContextService';

// Mock company context service
jest.mock('../../services/ai/companyContextService');
const mockCompanyContextService = companyContextService as jest.Mocked<typeof companyContextService>;

describe('NaturalLanguageSearchService', () => {
  const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '987fcdeb-51d2-43b8-a765-123456789012';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock company context
    mockCompanyContextService.getCompanyContext.mockResolvedValue({
      profile: {
        organizationId: mockOrganizationId,
        industry: 'Technology',
        productType: 'Project Management Software',
        companySize: 'Growth',
        targetMarket: 'Mid-market businesses',
        businessGoals: ['Increase user engagement', 'Reduce churn'],
        currentChallenges: ['Performance issues', 'User onboarding'],
        productFeatures: ['Task management', 'Team collaboration'],
        priorityKeywords: ['performance', 'slow', 'crash', 'bug'],
        customerValueWords: ['enterprise', 'premium', 'annual'],
        customerSegments: [
          { name: 'Enterprise', characteristics: ['complex workflows'], value: 'high' }
        ]
      },
      feedbackPatterns: {
        commonCategories: [
          { category: 'performance-issues', count: 45, trend: 1 },
          { category: 'feature-requests', count: 32, trend: 0 },
          { category: 'bug-reports', count: 28, trend: -1 }
        ]
      }
    });
  });

  describe('processQuery', () => {
    it('should process simple filter queries', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'show me urgent issues',
        mockOrganizationId,
        mockUserId
      );

      expect(result.originalQuery).toBe('show me urgent issues');
      expect(result.intent.type).toBe('filter');
      expect(result.intent.extractedFilters.priority).toContain('urgent');
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    it('should extract status filters correctly', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'list all new feedback items',
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.status).toContain('new');
      expect(result.intent.type).toBe('filter');
    });

    it('should extract date range filters', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'feedback from last 7 days',
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.dateRange).toBeDefined();
      expect(result.intent.extractedFilters.dateRange?.start).toBeDefined();
      expect(result.intent.extractedFilters.dateRange?.end).toBeDefined();
    });

    it('should detect analyze intent', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'analyze customer feedback trends',
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.type).toBe('analyze');
      expect(result.intent.confidence).toBeGreaterThan(0);
    });

    it('should detect compare intent', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'compare feedback from this month vs last month',
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.type).toBe('compare');
    });

    it('should handle complex multi-filter queries', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'show urgent high priority issues from last week status new',
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.priority).toEqual(expect.arrayContaining(['urgent', 'high']));
      expect(result.intent.extractedFilters.status).toContain('new');
      expect(result.intent.extractedFilters.dateRange).toBeDefined();
    });

    it('should generate relevant suggestions', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'performance',
        mockOrganizationId,
        mockUserId
      );

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      // Should suggest performance-related categories
      const categorySuggestion = result.suggestions.find(s => s.type === 'category');
      expect(categorySuggestion).toBeDefined();
    });

    it('should handle queries with no matches gracefully', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'xyz abc random text',
        mockOrganizationId,
        mockUserId
      );

      expect(result.originalQuery).toBe('xyz abc random text');
      expect(result.intent.extractedFilters.search).toBe('xyz abc random text');
      expect(result.metadata.confidenceScore).toBeLessThan(1.0);
    });

    it('should handle empty queries', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        '',
        mockOrganizationId,
        mockUserId
      );

      expect(result.originalQuery).toBe('');
      expect(result.intent.confidence).toBeLessThan(1.0);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return relevant suggestions for partial queries', async () => {
      const suggestions = await naturalLanguageSearchService.getSearchSuggestions(
        'perf',
        mockOrganizationId,
        5
      );

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      
      // Should include performance-related suggestions
      const performanceSuggestion = suggestions.find(s => 
        s.display.toLowerCase().includes('performance')
      );
      expect(performanceSuggestion).toBeDefined();
    });

    it('should return empty array for very short queries', async () => {
      const suggestions = await naturalLanguageSearchService.getSearchSuggestions(
        'a',
        mockOrganizationId,
        5
      );

      expect(suggestions).toEqual([]);
    });

    it('should limit suggestions correctly', async () => {
      const suggestions = await naturalLanguageSearchService.getSearchSuggestions(
        'status',
        mockOrganizationId,
        3
      );

      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should return suggestions sorted by confidence', async () => {
      const suggestions = await naturalLanguageSearchService.getSearchSuggestions(
        'urgent',
        mockOrganizationId,
        10
      );

      // Verify suggestions are sorted by confidence (descending)
      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });
  });

  describe('extractFilters', () => {
    it('should extract multiple status values', async () => {
      const query = 'status is new or in_progress';
      const result = await naturalLanguageSearchService.processQuery(
        query,
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.status).toEqual(
        expect.arrayContaining(['new', 'in_progress'])
      );
    });

    it('should extract priority filters correctly', async () => {
      const query = 'priority high and urgent';
      const result = await naturalLanguageSearchService.processQuery(
        query,
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.priority).toEqual(
        expect.arrayContaining(['high', 'urgent'])
      );
    });

    it('should extract sentiment filters', async () => {
      const query = 'sentiment negative';
      const result = await naturalLanguageSearchService.processQuery(
        query,
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.sentiment).toContain('negative');
    });

    it('should preserve search terms after filter extraction', async () => {
      const query = 'dashboard loading issues status new priority high';
      const result = await naturalLanguageSearchService.processQuery(
        query,
        mockOrganizationId,
        mockUserId
      );

      expect(result.intent.extractedFilters.search).toContain('dashboard loading issues');
      expect(result.intent.extractedFilters.status).toContain('new');
      expect(result.intent.extractedFilters.priority).toContain('high');
    });
  });

  describe('intent detection', () => {
    const intentTestCases = [
      { query: 'show me all feedback', expectedIntent: 'filter' },
      { query: 'find feedback from customer XYZ', expectedIntent: 'find' },
      { query: 'analyze feedback trends', expectedIntent: 'analyze' },
      { query: 'compare this month vs last month', expectedIntent: 'compare' },
      { query: 'list urgent issues', expectedIntent: 'filter' },
      { query: 'what are the main problems?', expectedIntent: 'analyze' },
      { query: 'how many complaints do we have?', expectedIntent: 'analyze' }
    ];

    test.each(intentTestCases)(
      'should detect $expectedIntent intent for query: "$query"',
      async ({ query, expectedIntent }) => {
        const result = await naturalLanguageSearchService.processQuery(
          query,
          mockOrganizationId,
          mockUserId
        );

        expect(result.intent.type).toBe(expectedIntent);
      }
    );
  });

  describe('error handling', () => {
    it('should handle company context service errors gracefully', async () => {
      mockCompanyContextService.getCompanyContext.mockRejectedValue(
        new Error('Context service unavailable')
      );

      const result = await naturalLanguageSearchService.processQuery(
        'show urgent issues',
        mockOrganizationId,
        mockUserId
      );

      // Should still return a valid result
      expect(result.originalQuery).toBe('show urgent issues');
      expect(result.intent).toBeDefined();
      expect(result.metadata.confidenceScore).toBeLessThan(1.0);
    });

    it('should handle invalid organization IDs', async () => {
      const result = await naturalLanguageSearchService.processQuery(
        'test query',
        'invalid-org-id',
        mockUserId
      );

      expect(result.originalQuery).toBe('test query');
      expect(result.intent.extractedFilters.search).toBe('test query');
    });
  });

  describe('performance', () => {
    it('should process queries within reasonable time', async () => {
      const startTime = Date.now();
      
      await naturalLanguageSearchService.processQuery(
        'show me urgent performance issues from last week',
        mockOrganizationId,
        mockUserId
      );
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process within 2 seconds
      expect(processingTime).toBeLessThan(2000);
    });

    it('should handle concurrent requests', async () => {
      const queries = [
        'urgent issues',
        'new feedback',
        'performance problems',
        'customer complaints',
        'feature requests'
      ];

      const promises = queries.map(query =>
        naturalLanguageSearchService.processQuery(query, mockOrganizationId, mockUserId)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.originalQuery).toBe(queries[index]);
        expect(result.intent).toBeDefined();
      });
    });
  });
});