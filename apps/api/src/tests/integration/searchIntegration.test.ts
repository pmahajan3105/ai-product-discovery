/**
 * Search Integration Tests
 * Tests the end-to-end search functionality integration
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../helpers/testApp';
import { createTestSession } from '../helpers/auth';

describe('Search Integration Tests', () => {
  let app: Express;
  let organizationId: string;
  let sessionToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create test user and organization
    const testSession = await createTestSession();
    organizationId = testSession.organizationId;
    sessionToken = testSession.sessionToken;
  });

  describe('Natural Language Search', () => {
    it('should process natural language queries', async () => {
      const response = await request(app)
        .post(`/api/search/${organizationId}/natural`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          query: 'show me urgent issues from last week'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBeDefined();
      expect(response.body.data.query.originalQuery).toBe('show me urgent issues from last week');
      expect(response.body.data.query.intent).toBeDefined();
      expect(response.body.data.appliedFilters).toBeDefined();
    });

    it('should return suggestions for partial queries', async () => {
      const response = await request(app)
        .get(`/api/search/${organizationId}/suggestions`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .query({ q: 'urgent', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/search/${organizationId}/natural`)
        .send({
          query: 'test query'
        })
        .expect(401);
    });

    it('should validate organization ID', async () => {
      await request(app)
        .post('/api/search/invalid-org-id/natural')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          query: 'test query'
        })
        .expect(400);
    });
  });

  describe('Boolean Search', () => {
    it('should process boolean queries', async () => {
      const response = await request(app)
        .post(`/api/search/${organizationId}/boolean`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          query: 'urgent AND status:new'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.parsedQuery).toBeDefined();
      expect(response.body.data.appliedFilters).toBeDefined();
    });
  });

  describe('Search Analytics', () => {
    it('should return search analytics', async () => {
      const response = await request(app)
        .get(`/api/search/analytics/${organizationId}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.period).toBe('30d');
      expect(response.body.data.totalSearches).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const response = await request(app)
        .post(`/api/search/${organizationId}/natural`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          query: ''
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle service failures gracefully', async () => {
      // This would test with a service that's expected to fail
      // Implementation depends on how you want to simulate failures
    });
  });

  describe('Integration with Feedback Service', () => {
    it('should return actual search results from feedback service', async () => {
      // First create some test feedback
      await request(app)
        .post(`/api/organizations/${organizationId}/feedback`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          title: 'Test urgent issue',
          description: 'This is a test urgent performance issue',
          source: 'test',
          priority: 'urgent',
          status: 'new'
        });

      // Then search for it
      const response = await request(app)
        .post(`/api/search/${organizationId}/natural`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          query: 'urgent performance'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toBeDefined();
      expect(Array.isArray(response.body.data.feedback)).toBe(true);
    });
  });
});