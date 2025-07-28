/**
 * LangChain Service
 * Main orchestration service for AI functionality using LangChain
 * 
 * Key Features:
 * - ChatOpenAI integration with GPT-4 Mini
 * - Company context injection via dynamic prompts
 * - Chain composition for complex workflows
 * - Memory management for conversations
 * - Streaming support with callbacks
 */

import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { BufferWindowMemory } from 'langchain/memory';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { companyContextService } from './companyContextService';
import { AIRetryService, aiCircuitBreakers } from './retryService';
import { AIErrorClassifier, AIErrorType } from '../../middleware/aiErrorHandler';

// Environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found. AI features will be disabled.');
}

export interface LangChainConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
}

export interface CategorizationResult {
  category: string;
  categoryConfidence: number;
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore: number;
  sentimentConfidence: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priorityScore: number;
  emotions: string[];
  keyTopics: string[];
  customerSegment?: string;
  businessImpact: 'low' | 'medium' | 'high';
  actionSuggestions: string[];
  reasoning: string;
}

export interface StreamingCallback {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class LangChainService {
  private chatModel: ChatOpenAI | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private defaultConfig: LangChainConfig = {
    model: 'gpt-4.1-nano',
    temperature: 0.3,
    maxTokens: 1500,
    streaming: false
  };

  constructor() {
    if (OPENAI_API_KEY) {
      this.initializeModels();
    }
  }

