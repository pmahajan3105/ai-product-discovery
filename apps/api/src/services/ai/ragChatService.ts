/**
 * RAG Chat Service
 * Implements RAG (Retrieval-Augmented Generation) chat using LangChain
 * 
 * Key Features:
 * - ConversationalRetrievalQAChain for context-aware conversations
 * - PGVectorStore integration for semantic search
 * - Company context injection
 * - Conversation memory management
 * - Source attribution and relevance scoring
 */

import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { BufferWindowMemory } from 'langchain/memory';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { langchainService } from './langchainService';
import { PGVectorStore } from './pgvectorStore';
import { companyContextService } from './companyContextService';
import { db } from '../database';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  organizationId: string;
  userId: string;
  title?: string;
  messages: ChatMessage[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponse {
  message: string;
  confidence: number;
  sources: Array<{
    feedbackId: string;
    title: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  suggestions: string[];
  followUpQuestions: string[];
  processingTime: number;
}

export interface ChatRequest {
  sessionId?: string;
  organizationId: string;
  userId: string;
  message: string;
  enableStreaming?: boolean;
  socketId?: string;
  context?: {
    filters?: {
      categories?: string[];
      sentiments?: string[];
      dateRange?: { start: Date; end: Date };
    };
  };
}

export class RAGChatService {
  private chains: Map<string, ConversationalRetrievalQAChain> = new Map();
  private memories: Map<string, BufferWindowMemory> = new Map();
  private vectorStores: Map<string, PGVectorStore> = new Map();

  /**
   * Initialize or get RAG chain for organization
   */
  async getOrCreateChain(organizationId: string): Promise<ConversationalRetrievalQAChain | null> {
    if (this.chains.has(organizationId)) {
      return this.chains.get(organizationId)!;
    }

    if (!langchainService.isAvailable()) {
      console.warn('LangChain service not available');
      return null;
    }

    try {
      // Get LangChain components
      const chatModel = langchainService.getChatModel({ temperature: 0.7 });
      const embeddings = langchainService.getEmbeddings();
      
      if (!chatModel || !embeddings) {
        console.error('Failed to get LangChain components');
        return null;
      }

      // Create or get vector store
      const vectorStore = await this.getOrCreateVectorStore(organizationId, embeddings);
      if (!vectorStore) {
        console.error('Failed to create vector store');
        return null;
      }

      // Create retriever with filters
      const retriever = vectorStore.asRetriever({
        k: 5,
        searchType: 'similarity',
      });

      // Create conversation memory
      const memory = new BufferWindowMemory({
        k: 10,
        memoryKey: 'chat_history',
        inputKey: 'question',
        outputKey: 'text',
        returnMessages: true,
      });

      // Create company-aware prompt template
      const companyContext = await companyContextService.generateAIContextPrompt(organizationId);
      
      const qaPrompt = PromptTemplate.fromTemplate(`
${companyContext}

You are an AI assistant helping analyze customer feedback. Use the following context from feedback data to answer questions accurately and provide actionable insights.

Context from feedback:
{context}

Chat History:
{chat_history}

Current Question: {question}

Instructions:
1. Provide accurate, helpful responses based on the feedback context
2. Consider the company's business goals and customer segments
3. Suggest actionable next steps when appropriate
4. Cite specific feedback items when relevant
5. If you don't have enough context, ask clarifying questions

Answer:
`);

      // Create the conversational RAG chain
      const chain = ConversationalRetrievalQAChain.fromLLM(
        chatModel,
        retriever,
        {
          memory,
          qaTemplate: qaPrompt,
          returnSourceDocuments: true,
          verbose: process.env.NODE_ENV === 'development',
        }
      );

      // Cache the chain and memory
      this.chains.set(organizationId, chain);
      this.memories.set(organizationId, memory);

      return chain;

    } catch (error) {
      console.error('Error creating RAG chain:', error);
      return null;
    }
  }

  /**
   * Get or create vector store for organization
   */
  private async getOrCreateVectorStore(organizationId: string, embeddings: any): Promise<PGVectorStore | null> {
    if (this.vectorStores.has(organizationId)) {
      return this.vectorStores.get(organizationId)!;
    }

    try {
      // Create vector store from existing data
      const vectorStore = await PGVectorStore.fromExistingIndex(embeddings, {
        organizationId,
        tableName: 'feedback_embeddings',
        embeddingDimension: 1536,
        distanceStrategy: 'cosine',
      });

      this.vectorStores.set(organizationId, vectorStore);
      return vectorStore;

    } catch (error) {
      console.error('Error creating vector store:', error);
      return null;
    }
  }

  /**
   * Chat with feedback data using RAG
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Get or create RAG chain
      const chain = await this.getOrCreateChain(request.organizationId);
      if (!chain) {
        throw new Error('RAG chain not available');
      }

      // Create streaming handler if enabled
      let streamingHandler = null;
      if (request.enableStreaming && request.sessionId && global.aiStreamingService) {
        // Get socket connection
        const io = global.aiStreamingService;
        // For now, we'll emit to the session room directly
        // In a real implementation, you'd need to pass the actual socket instance
        streamingHandler = {
          handleLLMNewToken: (token: string) => {
            io.broadcastToSession(request.sessionId!, 'ai_token', {
              sessionId: request.sessionId,
              token,
              timestamp: new Date().toISOString()
            });
          },
          handleLLMStart: () => {
            io.sendTypingIndicator(request.sessionId!, true);
          },
          handleLLMEnd: () => {
            io.sendTypingIndicator(request.sessionId!, false);
          }
        };
      }

      // Execute the chain with optional streaming
      const result = await chain.call({
        question: request.message,
      }, streamingHandler ? { callbacks: [streamingHandler] } : undefined);

      // Process source documents
      const sources = (result.sourceDocuments || []).map((doc: Document, index: number) => ({
        feedbackId: doc.metadata.feedbackId || 'unknown',
        title: doc.metadata.title || 'Untitled',
        relevanceScore: 0.8 - (index * 0.1), // Approximate relevance based on order
        excerpt: doc.pageContent.substring(0, 200) + '...',
      }));

      // Generate follow-up questions
      const followUpQuestions = this.generateFollowUpQuestions(request.message, result.text);

      // Generate suggestions
      const suggestions = this.extractActionSuggestions(result.text);

      const response: ChatResponse = {
        message: result.text,
        confidence: 0.85, // TODO: Calculate actual confidence
        sources,
        suggestions,
        followUpQuestions,
        processingTime: Date.now() - startTime,
      };

      // Save to session if provided
      if (request.sessionId) {
        await this.saveChatMessage(request.sessionId, request.message, result.text);
      }

      return response;

    } catch (error) {
      console.error('Error in RAG chat:', error);
      
      // Return fallback response
      return {
        message: `I apologize, but I'm having trouble processing your request right now. The error was: ${(error as Error).message}`,
        confidence: 0.1,
        sources: [],
        suggestions: ['Try rephrasing your question', 'Check if the AI service is properly configured'],
        followUpQuestions: ['What specific feedback data would you like to explore?'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Create new chat session
   */
  async createSession(organizationId: string, userId: string, title?: string): Promise<ChatSession> {
    const session = await db.models.AIChatSession.create({
      organizationId,
      userId,
      title: title || 'New Chat',
      messages: [],
      metadata: {},
      isActive: true,
    });

    return session.toJSON() as ChatSession;
  }

  /**
   * Get chat session
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const session = await db.models.AIChatSession.findOne({
      where: { id: sessionId, userId },
    });

    return session ? session.toJSON() as ChatSession : null;
  }

  /**
   * List chat sessions for user
   */
  async listSessions(organizationId: string, userId: string): Promise<ChatSession[]> {
    const sessions = await db.models.AIChatSession.findAll({
      where: { organizationId, userId, isActive: true },
      order: [['updatedAt', 'DESC']],
      limit: 50,
    });

    return sessions.map(s => s.toJSON() as ChatSession);
  }

  /**
   * Save chat message to session
   */
  private async saveChatMessage(sessionId: string, userMessage: string, assistantMessage: string): Promise<void> {
    try {
      const session = await db.models.AIChatSession.findByPk(sessionId);
      if (!session) return;

      const messages = session.messages || [];
      
      // Add user message
      messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      });

      // Add assistant message
      messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date(),
      });

      // Update session
      await session.update({
        messages,
        lastMessageAt: new Date(),
      });

    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  /**
   * Generate follow-up questions based on response
   */
  private generateFollowUpQuestions(userMessage: string, response: string): string[] {
    const questions = [
      'What specific time period would you like to focus on?',
      'Which customer segment should we analyze further?',
      'Would you like to see the underlying feedback items?',
    ];

    // TODO: Use LLM to generate more contextual follow-up questions
    return questions.slice(0, 2);
  }

  /**
   * Extract actionable suggestions from response
   */
  private extractActionSuggestions(response: string): string[] {
    // Simple keyword-based extraction
    const actionWords = /\b(should|could|recommend|suggest|consider|try|implement|add|fix|improve)\b/gi;
    const sentences = response.split(/[.!?]+/);
    
    return sentences
      .filter(sentence => actionWords.test(sentence))
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10)
      .slice(0, 3);
  }

  /**
   * Clear chat chain cache (useful for updates)
   */
  clearCache(organizationId: string): void {
    this.chains.delete(organizationId);
    this.memories.delete(organizationId);
    this.vectorStores.delete(organizationId);
  }

  /**
   * Update feedback embeddings for organization
   */
  async updateEmbeddings(organizationId: string, feedbackIds: string[]): Promise<void> {
    try {
      const embeddings = langchainService.getEmbeddings();
      if (!embeddings) return;

      const vectorStore = this.vectorStores.get(organizationId);
      if (!vectorStore) return;

      // Get feedback data
      const feedback = await db.models.Feedback.findAll({
        where: { 
          id: { [db.Sequelize.Op.in]: feedbackIds },
          organizationId 
        },
        attributes: ['id', 'title', 'description', 'category', 'sentiment', 'metadata'],
      });

      // Create documents for embeddings
      const documents = feedback.map(f => new Document({
        pageContent: `${f.title}\n\n${f.description}`,
        metadata: {
          feedbackId: f.id,
          title: f.title,
          category: f.category,
          sentiment: f.sentiment,
          ...f.metadata,
        },
      }));

      // Add to vector store
      await vectorStore.addDocuments(documents);

      console.log(`Updated embeddings for ${documents.length} feedback items`);

    } catch (error) {
      console.error('Error updating embeddings:', error);
    }
  }
}

export const ragChatService = new RAGChatService();