# AI Prompts Reference Documentation

This document contains all the system prompts used in the FeedbackHub AI implementation for easy reference and customization.

## 📋 **Table of Contents**
1. [Company Context Prompt](#1-company-context-prompt)
2. [Feedback Categorization Prompt](#2-feedback-categorization-prompt)
3. [RAG Chat Conversation Prompt](#3-rag-chat-conversation-prompt)
4. [Executive Insights Generation Prompt](#4-executive-insights-generation-prompt)
5. [Default Company Settings](#5-default-company-settings)
6. [Prompt Customization Guide](#6-prompt-customization-guide)

---

## **1. Company Context Prompt**

**Location**: `apps/api/src/services/ai/companyContextService.ts:145-179`
**Purpose**: Creates dynamic, company-specific context injected into all AI operations

```typescript
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
```

**Sample Output**:
```
You are analyzing customer feedback for Project Management Software in the Technology industry.

Company Context:
- Industry: Technology
- Product: Project Management Software
- Company Size: Growth
- Target Market: Mid-market businesses

Customer Segments:
- Enterprise: Large organizations, complex workflows, high budget (high value)
- Mid-Market: Growing companies, standardizing processes, moderate budget (medium value)
- SMB: Small teams, simple needs, cost-conscious (low value)

Business Goals:
- Increase user engagement and retention
- Expand into enterprise market
- Reduce customer churn

Current Challenges:
- User onboarding complexity
- Feature discoverability
- Mobile experience

Key Product Features:
- Task management
- Team collaboration
- Reporting and analytics
- Third-party integrations

Priority Keywords (indicate high-priority issues):
performance, slow, crash, bug, error, login, broken

High-Value Customer Indicators:
enterprise, large team, enterprise plan, premium, annual subscription

Recent Feedback Patterns:
- Performance Issues: 45 items (increasing)
- Feature Requests: 32 items (stable)
- User Interface: 28 items (decreasing)
- Integration Problems: 15 items (increasing)
- Mobile Issues: 12 items (stable)
```

---

## **2. Feedback Categorization Prompt**

**Location**: `apps/api/src/services/ai/langchainService.ts:138-173`
**Purpose**: Analyzes individual feedback items and returns structured classification

```typescript
const categorizationTemplate = `${contextPrompt}

You are analyzing customer feedback for categorization and sentiment analysis.

Your task is to analyze the feedback and return a JSON response with the following structure:
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
```

**Input Variables**:
- `customerName`: Customer's name
- `customerEmail`: Customer's email address
- `customerCompany`: Customer's company
- `customerSegment`: Customer segment (enterprise, mid-market, SMB)
- `feedbackText`: The actual feedback content

**Sample Analysis Output**:
```json
{
  "category": "performance-issues",
  "categoryConfidence": 0.92,
  "sentiment": "negative",
  "sentimentScore": -1.5,
  "sentimentConfidence": 0.88,
  "priority": "high",
  "priorityScore": 8,
  "emotions": ["frustration", "disappointment"],
  "keyTopics": ["slow loading", "dashboard", "timeout errors"],
  "customerSegment": "enterprise",
  "businessImpact": "high",
  "actionSuggestions": [
    "Investigate dashboard loading performance",
    "Implement timeout error handling",
    "Provide status updates to customer"
  ],
  "reasoning": "Customer reports critical performance issues affecting daily workflow. High-value enterprise customer with specific technical details suggests urgent attention needed."
}
```

---

## **3. RAG Chat Conversation Prompt**

**Location**: `apps/api/src/services/ai/ragChatService.ts:122-143`
**Purpose**: Powers the conversational AI chat interface with context-aware responses

```typescript
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
```

**Input Variables**:
- `context`: Relevant feedback data retrieved via vector similarity search
- `chat_history`: Previous conversation messages
- `question`: Current user question

**Sample Conversation**:

**User**: "What are the most common complaints from enterprise customers?"

**AI Response**: 
```
Based on the feedback data, here are the most common complaints from enterprise customers:

## Top Issues (Last 30 Days)

1. **Performance Problems** (32 reports)
   - Dashboard loading takes 15-30 seconds
   - Timeout errors during peak usage
   - Mobile app crashes with large datasets

2. **Integration Limitations** (28 reports)
   - Missing Salesforce sync functionality
   - SSO authentication issues
   - API rate limiting problems

3. **Advanced Feature Gaps** (21 reports)
   - Lack of custom reporting options
   - Limited user permission controls
   - No bulk data import capability

## Business Impact
These issues are particularly concerning because enterprise customers represent 60% of your revenue. The performance problems are directly affecting daily workflows for teams of 50+ users.

## Recommended Actions
1. **Immediate**: Investigate dashboard performance optimization
2. **Short-term**: Prioritize Salesforce integration completion
3. **Medium-term**: Develop enterprise-specific feature roadmap

Would you like me to dive deeper into any of these areas or show you specific feedback examples?
```

---

## **4. Executive Insights Generation Prompt**

**Location**: `apps/api/src/services/ai/langchainService.ts:207-233`
**Purpose**: Creates executive-level insights from feedback summaries

```typescript
const insightsTemplate = `${contextPrompt}

You are generating executive insights from customer feedback data.

Based on the feedback summary provided, generate actionable business insights in JSON format:
{
  "summary": "string", // Brief executive overview in plain language
  "keyInsights": ["string"], // 3-5 key insights aligned with business goals
  "recommendations": ["string"], // 3-5 actionable recommendations
  "trends": ["string"], // 2-3 important trends with business impact
  "priorityActions": ["string"], // Immediate actions needed
  "customerSegmentInsights": {
    "enterprise": "string",
    "midMarket": "string", 
    "smb": "string"
  }
}

Focus on:
1. Business-relevant insights aligned with company goals
2. Actionable recommendations with clear next steps
3. Customer segment-specific insights
4. Trends that impact business success
5. Priority issues requiring immediate attention

Feedback Summary Data:
{feedbackSummary}`;
```

**Input Variables**:
- `feedbackSummary`: Aggregated feedback data and metrics

**Sample Insights Output**:
```json
{
  "summary": "Customer feedback reveals strong product-market fit but significant performance concerns are emerging as a primary churn risk, particularly among high-value enterprise customers. While feature satisfaction remains high, technical stability issues require immediate executive attention.",
  
  "keyInsights": [
    "Performance issues increased 40% this quarter, directly correlating with enterprise customer churn",
    "Feature requests show strong alignment with product roadmap, indicating good market positioning",
    "Customer success engagement drops 60% after first performance incident",
    "Mobile usage complaints concentrated in field teams, suggesting untapped expansion opportunity",
    "Integration requests heavily skewed toward Salesforce and Microsoft, showing clear partnership priorities"
  ],
  
  "recommendations": [
    "Establish dedicated performance engineering team to address technical debt",
    "Implement proactive monitoring and customer communication for service disruptions",
    "Accelerate Salesforce integration development to capture enterprise expansion",
    "Create mobile-first experience for field teams to drive user adoption",
    "Develop customer success playbook for performance incident recovery"
  ],
  
  "trends": [
    "Enterprise customers increasingly demanding real-time performance guarantees and SLAs",
    "Shift toward mobile-first workflows, especially in sales and field operations",
    "Growing expectation for bi-directional data sync with business-critical systems"
  ],
  
  "priorityActions": [
    "Schedule emergency performance review with engineering leadership this week",
    "Implement immediate customer communication protocol for service issues",
    "Accelerate enterprise customer health score monitoring"
  ],
  
  "customerSegmentInsights": {
    "enterprise": "High performance standards, complex integration needs, willing to pay premium for reliability. Churn risk increases dramatically after performance incidents.",
    "midMarket": "Feature-focused, seeking competitive advantage through better workflows. Price-sensitive but value-driven. Strong expansion potential.",
    "smb": "Simplicity and ease-of-use priorities. Limited technical resources. High viral potential through word-of-mouth recommendations."
  }
}
```

---

## **5. Default Company Settings**

**Location**: `apps/api/src/services/ai/companyContextService.ts` (various methods)

### **Default Industries and Categories**:

```typescript
// Default category mappings by industry
getDefaultCategoryMapping(industry: string): Record<string, string[]> {
  const mappings = {
    'Technology': [
      'performance-issues', 'feature-requests', 'bug-reports', 
      'user-interface', 'integrations', 'security', 'mobile-experience',
      'api-documentation', 'developer-experience'
    ],
    'SaaS': [
      'billing-subscription', 'user-onboarding', 'feature-requests',
      'performance-issues', 'integrations', 'customer-support',
      'reporting-analytics', 'user-permissions'
    ],
    'E-commerce': [
      'product-catalog', 'checkout-payment', 'shipping-delivery',
      'customer-service', 'mobile-shopping', 'search-discovery',
      'returns-refunds', 'product-reviews'
    ],
    'Finance': [
      'security-compliance', 'transaction-processing', 'reporting',
      'user-interface', 'mobile-banking', 'customer-support',
      'integration-banking', 'regulatory-compliance'
    ],
    'Healthcare': [
      'patient-experience', 'clinical-workflow', 'compliance-hipaa',
      'system-integration', 'reporting-analytics', 'mobile-access',
      'security-privacy', 'user-training'
    ],
    'Education': [
      'learning-experience', 'course-content', 'technical-issues',
      'mobile-learning', 'assessment-grading', 'collaboration-tools',
      'accessibility', 'parent-communication'
    ]
  };
  
  return { categories: mappings[industry] || mappings['Technology'] };
}

// Default priority keywords by industry
getDefaultPriorityKeywords(industry: string): string[] {
  const keywords = {
    'Technology': ['crash', 'slow', 'error', 'bug', 'broken', 'timeout', 'performance'],
    'SaaS': ['billing', 'payment', 'login', 'access', 'data loss', 'downtime'],
    'E-commerce': ['payment', 'checkout', 'order', 'shipping', 'refund', 'cart'],
    'Finance': ['security', 'transaction', 'fraud', 'compliance', 'audit'],
    'Healthcare': ['patient', 'hipaa', 'privacy', 'clinical', 'safety'],
    'Education': ['grade', 'student', 'assignment', 'accessibility', 'privacy']
  };
  
  return keywords[industry] || keywords['Technology'];
}

// Default customer value indicators
getDefaultValueWords(): string[] {
  return [
    'enterprise', 'premium', 'annual', 'large team', 'corporate',
    'enterprise plan', 'business critical', 'mission critical',
    'high volume', 'integration', 'custom', 'dedicated',
    'priority support', 'sla', 'compliance'
  ];
}
```

### **Default Customer Segments**:

```typescript
// Default customer segments by company size
getDefaultCustomerSegments(companySize: string) {
  const segments = {
    'Startup': [
      { name: 'Early Adopters', characteristics: ['tech-savvy', 'feedback-driven'], value: 'medium' },
      { name: 'Bootstrapped', characteristics: ['cost-conscious', 'self-service'], value: 'low' }
    ],
    'SMB': [
      { name: 'Small Teams', characteristics: ['simple needs', 'quick setup'], value: 'low' },
      { name: 'Growing SMB', characteristics: ['scaling processes', 'integration needs'], value: 'medium' }
    ],
    'Growth': [
      { name: 'Mid-Market', characteristics: ['standardizing processes', 'moderate budget'], value: 'medium' },
      { name: 'Enterprise-Ready', characteristics: ['complex workflows', 'high budget'], value: 'high' }
    ],
    'Enterprise': [
      { name: 'Enterprise', characteristics: ['complex requirements', 'high security'], value: 'high' },
      { name: 'Strategic', characteristics: ['partnership potential', 'reference customer'], value: 'very high' }
    ]
  };
  
  return segments[companySize] || segments['Growth'];
}
```

---

## **6. Prompt Customization Guide**

### **How to Customize Prompts**:

1. **Company Context Customization**:
   - Edit `companyContextService.ts:145-179`
   - Modify the template structure
   - Add industry-specific considerations
   - Include competitive positioning

2. **Categorization Customization**:
   - Edit `langchainService.ts:138-173`
   - Adjust the JSON response structure
   - Add custom analysis dimensions
   - Modify confidence scoring criteria

3. **Chat Conversation Customization**:
   - Edit `ragChatService.ts:122-143`
   - Change the assistant personality
   - Add specific response guidelines
   - Include custom formatting instructions

4. **Insights Generation Customization**:
   - Edit `langchainService.ts:207-233`
   - Modify executive summary format
   - Add industry-specific metrics
   - Include custom recommendation categories

### **Best Practices for Prompt Engineering**:

1. **Be Specific**: Clear, detailed instructions yield better results
2. **Use Examples**: Include sample outputs when possible
3. **Set Constraints**: Define valid response formats and ranges
4. **Include Context**: Company-specific information improves relevance
5. **Test Variations**: A/B test different prompt versions
6. **Monitor Performance**: Track confidence scores and user feedback

### **Testing Your Prompt Changes**:

```bash
# Run the manual test to verify prompt changes
npx ts-node apps/api/src/tests/ai/manualTest.ts

# Test specific categorization
curl -X POST http://localhost:3001/api/ai/categorize \
  -H "Content-Type: application/json" \
  -d '{"feedbackId":"test","organizationId":"your-org","title":"Test","description":"Your test feedback"}'
```

---

## **📝 Prompt Modification Checklist**

When modifying prompts, ensure you:

- [ ] Test with various input types and edge cases
- [ ] Validate JSON response format (for structured outputs)
- [ ] Check confidence score ranges (0-1 for percentages, -2 to 2 for sentiment)
- [ ] Verify company context integration
- [ ] Test with different customer segments
- [ ] Monitor AI response quality and relevance
- [ ] Update corresponding TypeScript interfaces if needed
- [ ] Document any breaking changes

---

**Last Updated**: 2024-01-27
**Version**: 1.0
**Maintained By**: FeedbackHub AI Team

*This document should be updated whenever prompt templates are modified to ensure consistency across the development team.*