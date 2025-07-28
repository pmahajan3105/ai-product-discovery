/**
 * AI Categorization Service
 * Handles intelligent feedback categorization with company context
 * 
 * Key Features:
 * - Company-aware categorization
 * - Confidence scoring
 * - Bulk processing
 * - Human-in-the-loop learning
 * - Performance tracking
 */

import { openaiService } from './openaiService';
import { companyContextService } from './companyContextService';
import { db } from '../database';
import { Op } from 'sequelize';

export interface CategorizationRequest {
  feedbackId: string;
  organizationId: string;
  title: string;
  description: string;
  customerInfo?: {
    name?: string;
    email?: string;
    company?: string;
    segment?: string;
  };
  source?: string;
  metadata?: any;
}

export interface CategorizationResult {
  feedbackId: string;
  category: string;
  categoryConfidence: number;
  sentiment: string;
  sentimentScore: number;
  sentimentConfidence: number;
  priority: string;
  priorityScore: number;
  emotions: string[];
  keyTopics: string[];
  customerSegment?: string;
  businessImpact: string;
  actionSuggestions: string[];
  reasoning: string;
  processingTime: number;
  aiModel: string;
}

export interface BatchCategorizationResult {
  processed: number;
  successful: number;
  failed: number;
  results: CategorizationResult[];
  errors: Array<{ feedbackId: string; error: string }>;
  totalProcessingTime: number;
}

export interface CategorizationStats {
  totalProcessed: number;
  averageConfidence: number;
  categoryDistribution: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  averageProcessingTime: number;
  accuracyRate: number; // Based on user corrections
}

export class AICategorizationService {
  /**
   * Categorize single feedback item
   */
  async categorizeFeedback(request: CategorizationRequest): Promise<CategorizationResult> {
    const startTime = Date.now();
    
    try {
      // Check if OpenAI is available
      if (!openaiService.isAvailable()) {
        return this.getFallbackCategorization(request, startTime);
      }

      // Combine title and description for analysis
      const fullText = `${request.title}\n\n${request.description}`;

      // Perform AI analysis
      const analysis = await openaiService.analyzeFeedback(
        request.organizationId,
        fullText,
        request.customerInfo
      );

      const result: CategorizationResult = {
        feedbackId: request.feedbackId,
        category: analysis.category,
        categoryConfidence: analysis.categoryConfidence,
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        sentimentConfidence: analysis.sentimentConfidence,
        priority: analysis.priority,
        priorityScore: analysis.priorityScore,
        emotions: analysis.emotions,
        keyTopics: analysis.keyTopics,
        customerSegment: analysis.customerSegment,
        businessImpact: analysis.businessImpact,
        actionSuggestions: analysis.actionSuggestions,
        reasoning: analysis.reasoning,
        processingTime: Date.now() - startTime,
        aiModel: 'gpt-4o-mini'
      };

      // Store analysis result
      await this.storeCategorizationResult(result);

      // Update feedback with AI analysis
      await this.updateFeedbackWithAI(request.feedbackId, analysis);

      return result;

    } catch (error) {
      console.error('Error categorizing feedback:', error);
      return this.getFallbackCategorization(request, startTime, error as Error);
    }
  }

