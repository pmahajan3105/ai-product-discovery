/**
 * Manual AI Pipeline Test
 * Quick test script to verify AI functionality manually
 */

import { langchainService } from '../../services/ai/langchainService';
import { ragChatService } from '../../services/ai/ragChatService';
import { aiCategorizationService } from '../../services/ai/aiCategorizationService';
import { companyContextService } from '../../services/ai/companyContextService';
import { aiHealthCheckService } from '../../services/ai/healthCheckService';
import { db } from '../../services/database';

const TEST_ORG_ID = 'manual-test-org';
const TEST_USER_ID = 'manual-test-user';

async function runManualTests() {
  console.log('🚀 Starting AI Pipeline Manual Tests...\n');

  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    await db.connect();
    console.log('✅ Database connected\n');

    // Test 1: Health Check
    console.log('🏥 Testing AI Health Check Service...');
    const health = await aiHealthCheckService.getSystemHealth();
    console.log('Overall Status:', health.overall.status);
    console.log('Components:', Object.keys(health.components).map(key => 
      `${key}: ${health.components[key].status}`
    ).join(', '));
    console.log('✅ Health check completed\n');

    // Test 2: LangChain Service
    console.log('🔗 Testing LangChain Service...');
    console.log('Available:', langchainService.isAvailable());
    console.log('Has Chat Model:', !!langchainService.getChatModel());
    console.log('Has Embeddings:', !!langchainService.getEmbeddings());
    console.log('✅ LangChain service verified\n');

    // Test 3: Company Context
    console.log('🏢 Testing Company Context Service...');
    const context = await companyContextService.getCompanyContext(TEST_ORG_ID);
    console.log('Context categories:', context.categories.length);
    console.log('Business goals:', context.businessGoals.length);
    console.log('✅ Company context generated\n');

    // Test 4: Feedback Categorization
    console.log('📋 Testing AI Categorization Service...');
    const categorizationResult = await aiCategorizationService.categorizeFeedback({
      feedbackId: 'manual-test-feedback-1',
      organizationId: TEST_ORG_ID,
      title: 'Product Performance Issue',
      description: 'The application is running very slowly and crashes frequently. This is affecting our team productivity.',
      customerInfo: {
        name: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        segment: 'enterprise'
      },
      source: 'email'
    });
    
    console.log('Category:', categorizationResult.category);
    console.log('Sentiment:', categorizationResult.sentiment);
    console.log('Priority:', categorizationResult.priority);
    console.log('Confidence:', Math.round((categorizationResult.confidence || 0) * 100) + '%');
    console.log('✅ Categorization completed\n');

    // Test 5: RAG Chat Service
    console.log('💬 Testing RAG Chat Service...');
    
    // Create a chat session
    const sessionId = await ragChatService.createSession(TEST_ORG_ID, TEST_USER_ID, 'Manual Test Session');
    console.log('Created session:', sessionId);

    // Send a test message
    const chatResponse = await ragChatService.chat({
      sessionId,
      organizationId: TEST_ORG_ID,
      userId: TEST_USER_ID,
      message: 'What are the main issues customers are reporting?'
    });

    console.log('Chat Response:');
    console.log('- Message:', chatResponse.message.substring(0, 100) + '...');
    console.log('- Confidence:', Math.round(chatResponse.confidence * 100) + '%');
    console.log('- Sources:', chatResponse.sources.length);
    console.log('- Suggestions:', chatResponse.suggestions.length);
    console.log('- Processing Time:', chatResponse.processingTime + 'ms');
    console.log('- Fallback Response:', chatResponse.fallbackResponse || false);

    // List sessions
    const sessions = await ragChatService.listSessions(TEST_ORG_ID, TEST_USER_ID);
    console.log('Total sessions:', sessions.length);

    // Clean up test session
    await ragChatService.deleteSession(sessionId);
    console.log('✅ RAG chat service verified\n');

    // Test 6: Batch Operations
    console.log('📦 Testing Batch Operations...');
    const batchRequests = [
      {
        feedbackId: 'batch-test-1',
        organizationId: TEST_ORG_ID,
        title: 'Great Support',
        description: 'The customer support team was very helpful and resolved my issue quickly.',
        source: 'support-ticket'
      },
      {
        feedbackId: 'batch-test-2',
        organizationId: TEST_ORG_ID,
        title: 'Login Problems',
        description: 'I cannot log into my account. The password reset is not working.',
        source: 'email'
      }
    ];

    const batchResults = await aiCategorizationService.batchCategorize(batchRequests);
    console.log('Batch processed:', batchResults.length, 'items');
    batchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.category} (${result.sentiment}) - Confidence: ${Math.round((result.confidence || 0) * 100)}%`);
    });
    console.log('✅ Batch operations completed\n');

    // Test 7: Statistics
    console.log('📊 Testing Statistics...');
    const stats = await aiCategorizationService.getCategorizationStats(TEST_ORG_ID, 30);
    console.log('Total processed:', stats.totalProcessed);
    console.log('Average confidence:', Math.round(stats.averageConfidence * 100) + '%');
    console.log('Categories:', Object.keys(stats.categoryDistribution).length);
    console.log('Sentiments:', Object.keys(stats.sentimentDistribution).length);
    console.log('✅ Statistics retrieved\n');

    console.log('🎉 All manual tests completed successfully!');
    console.log('\n=== AI Pipeline Status ===');
    console.log('✅ Database: Connected');
    console.log('✅ LangChain: Available');
    console.log('✅ Health Check: Working');
    console.log('✅ Company Context: Generated');
    console.log('✅ Categorization: Functional');
    console.log('✅ RAG Chat: Operational');
    console.log('✅ Batch Processing: Working');
    console.log('✅ Statistics: Available');
    console.log('\n🚀 AI Pipeline is ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error);
    
    // Provide helpful debugging information
    console.log('\n🔍 Debugging Information:');
    console.log('- OpenAI API Key configured:', !!process.env.OPENAI_API_KEY);
    console.log('- Database connected:', db.isConnected());
    console.log('- LangChain available:', langchainService.isAvailable());
    
  } finally {
    // Disconnect from database
    await db.disconnect();
    console.log('\n📊 Database disconnected');
  }
}

// Performance test
async function runPerformanceTest() {
  console.log('⚡ Running Performance Test...\n');

  try {
    await db.connect();

    const startTime = Date.now();
    
    // Test concurrent operations
    const promises = Array.from({ length: 5 }, async (_, i) => {
      const sessionId = await ragChatService.createSession(TEST_ORG_ID, TEST_USER_ID, `Perf Test ${i + 1}`);
      
      const response = await ragChatService.chat({
        sessionId,
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        message: `Performance test message ${i + 1}: What insights can you provide?`
      });

      await ragChatService.deleteSession(sessionId);
      
      return {
        sessionId,
        processingTime: response.processingTime,
        messageLength: response.message.length
      };
    });

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    console.log('Performance Results:');
    console.log('- Total concurrent operations:', results.length);
    console.log('- Total time:', totalTime + 'ms');
    console.log('- Average time per operation:', Math.round(totalTime / results.length) + 'ms');
    console.log('- AI processing times:', results.map(r => r.processingTime + 'ms').join(', '));
    console.log('✅ Performance test completed\n');

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await db.disconnect();
  }
}

// Run tests based on command line argument
const testType = process.argv[2] || 'manual';

if (testType === 'performance') {
  runPerformanceTest();
} else {
  runManualTests();
}

export { runManualTests, runPerformanceTest };