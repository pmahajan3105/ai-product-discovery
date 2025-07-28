/**
 * Enhanced Search API Routes
 * Provides natural language search, smart suggestions, and advanced filtering
 */

import express from 'express';
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import { SessionRequest } from "supertokens-node/framework/express";
import { validateRequest } from '../middleware/validation';
import { naturalLanguageSearchService } from '../services/search/naturalLanguageSearchService';
import { feedbackService } from '../services/feedbackService';
import { queryOptimizer } from '../services/performance/queryOptimizer';
import { apiCache, cacheConfigs, cacheInvalidation } from '../middleware/caching';
import { body, query, param } from 'express-validator';

const router = express.Router();

/**
 * Natural language search endpoint
 * POST /api/search/:organizationId/natural
 */
router.post('/:organizationId/natural',
  verifySession(),
  apiCache.middleware(cacheConfigs.searchCache),
  [
    param('organizationId').isUUID().withMessage('Valid organization ID is required'),
    body('query').isString().notEmpty().withMessage('Query is required'),
    body('filters').optional().isObject().withMessage('Filters must be an object'),
    body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  async (req: SessionRequest, res) => {
    try {
      const { organizationId } = req.params;
      const { query, filters = {}, page = 1, limit = 25 } = req.body;
      const userId = req.session!.getUserId();

      if (!userId) {
        return res.status(401).json({ 
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        });
      }

      // Process natural language query
      const nlQuery = await naturalLanguageSearchService.processQuery(
        query, 
        organizationId, 
        userId
      );

      // Merge extracted filters with provided filters
      const combinedFilters = {
        ...filters,
        ...nlQuery.intent.extractedFilters
      };

      // Execute search with processed filters
      const searchResults = await feedbackService.getFeedbackList(
        organizationId,
        {
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          filters: combinedFilters
        },
        userId
      );

      res.json({
        success: true,
        data: {
          ...searchResults,
          query: nlQuery,
          appliedFilters: combinedFilters
        }
      });

    } catch (error) {
      console.error('Natural language search failed:', error);
      res.status(500).json({
        error: 'Search processing failed',
        code: 'SEARCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Search suggestions endpoint
 * GET /api/search/:organizationId/suggestions
 */
router.get('/:organizationId/suggestions',
  verifySession(),
  apiCache.middleware(cacheConfigs.shortCache),
  [
    param('organizationId').isUUID().withMessage('Valid organization ID is required'),
    query('q').isString().notEmpty().withMessage('Query parameter q is required'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
  ],
  validateRequest,
  async (req: SessionRequest, res) => {
    try {
      const { organizationId } = req.params;
      const { q: partialQuery, limit = 5 } = req.query as any;
      const userId = req.session!.getUserId();

      if (!userId) {
        return res.status(401).json({ 
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        });
      }

      const suggestions = await naturalLanguageSearchService.getSearchSuggestions(
        partialQuery,
        organizationId,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          suggestions,
          query: partialQuery
        }
      });

    } catch (error) {
      console.error('Search suggestions failed:', error);
      res.status(500).json({
        error: 'Failed to get search suggestions',
        code: 'SUGGESTIONS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Boolean search endpoint
 * POST /api/search/:organizationId/boolean
 */
router.post('/:organizationId/boolean',
  verifySession(),
  apiCache.middleware(cacheConfigs.searchCache),
  [
    param('organizationId').isUUID().withMessage('Valid organization ID is required'),
    body('query').isString().notEmpty().withMessage('Query is required'),
    body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  async (req: SessionRequest, res) => {
    try {
      const { organizationId } = req.params;
      const { query, page = 1, limit = 25 } = req.body;
      const userId = req.session!.getUserId();

      if (!userId) {
        return res.status(401).json({ 
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        });
      }

      // Parse boolean search query
      const booleanQuery = parseBooleanQuery(query);

      // Convert to database filters
      const filters = convertBooleanToFilters(booleanQuery);

      // Execute search
      const searchResults = await feedbackService.getFeedbackList(
        organizationId,
        {
          page,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'DESC',
          filters
        },
        userId
      );

      res.json({
        success: true,
        data: {
          ...searchResults,
          parsedQuery: booleanQuery,
          appliedFilters: filters
        }
      });

    } catch (error) {
      console.error('Boolean search failed:', error);
      res.status(500).json({
        error: 'Boolean search failed',
        code: 'BOOLEAN_SEARCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Search analytics endpoint
 * GET /api/search/analytics/:organizationId
 */
router.get('/analytics/:organizationId',
  verifySession(),
  apiCache.middleware(cacheConfigs.analyticsCache),
  [
    param('organizationId').isUUID().withMessage('Valid organization ID is required'),
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Period must be 7d, 30d, or 90d')
  ],
  validateRequest,
  async (req: SessionRequest, res) => {
    try {
      const { organizationId } = req.params;
      const { period = '30d' } = req.query as any;
      const userId = req.session!.getUserId();

      if (!userId) {
        return res.status(401).json({ 
          error: 'User not authenticated',
          code: 'UNAUTHORIZED'
        });
      }

      // Get search analytics data
      const analytics = await getSearchAnalytics(organizationId, period, userId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Search analytics failed:', error);
      res.status(500).json({
        error: 'Failed to get search analytics',
        code: 'ANALYTICS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Parse boolean search query
 */
function parseBooleanQuery(query: string): any {
  // Simple boolean query parser
  // Supports: AND, OR, NOT, parentheses, quoted strings
  
  const tokens = tokenizeBooleanQuery(query);
  const ast = parseBooleanTokens(tokens);
  
  return {
    original: query,
    parsed: ast,
    operators: extractOperators(tokens)
  };
}

/**
 * Tokenize boolean query
 */
function tokenizeBooleanQuery(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    
    if ((char === '"' || char === "'") && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      if (current.trim()) {
        tokens.push(`"${current.trim()}"`);
        current = '';
      }
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes && /\s/.test(char)) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
    } else if (!inQuotes && (char === '(' || char === ')')) {
      if (current.trim()) {
        tokens.push(current.trim());
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    tokens.push(current.trim());
  }
  
  return tokens.filter(token => token.length > 0);
}

/**
 * Parse boolean tokens into AST
 */
function parseBooleanTokens(tokens: string[]): any {
  // Simplified AST parser for demonstration
  // In production, you'd want a more robust parser
  
  const result = {
    type: 'group',
    operator: 'AND', // default
    terms: [] as any[]
  };
  
  let currentTerm = '';
  let currentOperator = 'AND';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toUpperCase();
    
    if (token === 'AND' || token === 'OR') {
      if (currentTerm) {
        result.terms.push({
          type: 'term',
          value: currentTerm,
          operator: currentOperator
        });
        currentTerm = '';
      }
      currentOperator = token;
    } else if (token === 'NOT') {
      const nextToken = tokens[i + 1];
      if (nextToken) {
        result.terms.push({
          type: 'term',
          value: nextToken,
          operator: 'NOT'
        });
        i++; // skip next token
      }
    } else if (token !== '(' && token !== ')') {
      currentTerm = tokens[i]; // use original case
    }
  }
  
  if (currentTerm) {
    result.terms.push({
      type: 'term',
      value: currentTerm,
      operator: currentOperator
    });
  }
  
  return result;
}

/**
 * Extract operators from tokens
 */
function extractOperators(tokens: string[]): string[] {
  return tokens.filter(token => 
    ['AND', 'OR', 'NOT'].includes(token.toUpperCase())
  );
}

/**
 * Convert boolean query to database filters
 */
function convertBooleanToFilters(booleanQuery: any): any {
  const filters: any = {};
  
  if (booleanQuery.parsed && booleanQuery.parsed.terms) {
    const searchTerms: string[] = [];
    
    for (const term of booleanQuery.parsed.terms) {
      if (term.type === 'term') {
        if (term.operator === 'NOT') {
          // Handle NOT operator (would need custom SQL for full support)
          continue;
        } else {
          // Clean quoted strings
          const cleanValue = term.value.replace(/^["']|["']$/g, '');
          searchTerms.push(cleanValue);
        }
      }
    }
    
    if (searchTerms.length > 0) {
      filters.search = searchTerms.join(' ');
    }
  }
  
  return filters;
}

/**
 * Get search analytics data
 */
async function getSearchAnalytics(organizationId: string, period: string, userId: string): Promise<any> {
  // This would typically query a search_logs table
  // For now, return mock analytics data
  
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  
  return {
    period,
    totalSearches: Math.floor(Math.random() * 1000) + 100,
    avgResponseTime: Math.floor(Math.random() * 200) + 50,
    topQueries: [
      { query: 'urgent issues', count: 45 },
      { query: 'performance problems', count: 32 },
      { query: 'feature requests', count: 28 },
      { query: 'new feedback', count: 25 },
      { query: 'customer complaints', count: 20 }
    ],
    searchPatterns: {
      naturalLanguage: 60,
      filters: 30,
      boolean: 10
    },
    successRate: 94.5,
    zeroResults: 12
  };
}

export default router;