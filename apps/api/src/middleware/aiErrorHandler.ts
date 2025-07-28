/**
 * AI Error Handler Middleware
 * Comprehensive error handling for AI services with fallbacks
 */

import { Request, Response, NextFunction } from 'express';
import { ResponseBuilder } from '../utils/ResponseBuilder';

export enum AIErrorType {
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  LANGCHAIN_ERROR = 'LANGCHAIN_ERROR',
  VECTOR_STORE_ERROR = 'VECTOR_STORE_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  RAG_CHAIN_ERROR = 'RAG_CHAIN_ERROR',
  STREAMING_ERROR = 'STREAMING_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  CONTEXT_ERROR = 'CONTEXT_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AIError {
  type: AIErrorType;
  message: string;
  originalError?: any;
  context?: {
    organizationId?: string;
    userId?: string;
    sessionId?: string;
    operation?: string;
  };
  timestamp: Date;
  retryable: boolean;
  fallbackAvailable: boolean;
}

export class AIErrorClassifier {
  static classifyError(error: any, context?: any): AIError {
    const timestamp = new Date();
    
    // OpenAI API errors
    if (error.name === 'OpenAIError' || error.message?.includes('OpenAI')) {
      return {
        type: AIErrorType.OPENAI_API_ERROR,
        message: this.sanitizeErrorMessage(error.message || 'OpenAI API error'),
        originalError: error,
        context,
        timestamp,
        retryable: error.status !== 401 && error.status !== 403,
        fallbackAvailable: true
      };
    }

    // LangChain errors
    if (error.name?.includes('LangChain') || error.message?.includes('langchain')) {
      return {
        type: AIErrorType.LANGCHAIN_ERROR,
        message: this.sanitizeErrorMessage(error.message || 'LangChain processing error'),
        originalError: error,
        context,
        timestamp,
        retryable: true,
        fallbackAvailable: true
      };
    }

    // Vector store errors
    if (error.message?.includes('vector') || error.message?.includes('embedding')) {
      return {
        type: AIErrorType.VECTOR_STORE_ERROR,
        message: 'Vector search is temporarily unavailable',
        originalError: error,
        context,
        timestamp,
        retryable: true,
        fallbackAvailable: true
      };
    }

    // Rate limiting errors
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return {
        type: AIErrorType.RATE_LIMIT_ERROR,
        message: 'AI service is temporarily overloaded. Please try again in a moment.',
        originalError: error,
        context,
        timestamp,
        retryable: true,
        fallbackAvailable: false
      };
    }

    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return {
        type: AIErrorType.AUTHENTICATION_ERROR,
        message: 'AI service authentication failed',
        originalError: error,
        context,
        timestamp,
        retryable: false,
        fallbackAvailable: false
      };
    }

    // Database errors
    if (error.name === 'SequelizeError' || error.message?.includes('database')) {
      return {
        type: AIErrorType.DATABASE_ERROR,
        message: 'Database connection issue affecting AI services',
        originalError: error,
        context,
        timestamp,
        retryable: true,
        fallbackAvailable: true
      };
    }

    // Default unknown error
    return {
      type: AIErrorType.UNKNOWN_ERROR,
      message: 'An unexpected error occurred in the AI service',
      originalError: error,
      context,
      timestamp,
      retryable: true,
      fallbackAvailable: true
    };
  }

  private static sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/api[_\s]?key[^a-zA-Z0-9]*[a-zA-Z0-9-_]+/gi, 'API_KEY_REDACTED')
      .replace(/token[^a-zA-Z0-9]*[a-zA-Z0-9-_.]+/gi, 'TOKEN_REDACTED')
      .replace(/sk-[a-zA-Z0-9]+/gi, 'API_KEY_REDACTED');
  }
}

export class AIFallbackService {
  static async generateFallbackResponse(errorType: AIErrorType, userMessage: string, context?: any): Promise<any> {
    const fallbackResponses = {
      [AIErrorType.OPENAI_API_ERROR]: {
        message: "I'm experiencing connectivity issues with the AI service. Here are some general suggestions based on your query:",
        suggestions: [
          "Please try your request again in a few moments",
          "Check if your internet connection is stable",
          "Contact support if the issue persists"
        ],
        confidence: 0.1
      },
      
      [AIErrorType.VECTOR_STORE_ERROR]: {
        message: "I can't access the feedback database right now, but I can provide general guidance:",
        suggestions: [
          "Try browsing your feedback manually for now",
          "The search functionality should be restored shortly",
          "Check back in a few minutes"
        ],
        confidence: 0.2
      },
      
      [AIErrorType.RAG_CHAIN_ERROR]: {
        message: "I'm having trouble processing your question with full context, but here's what I can tell you:",
        suggestions: [
          "Try asking a simpler, more specific question",
          "Break down complex queries into smaller parts",
          "Check back when the service is fully operational"
        ],
        confidence: 0.3
      },
      
      [AIErrorType.DATABASE_ERROR]: {
        message: "I can't access your feedback data right now due to a database issue:",
        suggestions: [
          "Please try again in a few minutes",
          "Check your organization's data connection",
          "Contact your administrator if issues persist"
        ],
        confidence: 0.1
      }
    };

    const fallback = fallbackResponses[errorType] || fallbackResponses[AIErrorType.UNKNOWN_ERROR];
    
    return {
      message: fallback.message,
      confidence: fallback.confidence,
      sources: [],
      suggestions: fallback.suggestions,
      followUpQuestions: [
        "Would you like me to try processing your request differently?",
        "Is there a specific aspect of your feedback you'd like to explore?"
      ],
      processingTime: 50,
      fallbackResponse: true,
      error: {
        type: errorType,
        recoverable: true
      }
    };
  }

  static async getSystemStatus(): Promise<{
    openaiService: boolean;
    vectorStore: boolean;
    database: boolean;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    // In a real implementation, you would check actual service health
    return {
      openaiService: true,
      vectorStore: true,
      database: true,
      overallHealth: 'healthy'
    };
  }
}

export const aiErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only handle AI-related routes
  if (!req.path.includes('/ai/')) {
    next(error);
    return;
  }

  const context = {
    organizationId: req.params.organizationId,
    userId: req.user?.id,
    sessionId: req.body?.sessionId,
    operation: req.path
  };

  const aiError = AIErrorClassifier.classifyError(error, context);
  
  // Log error for monitoring (remove in production or use proper logging)
  console.error('AI Service Error:', {
    type: aiError.type,
    message: aiError.message,
    context: aiError.context,
    timestamp: aiError.timestamp,
    path: req.path,
    method: req.method
  });

  // Determine response status
  let status = 500;
  switch (aiError.type) {
    case AIErrorType.AUTHENTICATION_ERROR:
      status = 401;
      break;
    case AIErrorType.RATE_LIMIT_ERROR:
      status = 429;
      break;
    case AIErrorType.CONTEXT_ERROR:
      status = 400;
      break;
    default:
      status = 500;
  }

  // Send appropriate response
  if (aiError.fallbackAvailable && req.path.includes('/chat')) {
    // For chat endpoints, provide fallback response
    AIFallbackService.generateFallbackResponse(
      aiError.type,
      req.body?.message || '',
      context
    ).then(fallbackResponse => {
      ResponseBuilder.success(res, fallbackResponse, 'Response generated with limited functionality', status);
    }).catch(() => {
      ResponseBuilder.error(res, aiError.message, status);
    });
  } else {
    // For other endpoints, return error
    ResponseBuilder.error(res, aiError.message, status, {
      errorType: aiError.type,
      retryable: aiError.retryable,
      timestamp: aiError.timestamp
    });
  }
};