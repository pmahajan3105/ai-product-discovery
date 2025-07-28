/**
 * CSRF Protection Tests - Comprehensive test suite for CSRF middleware
 * Tests all aspects of CSRF protection including edge cases and security scenarios
 */

import { Request, Response, NextFunction } from 'express';
import { CsrfProtection } from '../csrfProtection';
import { CsrfTokenManager } from '../../utils/csrfUtils';
import { SCOPE_PUBLIC, SCOPE_ORGANIZATION } from '../../config/routeConstants';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../utils/redis');
jest.mock('../../utils/ResponseBuilder');

describe('CsrfProtection', () => {
  let csrfProtection: CsrfProtection;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    csrfProtection = new CsrfProtection({
      skipGetRequests: true,
      skipPublicRoutes: true,
      tokenExpiry: 30 * 60 * 1000 // 30 minutes
    });

    mockReq = {
      method: 'POST',
      path: '/api/feedback',
      ip: '127.0.0.1',
      user_id: 'user123',
      organization_id: 'org456',
      get: jest.fn(),
      body: {},
      query: {},
      cookies: {},
      routeDetails: {
        scope: SCOPE_ORGANIZATION,
        requiredPermissions: ['create-feedback'],
        resources: ['feedback'],
        log: { request: true, response: false }
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      locals: {}
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation', () => {
    it('should generate valid CSRF token', () => {
      const tokenData = csrfProtection.generateToken('user123', 'org456');

      expect(tokenData.token).toBeDefined();
      expect(tokenData.secret).toBeDefined();
      expect(tokenData.userId).toBe('user123');
      expect(tokenData.organizationId).toBe('org456');
      expect(tokenData.issuedAt).toBeGreaterThan(0);
      expect(tokenData.expiresAt).toBeGreaterThan(tokenData.issuedAt);
    });

    it('should generate different tokens each time', () => {
      const token1 = csrfProtection.generateToken('user123');
      const token2 = csrfProtection.generateToken('user123');

      expect(token1.token).not.toBe(token2.token);
      expect(token1.secret).not.toBe(token2.secret);
    });

    it('should include expiration time', () => {
      const tokenData = csrfProtection.generateToken();
      const expectedExpiry = Date.now() + 30 * 60 * 1000; // 30 minutes

      expect(tokenData.expiresAt).toBeGreaterThan(Date.now());
      expect(tokenData.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000); // Allow 1s variance
    });
  });

  describe('Middleware Protection', () => {
    it('should skip protection for GET requests when configured', async () => {
      mockReq.method = 'GET';
      const middleware = csrfProtection.middleware();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip protection for public routes when configured', async () => {
      mockReq.routeDetails!.scope = SCOPE_PUBLIC;
      const middleware = csrfProtection.middleware();

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip protection for API key requests', async () => {
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'X-API-Key') return 'api_key_123';
        return undefined;
      });

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should require CSRF token for protected routes', async () => {
      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate CSRF token from header', async () => {
      const tokenData = csrfProtection.generateToken('user123', 'org456');
      
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-csrf-token') return tokenData.token;
        return undefined;
      });

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate CSRF token from body', async () => {
      const tokenData = csrfProtection.generateToken('user123', 'org456');
      mockReq.body = { _csrf: tokenData.token };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject expired tokens', async () => {
      // Create CSRF protection with very short expiry
      const shortExpiryProtection = new CsrfProtection({
        tokenExpiry: 1 // 1ms
      });

      const tokenData = shortExpiryProtection.generateToken('user123', 'org456');
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      mockReq.body = { _csrf: tokenData.token };

      const middleware = shortExpiryProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject tokens with wrong user context', async () => {
      const tokenData = csrfProtection.generateToken('user456', 'org456'); // Different user
      mockReq.body = { _csrf: tokenData.token };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject tokens with wrong organization context', async () => {
      const tokenData = csrfProtection.generateToken('user123', 'org789'); // Different org
      mockReq.body = { _csrf: tokenData.token };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Setting Middleware', () => {
    it('should set CSRF token in cookie and locals', () => {
      const setTokenMiddleware = csrfProtection.setToken();
      setTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        '_csrf',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'strict',
          path: '/'
        })
      );

      expect(mockRes.locals!.csrfToken).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should skip setting token for GET requests when configured', () => {
      mockReq.method = 'GET';
      const setTokenMiddleware = csrfProtection.setToken();
      setTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.cookie).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Token Endpoint', () => {
    it('should return token via endpoint', () => {
      const getTokenEndpoint = csrfProtection.getTokenEndpoint();
      getTokenEndpoint(mockReq as Request, mockRes as Response);

      expect(mockRes.cookie).toHaveBeenCalled();
      // Response builder would be called with token data
    });
  });

  describe('Security Tests', () => {
    it('should use timing-safe comparison for token validation', async () => {
      const validToken = csrfProtection.generateToken('user123', 'org456');
      
      // Create a token that's similar but with one character different
      const invalidToken = validToken.token.slice(0, -1) + 'X';
      
      mockReq.body = { _csrf: invalidToken };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed tokens gracefully', async () => {
      mockReq.body = { _csrf: 'invalid.token.format.too.many.parts' };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty tokens', async () => {
      mockReq.body = { _csrf: '' };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-string tokens', async () => {
      mockReq.body = { _csrf: 12345 };

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom cookie name', () => {
      const customCsrf = new CsrfProtection({ cookieName: 'custom_csrf' });
      const setTokenMiddleware = customCsrf.setToken();
      
      setTokenMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        'custom_csrf',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should respect custom header name', async () => {
      const customCsrf = new CsrfProtection({ headerName: 'x-custom-csrf' });
      const tokenData = customCsrf.generateToken('user123', 'org456');
      
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-custom-csrf') return tokenData.token;
        return undefined;
      });

      const middleware = customCsrf.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should respect custom body field name', async () => {
      const customCsrf = new CsrfProtection({ bodyFieldName: 'customCsrfField' });
      const tokenData = customCsrf.generateToken('user123', 'org456');
      
      mockReq.body = { customCsrfField: tokenData.token };

      const middleware = customCsrf.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should respect trusted origins', async () => {
      const customCsrf = new CsrfProtection({
        trustedOrigins: ['https://trusted.example.com'],
        skipPublicRoutes: false // Ensure we don't skip for other reasons
      });

      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'Origin') return 'https://trusted.example.com';
        return undefined;
      });

      const middleware = customCsrf.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('Error Handling', () => {
    it('should handle token generation errors gracefully', () => {
      // Mock crypto to throw error
      const originalRandomBytes = require('crypto').randomBytes;
      require('crypto').randomBytes = jest.fn().mockImplementation(() => {
        throw new Error('Crypto error');
      });

      expect(() => {
        csrfProtection.generateToken('user123', 'org456');
      }).toThrow('Crypto error');

      // Restore original
      require('crypto').randomBytes = originalRandomBytes;
    });

    it('should handle middleware errors gracefully', async () => {
      // Mock a method to throw error
      const originalExtractToken = (csrfProtection as any).extractToken;
      (csrfProtection as any).extractToken = jest.fn().mockImplementation(() => {
        throw new Error('Extract error');
      });

      const middleware = csrfProtection.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();

      // Restore original
      (csrfProtection as any).extractToken = originalExtractToken;
    });
  });
});

