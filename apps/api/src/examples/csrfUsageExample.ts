/**
 * CSRF Protection Usage Examples
 * Demonstrates how to integrate CSRF protection in various scenarios
 */

import express, { Router } from 'express';
import { CsrfProtection, csrfProtection, setCsrfToken, getCsrfToken } from '../middleware/csrfProtection';
import { addCsrfTokenToResponse, csrfInput, csrfMetaTag } from '../utils/csrfUtils';
import { ResponseBuilder } from '../utils/ResponseBuilder';

const router: Router = express.Router();

// ===== BASIC USAGE =====

/**
 * Example 1: Basic CSRF protection for all form routes
 */
const formRouter = express.Router();

// Set CSRF token for all routes
formRouter.use(setCsrfToken);

// Protect all POST/PUT/DELETE routes
formRouter.use(['POST', 'PUT', 'DELETE'], csrfProtection);

// Example protected route
formRouter.post('/feedback', (req, res) => {
  // This route is automatically protected by CSRF
  const { title, description } = req.body;
  
  // Process feedback creation
  return ResponseBuilder.success(res, { 
    message: 'Feedback created successfully' 
  });
});

// ===== CUSTOM CONFIGURATION =====

/**
 * Example 2: Custom CSRF configuration for specific needs
 */
const customCsrfProtection = new CsrfProtection({
  tokenExpiry: 60 * 60 * 1000, // 1 hour
  cookieName: 'app_csrf',
  headerName: 'x-app-csrf',
  skipGetRequests: false, // Protect GET requests too
  trustedOrigins: ['https://trusted-partner.com'],
  sameSitePolicy: 'lax'
});

const adminRouter = express.Router();
adminRouter.use(customCsrfProtection.setToken());
adminRouter.use(customCsrfProtection.middleware());

adminRouter.post('/admin/settings', (req, res) => {
  // Admin route with stricter CSRF protection
  return ResponseBuilder.success(res, { 
    message: 'Settings updated' 
  });
});

// ===== API ENDPOINTS FOR CSRF TOKENS =====

/**
 * Example 3: Dedicated endpoint to get CSRF tokens for AJAX
 */
router.get('/csrf-token', getCsrfToken);

/**
 * Example 4: Include CSRF token in API responses
 */
router.get('/initialize-form', addCsrfTokenToResponse, (req, res) => {
  return ResponseBuilder.success(res, {
    formData: {
      // ... form initialization data
    },
    csrfToken: res.locals.csrfToken
  });
});

// ===== FRONTEND INTEGRATION EXAMPLES =====

/**
 * Example 5: HTML Form Integration
 */
function generateFormHTML(csrfToken: string): string {
  return `
    <form method="POST" action="/api/feedback">
      ${csrfInput(csrfToken)}
      
      <div>
        <label for="title">Title:</label>
        <input type="text" id="title" name="title" required>
      </div>
      
      <div>
        <label for="description">Description:</label>
        <textarea id="description" name="description" required></textarea>
      </div>
      
      <button type="submit">Submit Feedback</button>
    </form>
  `;
}

/**
 * Example 6: HTML Page with Meta Tag for AJAX
 */
