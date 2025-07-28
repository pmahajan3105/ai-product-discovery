/**
 * Company Context Service
 * Manages company profile and context for AI-powered feedback analysis
 * 
 * Key Features:
 * - Company profile creation and management
 * - Business context understanding for AI
 * - Industry-specific categorization
 * - Customer segment analysis
 */

import { db } from '../database';
import { Op } from 'sequelize';
import { organizationService } from '../organizationService';

export interface CompanyProfile {
  id?: string;
  organizationId: string;
  industry: 'SaaS' | 'E-commerce' | 'Fintech' | 'Healthcare' | 'EdTech' | 'Other';
  productType: string; // "CRM Software", "E-commerce Platform"
  companySize: 'Startup' | 'SMB' | 'Mid-Market' | 'Enterprise';
  customerSegments: Array<{
    name: string;
    characteristics: string[];
    value: 'Enterprise' | 'Mid-Market' | 'SMB';
    percentage?: number;
  }>;
  businessGoals: string[];
  competitivePosition: string;
  currentChallenges: string[];
  productFeatures: string[];
  targetMarket: string;
  // AI learning data
  categoryMapping: Record<string, string[]>; // Custom categories to keywords
  priorityKeywords: string[]; // High-priority issue indicators
  customerValueWords: string[]; // Words indicating high-value customers
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CompanyContext {
  profile: CompanyProfile;
  feedbackPatterns: {
    commonCategories: Array<{ category: string; count: number; trend: number }>;
    sentimentTrends: Array<{ period: string; sentiment: number }>;
    customerSegmentInsights: Array<{ segment: string; topIssues: string[] }>;
  };
  aiLearning: {
    categoryAccuracy: number;
    lastTrainingDate: Date;
    userFeedbackCount: number;
    improvementSuggestions: string[];
  };
}

export class CompanyContextService {
  /**
   * Create or update company profile
   */
  async createOrUpdateProfile(organizationId: string, profileData: Partial<CompanyProfile>, userId: string): Promise<CompanyProfile> {
    // Check permissions
    const role = await organizationService.getUserRole(organizationId, userId);
    if (!role || !['owner', 'admin'].includes(role)) {
      throw new Error('Insufficient permissions to manage company profile');
    }

    // Check if profile exists
    const existingProfile = await this.getProfile(organizationId);
    
    const profilePayload: CompanyProfile = {
      organizationId,
      industry: profileData.industry || 'Other',
      productType: profileData.productType || '',
      companySize: profileData.companySize || 'SMB',
      customerSegments: profileData.customerSegments || [],
      businessGoals: profileData.businessGoals || [],
      competitivePosition: profileData.competitivePosition || '',
      currentChallenges: profileData.currentChallenges || [],
      productFeatures: profileData.productFeatures || [],
      targetMarket: profileData.targetMarket || '',
      categoryMapping: profileData.categoryMapping || this.getDefaultCategoryMapping(profileData.industry || 'Other'),
      priorityKeywords: profileData.priorityKeywords || this.getDefaultPriorityKeywords(profileData.industry || 'Other'),
      customerValueWords: profileData.customerValueWords || this.getDefaultValueWords(),
    };

    if (existingProfile) {
      // Update existing profile
      const updated = await db.models.CompanyProfile.update(profilePayload, {
        where: { organizationId },
        returning: true
      });
      return updated[1][0].toJSON() as CompanyProfile;
    } else {
      // Create new profile
      const created = await db.models.CompanyProfile.create(profilePayload);
      return created.toJSON() as CompanyProfile;
    }
  }

