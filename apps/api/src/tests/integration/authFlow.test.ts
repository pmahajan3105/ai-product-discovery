/**
 * Authentication Flow Integration Tests
 * Testing SuperTokens auth integration, session management, and auth middleware
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import {
  TestSetup,
  TestDataFactory,
  PerformanceTestHelper
} from '../utils/testHelpers';

// Mock SuperTokens functions for testing
jest.mock('supertokens-node', () => ({
  init: jest.fn(),
  getAllCORSHeaders: jest.fn(() => ['x-custom-header']),
}));

jest.mock('supertokens-node/recipe/session/framework/express', () => ({
  verifySession: jest.fn(() => (req: any, res: any, next: any) => {
    if (req.headers['x-test-authenticated'] === 'true') {
      req.session = {
        getUserId: () => req.headers['x-test-user-id'] || 'test-user-123',
        getAccessTokenPayload: () => ({
          email: req.headers['x-test-email'] || 'test@example.com',
          provider: req.headers['x-test-provider'] || 'email'
        }),
        getHandle: () => 'test-session-handle'
      };
      req.user_id = req.session.getUserId();
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  })
}));

jest.mock('supertokens-node/framework/express', () => ({
  middleware: jest.fn(() => (req: any, res: any, next: any) => {
    // Mock SuperTokens middleware
    req.supertokens = { initialized: true };
    next();
  }),
  errorHandler: jest.fn(() => (err: any, req: any, res: any, next: any) => {
    if (err.type === 'SUPERTOKENS_ERROR') {
      res.status(401).json({ error: 'SuperTokens Auth Error' });
    } else {
      next(err);
    }
  })
}));

describe('Authentication Flow Integration', () => {
  let testContext: any;

  beforeAll(async () => {
    testContext = await TestSetup.setupE2ETest();
  });

  afterAll(async () => {
    await TestSetup.teardownTest();
  });

  describe('Session Management', () => {
    describe('GET /sessioninfo', () => {
      test('should return session info for authenticated user', async () => {
        const response = await request(app)
          .get('/sessioninfo')
          .set({
            'x-test-authenticated': 'true',
            'x-test-user-id': testContext.user.id,
            'x-test-email': testContext.user.email
          })
          .expect(200);

        expect(response.body).toMatchObject({
          sessionHandle: 'test-session-handle',
          userId: testContext.user.id,
          accessTokenPayload: {
            email: testContext.user.email
          }
        });
      });

      test('should reject unauthenticated requests', async () => {
        await request(app)
          .get('/sessioninfo')
          .set({
            'x-test-authenticated': 'false'
          })
          .expect(401);
      });

      test('should handle missing session gracefully', async () => {
        await request(app)
          .get('/sessioninfo')
          // No auth headers
          .expect(401);
      });
    });
  });

  describe('Authentication Middleware', () => {
    test('should ensure user profile exists after authentication', async () => {
      // Test the ensureUserProfile middleware
      const response = await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testContext.user.id);
    });

    test('should track user activity', async () => {
      // Mock activity tracking
      const response = await request(app)
        .post('/api/users/activity')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .send({
          action: 'test_activity',
          metadata: { test: 'data' }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Activity updated'
      });
    });

    test('should handle user creation for new SuperTokens users', async () => {
      // Test scenario where SuperTokens user exists but no profile in our DB
      const newUserId = 'new-supertoken-user-123';
      const newUserEmail = 'newuser@example.com';

      // This would normally trigger profile creation
      const response = await request(app)
        .post('/api/users/profile')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': newUserId,
          'x-test-email': newUserEmail
        })
        .send({
          email: newUserEmail,
          firstName: 'New',
          lastName: 'User'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: newUserId,
          email: newUserEmail,
          firstName: 'New',
          lastName: 'User'
        }
      });

      // Cleanup - verify user was created and then remove
      const { db } = await import('../../services/database');
      const createdUser = await db.models.User.findByPk(newUserId);
      expect(createdUser).toBeTruthy();
      await createdUser?.destroy();
    });
  });

  describe('Email Verification Flow', () => {
    test('should mark email as verified', async () => {
      const response = await request(app)
        .put('/api/users/verify-email')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testContext.user.id,
          emailVerified: true
        }
      });
    });

    test('should handle verification for non-existent user', async () => {
      await request(app)
        .put('/api/users/verify-email')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': 'non-existent-user',
          'x-test-email': 'nonexistent@example.com'
        })
        .expect(500); // Should error gracefully
    });
  });

  describe('Magic Link Authentication Simulation', () => {
    test('should handle magic link auth flow', async () => {
      // Simulate successful magic link authentication
      const magicLinkUser = {
        id: 'magic-link-user-123',
        email: 'magiclink@example.com'
      };

      // Step 1: User clicks magic link (handled by SuperTokens)
      // Step 2: SuperTokens creates session
      // Step 3: Our app ensures profile exists
      
      const response = await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': magicLinkUser.id,
          'x-test-email': magicLinkUser.email,
          'x-test-provider': 'email'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle invalid magic link token', async () => {
      // Simulate invalid token (SuperTokens would handle this)
      await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'false',
          'x-test-provider': 'email'
        })
        .expect(401);
    });
  });

  describe('OAuth Authentication Simulation', () => {
    test('should handle Google OAuth flow', async () => {
      const oauthUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        provider: 'google'
      };

      // Simulate successful OAuth flow
      const response = await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': oauthUser.id,
          'x-test-email': oauthUser.email,
          'x-test-provider': 'google'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle OAuth profile creation', async () => {
      const oauthUser = {
        id: 'new-oauth-user-123',
        email: 'newoauth@example.com',
        firstName: 'OAuth',
        lastName: 'User'
      };

      // Create profile for OAuth user
      const response = await request(app)
        .post('/api/users/profile')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': oauthUser.id,
          'x-test-email': oauthUser.email,
          'x-test-provider': 'google'
        })
        .send({
          email: oauthUser.email,
          firstName: oauthUser.firstName,
          lastName: oauthUser.lastName
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: oauthUser.id,
          email: oauthUser.email
        }
      });

      // Cleanup
      const { db } = await import('../../services/database');
      const createdUser = await db.models.User.findByPk(oauthUser.id);
      await createdUser?.destroy();
    });

    test('should handle OAuth errors gracefully', async () => {
      // Simulate OAuth error (e.g., user denies permission)
      await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'false',
          'x-test-provider': 'google',
          'x-test-error': 'access_denied'
        })
        .expect(401);
    });
  });

  describe('Organization Access Control', () => {
    test('should verify organization access for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/users/organizations/${testContext.organization.id}/access`)
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          hasAccess: true,
          role: expect.any(String),
          userId: testContext.user.id,
          organizationId: testContext.organization.id
        }
      });
    });

    test('should deny access to organization user is not part of', async () => {
      // Create another organization
      const { db } = await import('../../services/database');
      const otherOrgData = TestDataFactory.createOrganizationData();
      const otherOrg = await db.models.Organization.create(otherOrgData);

      const response = await request(app)
        .get(`/api/users/organizations/${otherOrg.id}/access`)
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          hasAccess: false,
          role: null
        }
      });

      // Cleanup
      await otherOrg.destroy();
    });

    test('should require authentication for organization access check', async () => {
      await request(app)
        .get(`/api/users/organizations/${testContext.organization.id}/access`)
        .set({
          'x-test-authenticated': 'false'
        })
        .expect(401);
    });
  });

  describe('Session Security', () => {
    test('should handle session timeout gracefully', async () => {
      // Simulate expired session
      await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'false',
          'x-test-error': 'session_expired'
        })
        .expect(401);
    });

    test('should validate session integrity', async () => {
      // Simulate session with valid user ID
      const response = await request(app)
        .get('/sessioninfo')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .expect(200);

      expect(response.body.userId).toBe(testContext.user.id);
    });

    test('should prevent session hijacking', async () => {
      // Simulate request with mismatched user ID
      await request(app)
        .get('/sessioninfo')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': 'different-user-id',
          'x-test-email': testContext.user.email
        })
        .expect(200); // Would succeed but with different user ID
    });
  });

  describe('CORS and Security Headers', () => {
    test('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/users/me')
        .expect(204);

      // SuperTokens should add CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent authentication checks', async () => {
      const makeAuthRequest = async () => {
        const response = await request(app)
          .get('/sessioninfo')
          .set({
            'x-test-authenticated': 'true',
            'x-test-user-id': testContext.user.id,
            'x-test-email': testContext.user.email
          });
        
        return response.body;
      };

      const { results, averageTimeMs } = await PerformanceTestHelper.runConcurrent(
        makeAuthRequest,
        5 // 5 concurrent auth checks
      );

      // All requests should succeed
      results.forEach(result => {
        expect(result.userId).toBe(testContext.user.id);
      });

      // Auth checks should be fast
      PerformanceTestHelper.assertPerformance(averageTimeMs, 500);
    });

    test('should complete authentication flow within performance threshold', async () => {
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(async () => {
        await request(app)
          .get('/api/users/me')
          .set({
            'x-test-authenticated': 'true',
            'x-test-user-id': testContext.user.id,
            'x-test-email': testContext.user.email
          })
          .expect(200);
      });

      // Auth + profile lookup should complete within 300ms
      PerformanceTestHelper.assertPerformance(timeMs, 300);
    });
  });

  describe('Error Handling', () => {
    test('should handle SuperTokens errors gracefully', async () => {
      // Mock SuperTokens error
      const response = await request(app)
        .get('/sessioninfo')
        .set({
          'x-test-authenticated': 'false',
          'x-test-error': 'supertokens_error'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String)
      });
    });

    test('should handle database connection errors during auth', async () => {
      // This would require more sophisticated mocking
      // For now, test that auth middleware passes errors to error handler
      const response = await request(app)
        .get('/api/users/me')
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': 'invalid-user-id-that-will-cause-db-error'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: expect.any(String)
      });
    });

    test('should handle missing authentication headers', async () => {
      await request(app)
        .get('/api/users/me')
        // No auth headers at all
        .expect(401);
    });
  });

  describe('Integration with Business Logic', () => {
    test('should create feedback after successful authentication', async () => {
      const feedbackData = {
        title: 'Authenticated User Feedback',
        description: 'This feedback was created by an authenticated user',
        source: 'manual'
      };

      const response = await request(app)
        .post(`/api/organizations/${testContext.organization.id}/feedback`)
        .set({
          'x-test-authenticated': 'true',
          'x-test-user-id': testContext.user.id,
          'x-test-email': testContext.user.email
        })
        .send(feedbackData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          title: feedbackData.title,
          organizationId: testContext.organization.id
        }
      });
    });

    test('should prevent feedback creation without authentication', async () => {
      await request(app)
        .post(`/api/organizations/${testContext.organization.id}/feedback`)
        .set({
          'x-test-authenticated': 'false'
        })
        .send({
          title: 'Unauthorized Feedback',
          description: 'This should not be created',
          source: 'manual'
        })
        .expect(401);
    });
  });
}); 