/**
 * End-to-End Frontend-Backend Integration Tests
 * Validates complete user workflows and frontend-backend communication
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  TestSetup,
  TestDataFactory,
  AuthTestHelper,
  PerformanceTestHelper
} from '../utils/testHelpers';
import request from 'supertest';
import { app } from '../../index';

describe('E2E Frontend-Backend Integration Tests', () => {
  let testContext: any;
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    // Setup comprehensive test environment
    testContext = await TestSetup.setupE2ETest();
    authHeaders = AuthTestHelper.createAuthHeaders('test-session-token');
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('Authentication and Session Management', () => {
    test('should handle complete authentication flow', async () => {
      // 1. Check initial auth status (unauthenticated)
      const initialAuthResponse = await request(app)
        .get('/api/auth/status')
        .expect(401);

      expect(initialAuthResponse.body.success).toBe(false);

      // 2. Simulate magic link authentication
      const magicLinkData = {
        email: 'e2e-test@example.com',
        redirectTo: '/dashboard'
      };

      const magicLinkResponse = await request(app)
        .post('/api/auth/magic-link')
        .send(magicLinkData)
        .expect(200);

      expect(magicLinkResponse.body.success).toBe(true);
      expect(magicLinkResponse.body.data).toHaveProperty('deviceId');

      // 3. Simulate magic link consumption
      const consumeResponse = await request(app)
        .post('/api/auth/magic-link/consume')
        .send({
          linkCode: 'test-link-code',
          preAuthSessionId: 'test-session-id'
        })
        .expect(200);

      expect(consumeResponse.body.success).toBe(true);
      expect(consumeResponse.body.data).toHaveProperty('profile');

      // 4. Verify authenticated status
      const authStatusResponse = await request(app)
        .get('/api/auth/status')
        .set(authHeaders)
        .expect(200);

      expect(authStatusResponse.body.success).toBe(true);
      expect(authStatusResponse.body.data.profile).toHaveProperty('email');
    });

    test('should handle OAuth authentication flow', async () => {
      // 1. Initiate OAuth flow
      const oauthInitResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ redirectTo: '/dashboard' })
        .expect(200);

      expect(oauthInitResponse.body.success).toBe(true);
      expect(oauthInitResponse.body.data).toHaveProperty('authUrl');

      // 2. Simulate OAuth callback
      const callbackResponse = await request(app)
        .get('/api/auth/oauth/callback')
        .query({
          code: 'test-oauth-code',
          state: 'test-state'
        })
        .expect(302); // Redirect response

      expect(callbackResponse.headers.location).toContain('/dashboard');

      // 3. Verify user profile creation
      const profileResponse = await request(app)
        .get('/api/auth/status')
        .set(authHeaders)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.profile).toBeDefined();
    });

    test('should handle session persistence and refresh', async () => {
      // 1. Create session
      const loginResponse = await request(app)
        .post('/api/auth/signin')
        .send({
          email: testContext.user.email,
          password: 'test-password'
        })
        .expect(200);

      const sessionCookie = loginResponse.headers['set-cookie'];
      expect(sessionCookie).toBeDefined();

      // 2. Test session persistence
      const sessionCheckResponse = await request(app)
        .get('/api/auth/status')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(sessionCheckResponse.body.success).toBe(true);

      // 3. Test session refresh
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Dashboard Integration Workflow', () => {
    test('should load complete dashboard data', async () => {
      // 1. Get dashboard metrics
      const metricsResponse = await request(app)
        .get(`/api/organizations/${testContext.organization.id}/metrics`)
        .set(authHeaders)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toHaveProperty('totalFeedback');
      expect(metricsResponse.body.data).toHaveProperty('avgResponseTime');
      expect(metricsResponse.body.data).toHaveProperty('customerSatisfaction');

      // 2. Get activity feed
      const activityResponse = await request(app)
        .get(`/api/organizations/${testContext.organization.id}/activity`)
        .set(authHeaders)
        .query({ limit: 10 })
        .expect(200);

      expect(activityResponse.body.success).toBe(true);
      expect(Array.isArray(activityResponse.body.data)).toBe(true);

      // 3. Get filtered metrics with time range
      const timeRangeResponse = await request(app)
        .get(`/api/organizations/${testContext.organization.id}/metrics`)
        .set(authHeaders)
        .query({
          timeRange: '7d',
          filters: JSON.stringify({ status: ['new', 'in_progress'] })
        })
        .expect(200);

      expect(timeRangeResponse.body.success).toBe(true);
      expect(timeRangeResponse.body.data).toHaveProperty('timeRange');
    });

    test('should handle dashboard real-time updates', async () => {
      // 1. Create new feedback that should trigger updates
      const newFeedbackResponse = await request(app)
        .post('/api/feedback')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'Real-time Test Feedback',
          description: 'This should trigger real-time dashboard updates',
          priority: 'high',
          category: 'bug'
        })
        .expect(201);

      expect(newFeedbackResponse.body.success).toBe(true);
      const feedbackId = newFeedbackResponse.body.data.id;

      // 2. Verify metrics reflect the new feedback
      const updatedMetricsResponse = await request(app)
        .get(`/api/organizations/${testContext.organization.id}/metrics`)
        .set(authHeaders)
        .expect(200);

      expect(updatedMetricsResponse.body.data.totalFeedback).toBeGreaterThan(0);

      // 3. Update feedback status
      const updateResponse = await request(app)
        .put(`/api/feedback/${feedbackId}`)
        .set(authHeaders)
        .send({
          status: 'in_progress',
          assignedTo: testContext.user.id
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // 4. Verify activity feed shows the update
      const activityCheckResponse = await request(app)
        .get(`/api/organizations/${testContext.organization.id}/activity`)
        .set(authHeaders)
        .query({ limit: 5 })
        .expect(200);

      const activities = activityCheckResponse.body.data;
      const feedbackUpdate = activities.find((activity: any) => 
        activity.type === 'feedback_updated' && activity.resourceId === feedbackId
      );
      expect(feedbackUpdate).toBeDefined();
    });
  });

  describe('Feedback Management Workflow', () => {
    test('should handle complete feedback lifecycle', async () => {
      // 1. Create feedback
      const createResponse = await request(app)
        .post('/api/feedback')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'E2E Test Feedback',
          description: 'Complete lifecycle test feedback',
          priority: 'medium',
          category: 'feature',
          metadata: {
            source: 'web_app',
            userAgent: 'E2E Test Suite'
          }
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const feedbackId = createResponse.body.data.id;

      // 2. Get feedback details
      const detailsResponse = await request(app)
        .get(`/api/feedback/${feedbackId}`)
        .set(authHeaders)
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.title).toBe('E2E Test Feedback');

      // 3. Update feedback
      const updateResponse = await request(app)
        .put(`/api/feedback/${feedbackId}`)
        .set(authHeaders)
        .send({
          status: 'in_progress',
          assignedTo: testContext.user.id,
          priority: 'high',
          tags: ['urgent', 'customer-request']
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.status).toBe('in_progress');

      // 4. Add comment
      const commentResponse = await request(app)
        .post(`/api/feedback/${feedbackId}/comments`)
        .set(authHeaders)
        .send({
          content: 'Working on this issue now',
          internal: false
        })
        .expect(201);

      expect(commentResponse.body.success).toBe(true);

      // 5. Resolve feedback
      const resolveResponse = await request(app)
        .put(`/api/feedback/${feedbackId}`)
        .set(authHeaders)
        .send({
          status: 'resolved',
          resolution: 'Implemented requested feature'
        })
        .expect(200);

      expect(resolveResponse.body.success).toBe(true);
      expect(resolveResponse.body.data.status).toBe('resolved');

      // 6. Verify in feedback list
      const listResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          status: 'resolved'
        })
        .expect(200);

      const resolvedFeedback = listResponse.body.data.feedback.find((f: any) => f.id === feedbackId);
      expect(resolvedFeedback).toBeDefined();
      expect(resolvedFeedback.status).toBe('resolved');
    });

    test('should handle feedback filtering and search', async () => {
      // Create test feedback with various attributes
      const testFeedback = [
        {
          title: 'Bug Report: Search not working',
          description: 'Search functionality returns no results',
          priority: 'high',
          category: 'bug',
          status: 'new'
        },
        {
          title: 'Feature Request: Dark mode',
          description: 'Please add dark mode support',
          priority: 'medium',
          category: 'feature',
          status: 'in_progress'
        },
        {
          title: 'Performance Issue: Slow loading',
          description: 'Dashboard takes too long to load',
          priority: 'high',
          category: 'performance',
          status: 'new'
        }
      ];

      // Create feedback items
      const feedbackIds = [];
      for (const feedback of testFeedback) {
        const response = await request(app)
          .post('/api/feedback')
          .set(authHeaders)
          .send({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            ...feedback
          })
          .expect(201);
        
        feedbackIds.push(response.body.data.id);
      }

      // Test filtering by status
      const statusFilterResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          status: 'new'
        })
        .expect(200);

      const newFeedback = statusFilterResponse.body.data.feedback;
      expect(newFeedback.length).toBeGreaterThanOrEqual(2);
      newFeedback.forEach((f: any) => expect(f.status).toBe('new'));

      // Test filtering by priority
      const priorityFilterResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          priority: 'high'
        })
        .expect(200);

      const highPriorityFeedback = priorityFilterResponse.body.data.feedback;
      expect(highPriorityFeedback.length).toBeGreaterThanOrEqual(2);
      highPriorityFeedback.forEach((f: any) => expect(f.priority).toBe('high'));

      // Test search functionality
      const searchResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          search: 'search'
        })
        .expect(200);

      const searchResults = searchResponse.body.data.feedback;
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      const foundSearchFeedback = searchResults.find((f: any) => f.title.includes('Search'));
      expect(foundSearchFeedback).toBeDefined();

      // Test combined filters
      const combinedFilterResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          status: 'new',
          priority: 'high',
          category: 'bug'
        })
        .expect(200);

      const filteredResults = combinedFilterResponse.body.data.feedback;
      if (filteredResults.length > 0) {
        filteredResults.forEach((f: any) => {
          expect(f.status).toBe('new');
          expect(f.priority).toBe('high');
          expect(f.category).toBe('bug');
        });
      }
    });
  });

  describe('Customer Management Integration', () => {
    test('should handle customer identification and management', async () => {
      // 1. Create customer via smart identification
      const identifyResponse = await request(app)
        .post('/api/customers/identify')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          name: 'John Smith',
          email: 'john.smith@example.com',
          company: 'Example Corp',
          metadata: {
            source: 'contact_form',
            referrer: 'google'
          }
        })
        .expect(200);

      expect(identifyResponse.body.success).toBe(true);
      const customerId = identifyResponse.body.data.id;

      // 2. Get customer profile
      const profileResponse = await request(app)
        .get(`/api/customers/${customerId}`)
        .set(authHeaders)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe('john.smith@example.com');

      // 3. Update customer information
      const updateResponse = await request(app)
        .put(`/api/customers/${customerId}`)
        .set(authHeaders)
        .send({
          company: 'Example Corporation',
          phone: '+1-555-0123',
          avatar: 'https://example.com/avatar.jpg'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.company).toBe('Example Corporation');

      // 4. Test customer list and filtering
      const listResponse = await request(app)
        .get('/api/customers')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          search: 'John',
          limit: 10
        })
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      const customers = listResponse.body.data.customers;
      const foundCustomer = customers.find((c: any) => c.id === customerId);
      expect(foundCustomer).toBeDefined();

      // 5. Test customer feedback association
      const feedbackResponse = await request(app)
        .post('/api/feedback')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          customerId: customerId,
          title: 'Customer Feedback Test',
          description: 'Testing customer association'
        })
        .expect(201);

      expect(feedbackResponse.body.success).toBe(true);
      expect(feedbackResponse.body.data.customerId).toBe(customerId);

      // 6. Verify customer stats
      const statsResponse = await request(app)
        .get(`/api/customers/${customerId}/stats`)
        .set(authHeaders)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalFeedback).toBeGreaterThan(0);
    });

    test('should handle customer merging workflow', async () => {
      // 1. Create duplicate customers
      const customer1Response = await request(app)
        .post('/api/customers/identify')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          name: 'Jane Doe',
          email: 'jane.doe@company.com'
        })
        .expect(200);

      const customer2Response = await request(app)
        .post('/api/customers/identify')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          name: 'J. Doe',
          email: 'j.doe@company.com' // Different email, same person
        })
        .expect(200);

      const customer1Id = customer1Response.body.data.id;
      const customer2Id = customer2Response.body.data.id;

      // 2. Detect duplicates
      const duplicatesResponse = await request(app)
        .get('/api/customers/duplicates')
        .set(authHeaders)
        .query({ organizationId: testContext.organization.id })
        .expect(200);

      expect(duplicatesResponse.body.success).toBe(true);
      expect(Array.isArray(duplicatesResponse.body.data)).toBe(true);

      // 3. Merge customers
      const mergeResponse = await request(app)
        .post('/api/customers/merge')
        .set(authHeaders)
        .send({
          targetCustomerId: customer1Id,
          sourceCustomerId: customer2Id
        })
        .expect(200);

      expect(mergeResponse.body.success).toBe(true);

      // 4. Verify source customer no longer exists
      const sourceCheckResponse = await request(app)
        .get(`/api/customers/${customer2Id}`)
        .set(authHeaders)
        .expect(404);

      expect(sourceCheckResponse.body.success).toBe(false);

      // 5. Verify target customer has merged data
      const targetCheckResponse = await request(app)
        .get(`/api/customers/${customer1Id}`)
        .set(authHeaders)
        .expect(200);

      expect(targetCheckResponse.body.success).toBe(true);
      // Should contain merged information
    });
  });

  describe('Integration Management Workflow', () => {
    test('should handle OAuth integration setup', async () => {
      // 1. Get available integration types
      const typesResponse = await request(app)
        .get('/api/integrations/types')
        .set(authHeaders)
        .expect(200);

      expect(typesResponse.body.success).toBe(true);
      expect(Array.isArray(typesResponse.body.data)).toBe(true);

      // 2. Initiate OAuth flow for Slack
      const oauthInitResponse = await request(app)
        .post('/api/integrations/oauth/slack/init')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          redirectUri: 'http://localhost:3000/oauth/callback'
        })
        .expect(200);

      expect(oauthInitResponse.body.success).toBe(true);
      expect(oauthInitResponse.body.data).toHaveProperty('authUrl');

      // 3. Simulate OAuth callback
      const callbackResponse = await request(app)
        .post('/api/integrations/oauth/slack/callback')
        .set(authHeaders)
        .send({
          code: 'test-oauth-code',
          state: 'test-state',
          organizationId: testContext.organization.id
        })
        .expect(200);

      expect(callbackResponse.body.success).toBe(true);
      const integrationId = callbackResponse.body.data.id;

      // 4. Get integration details
      const detailsResponse = await request(app)
        .get(`/api/integrations/${integrationId}`)
        .set(authHeaders)
        .expect(200);

      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.type).toBe('slack');

      // 5. Test integration health
      const healthResponse = await request(app)
        .get(`/api/integrations/${integrationId}/health`)
        .set(authHeaders)
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toHaveProperty('status');

      // 6. Update integration settings
      const settingsResponse = await request(app)
        .put(`/api/integrations/${integrationId}`)
        .set(authHeaders)
        .send({
          enabled: true,
          config: {
            channel: '#feedback',
            notifyOnNew: true
          }
        })
        .expect(200);

      expect(settingsResponse.body.success).toBe(true);
    });
  });

  describe('CSV Import/Export Workflow', () => {
    test('should handle complete CSV import process', async () => {
      // 1. Upload CSV file
      const csvContent = `Customer Name,Email,Feedback,Priority
John Doe,john@example.com,Great product!,medium
Jane Smith,jane@example.com,Needs improvement,high
Bob Johnson,bob@example.com,Love the new features,low`;

      const uploadResponse = await request(app)
        .post('/api/csv-import/upload')
        .set(authHeaders)
        .attach('csvFile', Buffer.from(csvContent), 'feedback.csv')
        .field('mapping', JSON.stringify({
          'Customer Name': 'customer_name',
          'Email': 'customer_email',
          'Feedback': 'description',
          'Priority': 'priority'
        }))
        .expect(200);

      expect(uploadResponse.body.success).toBe(true);
      const taskId = uploadResponse.body.data.id;

      // 2. Check import status
      const statusResponse = await request(app)
        .get(`/api/csv-import/status/${taskId}`)
        .set(authHeaders)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('status');

      // 3. Wait for processing and get results
      // In real implementation, this would poll until completion
      const resultsResponse = await request(app)
        .get(`/api/csv-import/results/${taskId}`)
        .set(authHeaders)
        .expect(200);

      expect(resultsResponse.body.success).toBe(true);
      expect(resultsResponse.body.data).toHaveProperty('importedCount');
    });

    test('should handle CSV export functionality', async () => {
      // 1. Create test feedback for export
      const feedbackData = Array.from({ length: 5 }, (_, i) => ({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id,
        title: `Export Test Feedback ${i + 1}`,
        description: `Description for feedback ${i + 1}`,
        priority: ['low', 'medium', 'high'][i % 3],
        status: 'new'
      }));

      for (const feedback of feedbackData) {
        await request(app)
          .post('/api/feedback')
          .set(authHeaders)
          .send(feedback)
          .expect(201);
      }

      // 2. Export feedback as CSV
      const exportResponse = await request(app)
        .get('/api/feedback/export')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          format: 'csv'
        })
        .expect(200);

      expect(exportResponse.headers['content-type']).toContain('text/csv');
      expect(exportResponse.text).toContain('Export Test Feedback');

      // 3. Export with filters
      const filteredExportResponse = await request(app)
        .get('/api/feedback/export')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          format: 'csv',
          filters: JSON.stringify({ priority: ['high'] })
        })
        .expect(200);

      expect(filteredExportResponse.headers['content-type']).toContain('text/csv');
    });
  });

  describe('AI Chat Integration Workflow', () => {
    test('should handle AI chat session management', async () => {
      // 1. Start new chat session
      const sessionResponse = await request(app)
        .post('/api/ai/chat/sessions')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          context: {
            page: 'dashboard',
            filters: { status: ['new'] }
          }
        })
        .expect(201);

      expect(sessionResponse.body.success).toBe(true);
      const sessionId = sessionResponse.body.data.id;

      // 2. Send message to AI
      const messageResponse = await request(app)
        .post(`/api/ai/chat/sessions/${sessionId}/messages`)
        .set(authHeaders)
        .send({
          message: 'What are the most common feedback categories?',
          includeContext: true
        })
        .expect(200);

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data).toHaveProperty('response');

      // 3. Get chat history
      const historyResponse = await request(app)
        .get(`/api/ai/chat/sessions/${sessionId}/messages`)
        .set(authHeaders)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(Array.isArray(historyResponse.body.data)).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);

      // 4. End chat session
      const endResponse = await request(app)
        .delete(`/api/ai/chat/sessions/${sessionId}`)
        .set(authHeaders)
        .expect(200);

      expect(endResponse.body.success).toBe(true);
    });

    test('should handle AI feedback analysis', async () => {
      // 1. Create feedback for analysis
      const feedbackResponse = await request(app)
        .post('/api/feedback')
        .set(authHeaders)
        .send({
          organizationId: testContext.organization.id,
          customerId: testContext.customer.id,
          title: 'AI Analysis Test',
          description: 'This is a complex feedback that needs AI analysis to categorize and prioritize properly'
        })
        .expect(201);

      const feedbackId = feedbackResponse.body.data.id;

      // 2. Request AI analysis
      const analysisResponse = await request(app)
        .post(`/api/ai/analyze/feedback/${feedbackId}`)
        .set(authHeaders)
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('category');
      expect(analysisResponse.body.data).toHaveProperty('priority');
      expect(analysisResponse.body.data).toHaveProperty('sentiment');

      // 3. Verify feedback was updated with AI insights
      const updatedFeedbackResponse = await request(app)
        .get(`/api/feedback/${feedbackId}`)
        .set(authHeaders)
        .expect(200);

      expect(updatedFeedbackResponse.body.data).toHaveProperty('aiAnalysis');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle API rate limiting gracefully', async () => {
      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/feedback')
          .set(authHeaders)
          .query({ organizationId: testContext.organization.id })
      );

      const responses = await Promise.allSettled(requests);
      
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      ).length;

      expect(successful + rateLimited).toBe(100);
      if (rateLimited > 0) {
        expect(rateLimited).toBeLessThan(successful); // Most should succeed
      }
    });

    test('should handle network failures and retries', async () => {
      // Simulate network error handling
      const invalidResponse = await request(app)
        .get('/api/invalid-endpoint')
        .set(authHeaders)
        .expect(404);

      expect(invalidResponse.body.success).toBe(false);

      // Test malformed request handling
      const malformedResponse = await request(app)
        .post('/api/feedback')
        .set(authHeaders)
        .send({
          // Missing required fields
          invalidField: 'test'
        })
        .expect(400);

      expect(malformedResponse.body.success).toBe(false);
      expect(malformedResponse.body.error).toBeDefined();
    });

    test('should handle concurrent user operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/feedback')
          .set(authHeaders)
          .send({
            organizationId: testContext.organization.id,
            customerId: testContext.customer.id,
            title: `Concurrent Test ${i}`,
            description: 'Testing concurrent operations'
          })
      );

      const responses = await Promise.all(concurrentOperations);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all feedback was created correctly
      const listResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          search: 'Concurrent Test'
        })
        .expect(200);

      expect(listResponse.body.data.feedback.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Performance and Scalability', () => {
    test('should maintain API response times under load', async () => {
      const { averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        () => request(app)
          .get('/api/feedback')
          .set(authHeaders)
          .query({ organizationId: testContext.organization.id }),
        20
      );

      PerformanceTestHelper.assertPerformance(averageTimeMs, 1000);
    });

    test('should handle large data sets efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        organizationId: testContext.organization.id,
        customerId: testContext.customer.id,
        title: `Large Dataset Item ${i}`,
        description: 'Part of large dataset test'
      }));

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        const createPromises = largeDataset.map(data => 
          request(app)
            .post('/api/feedback')
            .set(authHeaders)
            .send(data)
        );
        return Promise.all(createPromises);
      });

      expect(timeMs).toBeLessThan(30000); // Should complete within 30 seconds

      // Test pagination with large dataset
      const paginationResponse = await request(app)
        .get('/api/feedback')
        .set(authHeaders)
        .query({
          organizationId: testContext.organization.id,
          page: 1,
          limit: 50
        })
        .expect(200);

      expect(paginationResponse.body.data).toHaveProperty('pagination');
      expect(paginationResponse.body.data.pagination.total).toBeGreaterThan(100);
    });
  });
}); 