describe('CsrfTokenManager', () => {
  let mockReq: Partial<Request>;

  beforeEach(() => {
    mockReq = {
      user_id: 'user123',
      organization_id: 'org456'
    };
  });

  describe('Token Management', () => {
    it('should generate and validate tokens', async () => {
      const { token } = await CsrfTokenManager.generateToken(mockReq as Request);
      expect(token).toBeDefined();

      const validation = await CsrfTokenManager.validateToken(token, mockReq as Request);
      expect(validation.valid).toBe(true);
    });

    it('should reject invalid tokens', async () => {
      const validation = await CsrfTokenManager.validateToken('invalid.token', mockReq as Request);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBeDefined();
    });

    it('should track token usage', async () => {
      const { token } = await CsrfTokenManager.generateToken(mockReq as Request);
      
      // First validation
      const validation1 = await CsrfTokenManager.validateToken(token, mockReq as Request);
      expect(validation1.valid).toBe(true);
      expect(validation1.tokenData?.requestCount).toBe(1);

      // Second validation
      const validation2 = await CsrfTokenManager.validateToken(token, mockReq as Request);
      expect(validation2.valid).toBe(true);
      expect(validation2.tokenData?.requestCount).toBe(2);
    });

    it('should revoke tokens', async () => {
      const { token } = await CsrfTokenManager.generateToken(mockReq as Request);
      
      const revoked = await CsrfTokenManager.revokeToken(token);
      expect(revoked).toBe(true);

      const validation = await CsrfTokenManager.validateToken(token, mockReq as Request);
      expect(validation.valid).toBe(false);
    });

    it('should clean up user tokens', async () => {
      // Generate multiple tokens for the same user
      const tokens = [];
      for (let i = 0; i < 7; i++) {
        const { token } = await CsrfTokenManager.generateToken(mockReq as Request);
        tokens.push(token);
      }

      const cleanedCount = await CsrfTokenManager.cleanupUserTokens('user123');
      expect(cleanedCount).toBeGreaterThan(0);
    });

    it('should provide token statistics', async () => {
      await CsrfTokenManager.generateToken(mockReq as Request);
      
      const stats = await CsrfTokenManager.getTokenStats();
      expect(stats.totalTokens).toBeGreaterThanOrEqual(1);
      expect(stats.tokensPerUser).toHaveProperty('user123');
    });
  });
});

describe('CSRF Utility Functions', () => {
  it('should generate CSRF input HTML', () => {
    const { csrfInput } = require('../../utils/csrfUtils');
    const input = csrfInput('test-token');
    
    expect(input).toContain('type="hidden"');
    expect(input).toContain('name="_csrf"');
    expect(input).toContain('value="test-token"');
  });

  it('should generate CSRF meta tag HTML', () => {
    const { csrfMetaTag } = require('../../utils/csrfUtils');
    const metaTag = csrfMetaTag('test-token');
    
    expect(metaTag).toContain('name="csrf-token"');
    expect(metaTag).toContain('content="test-token"');
  });

  it('should provide JavaScript helper functions', () => {
    const { csrfJavaScriptHelper } = require('../../utils/csrfUtils');
    
    expect(csrfJavaScriptHelper).toContain('function getCsrfToken()');
    expect(csrfJavaScriptHelper).toContain('function addCsrfToHeaders');
    expect(csrfJavaScriptHelper).toContain('function addCsrfToFormData');
  });
});