/**
 * AI Retry Service
 * Implements exponential backoff and intelligent retry logic for AI operations
 */

import { AIErrorType, AIErrorClassifier } from '../../middleware/aiErrorHandler';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitterFactor: number;
}

export interface RetryableOperation<T> {
  operation: () => Promise<T>;
  operationName: string;
  context?: any;
}

export class AIRetryService {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    exponentialBase: 2,
    jitterFactor: 0.1
  };

  private static readonly OPERATION_CONFIGS: Map<string, Partial<RetryConfig>> = new Map([
    ['openai_chat', { maxRetries: 5, baseDelay: 2000 }],
    ['embedding_generation', { maxRetries: 3, baseDelay: 1500 }],
    ['vector_search', { maxRetries: 2, baseDelay: 500 }],
    ['database_query', { maxRetries: 3, baseDelay: 1000 }],
    ['langchain_call', { maxRetries: 4, baseDelay: 1200 }]
  ]);

  static async executeWithRetry<T>(
    retryableOp: RetryableOperation<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = this.getConfigForOperation(retryableOp.operationName, customConfig);
    let lastError: any;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await retryableOp.operation();
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 0) {
          console.log(`Operation '${retryableOp.operationName}' succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        const aiError = AIErrorClassifier.classifyError(error, retryableOp.context);
        
        // Don't retry if error is not retryable
        if (!aiError.retryable) {
          console.log(`Operation '${retryableOp.operationName}' failed with non-retryable error:`, aiError.message);
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          console.log(`Operation '${retryableOp.operationName}' failed after ${config.maxRetries + 1} attempts`);
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        
        console.log(`Operation '${retryableOp.operationName}' failed on attempt ${attempt + 1}. Retrying in ${delay}ms...`);
        console.log(`Error: ${aiError.message}`);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private static getConfigForOperation(
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): RetryConfig {
    const baseConfig = { ...this.DEFAULT_CONFIG };
    const operationConfig = this.OPERATION_CONFIGS.get(operationName) || {};
    
    return {
      ...baseConfig,
      ...operationConfig,
      ...customConfig
    };
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (exponentialBase ^ attempt)
    const exponentialDelay = config.baseDelay * Math.pow(config.exponentialBase, attempt);
    
    // Apply jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    
    // Calculate final delay with jitter
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maximum delay
    return Math.min(delayWithJitter, config.maxDelay);
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Specialized retry methods for common AI operations
  static async retryOpenAICall<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return this.executeWithRetry({
      operation,
      operationName: 'openai_chat',
      context
    });
  }

  static async retryEmbeddingGeneration<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return this.executeWithRetry({
      operation,
      operationName: 'embedding_generation',
      context
    });
  }

  static async retryVectorSearch<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return this.executeWithRetry({
      operation,
      operationName: 'vector_search',
      context
    });
  }

  static async retryDatabaseQuery<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return this.executeWithRetry({
      operation,
      operationName: 'database_query',
      context
    });
  }

  static async retryLangChainCall<T>(
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    return this.executeWithRetry({
      operation,
      operationName: 'langchain_call',
      context
    });
  }
}

// Circuit breaker pattern for preventing cascade failures
export class AICircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly monitorWindow: number = 300000 // 5 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breakers for different AI services
export const aiCircuitBreakers = {
  openai: new AICircuitBreaker(5, 60000),
  langchain: new AICircuitBreaker(3, 30000),
  vectorStore: new AICircuitBreaker(3, 45000),
  database: new AICircuitBreaker(5, 30000)
};