/**
 * Performance Testing Script
 * Tests API endpoints and database query performance
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_ORG_ID = process.env.TEST_ORG_ID || '550e8400-e29b-41d4-a716-446655440000';

class PerformanceTest {
  constructor() {
    this.results = [];
    this.session = null;
  }

  /**
   * Run performance tests
   */
  async runTests() {
    console.log('🚀 Starting Performance Tests...\n');

    try {
      // Setup authentication
      await this.setupAuth();

      // Run test suites
      await this.testSearchEndpoints();
      await this.testFeedbackEndpoints();
      await this.testCachePerformance();
      await this.testConcurrentRequests();

      // Generate reports
      this.generateReport();

    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
    }
  }

  /**
   * Setup authentication for tests
   */
  async setupAuth() {
    console.log('🔐 Setting up authentication...');

    try {
      // In a real test, you'd authenticate properly
      // For now, we'll simulate with test credentials
      this.session = {
        headers: {
          'Cookie': 'test-session=mock-session-token',
          'Content-Type': 'application/json'
        }
      };
      
      console.log('✅ Authentication setup complete\n');
    } catch (error) {
      console.error('❌ Auth setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Test search endpoint performance
   */
  async testSearchEndpoints() {
    console.log('🔍 Testing Search Endpoints...');

    const searchTests = [
      {
        name: 'Natural Language Search',
        method: 'POST',
        url: `/api/search/${TEST_ORG_ID}/natural`,
        data: {
          query: 'urgent customer complaints',
          page: 1,
          limit: 25
        }
      },
      {
        name: 'Boolean Search',
        method: 'POST',
        url: `/api/search/${TEST_ORG_ID}/boolean`,
        data: {
          query: 'urgent AND (bug OR issue)',
          page: 1,
          limit: 25
        }
      },
      {
        name: 'Search Suggestions',
        method: 'GET',
        url: `/api/search/${TEST_ORG_ID}/suggestions?q=customer&limit=10`
      },
      {
        name: 'Search Analytics',
        method: 'GET',
        url: `/api/search/analytics/${TEST_ORG_ID}?period=30d`
      }
    ];

    for (const test of searchTests) {
      await this.runSingleTest(test);
    }

    console.log('✅ Search endpoint tests complete\n');
  }

  /**
   * Test feedback endpoint performance
   */
  async testFeedbackEndpoints() {
    console.log('📝 Testing Feedback Endpoints...');

    const feedbackTests = [
      {
        name: 'Get Feedback List',
        method: 'GET',
        url: `/api/organizations/${TEST_ORG_ID}/feedback?page=1&limit=50`
      },
      {
        name: 'Get Feedback Stats',
        method: 'GET',
        url: `/api/organizations/${TEST_ORG_ID}/feedback/stats`
      },
      {
        name: 'Get Filter Options',
        method: 'GET',
        url: `/api/organizations/${TEST_ORG_ID}/feedback/filters`
      }
    ];

    for (const test of feedbackTests) {
      await this.runSingleTest(test);
    }

    console.log('✅ Feedback endpoint tests complete\n');
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    console.log('💾 Testing Cache Performance...');

    const cacheTest = {
      name: 'Search Suggestions (Cache Test)',
      method: 'GET',
      url: `/api/search/${TEST_ORG_ID}/suggestions?q=customer&limit=10`
    };

    // First request (cache miss)
    const missResult = await this.runSingleTest({
      ...cacheTest,
      name: 'Cache Miss - ' + cacheTest.name
    });

    // Wait a moment then make the same request (cache hit)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const hitResult = await this.runSingleTest({
      ...cacheTest,
      name: 'Cache Hit - ' + cacheTest.name
    });

    // Calculate cache improvement
    if (missResult.responseTime && hitResult.responseTime) {
      const improvement = ((missResult.responseTime - hitResult.responseTime) / missResult.responseTime) * 100;
      console.log(`🎯 Cache Performance Improvement: ${improvement.toFixed(1)}%`);
    }

    console.log('✅ Cache performance tests complete\n');
  }

  /**
   * Test concurrent request handling
   */
  async testConcurrentRequests() {
    console.log('⚡ Testing Concurrent Request Handling...');

    const concurrentTest = {
      name: 'Get Feedback List',
      method: 'GET',
      url: `/api/organizations/${TEST_ORG_ID}/feedback?page=1&limit=25`
    };

    const concurrentLevels = [1, 5, 10, 20];

    for (const level of concurrentLevels) {
      console.log(`  Testing ${level} concurrent requests...`);
      
      const startTime = performance.now();
      const promises = Array(level).fill().map(() => this.makeRequest(concurrentTest));
      
      try {
        const responses = await Promise.all(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const avgTime = totalTime / level;

        console.log(`    ✅ ${level} requests completed in ${totalTime.toFixed(0)}ms (avg: ${avgTime.toFixed(0)}ms per request)`);

        this.results.push({
          name: `Concurrent Requests (${level})`,
          responseTime: totalTime,
          avgResponseTime: avgTime,
          status: 'success',
          requests: level,
          successCount: responses.filter(r => r.status >= 200 && r.status < 300).length
        });

      } catch (error) {
        console.log(`    ❌ Concurrent test failed for ${level} requests:`, error.message);
      }
    }

    console.log('✅ Concurrent request tests complete\n');
  }

  /**
   * Run a single performance test
   */
  async runSingleTest(test) {
    console.log(`  Testing: ${test.name}`);
    
    const startTime = performance.now();
    
    try {
      const response = await this.makeRequest(test);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result = {
        name: test.name,
        responseTime: responseTime,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        dataSize: JSON.stringify(response.data).length,
        cacheHeader: response.headers['x-cache'] || 'N/A'
      };

      this.results.push(result);

      const statusEmoji = result.success ? '✅' : '❌';
      console.log(`    ${statusEmoji} ${responseTime.toFixed(0)}ms (${result.cacheHeader})`);

      return result;

    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result = {
        name: test.name,
        responseTime: responseTime,
        status: error.response?.status || 'ERROR',
        success: false,
        error: error.message
      };

      this.results.push(result);
      console.log(`    ❌ ${responseTime.toFixed(0)}ms - ERROR: ${error.message}`);

      return result;
    }
  }

  /**
   * Make HTTP request
   */
  async makeRequest(test) {
    const config = {
      method: test.method,
      url: `${API_BASE_URL}${test.url}`,
      ...this.session,
      timeout: 30000
    };

    if (test.data) {
      config.data = test.data;
    }

    return await axios(config);
  }

  /**
   * Generate performance report
   */
  generateReport() {
    console.log('📊 PERFORMANCE TEST REPORT');
    console.log('=' .repeat(50));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    console.log(`\n📈 SUMMARY:`);
    console.log(`  Total Tests: ${this.results.length}`);
    console.log(`  Successful: ${successfulTests.length}`);
    console.log(`  Failed: ${failedTests.length}`);
    console.log(`  Success Rate: ${((successfulTests.length / this.results.length) * 100).toFixed(1)}%`);

    if (successfulTests.length > 0) {
      const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
      const maxResponseTime = Math.max(...successfulTests.map(r => r.responseTime));
      const minResponseTime = Math.min(...successfulTests.map(r => r.responseTime));

      console.log(`\n⚡ RESPONSE TIMES:`);
      console.log(`  Average: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`  Fastest: ${minResponseTime.toFixed(0)}ms`);
      console.log(`  Slowest: ${maxResponseTime.toFixed(0)}ms`);

      // Analyze cache performance
      const cacheHits = successfulTests.filter(r => r.cacheHeader === 'HIT').length;
      const cacheMisses = successfulTests.filter(r => r.cacheHeader === 'MISS').length;
      
      if (cacheHits + cacheMisses > 0) {
        console.log(`\n💾 CACHE PERFORMANCE:`);
        console.log(`  Cache Hits: ${cacheHits}`);
        console.log(`  Cache Misses: ${cacheMisses}`);
        console.log(`  Cache Hit Rate: ${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(1)}%`);
      }
    }

    // Performance benchmarks
    console.log(`\n🎯 PERFORMANCE BENCHMARKS:`);
    const fastTests = successfulTests.filter(r => r.responseTime < 200);
    const mediumTests = successfulTests.filter(r => r.responseTime >= 200 && r.responseTime < 500);
    const slowTests = successfulTests.filter(r => r.responseTime >= 500);

    console.log(`  Fast (<200ms): ${fastTests.length} tests`);
    console.log(`  Medium (200-500ms): ${mediumTests.length} tests`);
    console.log(`  Slow (>500ms): ${slowTests.length} tests`);

    // Detailed results
    console.log(`\n📋 DETAILED RESULTS:`);
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const time = result.responseTime?.toFixed(0) || 'N/A';
      const cache = result.cacheHeader ? ` (${result.cacheHeader})` : '';
      console.log(`  ${status} ${result.name}: ${time}ms${cache}`);
    });

    if (failedTests.length > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      failedTests.forEach(result => {
        console.log(`  - ${result.name}: ${result.error || result.status}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Performance testing complete!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new PerformanceTest();
  test.runTests().catch(console.error);
}

module.exports = PerformanceTest;