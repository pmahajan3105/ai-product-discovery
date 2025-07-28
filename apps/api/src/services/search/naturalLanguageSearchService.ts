/**
 * Natural Language Search Service
 * Processes natural language queries and converts them to structured search filters
 */

import { langchainService } from '../ai/langchainService';
import { FeedbackFilters } from '../feedbackService';
import { companyContextService } from '../ai/companyContextService';

export interface SearchIntent {
  type: 'filter' | 'find' | 'analyze' | 'compare';
  confidence: number;
  extractedFilters: Partial<FeedbackFilters>;
  suggestedQuery: string;
  alternatives: string[];
}

export interface SearchSuggestion {
  type: 'category' | 'status' | 'assignee' | 'customer' | 'timeframe' | 'priority';
  value: string;
  display: string;
  confidence: number;
  context?: string;
}

export interface NaturalLanguageQuery {
  originalQuery: string;
  intent: SearchIntent;
  suggestions: SearchSuggestion[];
  processedQuery: string;
  metadata: {
    processingTime: number;
    confidenceScore: number;
    alternatives: string[];
  };
}

export class NaturalLanguageSearchService {
  private readonly intentPatterns = {
    filter: [
      /show me|find|get|list|display/i,
      /where|with|having|contains/i,
      /status is|priority is|assigned to/i
    ],
    find: [
      /find feedback|search for|look for/i,
      /customer|user|from/i
    ],
    analyze: [
      /analyze|insights|trends|patterns/i,
      /what are|how many|why/i
    ],
    compare: [
      /compare|versus|vs|difference/i,
      /between|before and after/i
    ]
  };

  private readonly filterPatterns = {
    status: {
      pattern: /status\s+(?:is|=|:)?\s*(new|triaged|planned|in_progress|resolved|archived)/gi,
      values: ['new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived']
    },
    priority: {
      pattern: /priority\s+(?:is|=|:)?\s*(low|medium|high|urgent)/gi,
      values: ['low', 'medium', 'high', 'urgent']
    },
    sentiment: {
      pattern: /sentiment\s+(?:is|=|:)?\s*(very_negative|negative|neutral|positive|very_positive)/gi,
      values: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    },
    category: {
      pattern: /category\s+(?:is|=|:)?\s*["']?([^"'\s,]+)["']?/gi,
      values: [] // Dynamic based on organization
    },
    timeframe: {
      pattern: /(last|past|within)\s+(\d+)\s+(day|week|month|year)s?/gi,
      values: []
    },
    assignee: {
      pattern: /assigned\s+to\s+["']?([^"'\s,]+)["']?/gi,
      values: []
    },
    customer: {
      pattern: /(?:from|by|customer)\s+["']?([^"'\s,]+)["']?/gi,
      values: []
    }
  };

  /**
   * Process natural language query into structured search
   */
  async processQuery(
    query: string, 
    organizationId: string, 
    userId: string
  ): Promise<NaturalLanguageQuery> {
    const startTime = Date.now();

    try {
      // Get company context for better understanding
      const companyContext = await companyContextService.getCompanyContext(organizationId);
      
      // Detect intent
      const intent = await this.detectIntent(query, companyContext);
      
      // Extract filters from query
      const extractedFilters = await this.extractFilters(query, organizationId);
      
      // Generate suggestions
      const suggestions = await this.generateSuggestions(query, extractedFilters, organizationId);
      
      // Create processed query
      const processedQuery = this.createProcessedQuery(query, extractedFilters);
      
      const processingTime = Date.now() - startTime;
      
      return {
        originalQuery: query,
        intent,
        suggestions,
        processedQuery,
        metadata: {
          processingTime,
          confidenceScore: intent.confidence,
          alternatives: intent.alternatives
        }
      };
    } catch (error) {
      console.error('Natural language search processing failed:', error);
      
      // Fallback to basic processing
      return {
        originalQuery: query,
        intent: {
          type: 'filter',
          confidence: 0.5,
          extractedFilters: { search: query },
          suggestedQuery: query,
          alternatives: []
        },
        suggestions: [],
        processedQuery: query,
        metadata: {
          processingTime: Date.now() - startTime,
          confidenceScore: 0.5,
          alternatives: []
        }
      };
    }
  }

  /**
   * Detect search intent from natural language
   */
  private async detectIntent(query: string, companyContext: any): Promise<SearchIntent> {
    const intentScores = {
      filter: 0,
      find: 0,
      analyze: 0,
      compare: 0
    };

    // Pattern-based intent detection
    for (const [intentType, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          intentScores[intentType as keyof typeof intentScores] += 0.3;
        }
      }
    }

    // AI-enhanced intent detection for complex queries
    if (query.length > 50 || Object.values(intentScores).every(score => score < 0.5)) {
      try {
        const aiIntent = await this.detectIntentWithAI(query, companyContext);
        if (aiIntent) {
          intentScores[aiIntent.type] = Math.max(intentScores[aiIntent.type], aiIntent.confidence);
        }
      } catch (error) {
        console.warn('AI intent detection failed, using pattern-based fallback');
      }
    }