  /**
   * Batch categorize multiple feedback items
   */
  async batchCategorize(requests: CategorizationRequest[]): Promise<BatchCategorizationResult> {
    const startTime = Date.now();
    const results: CategorizationResult[] = [];
    const errors: Array<{ feedbackId: string; error: string }> = [];

    // Process in chunks to avoid rate limits
    const chunkSize = 5;
    const chunks = this.chunkArray(requests, chunkSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (request) => {
        try {
          const result = await this.categorizeFeedback(request);
          results.push(result);
        } catch (error) {
          errors.push({
            feedbackId: request.feedbackId,
            error: (error as Error).message
          });
        }
      });

      // Wait for chunk to complete
      await Promise.all(chunkPromises);

      // Rate limiting delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(1000); // 1 second delay
      }
    }

    return {
      processed: requests.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      totalProcessingTime: Date.now() - startTime
    };
  }

  /**
   * Re-categorize feedback with user correction
   */
  async recategorizeWithCorrection(
    feedbackId: string,
    organizationId: string,
    correction: {
      originalCategory?: string;
      correctedCategory?: string;
      originalSentiment?: string;
      correctedSentiment?: string;
      notes?: string;
    }
  ): Promise<void> {
    // Record user feedback for learning
    await companyContextService.recordUserFeedback(organizationId, feedbackId, correction);

    // Update feedback with corrected values
    const updateData: any = {};
    if (correction.correctedCategory) {
      updateData.category = correction.correctedCategory;
    }
    if (correction.correctedSentiment) {
      updateData.sentiment = correction.correctedSentiment;
    }

    if (Object.keys(updateData).length > 0) {
      await db.models.Feedback.update(updateData, {
        where: { id: feedbackId, organizationId }
      });
    }

    // Update accuracy tracking
    await this.updateAccuracyTracking(organizationId, correction);
  }

  /**
   * Get categorization statistics for organization
   */
  async getCategorizationStats(organizationId: string, days: number = 30): Promise<CategorizationStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all AI-processed feedback
    const feedback = await db.models.Feedback.findAll({
      where: {
        organizationId,
        createdAt: { [Op.gte]: since },
        'aiAnalysis.processed': true
      },
      attributes: ['aiAnalysis', 'category', 'sentiment']
    });

    const totalProcessed = feedback.length;
    if (totalProcessed === 0) {
      return {
        totalProcessed: 0,
        averageConfidence: 0,
        categoryDistribution: {},
        sentimentDistribution: {},
        averageProcessingTime: 0,
        accuracyRate: 0
      };
    }

    // Calculate statistics
    const confidenceScores = feedback
      .map(f => f.aiAnalysis?.categoryConfidence || 0)
      .filter(score => score > 0);

    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    feedback.forEach(f => {
      const category = f.category || 'Uncategorized';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
    });

    // Sentiment distribution
    const sentimentDistribution: Record<string, number> = {};
    feedback.forEach(f => {
      const sentiment = f.sentiment || 'neutral';
      sentimentDistribution[sentiment] = (sentimentDistribution[sentiment] || 0) + 1;
    });

    // Processing time
    const processingTimes = feedback
      .map(f => f.aiAnalysis?.processingTime || 0)
      .filter(time => time > 0);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Accuracy rate from user corrections
    const accuracyRate = await this.calculateAccuracyRate(organizationId, days);

    return {
      totalProcessed,
      averageConfidence,
      categoryDistribution,
      sentimentDistribution,
      averageProcessingTime,
      accuracyRate
    };
  }

  /**
   * Get pending items for manual review (low confidence)
   */
  async getPendingReviewItems(organizationId: string, confidenceThreshold: number = 0.7): Promise<Array<{
    id: string;
    title: string;
    category: string;
    categoryConfidence: number;
    sentiment: string;
    sentimentConfidence: number;
    reasoning: string;
  }>> {
    const feedback = await db.models.Feedback.findAll({
      where: {
        organizationId,
        [Op.or]: [
          { 'aiAnalysis.categoryConfidence': { [Op.lt]: confidenceThreshold } },
          { 'aiAnalysis.sentimentConfidence': { [Op.lt]: confidenceThreshold } }
        ]
      },
      attributes: ['id', 'title', 'category', 'sentiment', 'aiAnalysis'],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    return feedback.map(f => ({
      id: f.id,
      title: f.title,
      category: f.category || 'Uncategorized',
      categoryConfidence: f.aiAnalysis?.categoryConfidence || 0,
      sentiment: f.sentiment || 'neutral',
      sentimentConfidence: f.aiAnalysis?.sentimentConfidence || 0,
      reasoning: f.aiAnalysis?.reasoning || 'No reasoning available'
    }));
  }

  /**
   * Store categorization result for tracking
   */
  private async storeCategorizationResult(result: CategorizationResult): Promise<void> {
    try {
      await db.models.AICategorizationLog.create({
        feedbackId: result.feedbackId,
        organizationId: '', // Will be filled from feedback
        category: result.category,
        categoryConfidence: result.categoryConfidence,
        sentiment: result.sentiment,
        sentimentConfidence: result.sentimentConfidence,
        priority: result.priority,
        processingTime: result.processingTime,
        aiModel: result.aiModel,
        reasoning: result.reasoning,
        createdAt: new Date()
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Error storing categorization result:', error);
    }
  }

  /**
   * Update feedback with AI analysis
   */
  private async updateFeedbackWithAI(feedbackId: string, analysis: any): Promise<void> {
    await db.models.Feedback.update({
      category: analysis.category,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      aiAnalysis: {
        ...analysis,
        processed: true,
        processedAt: new Date().toISOString()
      }
    }, {
      where: { id: feedbackId }
    });
  }

  /**
   * Get fallback categorization when AI fails
   */
  private getFallbackCategorization(
    request: CategorizationRequest,
    startTime: number,
    error?: Error
  ): CategorizationResult {
    const text = `${request.title} ${request.description}`.toLowerCase();
    
    // Simple keyword-based categorization
    let category = 'General';
    const keywords = {
      'Bug Report': ['bug', 'error', 'crash', 'not working', 'broken', 'issue'],
      'Feature Request': ['feature', 'enhancement', 'improvement', 'add', 'need', 'want'],
      'Performance': ['slow', 'loading', 'timeout', 'performance', 'speed'],
      'UI/UX': ['interface', 'design', 'usability', 'confusing', 'difficult']
    };

    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(word => text.includes(word))) {
        category = cat;
        break;
      }
    }

    // Simple sentiment analysis
    let sentiment: any = 'neutral';
    let sentimentScore = 0;
    
    const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'broken'];
    
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
      feedbackId: request.feedbackId,
      category,
      categoryConfidence: 0.3,
      sentiment,
      sentimentScore,
      sentimentConfidence: 0.3,
      priority: 'medium',
      priorityScore: 5,
      emotions: [],
      keyTopics: [],
      businessImpact: 'medium',
      actionSuggestions: ['Manual review recommended'],
      reasoning: error ? `AI unavailable: ${error.message}` : 'Using keyword-based fallback',
      processingTime: Date.now() - startTime,
      aiModel: 'fallback'
    };
  }

  /**
   * Calculate accuracy rate from user corrections
   */
  private async calculateAccuracyRate(organizationId: string, days: number): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const totalCorrections = await db.models.AIUserFeedback.count({
      where: {
        organizationId,
        createdAt: { [Op.gte]: since }
      }
    });

    const totalProcessed = await db.models.Feedback.count({
      where: {
        organizationId,
        createdAt: { [Op.gte]: since },
        'aiAnalysis.processed': true
      }
    });

    if (totalProcessed === 0) return 0;

    // Accuracy = (Total - Corrections) / Total
    return Math.max(0, (totalProcessed - totalCorrections) / totalProcessed);
  }

  /**
   * Update accuracy tracking
   */
  private async updateAccuracyTracking(organizationId: string, correction: any): Promise<void> {
    // This could be used to update machine learning models or improve prompts
    // For now, we just store the correction in the user feedback table
    console.log('Accuracy tracking updated for organization:', organizationId);
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const aiCategorizationService = new AICategorizationService();