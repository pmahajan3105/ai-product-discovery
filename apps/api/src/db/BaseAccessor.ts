/**
 * Base Accessor Pattern - Enhanced TypeScript version of Zeda's database accessor pattern
 * Provides consistent database operations with transaction support, query building, and error handling
 */

import { Model, ModelStatic, Transaction, FindOptions, CreateOptions, UpdateOptions, DestroyOptions, BulkCreateOptions } from 'sequelize';
import { db } from '../services/database';
import { logger } from '../utils/logger';
import { Op, QueryTypes } from 'sequelize';

// Type definitions for accessor operations
export interface AnyObj {
  [key: string]: any;
}

export interface QueryResult<T> {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
}

export interface AccessorOptions {
  transaction?: Transaction;
  include?: any[];
  attributes?: string[];
  order?: [string, 'ASC' | 'DESC'][];
  limit?: number;
  offset?: number;
  raw?: boolean;
  nest?: boolean;
}

export interface PaginationOptions {
  page?: number;
  size?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

/**
 * Base Accessor Class - Provides common database operations for all models
 * Based on Zeda's proven patterns with TypeScript enhancements
 */
export class BaseAccessor<T extends Model = Model> {
  protected readonly model: ModelStatic<T>;
  protected readonly modelName: string;

  constructor(model: ModelStatic<T>) {
    this.model = model;
    this.modelName = model.name;
  }