function generatePageHTML(csrfToken: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Feedback Form</title>
      ${csrfMetaTag(csrfToken)}
    </head>
    <body>
      <div id="feedback-form">
        <!-- Form will be populated by JavaScript -->
      </div>
      
      <script>
        // CSRF helper functions
        ${require('../utils/csrfUtils').csrfJavaScriptHelper}
        
        // Example AJAX request with CSRF protection
        async function submitFeedback(formData) {
          const headers = addCsrfToHeaders({
            'Content-Type': 'application/json'
          });
          
          const response = await fetch('/api/feedback', {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
          });
          
          return response.json();
        }
        
        // Example FormData submission
        function submitForm(formElement) {
          const formData = new FormData(formElement);
          addCsrfToFormData(formData);
          
          fetch('/api/feedback', {
            method: 'POST',
            body: formData
          });
        }
      </script>
    </body>
    </html>
  `;
}

// ===== CONDITIONAL PROTECTION =====

/**
 * Example 7: Conditional CSRF protection based on route
 */
const conditionalRouter = express.Router();

conditionalRouter.use((req, res, next) => {
  // Only protect admin routes and form submissions
  if (req.path.startsWith('/admin') || req.method !== 'GET') {
    return csrfProtection(req, res, next);
  }
  next();
});

// ===== ERROR HANDLING =====

/**
 * Example 8: Custom CSRF error handling
 */
const errorHandlingRouter = express.Router();

errorHandlingRouter.use(setCsrfToken);

errorHandlingRouter.use((req, res, next) => {
  // Custom validation logic
  if (req.method === 'POST' && req.path.includes('/sensitive')) {
    // Extra strict validation for sensitive routes
    return csrfProtection(req, res, next);
  }
  next();
});

// Global error handler for CSRF errors
errorHandlingRouter.use((error: any, req: any, res: any, next: any) => {
  if (error.code === 'CSRF_TOKEN_INVALID') {
    return ResponseBuilder.forbidden(res, 'CSRF protection failed', {
      code: 'CSRF_ERROR',
      suggestion: 'Please refresh the page and try again',
      newToken: res.locals.csrfToken // Provide new token
    });
  }
  next(error);
});

// ===== REACT/SPA INTEGRATION =====

/**
 * Example 9: API endpoint for SPA initialization
 */
router.get('/app/initialize', addCsrfTokenToResponse, (req, res) => {
  return ResponseBuilder.success(res, {
    user: {
      id: req.user_id,
      // ... user data
    },
    organization: {
      id: req.organization_id,
      // ... organization data
    },
    csrfToken: res.locals.csrfToken,
    config: {
      // ... app configuration
    }
  });
});

// ===== WEBHOOK ENDPOINTS =====

/**
 * Example 10: Skip CSRF for webhook endpoints
 */
const webhookRouter = express.Router();

// Webhook routes should skip CSRF (they use other security measures)
webhookRouter.post('/webhooks/slack', (req, res, next) => {
  // Skip CSRF for webhooks
  (req as any).isPublicURL = true;
  next();
}, csrfProtection, (req, res) => {
  // Process webhook
  return ResponseBuilder.success(res, { received: true });
});

// ===== MONITORING AND DEBUGGING =====

/**
 * Example 11: CSRF token monitoring endpoint
 */
router.get('/admin/csrf-stats', async (req, res) => {
  const CsrfTokenManager = require('../utils/csrfUtils').default;
  const stats = await CsrfTokenManager.getTokenStats();
  
  return ResponseBuilder.success(res, {
    tokenStats: stats,
    timestamp: new Date().toISOString()
  });
});

// ===== TESTING HELPERS =====

/**
 * Example 12: Test helpers for CSRF protection
 */
export const testHelpers = {
  /**
   * Generate test CSRF token
   */
  generateTestToken: (userId?: string, orgId?: string) => {
    const testCsrf = new CsrfProtection();
    return testCsrf.generateToken(userId, orgId);
  },

  /**
   * Create mock request with CSRF token
   */
  createMockRequestWithCsrf: (token: string, method = 'POST') => ({
    method,
    headers: { 'x-csrf-token': token },
    body: {},
    user_id: 'test-user',
    organization_id: 'test-org'
  }),

  /**
   * Bypass CSRF for testing
   */
  bypassCsrfForTest: (req: any) => {
    req.isPublicURL = true;
    return req;
  }
};

// ===== COMPLETE EXAMPLE APPLICATION =====

/**
 * Example 13: Complete Express app with CSRF protection
 */
export function createAppWithCsrf() {
  const app = express();

  // Parse JSON and form data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookie parser for CSRF tokens
  app.use(require('cookie-parser')());

  // Global CSRF token setting for all routes
  app.use(setCsrfToken);

  // Public routes (no CSRF protection needed)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // API routes with CSRF protection
  app.use('/api', csrfProtection, router);

  // Form routes with CSRF protection
  app.use('/forms', formRouter);

  // Admin routes with custom CSRF protection
  app.use('/admin', adminRouter);

  // Error handling
  app.use((error: any, req: any, res: any, next: any) => {
    if (error.code?.includes('CSRF')) {
      return ResponseBuilder.forbidden(res, 'CSRF protection failed');
    }
    next(error);
  });

  return app;
}

export default {
  router,
  formRouter,
  adminRouter,
  testHelpers,
  createAppWithCsrf,
  generateFormHTML,
  generatePageHTML
};