    // Determine primary intent
    const primaryIntent = Object.entries(intentScores).reduce((a, b) => 
      intentScores[a[0] as keyof typeof intentScores] > intentScores[b[0] as keyof typeof intentScores] ? a : b
    )[0] as keyof typeof intentScores;

    const confidence = intentScores[primaryIntent];
    
    // Extract basic filters for intent
    const extractedFilters = this.extractBasicFilters(query);
    
    return {
      type: primaryIntent,
      confidence: Math.min(confidence, 1.0),
      extractedFilters,
      suggestedQuery: this.createSuggestedQuery(query, primaryIntent),
      alternatives: this.generateAlternatives(query, primaryIntent)
    };
  }

  /**
   * Use AI to detect complex search intents
   */
  private async detectIntentWithAI(query: string, companyContext: any): Promise<{type: string, confidence: number} | null> {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }

    try {
      const contextPrompt = companyContext ? 
        await companyContextService.generateAIContextPrompt(companyContext.profile.organizationId) : 
        "You are analyzing search queries for a general software company.";

      const intentPrompt = `${contextPrompt}

Analyze the following search query and determine the user's intent. Return a JSON response:

{
  "type": "filter|find|analyze|compare",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Intent types:
- filter: User wants to filter/search existing feedback
- find: User wants to find specific feedback items
- analyze: User wants insights/analysis of feedback data
- compare: User wants to compare different aspects

Query: "${query}"`;

      // Use the categorization chain as a way to process text
      const chain = await langchainService.createCategorizationChain(companyContext?.profile?.organizationId || 'default');
      if (!chain) {
        return null;
      }

      // This is a simplified approach - in a real implementation, you'd create a specific intent detection chain
      // For now, use pattern matching as the primary method
      return null;
    } catch (error) {
      console.warn('AI intent detection failed:', error);
      return null;
    }
  }

  /**
   * Extract filters from natural language query
   */
  private async extractFilters(query: string, organizationId: string): Promise<Partial<FeedbackFilters>> {
    const filters: Partial<FeedbackFilters> = {};

    // Extract status filters
    const statusMatches = Array.from(query.matchAll(this.filterPatterns.status.pattern));
    if (statusMatches.length > 0) {
      filters.status = statusMatches.map(match => match[1].toLowerCase().replace(' ', '_'));
    }

    // Extract priority filters
    const priorityMatches = Array.from(query.matchAll(this.filterPatterns.priority.pattern));
    if (priorityMatches.length > 0) {
      filters.priority = priorityMatches.map(match => match[1].toLowerCase());
    }

    // Extract sentiment filters
    const sentimentMatches = Array.from(query.matchAll(this.filterPatterns.sentiment.pattern));
    if (sentimentMatches.length > 0) {
      filters.sentiment = sentimentMatches.map(match => match[1].toLowerCase());
    }

    // Extract date range
    const timeframeMatches = Array.from(query.matchAll(this.filterPatterns.timeframe.pattern));
    if (timeframeMatches.length > 0) {
      const match = timeframeMatches[0];
      const amount = parseInt(match[2]);
      const unit = match[3];
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (unit) {
        case 'day':
          startDate.setDate(startDate.getDate() - amount);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - (amount * 7));
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - amount);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - amount);
          break;
      }
      
      filters.dateRange = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      };
    }

    // Extract remaining search terms as general search
    let searchTerms = query;
    
    // Remove extracted filter terms
    searchTerms = searchTerms.replace(this.filterPatterns.status.pattern, '');
    searchTerms = searchTerms.replace(this.filterPatterns.priority.pattern, '');
    searchTerms = searchTerms.replace(this.filterPatterns.sentiment.pattern, '');
    searchTerms = searchTerms.replace(this.filterPatterns.timeframe.pattern, '');
    
    // Clean up search terms
    searchTerms = searchTerms.replace(/\s+/g, ' ').trim();
    
    if (searchTerms) {
      filters.search = searchTerms;
    }

    return filters;
  }

  /**
   * Generate smart search suggestions
   */
  private async generateSuggestions(
    query: string, 
    extractedFilters: Partial<FeedbackFilters>,
    organizationId: string
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    try {
      // Get company context for relevant suggestions
      const companyContext = await companyContextService.getCompanyContext(organizationId);
      
      // Suggest categories based on company context
      if (companyContext?.feedbackPatterns?.commonCategories) {
        const categoryMatches = companyContext.feedbackPatterns.commonCategories
          .filter(cat => cat.category.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
          
        for (const category of categoryMatches) {
          suggestions.push({
            type: 'category',
            value: category.category,
            display: `Category: ${category.category} (${category.count} items)`,
            confidence: 0.8,
            context: `${category.trend > 0 ? 'Trending up' : 'Stable'}`
          });
        }
      }

      // Suggest status filters if not already specified
      if (!extractedFilters.status) {
        const statusSuggestions = ['new', 'in_progress', 'resolved']
          .filter(status => status.includes(query.toLowerCase()));
          
        for (const status of statusSuggestions) {
          suggestions.push({
            type: 'status',
            value: status,
            display: `Status: ${status.replace('_', ' ')}`,
            confidence: 0.7
          });
        }
      }

      // Suggest priority filters
      if (!extractedFilters.priority) {
        const prioritySuggestions = ['high', 'urgent', 'medium', 'low']
          .filter(priority => priority.includes(query.toLowerCase()));
          
        for (const priority of prioritySuggestions) {
          suggestions.push({
            type: 'priority',
            value: priority,
            display: `Priority: ${priority}`,
            confidence: 0.7
          });
        }
      }

      // Suggest timeframe filters
      if (!extractedFilters.dateRange) {
        const timeframeSuggestions = [
          { value: 'last 7 days', display: 'Last 7 days' },
          { value: 'last 30 days', display: 'Last 30 days' },
          { value: 'last 3 months', display: 'Last 3 months' }
        ];
        
        for (const timeframe of timeframeSuggestions) {
          suggestions.push({
            type: 'timeframe',
            value: timeframe.value,
            display: timeframe.display,
            confidence: 0.6
          });
        }
      }

    } catch (error) {
      console.warn('Failed to generate suggestions:', error);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract basic filters using pattern matching
   */
  private extractBasicFilters(query: string): Partial<FeedbackFilters> {
    const filters: Partial<FeedbackFilters> = {};

    // Simple keyword detection
    if (query.includes('urgent') || query.includes('critical')) {
      filters.priority = ['urgent', 'high'];
    }

    if (query.includes('new') && !query.includes('not new')) {
      filters.status = ['new'];
    }

    if (query.includes('resolved') || query.includes('closed')) {
      filters.status = ['resolved'];
    }

    return filters;
  }

  /**
   * Create suggested query based on intent
   */
  private createSuggestedQuery(query: string, intent: string): string {
    switch (intent) {
      case 'analyze':
        return `Show insights for: ${query}`;
      case 'compare':
        return `Compare ${query}`;
      case 'find':
        return `Find feedback about: ${query}`;
      default:
        return query;
    }
  }

  /**
   * Generate alternative query suggestions
   */
  private generateAlternatives(query: string, intent: string): string[] {
    const alternatives: string[] = [];

    // Add common alternative phrasings
    if (intent === 'filter') {
      alternatives.push(`Show me all ${query}`);
      alternatives.push(`List ${query}`);
    }

    if (intent === 'analyze') {
      alternatives.push(`What are the trends in ${query}?`);
      alternatives.push(`Give me insights about ${query}`);
    }

    return alternatives.slice(0, 3);
  }

  /**
   * Create processed query from extracted filters
   */
  private createProcessedQuery(query: string, filters: Partial<FeedbackFilters>): string {
    const parts: string[] = [];

    if (filters.search) {
      parts.push(filters.search);
    }

    if (filters.status?.length) {
      parts.push(`status:${filters.status.join(',')}`);
    }

    if (filters.priority?.length) {
      parts.push(`priority:${filters.priority.join(',')}`);
    }

    if (filters.sentiment?.length) {
      parts.push(`sentiment:${filters.sentiment.join(',')}`);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      parts.push(`date:${start.toLocaleDateString()}-${end.toLocaleDateString()}`);
    }

    return parts.join(' ') || query;
  }

  /**
   * Get search suggestions for auto-complete
   */
  async getSearchSuggestions(
    partialQuery: string,
    organizationId: string,
    limit: number = 5
  ): Promise<SearchSuggestion[]> {
    if (partialQuery.length < 2) {
      return [];
    }

    const suggestions: SearchSuggestion[] = [];

    try {
      // Get company context for relevant suggestions
      const companyContext = await companyContextService.getCompanyContext(organizationId);
      
      // Category suggestions
      if (companyContext?.feedbackPatterns?.commonCategories) {
        const categoryMatches = companyContext.feedbackPatterns.commonCategories
          .filter(cat => 
            cat.category.toLowerCase().includes(partialQuery.toLowerCase()) ||
            partialQuery.toLowerCase().includes(cat.category.toLowerCase())
          )
          .slice(0, 3);
          
        for (const category of categoryMatches) {
          suggestions.push({
            type: 'category',
            value: `category:${category.category}`,
            display: `${category.category} (${category.count} items)`,
            confidence: 0.9
          });
        }
      }

      // Predefined suggestions
      const predefinedSuggestions = [
        { query: 'urgent', display: 'Urgent feedback', type: 'priority' as const },
        { query: 'new status', display: 'New feedback', type: 'status' as const },
        { query: 'last 7 days', display: 'Recent feedback', type: 'timeframe' as const },
        { query: 'negative sentiment', display: 'Negative feedback', type: 'priority' as const },
        { query: 'performance', display: 'Performance issues', type: 'category' as const }
      ];

      for (const suggestion of predefinedSuggestions) {
        if (suggestion.query.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push({
            type: suggestion.type,
            value: suggestion.query,
            display: suggestion.display,
            confidence: 0.7
          });
        }
      }

    } catch (error) {
      console.warn('Failed to get search suggestions:', error);
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}

export const naturalLanguageSearchService = new NaturalLanguageSearchService();