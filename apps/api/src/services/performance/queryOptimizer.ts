/**
 * Query Optimizer Service
 * Optimizes database queries for maximum performance
 */

import { Op, Sequelize, QueryTypes } from 'sequelize';
import { db } from '../database';

export interface QueryOptimizationStats {
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexUsed: boolean;
  optimizationSuggestions: string[];
}

export interface OptimizedQuery {
  query: any;
  stats?: QueryOptimizationStats;
  cacheKey: string;
  cacheTTL: number;
}

export class QueryOptimizer {
  private queryCache = new Map<string, { data: any; expires: number }>();
  private performanceMetrics = new Map<string, QueryOptimizationStats[]>();

  /**
   * Optimize feedback list queries with intelligent index usage
   */
  optimizeFeedbackQuery(organizationId: string, filters: any = {}, options: any = {}): OptimizedQuery {
    const cacheKey = this.generateCacheKey('feedback', { organizationId, filters, options });
    
    // Build optimized where clause using compound indexes
    const where: any = { organizationId };
    const include: any[] = [];
    
    // Use compound index for status + priority + created_at
    if (filters.status || filters.priority || options.sortBy === 'createdAt') {
      if (filters.status?.length) {
        where.status = { [Op.in]: filters.status };
      }
      if (filters.priority?.length) {
        where.priority = { [Op.in]: filters.priority };
      }
    }

    // Optimize category filtering
    if (filters.category?.length) {
      where.category = { [Op.in]: filters.category };
    }

    // Optimize customer filtering with join
    if (filters.customerId?.length || filters.hasCustomer !== undefined) {
      if (filters.customerId?.length) {
        where.customerId = { [Op.in]: filters.customerId };
      } else if (filters.hasCustomer !== undefined) {
        where.customerId = filters.hasCustomer ? { [Op.not]: null } : { [Op.is]: null };
      }
      
      // Only include customer data if needed
      if (filters.customerId?.length || filters.hasCustomer) {
        include.push({
          model: db.models.Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'company', 'avatar'],
          required: false
        });
      }
    }

    // Optimize assignee filtering
    if (filters.assignedTo?.length || filters.isAssigned !== undefined) {
      if (filters.assignedTo?.length) {
        where.assignedTo = { [Op.in]: filters.assignedTo };
      } else if (filters.isAssigned !== undefined) {
        where.assignedTo = filters.isAssigned ? { [Op.not]: null } : { [Op.is]: null };
      }

      // Only include assignee data if needed
      include.push({
        model: db.models.User,
        as: 'assignee',
        attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage'],
        required: false
      });
    }

    // Optimize date range filtering
    if (filters.dateRange) {
      where.createdAt = {
        [Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }

    // Optimize search with text search
    if (filters.search) {
      const searchConditions = this.buildOptimizedSearchConditions(filters.search);
      where[Op.and] = where[Op.and] ? [...where[Op.and], searchConditions] : [searchConditions];
    }

    // Optimize ordering
    let order: any[] = [];
    if (options.sortBy) {
      order = [[options.sortBy, options.sortOrder || 'DESC']];
    } else {
      // Default to created_at for index usage
      order = [['createdAt', 'DESC']];
    }

    const query = {
      where,
      include,
      order,
      limit: options.limit || 25,
      offset: options.offset || 0,
      subQuery: false, // Important for performance with includes
    };

    return {
      query,
      cacheKey,
      cacheTTL: this.determineCacheTTL(filters)
    };
  }

  /**
   * Build optimized search conditions using indexes
   */
  private buildOptimizedSearchConditions(searchQuery: string): any {
    const searchTerms = searchQuery.trim().split(/\s+/);
    
    // Use title index for primary search, then fall back to description
    const conditions = [];
    
    for (const term of searchTerms) {
      conditions.push({
        [Op.or]: [
          // Use title index first (faster)
          { title: { [Op.iLike]: `%${term}%` } },
          // Then description (slower but necessary)
          { description: { [Op.iLike]: `%${term}%` } },
          // Category is indexed
          { category: { [Op.iLike]: `%${term}%` } },
          // Source is smaller field
          { source: { [Op.iLike]: `%${term}%` } }
        ]
      });
    }

    return { [Op.and]: conditions };
  }

  /**
   * Optimize customer queries
   */
  optimizeCustomerQuery(organizationId: string, filters: any = {}, options: any = {}): OptimizedQuery {
    const cacheKey = this.generateCacheKey('customers', { organizationId, filters, options });
    
    const where: any = { organizationId };
    
    // Use email index for search
    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${filters.search}%` } },
        { email: { [Op.iLike]: `%${filters.search}%` } },
        { company: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const query = {
      where,
      order: [['createdAt', 'DESC']],
      limit: options.limit || 25,
      offset: options.offset || 0
    };

    return {
      query,
      cacheKey,
      cacheTTL: 300 // 5 minutes for customer data
    };
  }

  /**
   * Optimize analytics queries with aggregation
   */
  async getOptimizedAnalytics(organizationId: string, period: string = '30d'): Promise<any> {
    const cacheKey = `analytics:${organizationId}:${period}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Use raw queries with proper indexes for analytics
    const [statusCounts, categoryCounts, trendData] = await Promise.all([
      // Status distribution (uses org + status index)
      db.sequelize.query(`
        SELECT status, COUNT(*) as count
        FROM feedback 
        WHERE organization_id = :orgId 
          AND created_at >= :startDate
        GROUP BY status
        ORDER BY count DESC
      `, {
        replacements: { orgId: organizationId, startDate },
        type: QueryTypes.SELECT
      }),

      // Category distribution (uses org + category index)
      db.sequelize.query(`
        SELECT category, COUNT(*) as count
        FROM feedback 
        WHERE organization_id = :orgId 
          AND created_at >= :startDate
          AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `, {
        replacements: { orgId: organizationId, startDate },
        type: QueryTypes.SELECT
      }),

      // Daily trend data (uses org + created_at index)
      db.sequelize.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
        FROM feedback 
        WHERE organization_id = :orgId 
          AND created_at >= :startDate
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, {
        replacements: { orgId: organizationId, startDate },
        type: QueryTypes.SELECT
      })
    ]);

    const result = {
      statusCounts,
      categoryCounts,
      trendData,
      generatedAt: new Date().toISOString()
    };

    this.setCache(cacheKey, result, 600); // 10 minutes
    return result;
  }

