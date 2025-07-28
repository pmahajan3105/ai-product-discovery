/**
 * AI API Client
 * Functions for interacting with AI services
 */

import { apiClient } from './apiClient';

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    filters?: {
      categories?: string[];
      sentiments?: string[];
      dateRange?: { start: Date; end: Date };
    };
  };
  enableStreaming?: boolean;
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
  fallbackResponse?: boolean;
  error?: {
    type: string;
    recoverable: boolean;
  };
}

export interface ChatSession {
  id: string;
  organizationId: string;
  userId: string;
  title?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  metadata?: any;
  lastMessageAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyProfile {
  id: string;
  organizationId: string;
  companyName: string;
  industry: string;
  productType: string;
  customerSegments: string[];
  businessGoals: string[];
  feedbackCategories: string[];
  customPrompts?: string;
  analysisPreferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAvailability {
  available: boolean;
  services: string[];
  degradedServices: string[];
  unavailableServices: string[];
}

export interface AIHealthStatus {
  overall: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: Date;
    responseTime?: number;
    error?: string;
  };
  components: {
    openai: any;
    langchain: any;
    vectorStore: any;
    database: any;
    streaming: any;
  };
  circuitBreakers: any;
}

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

export interface CategorizationResponse {
  category?: string;
  categoryConfidence?: number;
  sentiment?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  sentimentScore?: number;
  sentimentConfidence?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  priorityScore?: number;
  emotions?: string[];
  keyTopics?: string[];
  customerSegment?: string;
  businessImpact?: 'low' | 'medium' | 'high';
  actionSuggestions?: string[];
  reasoning?: string;
  processingTime?: number;
}

class AIApi {
  // Chat operations
  async sendChatMessage(organizationId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await apiClient.post(`/ai/organizations/${organizationId}/chat`, request);
    return response.data;
  }

  async createChatSession(organizationId: string, title?: string): Promise<ChatSession> {
    const response = await apiClient.post(`/ai/organizations/${organizationId}/chat/sessions`, {
      title
    });
    return response.data;
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await apiClient.get(`/ai/chat/sessions/${sessionId}`);
    return response.data;
  }

  async listChatSessions(organizationId: string): Promise<ChatSession[]> {
    const response = await apiClient.get(`/ai/organizations/${organizationId}/chat/sessions`);
    return response.data || [];
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/ai/chat/sessions/${sessionId}`);
  }

  // Company profile operations
  async createOrUpdateCompanyProfile(organizationId: string, profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await apiClient.post(`/ai/organizations/${organizationId}/profile`, profile);
    return response.data;
  }

  async getCompanyProfile(organizationId: string): Promise<CompanyProfile | null> {
    try {
      const response = await apiClient.get(`/ai/organizations/${organizationId}/profile`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getCompanyContext(organizationId: string): Promise<any> {
    const response = await apiClient.get(`/ai/organizations/${organizationId}/context`);
    return response.data;
  }

  // Feedback categorization
  async categorizeFeedback(request: CategorizationRequest): Promise<CategorizationResponse> {
    const response = await apiClient.post('/ai/categorize', request);
    return response.data;
  }

  async batchCategorizeFeedback(requests: CategorizationRequest[]): Promise<CategorizationResponse[]> {
    const response = await apiClient.post('/ai/categorize/batch', { requests });
    return response.data || [];
  }

  async submitCorrection(feedbackId: string, organizationId: string, correction: any): Promise<void> {
    await apiClient.post(`/ai/feedback/${feedbackId}/organizations/${organizationId}/corrections`, correction);
  }

  // Analytics and insights
  async generateInsights(organizationId: string, feedbackSummary: any): Promise<any> {
    const response = await apiClient.post(`/ai/organizations/${organizationId}/insights`, {
      feedbackSummary
    });
    return response.data;
  }

  async getCategorizationStats(organizationId: string, days: number = 30): Promise<any> {
    const response = await apiClient.get(`/ai/organizations/${organizationId}/stats/categorization`, {
      params: { days }
    });
    return response.data;
  }

  async getPendingReviewItems(organizationId: string, threshold: number = 0.7): Promise<any[]> {
    const response = await apiClient.get(`/ai/organizations/${organizationId}/review/pending`, {
      params: { threshold }
    });
    return response.data || [];
  }

  // Service availability and health
  async checkAvailability(detailed: boolean = false): Promise<AIAvailability | AIHealthStatus> {
    const response = await apiClient.get('/ai/availability', {
      params: { detailed: detailed.toString() }
    });
    return response.data;
  }

  // Utility methods
  async healthCheck(): Promise<AIHealthStatus> {
    return this.checkAvailability(true) as Promise<AIHealthStatus>;
  }

  async isServiceAvailable(): Promise<boolean> {
    try {
      const availability = await this.checkAvailability(false) as AIAvailability;
      return availability.available;
    } catch (error) {
      console.error('Failed to check AI service availability:', error);
      return false;
    }
  }

  // WebSocket connection helper
  getWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return baseUrl.replace(/^http/, 'ws');
  }

  // Authentication token for WebSocket
  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('supertokens-access-token');
    }
    return null;
  }
}

export const aiApi = new AIApi();