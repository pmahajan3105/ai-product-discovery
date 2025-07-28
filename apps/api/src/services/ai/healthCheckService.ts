/**
 * AI Health Check Service
 * Monitors health of all AI components and services
 */

import { AIRetryService, aiCircuitBreakers } from './retryService';
import { db } from '../database';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: Date;
  responseTime?: number;
  error?: string;
}

export interface AISystemHealth {
  overall: HealthStatus;
  components: {
    openai: HealthStatus;
    langchain: HealthStatus;
    vectorStore: HealthStatus;
    database: HealthStatus;
    streaming: HealthStatus;
  };
  circuitBreakers: {
    openai: any;
    langchain: any;
    vectorStore: any;
    database: any;
  };
}

export class AIHealthCheckService {
  private static instance: AIHealthCheckService;
  private lastHealthCheck: Date | null = null;
  private cachedHealth: AISystemHealth | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): AIHealthCheckService {
    if (!AIHealthCheckService.instance) {
      AIHealthCheckService.instance = new AIHealthCheckService();
    }
    return AIHealthCheckService.instance;
  }

  async getSystemHealth(forceRefresh: boolean = false): Promise<AISystemHealth> {
    const now = new Date();
    
    // Return cached result if available and not expired
    if (!forceRefresh && 
        this.cachedHealth && 
        this.lastHealthCheck &&
        (now.getTime() - this.lastHealthCheck.getTime()) < this.CACHE_DURATION) {
      return this.cachedHealth;
    }

    // Perform health checks in parallel
    const [
      openaiHealth,
      langchainHealth,
      vectorStoreHealth,
      databaseHealth,
      streamingHealth
    ] = await Promise.allSettled([
      this.checkOpenAIService(),
      this.checkLangChainService(),
      this.checkVectorStoreService(),
      this.checkDatabaseService(),
      this.checkStreamingService()
    ]);

    const components = {
      openai: this.extractHealthResult(openaiHealth),
      langchain: this.extractHealthResult(langchainHealth),
      vectorStore: this.extractHealthResult(vectorStoreHealth),
      database: this.extractHealthResult(databaseHealth),
      streaming: this.extractHealthResult(streamingHealth)
    };

    // Determine overall health
    const overall = this.calculateOverallHealth(components);

    // Get circuit breaker states
    const circuitBreakers = {
      openai: aiCircuitBreakers.openai.getState(),
      langchain: aiCircuitBreakers.langchain.getState(),
      vectorStore: aiCircuitBreakers.vectorStore.getState(),
      database: aiCircuitBreakers.database.getState()
    };

    const systemHealth: AISystemHealth = {
      overall,
      components,
      circuitBreakers
    };

    // Cache the result
    this.cachedHealth = systemHealth;
    this.lastHealthCheck = now;

    return systemHealth;
  }

  private async checkOpenAIService(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return {
          status: 'unhealthy',
          lastChecked: new Date(),
          error: 'OpenAI API key not configured'
        };
      }

      // Simple test call to OpenAI (we'll use a minimal request)
      const { ChatOpenAI } = await import('@langchain/openai');
      const model = new ChatOpenAI({
        model: 'gpt-4o-mini',
        temperature: 0,
        maxTokens: 1,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Test with a simple prompt
      const response = await model.invoke([
        { role: 'user', content: 'Hi' }
      ]);

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error.message || 'OpenAI service check failed'
      };
    }
  }

  private async checkLangChainService(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test LangChain prompt template functionality
      const { PromptTemplate } = await import('@langchain/core/prompts');
      
      const template = new PromptTemplate({
        template: 'Test template: {input}',
        inputVariables: ['input']
      });

      const formatted = await template.format({ input: 'test' });
      
      if (!formatted.includes('test')) {
        throw new Error('LangChain template formatting failed');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error.message || 'LangChain service check failed'
      };
    }
  }

  private async checkVectorStoreService(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Check if pgvector is available by testing a simple query
      const query = `SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_pgvector;`;
      
      const result = await db.query(query);
      
      if (!result || !result[0] || !result[0].has_pgvector) {
        throw new Error('pgvector extension not available');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error.message || 'Vector store service check failed'
      };
    }
  }

  private async checkDatabaseService(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      await db.authenticate();
      
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error.message || 'Database service check failed'
      };
    }
  }

  private async checkStreamingService(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Check if Socket.IO server is available
      const isStreamingAvailable = global.aiStreamingService !== undefined;
      
      if (!isStreamingAvailable) {
        throw new Error('Streaming service not initialized');
      }

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        error: error.message || 'Streaming service check failed'
      };
    }
  }

  private extractHealthResult(result: PromiseSettledResult<HealthStatus>): HealthStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        lastChecked: new Date(),
        error: result.reason?.message || 'Health check failed'
      };
    }
  }

  private calculateOverallHealth(components: Record<string, HealthStatus>): HealthStatus {
    const statuses = Object.values(components).map(c => c.status);
    const unhealthyCount = statuses.filter(s => s === 'unhealthy').length;
    const degradedCount = statuses.filter(s => s === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (unhealthyCount > 0) {
      overallStatus = unhealthyCount >= statuses.length / 2 ? 'unhealthy' : 'degraded';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const avgResponseTime = Object.values(components)
      .filter(c => c.responseTime)
      .reduce((sum, c) => sum + (c.responseTime || 0), 0) / statuses.length;

    return {
      status: overallStatus,
      lastChecked: new Date(),
      responseTime: avgResponseTime || undefined
    };
  }

  // Method to get simple availability status (for /availability endpoint)
  async getAvailabilityStatus(): Promise<{
    available: boolean;
    services: string[];
    degradedServices: string[];
    unavailableServices: string[];
  }> {
    const health = await this.getSystemHealth();
    
    const available = health.overall.status !== 'unhealthy';
    const services: string[] = [];
    const degradedServices: string[] = [];
    const unavailableServices: string[] = [];

    Object.entries(health.components).forEach(([name, status]) => {
      if (status.status === 'healthy') {
        services.push(name);
      } else if (status.status === 'degraded') {
        degradedServices.push(name);
      } else {
        unavailableServices.push(name);
      }
    });

    return {
      available,
      services,
      degradedServices,
      unavailableServices
    };
  }
}

// Export singleton instance
export const aiHealthCheckService = AIHealthCheckService.getInstance();