  /**
   * Get company profile
   */
  async getProfile(organizationId: string): Promise<CompanyProfile | null> {
    try {
      const profile = await db.models.CompanyProfile.findOne({
        where: { organizationId }
      });
      return profile ? profile.toJSON() as CompanyProfile : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get complete company context for AI
   */
  async getCompanyContext(organizationId: string): Promise<CompanyContext | null> {
    const profile = await this.getProfile(organizationId);
    if (!profile) return null;

    // Get feedback patterns
    const feedbackPatterns = await this.analyzeFeedbackPatterns(organizationId);
    
    // Get AI learning data
    const aiLearning = await this.getAILearningData(organizationId);

    return {
      profile,
      feedbackPatterns,
      aiLearning
    };
  }

  /**
   * Generate AI context prompt for GPT-4 Mini
   */
  async generateAIContextPrompt(organizationId: string): Promise<string> {
    const context = await this.getCompanyContext(organizationId);
    if (!context) {
      return "You are analyzing feedback for a general software company.";
    }

    const { profile, feedbackPatterns } = context;

    return `You are analyzing customer feedback for ${profile.productType} in the ${profile.industry} industry.

Company Context:
- Industry: ${profile.industry}
- Product: ${profile.productType}
- Company Size: ${profile.companySize}
- Target Market: ${profile.targetMarket}

Customer Segments:
${profile.customerSegments.map(seg => `- ${seg.name}: ${seg.characteristics.join(', ')} (${seg.value} value)`).join('\n')}

Business Goals:
${profile.businessGoals.map(goal => `- ${goal}`).join('\n')}

Current Challenges:
${profile.currentChallenges.map(challenge => `- ${challenge}`).join('\n')}

Key Product Features:
${profile.productFeatures.map(feature => `- ${feature}`).join('\n')}

Priority Keywords (indicate high-priority issues):
${profile.priorityKeywords.join(', ')}

High-Value Customer Indicators:
${profile.customerValueWords.join(', ')}

Recent Feedback Patterns:
${feedbackPatterns.commonCategories.slice(0, 5).map(cat => `- ${cat.category}: ${cat.count} items (${cat.trend > 0 ? 'increasing' : 'decreasing'})`).join('\n')}

When analyzing feedback, consider:
1. How it relates to the company's business goals
2. Which customer segment it impacts
3. Priority level based on keywords and customer value
4. Industry-specific context and competitive implications
5. Relationship to existing product features and challenges`;
  }

  /**
   * Learn from user feedback to improve AI accuracy
   */
  async recordUserFeedback(organizationId: string, feedbackId: string, correction: {
    originalCategory?: string;
    correctedCategory?: string;
    originalSentiment?: string;
    correctedSentiment?: string;
    notes?: string;
  }): Promise<void> {
    // Store user correction for learning
    await db.models.AIUserFeedback.create({
      organizationId,
      feedbackId,
      correctionType: correction.correctedCategory ? 'category' : 'sentiment',
      originalValue: correction.originalCategory || correction.originalSentiment || '',
      correctedValue: correction.correctedCategory || correction.correctedSentiment || '',
      notes: correction.notes || '',
      createdAt: new Date()
    });

    // Update company profile based on patterns
    await this.updateProfileFromLearning(organizationId);
  }

  /**
   * Get default category mapping for industry
   */
  private getDefaultCategoryMapping(industry: string): Record<string, string[]> {
    const mappings: Record<string, Record<string, string[]>> = {
      'SaaS': {
        'Bug Report': ['bug', 'error', 'crash', 'not working', 'broken', 'issue'],
        'Feature Request': ['feature', 'enhancement', 'improvement', 'add', 'need', 'want'],
        'Performance': ['slow', 'loading', 'timeout', 'performance', 'speed', 'lag'],
        'Integration': ['integration', 'API', 'connect', 'sync', 'import', 'export'],
        'UI/UX': ['interface', 'design', 'usability', 'confusing', 'difficult', 'user experience'],
        'Security': ['security', 'privacy', 'access', 'permission', 'authentication', 'login']
      },
      'E-commerce': {
        'Bug Report': ['bug', 'error', 'not working', 'broken', 'cart', 'checkout'],
        'Product Request': ['product', 'inventory', 'out of stock', 'availability'],
        'Shipping': ['shipping', 'delivery', 'tracking', 'fulfillment'],
        'Payment': ['payment', 'billing', 'charge', 'refund', 'transaction'],
        'UI/UX': ['website', 'navigation', 'search', 'mobile', 'responsive'],
        'Customer Service': ['support', 'help', 'service', 'response', 'agent']
      },
      'Other': {
        'Bug Report': ['bug', 'error', 'issue', 'problem', 'not working'],
        'Feature Request': ['feature', 'enhancement', 'improvement', 'suggestion'],
        'Complaint': ['complaint', 'dissatisfied', 'unhappy', 'frustrated'],
        'Praise': ['great', 'excellent', 'love', 'amazing', 'perfect'],
        'Question': ['question', 'how', 'what', 'when', 'where', 'help']
      }
    };

    return mappings[industry] || mappings['Other'];
  }

  /**
   * Get default priority keywords for industry
   */
  private getDefaultPriorityKeywords(industry: string): string[] {
    const keywords: Record<string, string[]> = {
      'SaaS': ['critical', 'urgent', 'down', 'outage', 'security', 'data loss', 'cannot access', 'enterprise'],
      'E-commerce': ['checkout', 'payment', 'order', 'shipping', 'refund', 'cannot buy', 'cart'],
      'Fintech': ['security', 'money', 'transaction', 'fraud', 'compliance', 'regulatory'],
      'Healthcare': ['patient', 'critical', 'emergency', 'compliance', 'HIPAA', 'safety'],
      'Other': ['critical', 'urgent', 'important', 'blocking', 'cannot use']
    };

    return keywords[industry] || keywords['Other'];
  }

  /**
   * Get default customer value words
   */
  private getDefaultValueWords(): string[] {
    return [
      'enterprise', 'corporate', 'business', 'company', 'organization',
      'team', 'department', 'manager', 'director', 'executive',
      'premium', 'pro', 'plus', 'advanced', 'unlimited'
    ];
  }

  /**
   * Analyze feedback patterns for context
   */
  private async analyzeFeedbackPatterns(organizationId: string) {
    // Get common categories from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const categoryStats = await db.models.Feedback.findAll({
      where: {
        organizationId,
        createdAt: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        'category',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      order: [[db.sequelize.fn('COUNT', db.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get sentiment trends
    const sentimentTrends = await db.models.Feedback.findAll({
      where: {
        organizationId,
        createdAt: { [Op.gte]: thirtyDaysAgo },
        sentiment: { [Op.not]: null }
      },
      attributes: [
        [db.sequelize.fn('DATE_TRUNC', 'week', db.sequelize.col('createdAt')), 'week'],
        [db.sequelize.fn('AVG', 
          db.sequelize.literal(`CASE 
            WHEN sentiment = 'very_positive' THEN 2
            WHEN sentiment = 'positive' THEN 1
            WHEN sentiment = 'neutral' THEN 0
            WHEN sentiment = 'negative' THEN -1
            WHEN sentiment = 'very_negative' THEN -2
            ELSE 0
          END`)
        ), 'avg_sentiment']
      ],
      group: [db.sequelize.fn('DATE_TRUNC', 'week', db.sequelize.col('createdAt'))],
      order: [[db.sequelize.fn('DATE_TRUNC', 'week', db.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    return {
      commonCategories: (categoryStats as any[]).map(stat => ({
        category: stat.category || 'Uncategorized',
        count: parseInt(stat.count),
        trend: 0 // TODO: Calculate trend vs previous period
      })),
      sentimentTrends: (sentimentTrends as any[]).map(trend => ({
        period: trend.week,
        sentiment: parseFloat(trend.avg_sentiment) || 0
      })),
      customerSegmentInsights: [] // TODO: Implement customer segment analysis
    };
  }

  /**
   * Get AI learning data
   */
  private async getAILearningData(organizationId: string) {
    const userFeedbackCount = await db.models.AIUserFeedback.count({
      where: { organizationId }
    });

    return {
      categoryAccuracy: 0.85, // TODO: Calculate from actual corrections
      lastTrainingDate: new Date(),
      userFeedbackCount,
      improvementSuggestions: [
        'Collect more user feedback on AI categorizations',
        'Review and update priority keywords',
        'Add more product-specific categories'
      ]
    };
  }

  /**
   * Update profile based on learning patterns
   */
  private async updateProfileFromLearning(organizationId: string): Promise<void> {
    // TODO: Implement machine learning from user corrections
    // This would analyze patterns in corrections and update category mappings
  }
}

export const companyContextService = new CompanyContextService();