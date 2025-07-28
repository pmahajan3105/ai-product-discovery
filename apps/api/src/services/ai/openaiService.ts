/**
 * OpenAI Service
 * Handles all OpenAI API interactions with GPT-4 Mini and embeddings
 * 
 * Key Features:
 * - GPT-4 Mini for categorization and analysis
 * - OpenAI embeddings for semantic search
 * - Company context injection
 * - Streaming responses for chat
 * - Confidence scoring
 */

import OpenAI from 'openai';
import { companyContextService } from './companyContextService';

// Environment validation
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not found. AI features will be disabled.');
}

export interface AIAnalysisResult {
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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  confidence: number;
  sources: Array<{
    feedbackId: string;
    title: string;
    relevanceScore: number;
  }>;
  suggestions: string[];
  followUpQuestions: string[];
}

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  tokens: number;
}

export class OpenAIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });
    }
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Analyze feedback with company context
   */
  async analyzeFeedback(
    organizationId: string,
    feedbackText: string,
    customerInfo?: { name?: string; email?: string; company?: string; segment?: string }
  ): Promise<AIAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured');
    }

    // Get company context
    const contextPrompt = await companyContextService.generateAIContextPrompt(organizationId);
    
    // Build analysis prompt
    const analysisPrompt = this.buildAnalysisPrompt(contextPrompt, feedbackText, customerInfo);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Using GPT-4.1 Nano for cost-effectiveness
        messages: [
          { role: 'system', content: analysisPrompt },
          { role: 'user', content: `Analyze this feedback: "${feedbackText}"` }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse and validate response
      const analysis = JSON.parse(response) as AIAnalysisResult;
      return this.validateAnalysisResult(analysis);

    } catch (error) {
      console.error('Error analyzing feedback with OpenAI:', error);
      
      // Return fallback analysis
      return this.getFallbackAnalysis(feedbackText);
    }
  }

  /**
   * Generate embeddings for semantic search
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-large', // Latest embedding model
        input: text,
      });

      const embedding = response.data[0];
      return {
        embedding: embedding.embedding,
        text: text,
        tokens: response.usage.total_tokens
      };

    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Chat with feedback data using RAG
   */
  async chatWithFeedback(
    organizationId: string,
    messages: ChatMessage[],
    relevantFeedback: Array<{ id: string; title: string; description: string; metadata?: any }>
  ): Promise<ChatResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured');
    }

    // Get company context
    const contextPrompt = await companyContextService.generateAIContextPrompt(organizationId);
    
    // Build RAG context from relevant feedback
    const feedbackContext = this.buildFeedbackContext(relevantFeedback);
    
    // Create system prompt for chat
    const systemPrompt = this.buildChatSystemPrompt(contextPrompt, feedbackContext);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false // TODO: Implement streaming for better UX
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return {
        message: response,
        confidence: 0.85, // TODO: Calculate actual confidence
        sources: relevantFeedback.map(f => ({
          feedbackId: f.id,
          title: f.title,
          relevanceScore: 0.8 // TODO: Calculate from embedding similarity
        })),
        suggestions: this.extractActionSuggestions(response),
        followUpQuestions: this.generateFollowUpQuestions(response, organizationId)
      };

    } catch (error) {
      console.error('Error in chat completion:', error);
      throw new Error('Failed to generate chat response');
    }
  }

  /**
   * Generate insights summary for dashboard
   */
  async generateInsightsSummary(
    organizationId: string,
    feedbackSummary: {
      totalFeedback: number;
      sentimentBreakdown: Record<string, number>;
      topCategories: Array<{ category: string; count: number }>;
      trends: Array<{ period: string; count: number; sentiment: number }>;
    }
  ): Promise<{
    summary: string;
    keyInsights: string[];
    recommendations: string[];
    trends: string[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI API is not configured');
    }

    const contextPrompt = await companyContextService.generateAIContextPrompt(organizationId);
    const dataPrompt = this.buildInsightsPrompt(contextPrompt, feedbackSummary);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: dataPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);

    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        summary: 'Unable to generate AI insights at this time.',
        keyInsights: [],
        recommendations: [],
        trends: []
      };
    }
  }

  /**
   * Build analysis prompt with company context
   */
  private buildAnalysisPrompt(contextPrompt: string, feedbackText: string, customerInfo?: any): string {
    const customerContext = customerInfo ? `
Customer Information:
- Name: ${customerInfo.name || 'Unknown'}
- Email: ${customerInfo.email || 'Unknown'}
- Company: ${customerInfo.company || 'Unknown'}
- Segment: ${customerInfo.segment || 'Unknown'}
` : '';

    return `${contextPrompt}

${customerContext}

Your task is to analyze customer feedback and return a JSON response with the following structure:

{
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
}

Consider:
1. Company-specific context and categories
2. Customer segment and value
3. Priority keywords and business impact
4. Industry-specific implications
5. Actionable recommendations`;
  }

  /**
   * Build feedback context for RAG chat
   */
  private buildFeedbackContext(feedback: Array<{ id: string; title: string; description: string; metadata?: any }>): string {
    return `Relevant Feedback Data:
${feedback.map((f, i) => `
${i + 1}. ${f.title}
   Description: ${f.description}
   ID: ${f.id}
   ${f.metadata ? `Metadata: ${JSON.stringify(f.metadata)}` : ''}
`).join('\n')}`;
  }

  /**
   * Build chat system prompt
   */
  private buildChatSystemPrompt(contextPrompt: string, feedbackContext: string): string {
    return `${contextPrompt}

${feedbackContext}

You are an AI assistant helping product managers analyze customer feedback. 

Guidelines:
1. Provide insights based on the company context and relevant feedback
2. Be specific and actionable in your recommendations
3. Reference specific feedback items when relevant
4. Consider business impact and customer segments
5. Suggest concrete next steps
6. Ask clarifying questions when needed

Always ground your responses in the actual feedback data provided and the company's specific context.`;
  }

  /**
   * Build insights generation prompt
   */
  private buildInsightsPrompt(contextPrompt: string, feedbackSummary: any): string {
    return `${contextPrompt}

Feedback Summary Data:
- Total Feedback: ${feedbackSummary.totalFeedback}
- Sentiment Breakdown: ${JSON.stringify(feedbackSummary.sentimentBreakdown)}
- Top Categories: ${JSON.stringify(feedbackSummary.topCategories)}
- Trends: ${JSON.stringify(feedbackSummary.trends)}

Generate insights in this JSON format:
{
  "summary": "string", // Brief overview in plain language
  "keyInsights": ["string"], // 3-5 key insights
  "recommendations": ["string"], // 3-5 actionable recommendations
  "trends": ["string"] // 2-3 important trends
}

Focus on:
1. Business-relevant insights aligned with company goals
2. Actionable recommendations with clear next steps
3. Trends that impact the company's success
4. Customer segment-specific insights
5. Priority issues that need immediate attention`;
  }

  /**
   * Validate and clean analysis result
   */
  private validateAnalysisResult(analysis: AIAnalysisResult): AIAnalysisResult {
    // Ensure confidence scores are between 0 and 1
    analysis.categoryConfidence = Math.max(0, Math.min(1, analysis.categoryConfidence || 0.5));
    analysis.sentimentConfidence = Math.max(0, Math.min(1, analysis.sentimentConfidence || 0.5));
    
    // Ensure priority score is between 0 and 10
    analysis.priorityScore = Math.max(0, Math.min(10, analysis.priorityScore || 5));
    
    // Ensure sentiment score is between -2 and 2
    analysis.sentimentScore = Math.max(-2, Math.min(2, analysis.sentimentScore || 0));
    
    // Ensure arrays exist
    analysis.emotions = analysis.emotions || [];
    analysis.keyTopics = analysis.keyTopics || [];
    analysis.actionSuggestions = analysis.actionSuggestions || [];
    
    return analysis;
  }

  /**
   * Fallback analysis when OpenAI fails
   */
  private getFallbackAnalysis(feedbackText: string): AIAnalysisResult {
    const text = feedbackText.toLowerCase();
    
    // Simple keyword-based sentiment
    let sentiment: AIAnalysisResult['sentiment'] = 'neutral';
    let sentimentScore = 0;
    
    const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect', 'good'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'broken', 'bug', 'issue', 'problem'];
    
    const posCount = positiveWords.filter(word => text.includes(word)).length;
    const negCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (posCount > negCount) {
      sentiment = 'positive';
      sentimentScore = 1;
    } else if (negCount > posCount) {
      sentiment = 'negative';
      sentimentScore = -1;
    }

    return {
      category: 'General',
      categoryConfidence: 0.3,
      sentiment,
      sentimentScore,
      sentimentConfidence: 0.3,
      priority: 'medium',
      priorityScore: 5,
      emotions: [],
      keyTopics: [],
      businessImpact: 'medium',
      actionSuggestions: ['Review feedback manually for better categorization'],
      reasoning: 'AI analysis unavailable - using keyword-based fallback'
    };
  }

  /**
   * Extract action suggestions from response
   */
  private extractActionSuggestions(response: string): string[] {
    // Simple regex to find action-oriented sentences
    const actionWords = /\b(should|could|recommend|suggest|consider|try|implement|add|fix|improve)\b/gi;
    const sentences = response.split(/[.!?]+/);
    
    return sentences
      .filter(sentence => actionWords.test(sentence))
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 10)
      .slice(0, 3);
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(response: string, organizationId: string): string[] {
    // TODO: Generate contextual follow-up questions based on response and company context
    return [
      "What specific metrics would you like to see?",
      "Which customer segment should we focus on?",
      "What time period would you like to analyze?"
    ];
  }
}

export const openaiService = new OpenAIService();