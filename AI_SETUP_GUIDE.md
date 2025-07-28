# FeedbackHub AI Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete AI functionality including LangChain, pgvector, and RAG chat.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with superuser access
- OpenAI API key

## 1. Environment Setup

### Create `.env` file:
```bash
# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration  
DATABASE_URL=postgresql://username:password@localhost:5432/feedbackhub
REDIS_URL=redis://localhost:6379

# API Configuration
API_PORT=3001
NODE_ENV=development
```

### Install Dependencies:
```bash
cd apps/api
npm install

# The following packages are now included:
# - langchain ^0.1.25
# - @langchain/openai ^0.0.14
# - @langchain/postgres ^0.0.3
# - socket.io ^4.7.4
# - pgvector ^0.1.8
```

## 2. Database Setup

### Enable pgvector Extension:
```sql
-- Connect as superuser (postgres)
psql -U postgres -d feedbackhub

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Run Migrations:
```bash
# Run all migrations including AI tables
npm run db:migrate

# Migrations include:
# - 001-create-tables.js (base tables)
# - 002-create-ai-tables.js (AI functionality)  
# - 003-add-pgvector-support.js (vector support)
```

## 3. Verify Installation

### Test API Endpoints:
```bash
# Start the server
npm run dev

# Test AI availability
curl http://localhost:3001/api/ai/availability

# Expected response:
{
  "success": true,
  "data": {
    "available": true,
    "services": {
      "categorization": true,
      "chat": true,
      "insights": true,
      "embeddings": true,
      "rag": true
    }
  }
}
```

### Test Company Profile:
```bash
# Create company profile (requires authentication)
curl -X POST http://localhost:3001/api/ai/organizations/ORG_ID/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "industry": "SaaS",
    "productType": "CRM Software",
    "companySize": "SMB",
    "businessGoals": ["Improve customer satisfaction", "Reduce churn"]
  }'
```

## 4. AI Features Overview

### Available Endpoints:

#### Company Context Management:
- `POST /api/ai/organizations/:id/profile` - Create/update company profile
- `GET /api/ai/organizations/:id/profile` - Get company profile
- `GET /api/ai/organizations/:id/context` - Get AI context

#### Feedback Categorization:
- `POST /api/ai/categorize/single` - Categorize single feedback
- `POST /api/ai/categorize/batch` - Batch categorization
- `POST /api/ai/organizations/:id/feedback/:feedbackId/correction` - Submit correction

#### RAG Chat System:
- `POST /api/ai/organizations/:id/chat` - Chat with feedback data
- `POST /api/ai/organizations/:id/chat/sessions` - Create chat session
- `GET /api/ai/organizations/:id/chat/sessions` - List sessions
- `GET /api/ai/chat/sessions/:sessionId` - Get specific session

#### Analytics & Insights:
- `POST /api/ai/organizations/:id/insights/generate` - Generate insights
- `GET /api/ai/organizations/:id/categorization/stats` - Get AI stats
- `GET /api/ai/organizations/:id/review/pending` - Pending review items

## 5. Usage Examples

### RAG Chat Example:
```javascript
// Create chat session
const session = await fetch('/api/ai/organizations/org123/chat/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Customer Feedback Analysis' })
});

// Chat with feedback data
const response = await fetch('/api/ai/organizations/org123/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.id,
    message: 'What are customers saying about our performance?'
  })
});

// Response includes:
// - message: AI-generated response
// - sources: Relevant feedback items with citations
// - suggestions: Actionable recommendations
// - followUpQuestions: Context-aware follow-ups
```

### Feedback Categorization:
```javascript
const result = await fetch('/api/ai/categorize/single', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    feedbackId: 'feedback123',
    organizationId: 'org123',
    title: 'App crashes on startup',
    description: 'The mobile app keeps crashing when I try to open it...',
    customerInfo: {
      name: 'John Doe',
      email: 'john@company.com',
      segment: 'Enterprise'
    }
  })
});

// Response includes:
// - category, sentiment, priority with confidence scores
// - emotions, keyTopics, actionSuggestions
// - businessImpact assessment
// - reasoning for the analysis
```

## 6. Architecture Overview

### LangChain Integration:
- **ChatOpenAI**: GPT-4 Mini for cost-effective, fast responses
- **ConversationalRetrievalQAChain**: RAG pipeline with memory
- **PGVectorStore**: Native PostgreSQL vector operations
- **BufferWindowMemory**: Conversation context management

### Company Context System:
- Dynamic prompt templates based on business context
- Industry-specific categorization and analysis
- Customer segment-aware responses
- Business goal alignment in recommendations

### Performance Features:
- Native pgvector with similarity indexes (10-100x faster)
- Conversation memory for context-aware responses
- Batch processing for efficiency
- Error handling with fallbacks

## 7. Troubleshooting

### Common Issues:

#### pgvector Extension Error:
```bash
# Error: extension "vector" is not available
# Solution: Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

#### OpenAI API Error:
```bash
# Error: OPENAI_API_KEY not found
# Solution: Add to .env file
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

#### Migration Errors:
```bash
# Error: relation already exists
# Solution: Check migration status
npm run db:status

# Reset if needed
npm run db:reset
npm run db:migrate
```

## 8. Development Workflow

### Adding New AI Features:
1. Create service in `src/services/ai/`
2. Add controller method in `aiController.ts`
3. Add route in `src/routes/ai.ts`
4. Update company context if needed
5. Add tests and documentation

### Monitoring & Debugging:
```bash
# Enable verbose logging
NODE_ENV=development npm run dev

# Check AI service status
curl http://localhost:3001/api/ai/availability

# Monitor database queries
tail -f /var/log/postgresql/postgresql.log
```

## 9. Production Considerations

### Security:
- Store OpenAI API key securely (AWS Secrets Manager, etc.)
- Implement rate limiting for AI endpoints
- Add request validation and sanitization
- Monitor API usage and costs

### Performance:
- Consider pgvector index tuning for large datasets
- Implement caching for frequently requested insights
- Monitor embedding generation costs
- Use connection pooling for database

### Scaling:
- Horizontal scaling with session stickiness
- Vector database optimization for >1M embeddings
- Background job processing for batch operations
- Consider dedicated AI service architecture

---

## ✅ Setup Complete!

Your FeedbackHub AI system is now ready with:
- 🤖 **LangChain-powered** categorization and analysis
- 💬 **RAG chat system** with conversation memory
- 🧠 **Company context-aware** responses
- ⚡ **High-performance** vector search with pgvector
- 📊 **Comprehensive analytics** and insights

For support, check the troubleshooting section or review the service logs for detailed error information.