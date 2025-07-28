/**
 * Query Builder - Enhanced TypeScript version of Zeda's query builder pattern
 * Provides fluent interface for building complex Sequelize queries
 */

import { Op, WhereOptions, Order, IncludeOptions, FindOptions } from 'sequelize';
import { logger } from '../utils/logger';

export interface QueryBuilderOptions {
  where?: WhereOptions;
  include?: IncludeOptions[];
  order?: Order;
  limit?: number;
  offset?: number;
  attributes?: string[];
  group?: string[];
  having?: WhereOptions;
  raw?: boolean;
  nest?: boolean;
  distinct?: boolean;
}

/**
 * Query Builder Class - Provides fluent interface for building Sequelize queries
 * Based on Zeda's proven patterns with TypeScript enhancements
 */
export class QueryBuilder {
  private query: QueryBuilderOptions;

  constructor() {
    this.query = {
      where: {},
      include: [],
      order: [],
      attributes: undefined
    };
  }

  /**
   * Add WHERE condition for a specific field
   */
  filterByField(fieldName: string, value: any): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = value;
    return this;
  }

  /**
   * Add WHERE condition with custom operator
   */
  filterByOperator(fieldName: string, operator: symbol, value: any): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [operator]: value
    };
    return this;
  }

  /**
   * Add multiple WHERE conditions with OR logic
   */
  filterByMultiple(conditions: WhereOptions[]): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[Op.or] = conditions;
    return this;
  }

  /**
   * Add WHERE condition with AND logic
   */
  filterByAnd(conditions: WhereOptions[]): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[Op.and] = conditions;
    return this;
  }

  /**
   * Add LIKE search condition (case-insensitive)
   */
  searchByField(fieldName: string, value: string): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.iLike]: `%${value}%`
    };
    return this;
  }

  /**
   * Add exact match search (case-insensitive)
   */
  searchExact(fieldName: string, value: string): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.iLike]: value
    };
    return this;
  }

  /**
   * Add array contains condition (for JSONB fields)
   */
  filterByLabels(fieldName: string, values: any[]): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.contains]: values
    };
    return this;
  }

  /**
   * Add IN condition
   */
  filterByIn(fieldName: string, values: any[]): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.in]: values
    };
    return this;
  }

  /**
   * Add NOT IN condition
   */
  filterByNotIn(fieldName: string, values: any[]): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.notIn]: values
    };
    return this;
  }

  /**
   * Add date range condition
   */
  filterByDateRange(fieldName: string, startDate: Date, endDate: Date): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = {
      [Op.between]: [startDate, endDate]
    };
    return this;
  }

  /**
   * Add greater than condition
   */
  filterByGreaterThan(fieldName: string, value: any): QueryBuilder {
    return this.filterByOperator(fieldName, Op.gt, value);
  }

  /**
   * Add greater than or equal condition
   */
  filterByGreaterThanOrEqual(fieldName: string, value: any): QueryBuilder {
    return this.filterByOperator(fieldName, Op.gte, value);
  }

  /**
   * Add less than condition
   */
  filterByLessThan(fieldName: string, value: any): QueryBuilder {
    return this.filterByOperator(fieldName, Op.lt, value);
  }

  /**
   * Add less than or equal condition
   */
  filterByLessThanOrEqual(fieldName: string, value: any): QueryBuilder {
    return this.filterByOperator(fieldName, Op.lte, value);
  }

  /**
   * Add NULL check condition
   */
  filterByNull(fieldName: string, isNull: boolean = true): QueryBuilder {
    if (!this.query.where) {
      this.query.where = {};
    }
    
    (this.query.where as any)[fieldName] = isNull ? {
      [Op.is]: null
    } : {
      [Op.not]: null
    };
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  addOrderBy(fieldName: string, direction: 'ASC' | 'DESC' = 'DESC'): QueryBuilder {
    if (!this.query.order) {
      this.query.order = [];
    }
    
    (this.query.order as any[]).push([fieldName, direction]);
    return this;
  }

  /**
   * Add multiple ORDER BY clauses
   */
  addMultipleOrderBy(orders: Array<[string, 'ASC' | 'DESC']>): QueryBuilder {
    orders.forEach(([field, direction]) => {
      this.addOrderBy(field, direction);
    });
    return this;
  }

  /**
   * Add ORDER BY with association
   */
  addOrderByAssociation(association: string, fieldName: string, direction: 'ASC' | 'DESC' = 'DESC'): QueryBuilder {
    if (!this.query.order) {
      this.query.order = [];
    }
    
    (this.query.order as any[]).push([association, fieldName, direction]);
    return this;
  }

  /**
   * Add INCLUDE (JOIN) clause
   */
  addInclude(includeOptions: IncludeOptions): QueryBuilder {
    if (!this.query.include) {
      this.query.include = [];
    }
    
    this.query.include.push(includeOptions);
    return this;
  }

  /**
   * Add multiple INCLUDE clauses
   */
  addMultipleIncludes(includes: IncludeOptions[]): QueryBuilder {
    includes.forEach(include => this.addInclude(include));
    return this;
  }

  /**
   * Add LIMIT clause
   */
  addLimit(limit: number): QueryBuilder {
    this.query.limit = Math.max(1, Math.min(1000, limit)); // Enforce reasonable limits
    return this;
  }

  /**
   * Add OFFSET clause
   */
  addOffset(offset: number): QueryBuilder {
    this.query.offset = Math.max(0, offset);
    return this;
  }

  /**
   * Add pagination
   */
  addPagination(page: number, size: number): QueryBuilder {
    const validPage = Math.max(1, page);
    const validSize = Math.max(1, Math.min(100, size)); // Max 100 items per page
    const offset = (validPage - 1) * validSize;
    
    return this.addLimit(validSize).addOffset(offset);
  }

  /**
   * Select specific attributes
   */
  selectAttributes(attributes: string[]): QueryBuilder {
    this.query.attributes = attributes;
    return this;
  }

  /**
   * Add GROUP BY clause
   */
  addGroupBy(fields: string[]): QueryBuilder {
    this.query.group = fields;
    return this;
  }

  /**
   * Add HAVING clause
   */
  addHaving(havingCondition: WhereOptions): QueryBuilder {
    this.query.having = havingCondition;
    return this;
  }

  /**
   * Set raw option
   */
  setRaw(raw: boolean = true): QueryBuilder {
    this.query.raw = raw;
    return this;
  }

  /**
   * Set nest option
   */
  setNest(nest: boolean = true): QueryBuilder {
    this.query.nest = nest;
    return this;
  }

  /**
   * Set distinct option
   */
  setDistinct(distinct: boolean = true): QueryBuilder {
    this.query.distinct = distinct;
    return this;
  }

  /**
   * Get the built query object
   */
  getQuery(): FindOptions {
    // Log the built query for debugging in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Built query', { query: this.query });
    }
    
    return { ...this.query } as FindOptions;
  }

  /**
   * Reset the query builder
   */
  reset(): QueryBuilder {
    this.query = {
      where: {},
      include: [],
      order: [],
      attributes: undefined
    };
    return this;
  }

  /**
   * Clone the current query builder
   */
  clone(): QueryBuilder {
    const cloned = new QueryBuilder();
    cloned.query = JSON.parse(JSON.stringify(this.query));
    return cloned;
  }

  /**
   * Merge another query builder into this one
   */
  merge(other: QueryBuilder): QueryBuilder {
    const otherQuery = other.getQuery();
    
    // Merge where conditions
    if (otherQuery.where) {
      this.query.where = {
        ...this.query.where,
        [Op.and]: [this.query.where, otherQuery.where]
      };
    }
    
    // Merge includes
    if (otherQuery.include) {
      this.query.include = [...(this.query.include || []), ...(otherQuery.include as IncludeOptions[])];
    }
    
    // Merge order
    if (otherQuery.order) {
      this.query.order = [...(this.query.order as any[]), ...(otherQuery.order as any[])];
    }
    
    // Other properties take precedence from the other query
    if (otherQuery.limit !== undefined) this.query.limit = otherQuery.limit;
    if (otherQuery.offset !== undefined) this.query.offset = otherQuery.offset;
    if (otherQuery.attributes !== undefined) this.query.attributes = otherQuery.attributes;
    if (otherQuery.group !== undefined) this.query.group = otherQuery.group;
    if (otherQuery.having !== undefined) this.query.having = otherQuery.having;
    if (otherQuery.raw !== undefined) this.query.raw = otherQuery.raw;
    if (otherQuery.nest !== undefined) this.query.nest = otherQuery.nest;
    if (otherQuery.distinct !== undefined) this.query.distinct = otherQuery.distinct;
    
    return this;
  }

  /**
   * Apply common filters for organization-scoped queries
   */
  filterByOrganization(organizationId: string): QueryBuilder {
    return this.filterByField('organizationId', organizationId);
  }

  /**
   * Apply common filters for user-scoped queries
   */
  filterByUser(userId: string): QueryBuilder {
    return this.filterByField('userId', userId);
  }

  /**
   * Apply common filters for active records
   */
  filterActive(isActive: boolean = true): QueryBuilder {
    return this.filterByField('isActive', isActive);
  }

  /**
   * Apply common date filters for recent records
   */
  filterRecent(days: number = 30): QueryBuilder {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    
    return this.filterByGreaterThanOrEqual('createdAt', sinceDate);
  }
}

// Static factory methods for common query patterns
export class QueryBuilderFactory {
  /**
   * Create a query builder for pagination
   */
  static forPagination(page: number, size: number): QueryBuilder {
    return new QueryBuilder().addPagination(page, size);
  }

  /**
   * Create a query builder for organization-scoped queries
   */
  static forOrganization(organizationId: string): QueryBuilder {
    return new QueryBuilder().filterByOrganization(organizationId);
  }

  /**
   * Create a query builder for user-scoped queries
   */
  static forUser(userId: string): QueryBuilder {
    return new QueryBuilder().filterByUser(userId);
  }

  /**
   * Create a query builder for search queries
   */
  static forSearch(searchField: string, searchTerm: string): QueryBuilder {
    return new QueryBuilder().searchByField(searchField, searchTerm);
  }

  /**
   * Create a query builder for recent records
   */
  static forRecent(days: number = 30): QueryBuilder {
    return new QueryBuilder().filterRecent(days);
  }

  /**
   * Create a query builder for active records
   */
  static forActive(): QueryBuilder {
    return new QueryBuilder().filterActive(true);
  }
}

export default QueryBuilder;