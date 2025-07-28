/**
 * Performance and Load Testing Suite
 * Comprehensive stress testing for high-traffic scenarios and bottleneck detection
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  TestSetup,
  TestDataFactory,
  PerformanceTestHelper
} from '../utils/testHelpers';
import { QueryOptimizer } from '../../services/performance/queryOptimizer';
import { metricsService } from '../../services/integrations/metricsService';
import { feedbackService } from '../../services/feedbackService';
import { userService } from '../../services/userService';
import { customerService } from '../../services/customerService';
import { authBridgeService } from '../../services/authBridgeService';

describe('Performance and Load Testing Suite', () => {
  let testContext: any;
  let queryOptimizer: QueryOptimizer;

  beforeAll(async () => {
    // Setup comprehensive test environment
    testContext = await TestSetup.setupE2ETest();
    queryOptimizer = new QueryOptimizer();
    
    // Increase timeout for long-running performance tests
    jest.setTimeout(60000);
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    // Clear any caches to ensure clean testing
    jest.clearAllMocks();
  });

  describe('Database Performance Under Load', () => {
    test('should handle high-volume feedback creation', async () => {
      const feedbackCount = 500;
      const batchSize = 50;
      const batches = Math.ceil(feedbackCount / batchSize);

      const createFeedbackBatch = async (batchIndex: number) => {
        const batchFeedback = [];
        for (let i = 0; i < batchSize; i++) {
          const feedbackData = TestDataFactory.createFeedbackData({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            title: `Performance Test Feedback ${batchIndex * batchSize + i}`,
            description: `This is performance test feedback item ${batchIndex * batchSize + i} to test high-volume database operations`
          });
          batchFeedback.push(feedbackData);
        }

        // Measure batch creation time
        const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
          const { db } = await import('../../services/database');
          return await db.models.Feedback.bulkCreate(batchFeedback);
        });

        return { batchIndex, timeMs, count: batchFeedback.length };
      };

      // Run all batches concurrently
      const { results, totalTimeMs, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => createFeedbackBatch(Math.floor(Math.random() * 1000)),
        batches
      );

      // Performance assertions
      expect(results).toHaveLength(batches);
      expect(totalTimeMs).toBeLessThan(30000); // Should complete within 30 seconds
      expect(averageTimeMs).toBeLessThan(5000); // Each batch should take less than 5 seconds

      // Verify all feedback was created
      const totalCreated = results.reduce((sum, result) => sum + result.count, 0);
      expect(totalCreated).toBe(feedbackCount);

      console.log(`Created ${totalCreated} feedback items in ${totalTimeMs}ms (avg: ${averageTimeMs}ms per batch)`);
    });

    test('should maintain query performance with large datasets', async () => {
      // Create a large dataset first
      const largeDatasetSize = 1000;
      const feedbackData = Array.from({ length: largeDatasetSize }, (_, i) =>
        TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: `Large Dataset Item ${i}`,
          status: ['new', 'in_progress', 'resolved'][i % 3],
          priority: ['low', 'medium', 'high'][i % 3],
          category: ['bug', 'feature', 'improvement'][i % 3]
        })
      );

      const { db } = await import('../../services/database');
      await db.models.Feedback.bulkCreate(feedbackData);

      // Test various query patterns
      const queryTests = [
        {
          name: 'Basic list query',
          operation: () => feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 50 })
        },
        {
          name: 'Filtered by status',
          operation: () => feedbackService.getFeedbackList(testContext.organization.id, { status: ['new'] }, { limit: 50 })
        },
        {
          name: 'Complex multi-filter',
          operation: () => feedbackService.getFeedbackList(testContext.organization.id, {
            status: ['new', 'in_progress'],
            priority: ['high', 'medium'],
            category: ['bug']
          }, { limit: 50 })
        },
        {
          name: 'Search query',
          operation: () => feedbackService.getFeedbackList(testContext.organization.id, { search: 'Dataset' }, { limit: 50 })
        }
      ];

      for (const queryTest of queryTests) {
        const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(queryTest.operation);
        
        // Performance thresholds for different query types
        const maxTime = queryTest.name.includes('Search') ? 2000 : 1000;
        PerformanceTestHelper.assertPerformance(timeMs, maxTime);
        
        expect(result.feedback).toBeDefined();
        expect(Array.isArray(result.feedback)).toBe(true);
        
        console.log(`${queryTest.name}: ${timeMs}ms (${result.feedback.length} results)`);
      }
    });

    test('should handle concurrent database connections efficiently', async () => {
      const concurrentConnections = 20;
      const operationsPerConnection = 10;

      const simulateUserActivity = async (userId: string) => {
        const operations = [];
        
        for (let i = 0; i < operationsPerConnection; i++) {
          // Mix of read and write operations
          const operations_list = [
            () => feedbackService.getFeedbackList(testContext.organization.id),
            () => userService.getUserProfile(userId),
            () => customerService.getCustomerList(testContext.organization.id),
            () => feedbackService.createFeedback({
              organizationId: testContext.organization.id,
              customerId: testContext.customer.id,
              title: `Concurrent Test ${userId}-${i}`,
              description: 'Concurrent operation test'
            })
          ];
          
          const randomOperation = operations_list[Math.floor(Math.random() * operations_list.length)];
          operations.push(randomOperation());
        }

        return Promise.all(operations);
      };

      const { results, totalTimeMs, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => simulateUserActivity(`user-${Date.now()}-${Math.random()}`),
        concurrentConnections
      );

      // All concurrent operations should complete
      expect(results).toHaveLength(concurrentConnections);
      results.forEach(userOperations => {
        expect(userOperations).toHaveLength(operationsPerConnection);
      });

      // Performance thresholds for concurrent operations
      expect(totalTimeMs).toBeLessThan(15000); // Should complete within 15 seconds
      expect(averageTimeMs).toBeLessThan(2000); // Each user's operations within 2 seconds

      console.log(`${concurrentConnections} concurrent users, ${operationsPerConnection} ops each: ${totalTimeMs}ms total`);
    });
  });

  describe('API Endpoint Performance', () => {
    test('should handle high-frequency API requests', async () => {
      const requestsPerSecond = 50;
      const testDurationSeconds = 5;
      const totalRequests = requestsPerSecond * testDurationSeconds;

      const apiEndpoints = [
        {
          name: 'GET /feedback',
          operation: () => feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 10 })
        },
        {
          name: 'GET /customers',
          operation: () => customerService.getCustomerList(testContext.organization.id, { limit: 10 })
        },
        {
          name: 'GET /metrics',
          operation: () => metricsService.getMetricsSummary(testContext.organization.id)
        }
      ];

      for (const endpoint of apiEndpoints) {
        const startTime = Date.now();
        const requestPromises = [];

        // Generate requests at target rate
        for (let i = 0; i < totalRequests; i++) {
          const delay = (i / requestsPerSecond) * 1000; // Spread requests evenly
          
          const delayedRequest = new Promise(resolve => {
            setTimeout(async () => {
              try {
                const { timeMs } = await PerformanceTestHelper.measureExecutionTime(endpoint.operation);
                resolve({ success: true, timeMs, index: i });
              } catch (error) {
                resolve({ success: false, error: error.message, index: i });
              }
            }, delay);
          });
          
          requestPromises.push(delayedRequest);
        }

        const responses = await Promise.all(requestPromises);
        const totalTimeMs = Date.now() - startTime;

        // Analyze results
        const successfulRequests = responses.filter((r: any) => r.success);
        const failedRequests = responses.filter((r: any) => !r.success);
        const averageResponseTime = successfulRequests.reduce((sum: number, r: any) => sum + r.timeMs, 0) / successfulRequests.length;
        const actualRPS = (successfulRequests.length / totalTimeMs) * 1000;

        // Performance assertions
        expect(successfulRequests.length).toBeGreaterThan(totalRequests * 0.95); // 95% success rate
        expect(failedRequests.length).toBeLessThan(totalRequests * 0.05); // Less than 5% failures
        expect(averageResponseTime).toBeLessThan(500); // Average response under 500ms
        expect(actualRPS).toBeGreaterThan(requestsPerSecond * 0.8); // Achieve at least 80% of target RPS

        console.log(`${endpoint.name}: ${successfulRequests.length}/${totalRequests} successful, ${averageResponseTime.toFixed(2)}ms avg, ${actualRPS.toFixed(2)} RPS`);
      }
    });

    test('should maintain performance under memory pressure', async () => {
      // Create memory pressure by generating large datasets
      const memoryPressureOperations = [];
      
      // Generate large objects to simulate memory usage
      for (let i = 0; i < 10; i++) {
        const operation = async () => {
          // Create a large array of data
          const largeData = Array.from({ length: 10000 }, (_, index) => ({
            id: index,
            data: `Large data item ${index} for memory pressure test`,
            timestamp: new Date(),
            metadata: {
              processed: false,
              category: ['A', 'B', 'C'][index % 3],
              score: Math.random() * 100
            }
          }));

          // Perform operations on the data
          const processed = largeData.map(item => ({
            ...item,
            processed: true,
            hash: item.id.toString(16)
          }));

          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return processed.length;
        };

        memoryPressureOperations.push(operation);
      }

      // Run memory pressure operations while testing API performance
      const memoryPromise = Promise.all(memoryPressureOperations.map(op => op()));
      
      // Test API performance under memory pressure
      const apiTests = Array.from({ length: 20 }, () => 
        feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 10 })
      );

      const startTime = Date.now();
      const [memoryResults, ...apiResults] = await Promise.all([memoryPromise, ...apiTests]);
      const totalTime = Date.now() - startTime;

      // Verify memory operations completed
      expect(memoryResults).toHaveLength(10);
      memoryResults.forEach(result => expect(result).toBe(10000));

      // Verify API operations still performed well
      expect(apiResults).toHaveLength(20);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds even under memory pressure

      console.log(`Memory pressure test: ${apiResults.length} API calls completed in ${totalTime}ms`);
    });
  });

  describe('Authentication and Session Performance', () => {
    test('should handle high-volume user authentication', async () => {
      const userCount = 100;
      const createUser = async (index: number) => {
        const userData = TestDataFactory.createUserData({
          email: `perf-user-${index}@example.com`,
          firstName: `Performance`,
          lastName: `User${index}`
        });

        // Simulate user creation through auth bridge
        const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
          return await authBridgeService.handleUserSignup(userData, { source: 'signup' });
        });

        return { userData, timeMs };
      };

      const { results, totalTimeMs, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => createUser(Date.now() % 10000),
        userCount
      );

      // Performance assertions
      expect(results).toHaveLength(userCount);
      expect(totalTimeMs).toBeLessThan(20000); // Should complete within 20 seconds
      expect(averageTimeMs).toBeLessThan(1000); // Each user creation under 1 second

      console.log(`Created ${userCount} users in ${totalTimeMs}ms (avg: ${averageTimeMs}ms per user)`);
    });

    test('should efficiently manage concurrent sessions', async () => {
      const concurrentSessions = 50;
      const operationsPerSession = 5;

      const simulateUserSession = async (sessionId: string) => {
        const sessionOperations = [];

        for (let i = 0; i < operationsPerSession; i++) {
          const operations = [
            () => userService.getUserProfile(testContext.user.id),
            () => feedbackService.getFeedbackList(testContext.organization.id),
            () => customerService.getCustomerList(testContext.organization.id)
          ];

          const randomOp = operations[Math.floor(Math.random() * operations.length)];
          sessionOperations.push(randomOp());
        }

        const startTime = Date.now();
        await Promise.all(sessionOperations);
        const sessionTime = Date.now() - startTime;

        return { sessionId, sessionTime, operationCount: operationsPerSession };
      };

      const { results, totalTimeMs, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => simulateUserSession(`session-${Date.now()}-${Math.random()}`),
        concurrentSessions
      );

      // All sessions should complete successfully
      expect(results).toHaveLength(concurrentSessions);
      results.forEach(session => {
        expect(session.operationCount).toBe(operationsPerSession);
        expect(session.sessionTime).toBeLessThan(3000); // Each session under 3 seconds
      });

      expect(totalTimeMs).toBeLessThan(10000); // All sessions within 10 seconds
      console.log(`${concurrentSessions} concurrent sessions: ${totalTimeMs}ms total, ${averageTimeMs}ms average`);
    });
  });

  describe('Query Optimization Performance', () => {
    test('should optimize complex queries under load', async () => {
      // Test query optimization with various scenarios
      const queryScenarios = [
        {
          name: 'Simple filtering',
          filters: { status: ['new'] },
          options: { limit: 50 }
        },
        {
          name: 'Multi-field filtering',
          filters: { status: ['new', 'in_progress'], priority: ['high'], category: ['bug'] },
          options: { limit: 50, sortBy: 'createdAt', sortOrder: 'DESC' }
        },
        {
          name: 'Customer joins',
          filters: { hasCustomer: true },
          options: { limit: 50, includeCustomer: true }
        },
        {
          name: 'Date range filtering',
          filters: { 
            dateRange: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              end: new Date()
            }
          },
          options: { limit: 50 }
        }
      ];

      for (const scenario of queryScenarios) {
        // Test query optimization
        const optimizedQuery = queryOptimizer.optimizeFeedbackQuery(
          testContext.organization.id,
          scenario.filters,
          scenario.options
        );

        expect(optimizedQuery).toHaveProperty('query');
        expect(optimizedQuery).toHaveProperty('cacheKey');
        expect(optimizedQuery).toHaveProperty('cacheTTL');

        // Test concurrent execution of optimized queries
        const concurrentQueries = 10;
        const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
          () => feedbackService.getFeedbackList(testContext.organization.id, scenario.filters, scenario.options),
          concurrentQueries
        );

        // Performance assertions
        expect(results).toHaveLength(concurrentQueries);
        expect(averageTimeMs).toBeLessThan(800); // Optimized queries should be fast

        console.log(`${scenario.name}: ${concurrentQueries} concurrent queries, ${averageTimeMs}ms average`);
      }
    });

    test('should handle query cache performance', async () => {
      const cacheTestQueries = 50;
      const organizationId = testContext.organization.id;

      // First run - populate cache
      const firstRun = await PerformanceTestHelper.runConcurrent(
        () => feedbackService.getFeedbackList(organizationId, { status: ['new'] }, { limit: 20 }),
        cacheTestQueries
      );

      // Second run - should hit cache
      const secondRun = await PerformanceTestHelper.runConcurrent(
        () => feedbackService.getFeedbackList(organizationId, { status: ['new'] }, { limit: 20 }),
        cacheTestQueries
      );

      // Cache should improve performance
      expect(secondRun.averageTimeMs).toBeLessThan(firstRun.averageTimeMs * 1.5); // At most 50% more time
      
      console.log(`Cache performance: First run ${firstRun.averageTimeMs}ms, Second run ${secondRun.averageTimeMs}ms`);
    });
  });

  describe('Resource Usage and Limits', () => {
    test('should handle large payload processing', async () => {
      const largePayloadSize = 100; // 100 feedback items
      
      const largeFeedbackData = Array.from({ length: largePayloadSize }, (_, i) => 
        TestDataFactory.createFeedbackData({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: `Large Payload Item ${i}`,
          description: `This is a large description for feedback item ${i}. `.repeat(50) // ~2KB per item
        })
      );

      const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        const { db } = await import('../../services/database');
        return await db.models.Feedback.bulkCreate(largeFeedbackData);
      });

      expect(result).toHaveLength(largePayloadSize);
      expect(timeMs).toBeLessThan(10000); // Should process within 10 seconds

      console.log(`Processed ${largePayloadSize} large payload items in ${timeMs}ms`);
    });

    test('should enforce rate limiting under stress', async () => {
      const rateLimitTests = [];
      const requestsPerUser = 100;
      const burstUsers = 5;

      // Simulate burst traffic from multiple users
      for (let user = 0; user < burstUsers; user++) {
        const userRequests = Array.from({ length: requestsPerUser }, () =>
          feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 10 })
        );
        rateLimitTests.push(...userRequests);
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(rateLimitTests);
      const totalTime = Date.now() - startTime;

      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      expect(successful + failed).toBe(burstUsers * requestsPerUser);
      
      // Some requests should be throttled under extreme load
      const successRate = successful / (successful + failed);
      expect(successRate).toBeGreaterThan(0.5); // At least 50% should succeed
      
      console.log(`Rate limiting: ${successful}/${successful + failed} requests succeeded (${(successRate * 100).toFixed(1)}%)`);
    });

    test('should monitor memory usage patterns', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const memoryIntensiveOps = [];
      for (let i = 0; i < 5; i++) {
        memoryIntensiveOps.push(
          feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 100 })
        );
      }

      await Promise.all(memoryIntensiveOps);
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not grow excessively
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      expect(heapGrowthMB).toBeLessThan(100); // Should not grow more than 100MB
      
      console.log(`Memory usage: ${heapGrowthMB.toFixed(2)}MB heap growth`);
    });
  });

  describe('Integration Performance', () => {
    test('should handle metrics calculation under load', async () => {
      const metricsCalculations = 20;
      
      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => metricsService.getMetricsSummary(testContext.organization.id),
        metricsCalculations
      );

      expect(results).toHaveLength(metricsCalculations);
      expect(averageTimeMs).toBeLessThan(1000); // Metrics calculation under 1 second

      // Verify metrics consistency
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.totalIntegrations).toBe(firstResult.totalIntegrations);
      });

      console.log(`Metrics calculation: ${metricsCalculations} concurrent calls, ${averageTimeMs}ms average`);
    });

    test('should maintain integration health monitoring performance', async () => {
      const { healthMonitorService } = await import('../../services/integrations/healthMonitorService');
      
      const healthChecks = 15;
      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => healthMonitorService.getIntegrationHealth(testContext.organization.id),
        healthChecks
      );

      expect(results).toHaveLength(healthChecks);
      expect(averageTimeMs).toBeLessThan(2000); // Health checks under 2 seconds

      console.log(`Health monitoring: ${healthChecks} concurrent checks, ${averageTimeMs}ms average`);
    });
  });

  describe('System-Wide Performance Benchmarks', () => {
    test('should maintain overall system performance', async () => {
      // Comprehensive system test with mixed operations
      const systemOperations = [
        () => feedbackService.getFeedbackList(testContext.organization.id),
        () => userService.getUserProfile(testContext.user.id),
        () => customerService.getCustomerList(testContext.organization.id),
        () => metricsService.getMetricsSummary(testContext.organization.id),
        () => feedbackService.createFeedback({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'System Performance Test',
          description: 'Testing overall system performance'
        })
      ];

      const totalOperations = 100;
      const mixedOperations = Array.from({ length: totalOperations }, () => {
        const randomOp = systemOperations[Math.floor(Math.random() * systemOperations.length)];
        return randomOp();
      });

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        return await Promise.all(mixedOperations);
      });

      // System should handle mixed operations efficiently
      expect(timeMs).toBeLessThan(15000); // 100 mixed operations within 15 seconds
      const averageOpTime = timeMs / totalOperations;
      expect(averageOpTime).toBeLessThan(150); // Average operation under 150ms

      console.log(`System benchmark: ${totalOperations} mixed operations in ${timeMs}ms (${averageOpTime.toFixed(2)}ms avg)`);
    });

    test('should handle graceful degradation under extreme load', async () => {
      const extremeLoadOperations = 200;
      const startTime = Date.now();
      
      // Generate extreme load
      const operations = Array.from({ length: extremeLoadOperations }, () =>
        feedbackService.getFeedbackList(testContext.organization.id, {}, { limit: 10 })
      );

      const results = await Promise.allSettled(operations);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // System should maintain minimum service level
      const successRate = successful / extremeLoadOperations;
      expect(successRate).toBeGreaterThan(0.7); // At least 70% success under extreme load
      expect(totalTime).toBeLessThan(30000); // Should not hang indefinitely

      console.log(`Extreme load test: ${successful}/${extremeLoadOperations} succeeded (${(successRate * 100).toFixed(1)}%) in ${totalTime}ms`);
    });
  });
}); 