  /**
   * Initialize LangChain models
   */
  private initializeModels(): void {
    this.chatModel = new ChatOpenAI({
      modelName: this.defaultConfig.model,
      temperature: this.defaultConfig.temperature,
      maxTokens: this.defaultConfig.maxTokens,
      openAIApiKey: OPENAI_API_KEY,
      streaming: this.defaultConfig.streaming,
    });

    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large',
      openAIApiKey: OPENAI_API_KEY,
    });
  }

  /**
   * Check if LangChain is available
   */
  isAvailable(): boolean {
    return this.chatModel !== null && this.embeddings !== null;
  }

  /**
   * Get ChatOpenAI instance with custom config
   */
  getChatModel(config?: Partial<LangChainConfig>, callbacks?: CallbackManager): ChatOpenAI | null {
    if (!this.chatModel) return null;

    const finalConfig = { ...this.defaultConfig, ...config };
    
    return new ChatOpenAI({
      modelName: finalConfig.model,
      temperature: finalConfig.temperature,
      maxTokens: finalConfig.maxTokens,
      openAIApiKey: OPENAI_API_KEY,
      streaming: finalConfig.streaming,
      callbacks: callbacks,
    });
  }

  /**
   * Get OpenAI embeddings instance
   */
  getEmbeddings(): OpenAIEmbeddings | null {
    return this.embeddings;
  }

  /**
   * Create company-aware categorization chain
   */
  async createCategorizationChain(organizationId: string): Promise<LLMChain | null> {
    if (!this.chatModel) return null;

    try {
      // Get company context for dynamic prompt with retry logic
      const contextPrompt = await AIRetryService.retryDatabaseQuery(
        () => companyContextService.generateAIContextPrompt(organizationId),
        { organizationId, operation: 'getCompanyContext' }
      );

    const categorizationTemplate = `${contextPrompt}

You are analyzing customer feedback for categorization and sentiment analysis.

Your task is to analyze the feedback and return a JSON response with the following structure:
{{
  "category": "string", // Main category from company context
  "categoryConfidence": number, // 0-1 confidence score
  "sentiment": "very_negative|negative|neutral|positive|very_positive",
  "sentimentScore": number, // -2 to 2 numeric score  
  "sentimentConfidence": number, // 0-1 confidence score
  "priority": "low|medium|high|urgent",
  "priorityScore": number, // 0-10 priority score
  "emotions": ["string"], // Detected emotions
  "keyTopics": ["string"], // Main topics mentioned
  "customerSegment": "string", // Estimated customer segment
  "businessImpact": "low|medium|high",
  "actionSuggestions": ["string"], // Recommended actions
  "reasoning": "string" // Brief explanation of analysis
}}

Consider:
1. Company-specific context and categories
2. Customer segment and value indicators
3. Priority keywords and business impact
4. Industry-specific implications
5. Actionable recommendations aligned with business goals

Customer Information (if available):
Name: {customerName}
Email: {customerEmail}
Company: {customerCompany}
Segment: {customerSegment}

Feedback to analyze:
{feedbackText}`;

    const prompt = new PromptTemplate({
      template: categorizationTemplate,
      inputVariables: [
        'customerName',
        'customerEmail', 
        'customerCompany',
        'customerSegment',
        'feedbackText'
      ],
    });

      return new LLMChain({
        llm: this.chatModel,
        prompt: prompt,
        outputKey: 'categorization',
      });

    } catch (error) {
      console.error('Error creating categorization chain:', error);
      const aiError = AIErrorClassifier.classifyError(error, { organizationId });
      throw new Error(`Failed to create categorization chain: ${aiError.message}`);
    }
  }

  /**
   * Create company-aware insights generation chain
   */
  async createInsightsChain(organizationId: string): Promise<LLMChain | null> {
    if (!this.chatModel) return null;

    const contextPrompt = await companyContextService.generateAIContextPrompt(organizationId);

    const insightsTemplate = `${contextPrompt}

You are generating executive insights from customer feedback data.

Based on the feedback summary provided, generate actionable business insights in JSON format:
{{
  "summary": "string", // Brief executive overview in plain language
  "keyInsights": ["string"], // 3-5 key insights aligned with business goals
  "recommendations": ["string"], // 3-5 actionable recommendations
  "trends": ["string"], // 2-3 important trends with business impact
  "priorityActions": ["string"], // Immediate actions needed
  "customerSegmentInsights": {{
    "enterprise": "string",
    "midMarket": "string", 
    "smb": "string"
  }}
}}

Focus on:
1. Business-relevant insights aligned with company goals
2. Actionable recommendations with clear next steps
3. Customer segment-specific insights
4. Trends that impact business success
5. Priority issues requiring immediate attention

Feedback Summary Data:
{feedbackSummary}`;

    const prompt = new PromptTemplate({
      template: insightsTemplate,
      inputVariables: ['feedbackSummary'],
    });

    return new LLMChain({
      llm: this.chatModel,
      prompt: prompt,
      outputKey: 'insights',
    });
  }

  /**
   * Create memory for conversation management
   */
  createConversationMemory(sessionId: string): BufferWindowMemory {
    return new BufferWindowMemory({
      k: 10, // Keep last 10 exchanges
      memoryKey: 'chat_history',
      inputKey: 'question',
      outputKey: 'text',
    });
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.embeddings) return null;

    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple documents
   */
  async generateEmbeddings(documents: string[]): Promise<number[][] | null> {
    if (!this.embeddings) return null;

    try {
      const embeddings = await this.embeddings.embedDocuments(documents);
      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      return null;
    }
  }

  /**
   * Categorize feedback using LangChain
   */
  async categorizeFeedback(
    organizationId: string,
    feedbackText: string,
    customerInfo?: {
      name?: string;
      email?: string;
      company?: string;
      segment?: string;
    }
  ): Promise<CategorizationResult | null> {
    try {
      const chain = await this.createCategorizationChain(organizationId);
      if (!chain) return null;

      const result = await chain.call({
        customerName: customerInfo?.name || 'Unknown',
        customerEmail: customerInfo?.email || 'Unknown',
        customerCompany: customerInfo?.company || 'Unknown',
        customerSegment: customerInfo?.segment || 'Unknown',
        feedbackText: feedbackText,
      });

      // Parse JSON response
      const analysis = JSON.parse(result.categorization);
      return this.validateCategorizationResult(analysis);

    } catch (error) {
      console.error('Error categorizing feedback with LangChain:', error);
      return null;
    }
  }

  /**
   * Generate insights using LangChain
   */
  async generateInsights(
    organizationId: string,
    feedbackSummary: any
  ): Promise<any | null> {
    try {
      const chain = await this.createInsightsChain(organizationId);
      if (!chain) return null;

      const result = await chain.call({
        feedbackSummary: JSON.stringify(feedbackSummary, null, 2),
      });

      return JSON.parse(result.insights);

    } catch (error) {
      console.error('Error generating insights with LangChain:', error);
      return null;
    }
  }

  /**
   * Create streaming chat model with callbacks
   */
  createStreamingChatModel(callbacks: StreamingCallback): ChatOpenAI | null {
    if (!OPENAI_API_KEY) return null;

    const callbackManager = CallbackManager.fromHandlers({
      handleLLMStart: async () => {
        callbacks.onStart?.();
      },
      handleLLMNewToken: async (token: string) => {
        callbacks.onToken?.(token);
      },
      handleLLMEnd: async () => {
        callbacks.onEnd?.();
      },
      handleLLMError: async (error: Error) => {
        callbacks.onError?.(error);
      },
    });

    return new ChatOpenAI({
      modelName: 'gpt-4.1-nano',
      temperature: 0.7,
      maxTokens: 2000,
      openAIApiKey: OPENAI_API_KEY,
      streaming: true,
      callbacks: callbackManager,
    });
  }

  /**
   * Validate and normalize categorization result
   */
  private validateCategorizationResult(analysis: any): CategorizationResult {
    return {
      category: analysis.category || 'General',
      categoryConfidence: Math.max(0, Math.min(1, analysis.categoryConfidence || 0.5)),
      sentiment: analysis.sentiment || 'neutral',
      sentimentScore: Math.max(-2, Math.min(2, analysis.sentimentScore || 0)),
      sentimentConfidence: Math.max(0, Math.min(1, analysis.sentimentConfidence || 0.5)),
      priority: analysis.priority || 'medium',
      priorityScore: Math.max(0, Math.min(10, analysis.priorityScore || 5)),
      emotions: Array.isArray(analysis.emotions) ? analysis.emotions : [],
      keyTopics: Array.isArray(analysis.keyTopics) ? analysis.keyTopics : [],
      customerSegment: analysis.customerSegment,
      businessImpact: analysis.businessImpact || 'medium',
      actionSuggestions: Array.isArray(analysis.actionSuggestions) ? analysis.actionSuggestions : [],
      reasoning: analysis.reasoning || 'Analysis completed',
    };
  }
}

export const langchainService = new LangChainService();