  /**
   * Create a new record
   */
  async create(data: AnyObj, options: CreateOptions = {}): Promise<T> {
    try {
      logger.debug(`Creating ${this.modelName}`, { data: this.sanitizeLogData(data) });
      
      const result = await this.model.create(data, {
        transaction: options.transaction,
        ...options
      });

      logger.info(`${this.modelName} created successfully`, { 
        id: result.get('id'),
        modelName: this.modelName 
      });

      return result;
    } catch (error) {
      logger.error(`Failed to create ${this.modelName}`, error, { 
        data: this.sanitizeLogData(data),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Bulk create multiple records
   */
  async bulkCreate(data: AnyObj[], options: BulkCreateOptions = {}): Promise<T[]> {
    try {
      logger.debug(`Bulk creating ${data.length} ${this.modelName} records`);
      
      const results = await this.model.bulkCreate(data, {
        transaction: options.transaction,
        validate: true,
        ...options
      });

      logger.info(`Bulk created ${results.length} ${this.modelName} records`);
      return results;
    } catch (error) {
      logger.error(`Failed to bulk create ${this.modelName} records`, error, { 
        count: data.length,
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Find a single record
   */
  async findOne(condition: AnyObj = {}, options: AccessorOptions = {}): Promise<T | null> {
    try {
      logger.debug(`Finding one ${this.modelName}`, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });

      const findOptions: FindOptions = {
        where: condition,
        transaction: options.transaction,
        include: options.include,
        attributes: options.attributes,
        order: options.order,
        raw: options.raw,
        nest: options.nest
      };

      const result = await this.model.findOne(findOptions);

      if (result) {
        logger.debug(`Found ${this.modelName}`, { 
          id: result.get('id'),
          modelName: this.modelName 
        });
      } else {
        logger.debug(`No ${this.modelName} found`, { 
          condition: this.sanitizeLogData(condition),
          modelName: this.modelName 
        });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}`, error, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Find record by primary key
   */
  async findById(id: string, options: AccessorOptions = {}): Promise<T | null> {
    try {
      logger.debug(`Finding ${this.modelName} by ID`, { id, modelName: this.modelName });

      const findOptions: FindOptions = {
        transaction: options.transaction,
        include: options.include,
        attributes: options.attributes,
        raw: options.raw,
        nest: options.nest
      };

      const result = await this.model.findByPk(id, findOptions);

      if (result) {
        logger.debug(`Found ${this.modelName} by ID`, { id, modelName: this.modelName });
      } else {
        logger.debug(`No ${this.modelName} found with ID`, { id, modelName: this.modelName });
      }

      return result;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} by ID`, error, { 
        id,
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Find all records matching condition
   */
  async findAll(condition: AnyObj = {}, options: AccessorOptions = {}): Promise<T[]> {
    try {
      logger.debug(`Finding all ${this.modelName}`, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });

      const findOptions: FindOptions = {
        where: condition,
        transaction: options.transaction,
        include: options.include,
        attributes: options.attributes,
        order: options.order || [['createdAt', 'DESC']],
        limit: options.limit,
        offset: options.offset,
        raw: options.raw,
        nest: options.nest
      };

      const results = await this.model.findAll(findOptions);

      logger.debug(`Found ${results.length} ${this.modelName} records`, { 
        count: results.length,
        modelName: this.modelName 
      });

      return results;
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} records`, error, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Find records with pagination
   */
  async findWithPagination(
    condition: AnyObj = {}, 
    pagination: PaginationOptions = {},
    options: AccessorOptions = {}
  ): Promise<QueryResult<T>> {
    try {
      const page = Math.max(1, pagination.page || 1);
      const size = Math.min(100, Math.max(1, pagination.size || 10)); // Max 100 items per page
      const offset = (page - 1) * size;
      const sort = pagination.sort || 'createdAt';
      const order = pagination.order || 'DESC';

      logger.debug(`Finding ${this.modelName} with pagination`, { 
        condition: this.sanitizeLogData(condition),
        page,
        size,
        sort,
        order,
        modelName: this.modelName 
      });

      const findOptions: FindOptions = {
        where: condition,
        transaction: options.transaction,
        include: options.include,
        attributes: options.attributes,
        order: [[sort, order]],
        limit: size,
        offset,
        raw: options.raw,
        nest: options.nest
      };

      // Execute count and find in parallel for better performance
      const [data, totalCount] = await Promise.all([
        this.model.findAll(findOptions),
        this.model.count({ 
          where: condition, 
          transaction: options.transaction,
          include: options.include 
        })
      ]);

      const totalPages = Math.ceil(totalCount / size);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      logger.info(`Found ${data.length} ${this.modelName} records with pagination`, {
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage,
        hasPrevPage,
        modelName: this.modelName
      });

      return {
        data,
        totalCount,
        hasNextPage,
        hasPrevPage,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      logger.error(`Failed to find ${this.modelName} records with pagination`, error, { 
        condition: this.sanitizeLogData(condition),
        pagination,
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Update records
   */
  async update(
    condition: AnyObj, 
    updateData: AnyObj, 
    options: UpdateOptions = {}
  ): Promise<[number, T[]]> {
    try {
      logger.debug(`Updating ${this.modelName}`, { 
        condition: this.sanitizeLogData(condition),
        updateData: this.sanitizeLogData(updateData),
        modelName: this.modelName 
      });

      const [affectedCount, updatedRecords] = await this.model.update(updateData, {
        where: condition,
        transaction: options.transaction,
        returning: true,
        ...options
      });

      logger.info(`Updated ${affectedCount} ${this.modelName} records`, { 
        affectedCount,
        modelName: this.modelName 
      });

      return [affectedCount, updatedRecords];
    } catch (error) {
      logger.error(`Failed to update ${this.modelName}`, error, { 
        condition: this.sanitizeLogData(condition),
        updateData: this.sanitizeLogData(updateData),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Update by primary key
   */
  async updateById(id: string, updateData: AnyObj, options: UpdateOptions = {}): Promise<T | null> {
    try {
      logger.debug(`Updating ${this.modelName} by ID`, { 
        id,
        updateData: this.sanitizeLogData(updateData),
        modelName: this.modelName 
      });

      const [affectedCount, updatedRecords] = await this.update({ id }, updateData, options);
      
      if (affectedCount > 0 && updatedRecords.length > 0) {
        logger.info(`Updated ${this.modelName} by ID`, { id, modelName: this.modelName });
        return updatedRecords[0];
      }

      logger.warn(`No ${this.modelName} updated with ID`, { id, modelName: this.modelName });
      return null;
    } catch (error) {
      logger.error(`Failed to update ${this.modelName} by ID`, error, { 
        id,
        updateData: this.sanitizeLogData(updateData),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Delete records
   */
  async delete(condition: AnyObj, options: DestroyOptions = {}): Promise<number> {
    try {
      logger.debug(`Deleting ${this.modelName}`, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });

      const deletedCount = await this.model.destroy({
        where: condition,
        transaction: options.transaction,
        ...options
      });

      logger.info(`Deleted ${deletedCount} ${this.modelName} records`, { 
        deletedCount,
        modelName: this.modelName 
      });

      return deletedCount;
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName}`, error, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Delete by primary key
   */
  async deleteById(id: string, options: DestroyOptions = {}): Promise<boolean> {
    try {
      logger.debug(`Deleting ${this.modelName} by ID`, { id, modelName: this.modelName });

      const deletedCount = await this.delete({ id }, options);
      const wasDeleted = deletedCount > 0;

      if (wasDeleted) {
        logger.info(`Deleted ${this.modelName} by ID`, { id, modelName: this.modelName });
      } else {
        logger.warn(`No ${this.modelName} deleted with ID`, { id, modelName: this.modelName });
      }

      return wasDeleted;
    } catch (error) {
      logger.error(`Failed to delete ${this.modelName} by ID`, error, { 
        id,
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(condition: AnyObj = {}, options: AccessorOptions = {}): Promise<number> {
    try {
      logger.debug(`Counting ${this.modelName}`, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });

      const count = await this.model.count({
        where: condition,
        transaction: options.transaction,
        include: options.include
      });

      logger.debug(`Counted ${count} ${this.modelName} records`, { 
        count,
        modelName: this.modelName 
      });

      return count;
    } catch (error) {
      logger.error(`Failed to count ${this.modelName}`, error, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Check if record exists
   */
  async exists(condition: AnyObj, options: AccessorOptions = {}): Promise<boolean> {
    try {
      const count = await this.count(condition, options);
      return count > 0;
    } catch (error) {
      logger.error(`Failed to check if ${this.modelName} exists`, error, { 
        condition: this.sanitizeLogData(condition),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   */
  async executeRawQuery(
    query: string, 
    replacements: AnyObj = {},
    options: { type?: QueryTypes; transaction?: Transaction } = {}
  ): Promise<any> {
    try {
      logger.debug(`Executing raw query for ${this.modelName}`, { 
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        modelName: this.modelName 
      });

      const result = await db.sequelize.query(query, {
        replacements,
        type: options.type || QueryTypes.SELECT,
        transaction: options.transaction
      });

      logger.debug(`Raw query executed successfully for ${this.modelName}`, { 
        resultCount: Array.isArray(result) ? result.length : 'N/A',
        modelName: this.modelName 
      });

      return result;
    } catch (error) {
      logger.error(`Failed to execute raw query for ${this.modelName}`, error, { 
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        modelName: this.modelName 
      });
      throw error;
    }
  }

  /**
   * Execute operation within a transaction
   */
  async withTransaction<R>(
    operation: (transaction: Transaction) => Promise<R>
  ): Promise<R> {
    try {
      logger.debug(`Starting transaction for ${this.modelName}`);

      const result = await db.sequelize.transaction(async (transaction) => {
        logger.debug(`Transaction started for ${this.modelName}`, { 
          transactionId: transaction.id 
        });
        
        const operationResult = await operation(transaction);
        
        logger.debug(`Transaction operation completed for ${this.modelName}`, { 
          transactionId: transaction.id 
        });
        
        return operationResult;
      });

      logger.info(`Transaction completed successfully for ${this.modelName}`);
      return result;
    } catch (error) {
      logger.error(`Transaction failed for ${this.modelName}`, error);
      throw error;
    }
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeLogData(data: AnyObj): AnyObj {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
    const sanitized = { ...data };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get model name for logging and identification
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Get the underlying Sequelize model
   */
  getModel(): ModelStatic<T> {
    return this.model;
  }
}