  /**
   * Query performance monitoring
   */
  async analyzeQueryPerformance(query: string, params: any = {}): Promise<QueryOptimizationStats> {
    const startTime = Date.now();
    
    try {
      // Execute EXPLAIN ANALYZE for PostgreSQL
      const explainResult = await db.sequelize.query(`EXPLAIN (ANALYZE, BUFFERS) ${query}`, {
        replacements: params,
        type: QueryTypes.SELECT
      });

      const executionTime = Date.now() - startTime;
      
      // Parse explain output for metrics
      const stats: QueryOptimizationStats = {
        executionTime,
        rowsExamined: this.extractRowsFromExplain(explainResult),
        rowsReturned: 0, // Would need to be set by caller
        indexUsed: this.checkIndexUsage(explainResult),
        optimizationSuggestions: this.generateOptimizationSuggestions(explainResult)
      };

      return stats;
    } catch (error) {
      return {
        executionTime: Date.now() - startTime,
        rowsExamined: 0,
        rowsReturned: 0,
        indexUsed: false,
        optimizationSuggestions: ['Query analysis failed: ' + error.message]
      };
    }
  }

  /**
   * Cache management
   */
  private generateCacheKey(type: string, params: any): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private determineCacheTTL(filters: any): number {
    // Real-time data (search, filters) - short cache
    if (filters.search || filters.status?.includes('new')) {
      return 60; // 1 minute
    }
    
    // Historical data - longer cache
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const daysSince = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7 ? 3600 : 300; // 1 hour for old data, 5 minutes for recent
    }
    
    return 300; // 5 minutes default
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.queryCache.set(key, {
      data,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  /**
   * Performance analysis helpers
   */
  private extractRowsFromExplain(explainResult: any[]): number {
    // Parse PostgreSQL EXPLAIN output to extract row counts
    const explainText = explainResult.map(row => Object.values(row)[0]).join('\n');
    const rowsMatch = explainText.match(/rows=(\d+)/g);
    if (rowsMatch) {
      return Math.max(...rowsMatch.map(match => parseInt(match.split('=')[1])));
    }
    return 0;
  }

  private checkIndexUsage(explainResult: any[]): boolean {
    const explainText = explainResult.map(row => Object.values(row)[0]).join('\n');
    return explainText.includes('Index Scan') || explainText.includes('Bitmap Index Scan');
  }

  private generateOptimizationSuggestions(explainResult: any[]): string[] {
    const suggestions: string[] = [];
    const explainText = explainResult.map(row => Object.values(row)[0]).join('\n');
    
    if (explainText.includes('Seq Scan')) {
      suggestions.push('Consider adding an index for sequential scans');
    }
    
    if (explainText.includes('Sort') && !explainText.includes('Index Scan')) {
      suggestions.push('Consider adding an index to avoid sorting');
    }
    
    if (explainText.includes('Hash Join')) {
      suggestions.push('Consider optimizing join conditions with indexes');
    }
    
    return suggestions;
  }

  /**
   * Clear cache (useful for testing and cache invalidation)
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

export const queryOptimizer = new QueryOptimizer();